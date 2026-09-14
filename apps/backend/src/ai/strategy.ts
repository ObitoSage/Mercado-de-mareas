import type { GameAction, GameState } from '@mercado/shared';
import { createSeededRandom } from '../domain/random.js';
import { validateAction } from '../domain/rules.js';
import { scoreAction } from './score.js';

export function chooseAiAction(game: GameState): GameAction {
  const candidates: GameAction[] = [
    ...game.board.map((tile): GameAction => ({ type: 'MOVE', payload: tile.position })),
    { type: 'LOAD' },
    ...[...new Set(game.players.AI.cargo)].map((good): GameAction => ({ type: 'SELL', payload: { good } })),
    { type: 'END_TURN' },
  ];
  const ranked = candidates
    .filter((action) => validateAction(game, 'AI', action).ok)
    .map((action) => ({ action, score: scoreAction(game, action) }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  if (!best) throw new Error('El rival necesita un turno activo con puntos de acción.');
  const tied = ranked.filter(({ score }) => score === best.score);
  if (tied.length === 1) return best.action;
  return createSeededRandom(game.seed + game.round * 1_000 + game.actionPoints).pick(tied).action;
}
