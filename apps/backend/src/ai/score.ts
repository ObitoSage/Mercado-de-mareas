import type { ActorId, GameAction, GameState, Position } from '@mercado/shared';
import { getSalePrice } from '../domain/market.js';
import { isAdjacent, validateAction } from '../domain/rules.js';

function key(position: Position): string {
  return `${position.row},${position.column}`;
}

function atPosition(game: GameState, actor: ActorId, position: Position): GameState {
  return {
    ...game,
    phase: actor === 'AI' ? 'RESOLVING_AI' : 'PLAYER_TURN',
    activeActor: actor,
    actionPoints: 1,
    players: { ...game.players, [actor]: { ...game.players[actor], position } },
  };
}

// Breadth-first search uses the same movement rules as real actions, including
// occupied tiles and the ability to leave a reef after the tide has fallen.
function distancesFrom(game: GameState, actor: ActorId, start: Position): Map<string, number> {
  const distances = new Map([[key(start), 0]]);
  const queue = [{ position: start, distance: 0 }];
  for (const { position, distance } of queue) {
    const state = atPosition(game, actor, position);
    const neighbors = [
      { row: position.row - 1, column: position.column },
      { row: position.row + 1, column: position.column },
      { row: position.row, column: position.column - 1 },
      { row: position.row, column: position.column + 1 },
    ];
    for (const neighbor of neighbors) {
      if (distances.has(key(neighbor))) continue;
      if (!validateAction(state, actor, { type: 'MOVE', payload: neighbor }).ok) continue;
      distances.set(key(neighbor), distance + 1);
      queue.push({ position: neighbor, distance: distance + 1 });
    }
  }
  return distances;
}

function bestObjective(game: GameState, actor: ActorId): Position | undefined {
  const player = game.players[actor];
  const distances = distancesFrom(game, actor, player.position);
  const markets = game.board.filter((tile) => tile.kind === 'MARKET_PORT');
  const cargoValue = player.cargo.reduce((value, good) => value + getSalePrice(game, good), 0);
  const objectives: { position: Position; profit: number }[] = [];

  if (player.cargo.length > 0) {
    for (const market of markets) {
      const distance = distances.get(key(market.position)) ?? Infinity;
      objectives.push({ position: market.position, profit: cargoValue / (distance + player.cargo.length) });
    }
  }

  const space = player.cargoCapacity - player.cargo.length;
  for (const supply of game.supplies) {
    const units = Math.min(space, supply.stock);
    if (units <= 0) continue;
    const distance = distances.get(key(supply.position)) ?? Infinity;
    if (!Number.isFinite(distance)) continue;
    const deliveryDistances = distancesFrom(game, actor, supply.position);
    const delivery = Math.min(...markets.map((market) => deliveryDistances.get(key(market.position)) ?? Infinity));
    // Expected coins per action: travel, load, return and sell. This selects
    // the objective; the action weights below remain exactly those in the plan.
    const profit = (cargoValue + units * getSalePrice(game, supply.good))
      / (distance + units + delivery + player.cargo.length + units);
    objectives.push({ position: supply.position, profit });
  }

  return objectives.filter(({ profit }) => profit > 0)
    .sort((a, b) => b.profit - a.profit)[0]?.position;
}

function movementScore(game: GameState, destination: Position, objective: Position): number {
  const distance = distancesFrom(game, 'AI', destination).get(key(objective)) ?? Infinity;
  const reef = game.board.find((tile) => key(tile.position) === key(destination))?.kind === 'REEF';
  const risk = reef && game.tide === 'HIGH' && game.actionPoints === 1 ? 20 : 0;
  return 50 - distance - risk;
}

function usefulBlock(game: GameState, destination: Position): boolean {
  const player = game.players.PLAYER;
  if (!isAdjacent(player.position, destination)) return false;
  const state = atPosition(game, 'PLAYER', player.position);
  if (!validateAction(state, 'PLAYER', { type: 'MOVE', payload: destination }).ok) return false;
  const objective = bestObjective(game, 'PLAYER');
  if (!objective) return false;
  const current = distancesFrom(game, 'PLAYER', player.position).get(key(objective)) ?? Infinity;
  const next = distancesFrom(game, 'PLAYER', destination).get(key(objective)) ?? Infinity;
  return Number.isFinite(current) && next === current - 1;
}

export function scoreAction(game: GameState, action: GameAction): number {
  if (!validateAction(game, 'AI', action).ok) return -Infinity;
  if (action.type === 'SELL') return 100 + getSalePrice(game, action.payload.good);
  if (action.type === 'LOAD') {
    const supply = game.supplies.find((item) => key(item.position) === key(game.players.AI.position));
    if (!supply) throw new Error('La carga validada del rival no tiene suministro.');
    return 70 + getSalePrice(game, supply.good);
  }
  if (action.type === 'END_TURN') return -100;

  const objective = bestObjective(game, 'AI');
  if (!objective) return -Infinity;
  const score = movementScore(game, action.payload, objective);
  const bestMove = Math.max(...game.board
    .filter((tile) => validateAction(game, 'AI', { type: 'MOVE', payload: tile.position }).ok)
    .map((tile) => movementScore(game, tile.position, objective)));
  const bonus = Number.isFinite(score) && score === bestMove && usefulBlock(game, action.payload) ? 3 : 0;
  return score + bonus;
}
