import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';
import { gameApi } from '../src/api/game-api';
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

describe('App', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('starts a game and replaces the home screen with game status', async () => {
    const user = userEvent.setup();
    vi.mocked(gameApi.createGame).mockResolvedValue({ game: createGameFixture() });

    render(<App />);

    expect(screen.getByRole('heading', { name: /mercado de mareas/i })).toBeVisible();
    expect(screen.getByText(/dos puntos de acción/i)).toBeVisible();

    await user.type(screen.getByLabelText(/nombre del capitán/i), 'Marina');
    await user.click(screen.getByRole('button', { name: /iniciar partida/i }));

    expect(await screen.findByText(/ronda 1 de 10/i)).toBeVisible();
    expect(screen.queryByLabelText(/nombre del capitán/i)).not.toBeInTheDocument();
  });
});
