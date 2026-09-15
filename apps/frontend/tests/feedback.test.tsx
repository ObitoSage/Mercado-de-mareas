import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { GameResult } from '@mercado/shared';
import App from '../src/App';
import { GameApiError, gameApi } from '../src/api/game-api';
import ResultScreen from '../src/screens/ResultScreen';
import { createGameFixture } from './fixtures';

vi.mock('../src/api/game-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/api/game-api')>();
  return {
    ...actual,
    gameApi: {
      createGame: vi.fn(),
      getGame: vi.fn(),
      sendAction: vi.fn(),
    },
  };
});

beforeEach(() => {
  sessionStorage.clear();
  vi.resetAllMocks();
});

async function startPreparedGame() {
  vi.mocked(gameApi.createGame).mockResolvedValue({ game: createGameFixture() });
  await userEvent.click(screen.getByRole('button', { name: /iniciar partida/i }));
  await screen.findByText(/ronda 1 de 10/i);
}

describe('game feedback', () => {
  it('announces a backend rule error without removing the board', async () => {
    const game = createGameFixture();
    vi.mocked(gameApi.sendAction).mockRejectedValue(
      new GameApiError(409, 'NOT_AT_SUPPLY_PORT', 'Debes estar en un puerto de abastecimiento.', game),
    );
    render(<App />);
    await startPreparedGame();

    await userEvent.click(screen.getByRole('button', { name: /^cargar$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/puerto de abastecimiento/i);
    expect(screen.getByRole('grid', { name: /tablero marítimo/i })).toBeVisible();
    expect(screen.queryByRole('button', { name: /reintentar/i })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /cerrar mensaje/i }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('grid', { name: /tablero marítimo/i })).toBeVisible();
  });

  it('retries a network error while preserving the official board', async () => {
    vi.mocked(gameApi.sendAction).mockRejectedValue(
      new GameApiError(0, 'NETWORK_ERROR', 'No se pudo conectar con el servidor.'),
    );
    render(<App />);
    await startPreparedGame();

    await userEvent.click(screen.getByRole('button', { name: /terminar turno/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/conectar con el servidor/i);
    expect(screen.getByRole('grid', { name: /tablero marítimo/i })).toBeVisible();
    vi.mocked(gameApi.getGame).mockResolvedValue({ game: createGameFixture({ round: 2 }) });
    await userEvent.click(screen.getByRole('button', { name: /reintentar/i }));
    expect(await screen.findByText(/ronda 2 de 10/i)).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('offers GET recovery for a server error during a game', async () => {
    vi.mocked(gameApi.sendAction).mockRejectedValue(
      new GameApiError(500, 'INTERNAL_ERROR', 'Ocurrió un error interno.'),
    );
    render(<App />);
    await startPreparedGame();

    await userEvent.click(screen.getByRole('button', { name: /terminar turno/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/error interno/i);
    vi.mocked(gameApi.getGame).mockResolvedValue({ game: createGameFixture({ round: 2 }) });
    await userEvent.click(screen.getByRole('button', { name: /reintentar/i }));
    expect(await screen.findByText(/ronda 2 de 10/i)).toBeVisible();
  });

  it('does not show an ineffective retry after initial creation fails', async () => {
    vi.mocked(gameApi.createGame).mockRejectedValue(
      new GameApiError(0, 'NETWORK_ERROR', 'No se pudo conectar con el servidor.'),
    );
    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: /iniciar partida/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/conectar con el servidor/i);
    expect(screen.queryByRole('button', { name: /reintentar/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /iniciar partida/i })).toBeEnabled();
  });
});

describe('ResultScreen', () => {
  it.each([
    ['PLAYER_WIN', 'Victoria'],
    ['AI_WIN', 'Derrota'],
    ['DRAW', 'Empate'],
  ] as const)('renders an unambiguous %s result', async (kind, heading) => {
    const restart = vi.fn();
    const result: GameResult = { kind, playerCoins: 12, aiCoins: 9 };
    const eventLog = Array.from({ length: 12 }, (_, index) => ({
      type: 'GAME_STARTED' as const,
      round: index + 1,
      message: `Evento final ${index + 1}`,
    }));
    const game = createGameFixture({ round: 10, phase: 'FINISHED', result, eventLog });
    render(<ResultScreen game={game} restart={restart} />);

    expect(screen.getByRole('heading', { name: heading })).toBeVisible();
    expect(screen.getByText(/riqueza de marina: 12/i)).toBeVisible();
    expect(screen.getByText(/riqueza del rival: 9/i)).toBeVisible();
    expect(screen.getByText(/resultado final/i)).toBeVisible();
    expect(screen.getAllByRole('listitem')).toHaveLength(10);
    await userEvent.click(screen.getByRole('button', { name: /jugar otra vez/i }));
    expect(restart).toHaveBeenCalledOnce();
  });
});
