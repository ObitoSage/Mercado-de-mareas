import { describe, expect, it, vi } from 'vitest';
import { GameApiError, gameApi } from '../src/api/game-api';
import { createGameFixture } from './fixtures';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('gameApi', () => {
  it('sends actions as JSON with native fetch', async () => {
    const game = createGameFixture();
    const response = json({ game, newEvents: [] });
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response);
    vi.stubGlobal('fetch', fetchMock);
    expect(await gameApi.sendAction('game-1', { type: 'END_TURN' })).toEqual({ game, newEvents: [] });
    expect(fetchMock).toHaveBeenCalledWith('/api/games/game-1/actions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'END_TURN' }),
    });
    expect(response.bodyUsed).toBe(true);
  });

  it('creates a game with the shared request shape', async () => {
    const game = createGameFixture();
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(json({ game }, 201));
    vi.stubGlobal('fetch', fetchMock);
    expect(await gameApi.createGame({ playerName: 'Marina', seed: 1209 })).toEqual({ game });
    expect(fetchMock).toHaveBeenCalledWith('/api/games', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerName: 'Marina', seed: 1209 }),
    });
  });

  it('reads a game with an encoded id and GET', async () => {
    const game = createGameFixture();
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(json({ game }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await gameApi.getGame('game /?')).toEqual({ game });
    expect(fetchMock).toHaveBeenCalledWith('/api/games/game%20%2F%3F', { method: 'GET' });
  });

  it('preserves the authoritative game and rule message on a 409', async () => {
    const game = createGameFixture({ actionPoints: 1 });
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(json({
      game, error: { code: 'NOT_AT_SUPPLY_PORT', message: 'Debes estar en un puerto de abastecimiento.' },
    }, 409)));
    await expect(gameApi.sendAction('game-1', { type: 'LOAD' })).rejects.toMatchObject({
      name: 'GameApiError', status: 409, code: 'NOT_AT_SUPPLY_PORT', message: 'Debes estar en un puerto de abastecimiento.', game,
    });
  });

  it.each([400, 404, 500])('reports a JSON HTTP %i error without automatic retries', async (status) => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(json({ error: { code: 'ERROR', message: 'Error del servidor.' } }, status));
    vi.stubGlobal('fetch', fetchMock);
    await expect(gameApi.getGame('game-1')).rejects.toBeInstanceOf(GameApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reports a network error without retrying or exposing the native exception', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);
    await expect(gameApi.getGame('game-1')).rejects.toMatchObject({
      status: 0, code: 'NETWORK_ERROR', message: 'No se pudo conectar con el servidor.',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reports a non-JSON server response as an invalid response', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response('<html>Error</html>', { status: 502 })));
    await expect(gameApi.getGame('game-1')).rejects.toMatchObject({ status: 502, code: 'INVALID_RESPONSE' });
  });
});
