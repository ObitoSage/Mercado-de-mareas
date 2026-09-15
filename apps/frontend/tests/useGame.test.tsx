import { StrictMode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionResponse, GameResponse } from '@mercado/shared';
import { GameApiError, gameApi } from '../src/api/game-api';
import { useGame } from '../src/hooks/useGame';
import { createGameFixture } from './fixtures';

vi.mock('../src/api/game-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/api/game-api')>();
  return { ...actual, gameApi: { createGame: vi.fn(), getGame: vi.fn(), sendAction: vi.fn() } };
});

const KEY = 'mercado-de-mareas.game-id';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

beforeEach(() => {
  sessionStorage.clear();
  vi.resetAllMocks();
});

async function started() {
  vi.mocked(gameApi.createGame).mockResolvedValue({ game: createGameFixture() });
  const hook = renderHook(() => useGame());
  await act(async () => { await hook.result.current.startGame('Marina'); });
  return hook;
}

describe('useGame', () => {
  it('starts idle without requesting a game', () => {
    const { result } = renderHook(() => useGame());
    expect(result.current).toMatchObject({ game: null, status: 'idle', error: null, isSubmitting: false });
    expect(gameApi.getGame).not.toHaveBeenCalled();
  });

  it('moves from loading to playing and persists only the id', async () => {
    const response = deferred<GameResponse>();
    vi.mocked(gameApi.createGame).mockReturnValue(response.promise);
    const { result } = renderHook(() => useGame());
    let pending!: Promise<void>;
    act(() => { pending = result.current.startGame('Marina'); });
    expect(result.current).toMatchObject({ game: null, status: 'loading', isSubmitting: true });
    expect(gameApi.createGame).toHaveBeenCalledWith({ playerName: 'Marina' });
    const game = createGameFixture();
    await act(async () => { response.resolve({ game }); await pending; });
    expect(result.current).toMatchObject({ game, status: 'playing', isSubmitting: false, error: null });
    expect(sessionStorage.length).toBe(1);
    expect(sessionStorage.getItem(KEY)).toBe(game.id);
  });

  it('blocks a second create request while the first is pending', async () => {
    const response = deferred<GameResponse>();
    vi.mocked(gameApi.createGame).mockReturnValue(response.promise);
    const { result } = renderHook(() => useGame());
    let pending!: Promise<void>;
    act(() => { pending = result.current.startGame('Marina'); void result.current.startGame('Otra'); });
    expect(gameApi.createGame).toHaveBeenCalledTimes(1);
    await act(async () => { response.resolve({ game: createGameFixture() }); await pending; });
  });

  it('restores a stored game through GET', async () => {
    const game = createGameFixture({ round: 4 });
    sessionStorage.setItem(KEY, game.id);
    vi.mocked(gameApi.getGame).mockResolvedValue({ game });
    const { result } = renderHook(() => useGame());
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.game).toEqual(game));
    expect(result.current.status).toBe('playing');
    expect(gameApi.getGame).toHaveBeenCalledWith(game.id);
    expect(gameApi.createGame).not.toHaveBeenCalled();
  });

  it('restores correctly when StrictMode repeats the mount effect', async () => {
    const game = createGameFixture();
    sessionStorage.setItem(KEY, game.id);
    vi.mocked(gameApi.getGame).mockResolvedValue({ game });
    const { result } = renderHook(() => useGame(), { wrapper: StrictMode });
    await waitFor(() => expect(result.current).toMatchObject({ game, status: 'playing', isSubmitting: false }));
  });

  it('blocks duplicate actions immediately and waits for official state', async () => {
    const { result } = await started();
    const response = deferred<ActionResponse>();
    vi.mocked(gameApi.sendAction).mockReturnValue(response.promise);
    const before = result.current.game;
    let pending!: Promise<void>;
    act(() => { pending = result.current.sendAction({ type: 'END_TURN' }); void result.current.sendAction({ type: 'LOAD' }); });
    expect(gameApi.sendAction).toHaveBeenCalledTimes(1);
    expect(result.current.game).toEqual(before);
    expect(result.current.isSubmitting).toBe(true);
    const game = createGameFixture({ round: 2, tide: 'HIGH' });
    await act(async () => { response.resolve({ game, newEvents: [] }); await pending; });
    expect(result.current).toMatchObject({ game, status: 'playing', isSubmitting: false });
  });

  it('adopts the authoritative state attached to a 409 and displays its message', async () => {
    const { result } = await started();
    const game = createGameFixture({ actionPoints: 1 });
    vi.mocked(gameApi.sendAction).mockRejectedValue(new GameApiError(409, 'NOT_AT_SUPPLY_PORT', 'Carga inválida.', game));
    await act(async () => { await result.current.sendAction({ type: 'LOAD' }); });
    expect(result.current).toMatchObject({ game, status: 'playing', error: 'Carga inválida.', canRetry: false, isSubmitting: false });
  });

  it.each([0, 500])('preserves the last state on error %i and retries with GET only', async (status) => {
    const { result } = await started();
    const before = result.current.game;
    vi.mocked(gameApi.sendAction).mockRejectedValue(new GameApiError(status, 'ERROR', 'No se pudo completar.'));
    await act(async () => { await result.current.sendAction({ type: 'END_TURN' }); });
    expect(result.current).toMatchObject({ game: before, error: 'No se pudo completar.', canRetry: true, status: 'playing', isSubmitting: false });
    expect(gameApi.getGame).not.toHaveBeenCalled();
    const game = createGameFixture({ round: 2 });
    vi.mocked(gameApi.getGame).mockResolvedValue({ game });
    await act(async () => { await result.current.retry(); });
    expect(gameApi.getGame).toHaveBeenCalledWith('game-1');
    expect(gameApi.sendAction).toHaveBeenCalledTimes(1);
    expect(result.current).toMatchObject({ game, error: null, isSubmitting: false });
  });

  it('does not retry a missing game after the server loses in-memory state', async () => {
    const { result } = await started();
    vi.mocked(gameApi.sendAction).mockRejectedValue(
      new GameApiError(404, 'GAME_NOT_FOUND', 'La partida no existe.'),
    );

    await act(async () => { await result.current.sendAction({ type: 'END_TURN' }); });

    expect(result.current).toMatchObject({ error: 'La partida no existe.', canRetry: false });
  });

  it('allows recovery after a failed initial GET', async () => {
    sessionStorage.setItem(KEY, 'game-1');
    vi.mocked(gameApi.getGame).mockRejectedValueOnce(new GameApiError(0, 'NETWORK_ERROR', 'Sin conexión.'));
    const { result } = renderHook(() => useGame());
    await waitFor(() => expect(result.current).toMatchObject({ status: 'idle', error: 'Sin conexión.', isSubmitting: false }));
    vi.mocked(gameApi.getGame).mockResolvedValue({ game: createGameFixture() });
    await act(async () => { await result.current.retry(); });
    expect(result.current.status).toBe('playing');
  });

  it('returns to idle after a failed creation and allows another attempt', async () => {
    vi.mocked(gameApi.createGame).mockRejectedValueOnce(new GameApiError(0, 'NETWORK_ERROR', 'Sin conexión.'));
    const { result } = renderHook(() => useGame());
    await act(async () => { await result.current.startGame('Marina'); });
    expect(result.current).toMatchObject({ game: null, status: 'idle', error: 'Sin conexión.', canRetry: false, isSubmitting: false });
    expect(sessionStorage.getItem(KEY)).toBeNull();
    vi.mocked(gameApi.createGame).mockResolvedValue({ game: createGameFixture() });
    await act(async () => { await result.current.startGame('Marina'); });
    expect(result.current.status).toBe('playing');
  });

  it('shows finished when the official response ends the game', async () => {
    const { result } = await started();
    const game = createGameFixture({ round: 10, phase: 'FINISHED', actionPoints: 0, result: { kind: 'DRAW', playerCoins: 0, aiCoins: 0 } });
    vi.mocked(gameApi.sendAction).mockResolvedValue({ game, newEvents: [] });
    await act(async () => { await result.current.sendAction({ type: 'END_TURN' }); });
    expect(result.current).toMatchObject({ game, status: 'finished' });
    await act(async () => { await result.current.sendAction({ type: 'END_TURN' }); });
    expect(gameApi.sendAction).toHaveBeenCalledTimes(1);
  });

  it('restarts to idle and removes only its stored id', async () => {
    const { result } = await started();
    sessionStorage.setItem('unrelated', 'keep');
    act(() => { result.current.restart(); });
    expect(result.current).toMatchObject({ game: null, status: 'idle', error: null, isSubmitting: false });
    expect(sessionStorage.getItem(KEY)).toBeNull();
    expect(sessionStorage.getItem('unrelated')).toBe('keep');
  });

  it('ignores a late response after restarting and creating a new game', async () => {
    const { result } = await started();
    const old = deferred<ActionResponse>();
    vi.mocked(gameApi.sendAction).mockReturnValue(old.promise);
    let pending!: Promise<void>;
    act(() => { pending = result.current.sendAction({ type: 'END_TURN' }); result.current.restart(); });
    const game = createGameFixture({ id: 'new-game' });
    vi.mocked(gameApi.createGame).mockResolvedValue({ game });
    await act(async () => { await result.current.startGame('Nueva'); });
    await act(async () => { old.resolve({ game: createGameFixture({ round: 2 }), newEvents: [] }); await pending; });
    expect(result.current.game).toEqual(game);
    expect(sessionStorage.getItem(KEY)).toBe('new-game');
  });
});
