import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { GameState, Position } from '@mercado/shared';
import GameScreen from '../src/screens/GameScreen';
import { createGameFixture } from './fixtures';

function gameWithPlayer(position: Position, cargo: GameState['players']['PLAYER']['cargo'] = []) {
  const game = createGameFixture();
  return createGameFixture({
    players: {
      ...game.players,
      PLAYER: { ...game.players.PLAYER, position, cargo },
    },
  });
}

describe('GameScreen', () => {
  it('renders 49 cells and sends a selected adjacent move', async () => {
    const user = userEvent.setup();
    const sendAction = vi.fn().mockResolvedValue(undefined);

    render(<GameScreen game={createGameFixture()} sendAction={sendAction} isSubmitting={false} />);

    expect(screen.getAllByRole('gridcell')).toHaveLength(49);
    await user.click(screen.getByRole('button', { name: /casilla 6, 1: mar/i }));
    expect(sendAction).toHaveBeenCalledWith({ type: 'MOVE', payload: { row: 6, column: 1 } });
  });

  it('sends load, sell and end turn actions from their visible controls', async () => {
    const user = userEvent.setup();
    const sendAction = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(
      <GameScreen
        game={gameWithPlayer({ row: 5, column: 1 })}
        sendAction={sendAction}
        isSubmitting={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: /^cargar$/i }));
    expect(sendAction).toHaveBeenLastCalledWith({ type: 'LOAD' });

    rerender(
      <GameScreen
        game={gameWithPlayer({ row: 6, column: 0 }, ['SPICE'])}
        sendAction={sendAction}
        isSubmitting={false}
      />,
    );
    await user.click(screen.getByRole('button', { name: /vender especias/i }));
    expect(sendAction).toHaveBeenLastCalledWith({ type: 'SELL', payload: { good: 'SPICE' } });

    await user.click(screen.getByRole('button', { name: /terminar turno/i }));
    expect(sendAction).toHaveBeenLastCalledWith({ type: 'END_TURN' });
  });

  it('keeps every action visible and disables controls while submitting', () => {
    render(
      <GameScreen game={createGameFixture()} sendAction={vi.fn()} isSubmitting />,
    );

    expect(screen.getByRole('button', { name: /^cargar$/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /vender pescado/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /vender especias/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /vender perlas/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /terminar turno/i })).toBeVisible();
    for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled();
  });

  it('shows server prices, demand and accessible supply stock', () => {
    render(<GameScreen game={createGameFixture()} sendAction={vi.fn()} isSubmitting={false} />);

    expect(screen.getByText(/pescado: 3 monedas/i)).toBeVisible();
    expect(screen.getByText(/especias: 6 monedas/i)).toBeVisible();
    expect(screen.getByText(/perlas: 7 monedas/i)).toBeVisible();
    expect(screen.getByText(/penalización de demanda: 0/i)).toBeVisible();
    expect(screen.getByRole('button', {
      name: /casilla 5, 1: puerto de abastecimiento de pescado, 3 unidades disponibles/i,
    })).toBeVisible();
  });

  it('identifies every kind of tile with visible symbols and a board legend', () => {
    render(<GameScreen game={createGameFixture()} sendAction={vi.fn()} isSubmitting={false} />);

    const legend = screen.getByRole('list', { name: /leyenda del tablero/i });
    expect(within(legend).getByText('Mar navegable')).toBeVisible();
    expect(within(legend).getByText('Isla bloqueada')).toBeVisible();
    expect(within(legend).getByText('Arrecife · solo marea alta')).toBeVisible();
    expect(within(legend).getByText('Abastecimiento')).toBeVisible();
    expect(within(legend).getByText('Mercado')).toBeVisible();

    const board = screen.getByRole('grid', { name: /tablero marítimo/i });
    expect(within(board).getAllByText('Isla')).not.toHaveLength(0);
    expect(within(board).getAllByText('Arrecife')).not.toHaveLength(0);
    expect(within(board).getAllByText('Mercado')).not.toHaveLength(0);
    expect(within(board).getByText('Pescado')).toBeVisible();
    expect(within(board).getByText('Especias')).toBeVisible();
    expect(within(board).getByText('Perlas')).toBeVisible();
  });

  it('announces which ship occupies a board cell', () => {
    render(<GameScreen game={createGameFixture()} sendAction={vi.fn()} isSubmitting={false} />);

    expect(screen.getByRole('button', {
      name: /casilla 6, 0: mercado, contiene tu barco/i,
    })).toBeVisible();
    expect(screen.getByRole('button', {
      name: /casilla 0, 6: mercado, contiene el barco rival/i,
    })).toBeVisible();
  });

  it('explains whether reefs are open for the current tide', () => {
    const sendAction = vi.fn();
    const { rerender } = render(
      <GameScreen game={createGameFixture({ tide: 'LOW' })} sendAction={sendAction} isSubmitting={false} />,
    );

    expect(screen.getAllByRole('button', { name: /arrecife, bloqueado hasta la marea alta/i })).not.toHaveLength(0);

    rerender(<GameScreen game={createGameFixture({ tide: 'HIGH' })} sendAction={sendAction} isSubmitting={false} />);
    expect(screen.getAllByRole('button', { name: /arrecife, navegable con marea alta/i })).not.toHaveLength(0);
    expect(screen.getAllByText('Abierto')).not.toHaveLength(0);
  });

  it('disables every control outside the human turn', () => {
    render(
      <GameScreen
        game={createGameFixture({ phase: 'RESOLVING_AI', activeActor: 'AI' })}
        sendAction={vi.fn()}
        isSubmitting={false}
      />,
    );

    for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled();
  });
});
