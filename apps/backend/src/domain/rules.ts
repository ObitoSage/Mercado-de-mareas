import { GAME_RULES } from '@mercado/shared';
import type { ActorId, GameAction, GameEvent, GameState, Good, Position, Tile } from '@mercado/shared';
import { ruleError } from './errors.js';
import type { RuleErrorCode } from './errors.js';

export type RuleResult =
  | Readonly<{ ok: true; game: GameState; events: readonly GameEvent[] }>
  | Readonly<{ ok: false; error: { code: RuleErrorCode; message: string } }>;

export function isAdjacent(from: Position, to: Position): boolean {
  return Math.abs(from.row - to.row) + Math.abs(from.column - to.column) === 1;
}

function rejected(code: RuleErrorCode): RuleResult {
  return { ok: false, error: ruleError(code) };
}

function isActorTurn(game: GameState, actor: ActorId): boolean {
  const expectedPhase = actor === 'PLAYER' ? 'PLAYER_TURN' : 'RESOLVING_AI';
  return game.phase === expectedPhase && game.activeActor === actor;
}

function samePosition(a: Position, b: Position): boolean {
  return a.row === b.row && a.column === b.column;
}

function tileAt(game: GameState, position: Position): Tile | undefined {
  return game.board.find((tile) => samePosition(tile.position, position));
}

function salePrice(game: GameState, good: Good): number {
  const tideBonus =
    (game.tide === 'LOW' && good === 'FISH') || (game.tide === 'HIGH' && good === 'PEARL') ? 2
      : ((game.tide === 'RISING' || game.tide === 'FALLING') && good === 'SPICE' ? 1 : 0);
  return Math.max(1, game.prices[good] + tideBonus - game.demand[good]);
}

const GOOD_NAMES: Readonly<Record<Good, string>> = {
  FISH: 'pescado',
  SPICE: 'especias',
  PEARL: 'perlas',
};

export function appendEvents(game: GameState, events: readonly GameEvent[]): GameState {
  return { ...game, eventLog: [...game.eventLog, ...events].slice(-50) };
}

export function validateAction(game: GameState, actor: ActorId, action: GameAction): RuleResult {
  if (game.phase === 'FINISHED') return rejected('GAME_FINISHED');
  if (!isActorTurn(game, actor)) return rejected('NOT_ACTIVE_ACTOR');
  if (game.actionPoints <= 0) return rejected('NO_ACTION_POINTS');

  if (action.type === 'LOAD') {
    const player = game.players[actor];
    const tile = tileAt(game, player.position);
    if (tile?.kind !== 'SUPPLY_PORT' || !tile.supplyGood) return rejected('NOT_AT_SUPPLY_PORT');
    const supply = game.supplies.find((candidate) => samePosition(candidate.position, player.position));
    if (!supply || supply.stock <= 0) return rejected('SUPPLY_EMPTY');
    if (player.cargo.length >= player.cargoCapacity) return rejected('CARGO_FULL');
    return { ok: true, game, events: [] };
  }

  if (action.type === 'SELL') {
    const player = game.players[actor];
    if (tileAt(game, player.position)?.kind !== 'MARKET_PORT') return rejected('NOT_AT_MARKET');
    if (!player.cargo.includes(action.payload.good)) return rejected('GOOD_NOT_IN_CARGO');
    return { ok: true, game, events: [] };
  }

  if (action.type !== 'MOVE') return { ok: true, game, events: [] };

  const { row, column } = action.payload;
  if (row < 0 || row >= GAME_RULES.boardSize || column < 0 || column >= GAME_RULES.boardSize) {
    return rejected('OUT_OF_BOUNDS');
  }

  const player = game.players[actor];
  if (!isAdjacent(player.position, action.payload)) return rejected('NOT_ADJACENT');

  const tile = game.board.find((candidate) =>
    candidate.position.row === row && candidate.position.column === column);
  if (!tile || tile.kind === 'ISLAND') return rejected('TILE_BLOCKED');
  if (tile.kind === 'REEF' && game.tide !== 'HIGH') return rejected('REEF_CLOSED');

  const otherActor = actor === 'PLAYER' ? 'AI' : 'PLAYER';
  const otherPosition = game.players[otherActor].position;
  if (otherPosition.row === row && otherPosition.column === column) return rejected('TILE_OCCUPIED');

  return { ok: true, game, events: [] };
}

export function applyAction(game: GameState, actor: ActorId, action: GameAction): RuleResult {
  const validation = validateAction(game, actor, action);
  if (!validation.ok) return validation;

  const player = game.players[actor];
  if (action.type === 'MOVE') {
    const event: GameEvent = {
      type: 'MOVED', round: game.round, actor,
      from: { ...player.position }, to: { ...action.payload },
      message: `${player.name} avanzó a la casilla ${action.payload.row}, ${action.payload.column}.`,
    };
    const nextGame = appendEvents({
      ...game,
      actionPoints: game.actionPoints - 1,
      players: {
        ...game.players,
        [actor]: { ...player, position: { ...action.payload } },
      },
    }, [event]);
    return { ok: true, game: nextGame, events: [event] };
  }

  if (action.type === 'LOAD') {
    const supplyIndex = game.supplies.findIndex((supply) => samePosition(supply.position, player.position));
    const supply = game.supplies[supplyIndex];
    if (!supply) throw new Error('La carga validada no tiene puerto de abastecimiento.');
    const event: GameEvent = {
      type: 'LOADED', round: game.round, actor, good: supply.good,
      message: `${player.name} cargó una unidad de ${GOOD_NAMES[supply.good]}.`,
    };
    const supplies = game.supplies.map((item, index) => index === supplyIndex
      ? { ...item, stock: item.stock - 1 } : item);
    const nextGame = appendEvents({
      ...game,
      actionPoints: game.actionPoints - 1,
      players: {
        ...game.players,
        [actor]: { ...player, cargo: [...player.cargo, supply.good] },
      },
      supplies,
    }, [event]);
    return { ok: true, game: nextGame, events: [event] };
  }

  if (action.type === 'SELL') {
    const { good } = action.payload;
    const cargoIndex = player.cargo.indexOf(good);
    const coins = salePrice(game, good);
    const event: GameEvent = {
      type: 'SOLD', round: game.round, actor, good, coins,
      message: `${player.name} vendió una unidad de ${GOOD_NAMES[good]} por ${coins} monedas.`,
    };
    const nextGame = appendEvents({
      ...game,
      actionPoints: game.actionPoints - 1,
      players: {
        ...game.players,
        [actor]: {
          ...player,
          coins: player.coins + coins,
          cargo: player.cargo.filter((_item, index) => index !== cargoIndex),
        },
      },
      demand: { ...game.demand, [good]: game.demand[good] + 1 },
    }, [event]);
    return { ok: true, game: nextGame, events: [event] };
  }

  const event: GameEvent = {
    type: 'TURN_ENDED', round: game.round, actor,
    message: `${player.name} terminó su turno.`,
  };
  const nextGame = appendEvents({ ...game, actionPoints: 0 }, [event]);
  return { ok: true, game: nextGame, events: [event] };
}

export type { RuleErrorCode } from './errors.js';
