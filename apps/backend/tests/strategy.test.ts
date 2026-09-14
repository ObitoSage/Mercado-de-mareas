import { describe, expect, it } from 'vitest';
import type { GameAction, GameState, Position } from '@mercado/shared';
import { scoreAction } from '../src/ai/score.js';
import { chooseAiAction } from '../src/ai/strategy.js';
import { validateAction } from '../src/domain/rules.js';
import { aiAtMarketWithCargo, aiAtSupplyPort } from './fixtures.js';

function aiAt(position: Position, game = aiAtMarketWithCargo([])): GameState {
  return { ...game, players: { ...game.players, AI: { ...game.players.AI, position } } };
}

describe('chooseAiAction', () => {
  it('sells the most valuable cargo when already at market', () => {
    const game = aiAtMarketWithCargo(['FISH', 'PEARL']);
    expect(chooseAiAction(game)).toEqual({ type: 'SELL', payload: { good: 'PEARL' } });
  });

  it('uses tide and demand when comparing immediate sales', () => {
    const game = { ...aiAtMarketWithCargo(['FISH', 'PEARL']), tide: 'LOW' as const,
      demand: { FISH: 0, SPICE: 0, PEARL: 6 } };
    expect(chooseAiAction(game)).toEqual({ type: 'SELL', payload: { good: 'FISH' } });
  });

  it('loads when a profitable supply is under the ship', () => {
    expect(chooseAiAction(aiAtSupplyPort('SPICE'))).toEqual({ type: 'LOAD' });
  });

  it('moves toward the nearby profitable supply from the initial market', () => {
    expect(chooseAiAction(aiAtMarketWithCargo([]))).toEqual(expect.objectContaining({ type: 'MOVE' }));
    const action = chooseAiAction(aiAtMarketWithCargo([]));
    expect([
      { type: 'MOVE', payload: { row: 0, column: 5 } },
      { type: 'MOVE', payload: { row: 1, column: 6 } },
    ]).toContainEqual(action);
  });

  it('takes full cargo toward a market instead of loading', () => {
    const game = aiAt({ row: 0, column: 5 }, aiAtMarketWithCargo(['SPICE', 'SPICE', 'SPICE']));
    expect(chooseAiAction(game)).toEqual({ type: 'MOVE', payload: { row: 0, column: 6 } });
  });

  it('ignores an empty supply and heads toward stocked goods', () => {
    const base = aiAtSupplyPort('SPICE');
    const game = { ...base, tide: 'HIGH' as const,
      supplies: base.supplies.map((supply) => ({ ...supply, stock: supply.good === 'SPICE' ? 0 : 3 })) };
    expect(chooseAiAction(game)).toEqual({ type: 'MOVE', payload: { row: 1, column: 4 } });
  });

  it('navigates around an island rather than using Manhattan distance alone', () => {
    const game = aiAt({ row: 0, column: 1 }, aiAtMarketWithCargo(['PEARL', 'PEARL', 'PEARL']));
    expect(chooseAiAction(game)).toEqual({ type: 'MOVE', payload: { row: 1, column: 1 } });
  });

  it('never chooses an occupied destination', () => {
    const base = aiAtMarketWithCargo([]);
    const game = { ...base, players: { ...base.players,
      PLAYER: { ...base.players.PLAYER, position: { row: 0, column: 5 } } } };
    expect(chooseAiAction(game)).toEqual({ type: 'MOVE', payload: { row: 1, column: 6 } });
  });

  it('reproduces ties from the seed and can choose either tied move', () => {
    const actions = [1209, 10000].map((seed) => {
      const game = { ...aiAtMarketWithCargo([]), seed };
      const before = structuredClone(game);
      const action = chooseAiAction(game);
      expect(chooseAiAction(structuredClone(game))).toEqual(action);
      expect(game).toEqual(before);
      return action;
    });
    expect(actions[0]).not.toEqual(actions[1]);
  });

  it('ends its turn when every adjacent tile is blocked', () => {
    const base = aiAt({ row: 0, column: 0 });
    const game = { ...base, board: base.board.map((tile) =>
      (tile.position.row === 0 && tile.position.column === 1)
      || (tile.position.row === 1 && tile.position.column === 0)
        ? { ...tile, kind: 'ISLAND' as const } : tile) };
    expect(chooseAiAction(game)).toEqual({ type: 'END_TURN' });
  });

  it('waits when no reachable profitable objective exists', () => {
    const base = aiAtMarketWithCargo([]);
    const game = { ...base, supplies: base.supplies.map((supply) => ({ ...supply, stock: 0 })) };
    expect(chooseAiAction(game)).toEqual({ type: 'END_TURN' });
  });

  it.each(['LOW', 'RISING', 'HIGH', 'FALLING'] as const)('chooses a valid action on every navigable tile at %s', (tide) => {
    const base = aiAtMarketWithCargo(['PEARL']);
    for (const tile of base.board.filter((tile) => tile.kind !== 'ISLAND')) {
      if (tile.position.row === 6 && tile.position.column === 0) continue;
      const game = { ...aiAt(tile.position, base), tide };
      expect(validateAction(game, 'AI', chooseAiAction(game)).ok).toBe(true);
    }
  });
});

describe('scoreAction', () => {
  it('uses the approved immediate sale, load and end-turn weights', () => {
    expect(scoreAction(aiAtMarketWithCargo(['PEARL']), { type: 'SELL', payload: { good: 'PEARL' } })).toBe(107);
    expect(scoreAction(aiAtSupplyPort('SPICE'), { type: 'LOAD' })).toBe(76);
    expect(scoreAction(aiAtMarketWithCargo([]), { type: 'END_TURN' })).toBe(-100);
  });

  it('scores movement by the navigable distance to the best objective', () => {
    expect(scoreAction(aiAtMarketWithCargo([]), { type: 'MOVE', payload: { row: 0, column: 5 } })).toBe(49);
  });

  it('penalizes ending the high-tide turn on a reef by twenty points', () => {
    const game = { ...aiAt({ row: 1, column: 3 }), tide: 'HIGH' as const };
    const action: GameAction = { type: 'MOVE', payload: { row: 2, column: 3 } };
    expect(scoreAction({ ...game, actionPoints: 1 }, action)).toBe(scoreAction(game, action) - 20);
  });

  it('rejects a closed reef instead of scoring it as a route', () => {
    expect(scoreAction(aiAt({ row: 1, column: 3 }), { type: 'MOVE', payload: { row: 2, column: 3 } })).toBe(-Infinity);
  });

  it('adds three for blocking a human route without sacrificing its own progress', () => {
    const base = aiAt({ row: 0, column: 4 });
    const game = { ...base, players: { ...base.players,
      PLAYER: { ...base.players.PLAYER, position: { row: 0, column: 6 } } } };
    expect(scoreAction(game, { type: 'MOVE', payload: { row: 0, column: 5 } })).toBe(52);
    expect(scoreAction(game, { type: 'MOVE', payload: { row: 1, column: 4 } })).toBe(49);
    expect(chooseAiAction(game)).toEqual({ type: 'MOVE', payload: { row: 0, column: 5 } });
  });

  it('does not reward a blocking detour that reduces expected profit', () => {
    const base = aiAt({ row: 1, column: 4 });
    const game = { ...base, players: { ...base.players,
      PLAYER: { ...base.players.PLAYER, position: { row: 0, column: 5 } } } };
    expect(scoreAction(game, { type: 'MOVE', payload: { row: 0, column: 4 } })).toBe(48);
    expect(chooseAiAction(game)).toEqual({ type: 'MOVE', payload: { row: 1, column: 5 } });
  });
});
