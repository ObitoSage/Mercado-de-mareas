import { GAME_RULES } from '@mercado/shared';
import type { GameEvent, GameResult, GameState, Tide } from '@mercado/shared';
import { createSeededRandom } from './random.js';
import { appendEvents } from './rules.js';

const TIDES = ['LOW', 'RISING', 'HIGH', 'FALLING'] as const;

const GOOD_NAMES = {
  FISH: 'pescado',
  SPICE: 'especias',
  PEARL: 'perlas',
} as const;

function nextTide(tide: Tide): Tide {
  return TIDES[(TIDES.indexOf(tide) + 1) % TIDES.length] as Tide;
}

export function finishGame(game: GameState): GameState {
  const playerCoins = game.players.PLAYER.coins;
  const aiCoins = game.players.AI.coins;
  const kind = playerCoins > aiCoins ? 'PLAYER_WIN' : playerCoins < aiCoins ? 'AI_WIN' : 'DRAW';
  const result: GameResult = { kind, playerCoins, aiCoins };
  const outcome = kind === 'PLAYER_WIN' ? 'Ganó la capitana.' : kind === 'AI_WIN' ? 'Ganó el rival.' : 'La partida terminó en empate.';
  const event: GameEvent = {
    type: 'GAME_FINISHED',
    round: game.round,
    result,
    message: `${outcome} Marcador final: ${playerCoins} a ${aiCoins} monedas.`,
  };

  return appendEvents({ ...game, phase: 'FINISHED', actionPoints: 0, result }, [event]);
}

export function advanceAfterAiTurn(game: GameState): GameState {
  if (game.round === GAME_RULES.maxRounds) return finishGame(game);

  const round = game.round + 1;
  const tide = nextTide(game.tide);
  const eligibleSupplies = game.supplies.filter((supply) => supply.stock < 4);
  const selectedSupply = eligibleSupplies.length > 0
    ? createSeededRandom(game.seed + game.round * 101).pick(eligibleSupplies)
    : undefined;

  const tideEvent: GameEvent = {
    type: 'TIDE_CHANGED',
    round,
    tide,
    message: selectedSupply
      ? `La marea cambió a ${tide}.`
      : `La marea cambió a ${tide}. No fue necesaria ninguna reposición.`,
  };
  const events: GameEvent[] = [tideEvent];
  const supplies = selectedSupply
    ? game.supplies.map((supply) => supply === selectedSupply
      ? { ...supply, stock: supply.stock + 1 }
      : supply)
    : game.supplies;

  if (selectedSupply) {
    events.push({
      type: 'RESTOCKED',
      round,
      good: selectedSupply.good,
      position: { ...selectedSupply.position },
      message: `Se repuso una unidad de ${GOOD_NAMES[selectedSupply.good]}.`,
    });
  }

  return appendEvents({
    ...game,
    round,
    tide,
    phase: 'PLAYER_TURN',
    activeActor: 'PLAYER',
    actionPoints: GAME_RULES.actionsPerTurn,
    supplies,
    demand: { FISH: 0, SPICE: 0, PEARL: 0 },
  }, events);
}
