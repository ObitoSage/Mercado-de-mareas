import { GAME_RULES } from '@mercado/shared';
import type { GameAction, GameState } from '@mercado/shared';
import { chooseAiAction } from '../ai/strategy.js';
import { applyAction } from './rules.js';
import type { RuleResult } from './rules.js';
import { advanceAfterAiTurn } from './turns.js';

export function dispatchPlayerAction(game: GameState, action: GameAction): RuleResult {
  const playerResult = applyAction(game, 'PLAYER', action);
  if (!playerResult.ok || playerResult.game.actionPoints > 0) return playerResult;

  let current: GameState = {
    ...playerResult.game,
    phase: 'RESOLVING_AI',
    activeActor: 'AI',
    actionPoints: GAME_RULES.actionsPerTurn,
  };
  const events = [...playerResult.events];
  for (let index = 0; index < GAME_RULES.actionsPerTurn && current.actionPoints > 0; index++) {
    const aiAction = chooseAiAction(current);
    const aiResult = applyAction(current, 'AI', aiAction);
    if (!aiResult.ok) throw new Error(`La estrategia eligió una acción inválida: ${aiResult.error.code}.`);
    current = aiResult.game;
    events.push(...aiResult.events);
    if (aiAction.type === 'END_TURN') break;
  }

  const advanced = advanceAfterAiTurn(current);
  // Existing entries retain their references. Comparing them also works when
  // appendEvents has discarded the oldest entries from a full log.
  const previousEvents = new Set(current.eventLog);
  events.push(...advanced.eventLog.filter((event) => !previousEvents.has(event)));
  return { ok: true, game: advanced, events };
}
