import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameAction, GameResponse, GameState } from '@mercado/shared';
import { GameApiError, gameApi } from '../api/game-api';

const STORAGE_KEY = 'mercado-de-mareas.game-id';

export type UseGameResult = Readonly<{
  game: GameState | null;
  status: 'idle' | 'loading' | 'playing' | 'finished';
  error: string | null;
  canRetry: boolean;
  isSubmitting: boolean;
  startGame(playerName: string): Promise<void>;
  sendAction(action: GameAction): Promise<void>;
  retry(): Promise<void>;
  restart(): void;
}>;

export function useGame(): UseGameResult {
  const [initialId] = useState(() => sessionStorage.getItem(STORAGE_KEY));
  const [game, setGame] = useState<GameState | null>(null);
  const [status, setStatus] = useState<UseGameResult['status']>(initialId ? 'loading' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(Boolean(initialId));
  const currentGame = useRef<GameState | null>(null);
  const currentId = useRef(initialId);
  const busy = useRef(Boolean(initialId));
  const version = useRef(0);

  const adoptGame = useCallback((next: GameState) => {
    currentGame.current = next;
    currentId.current = next.id;
    setGame(next);
    setStatus(next.phase === 'FINISHED' ? 'finished' : 'playing');
    sessionStorage.setItem(STORAGE_KEY, next.id);
  }, []);

  const resolveRequest = useCallback(async (request: () => Promise<GameResponse>, requestVersion: number) => {
    try {
      const response = await request();
      if (version.current !== requestVersion) return;
      adoptGame(response.game);
      setError(null);
      setCanRetry(false);
    } catch (failure) {
      if (version.current !== requestVersion) return;
      if (failure instanceof GameApiError && failure.status === 409 && failure.game) {
        adoptGame(failure.game);
      } else {
        setStatus(currentGame.current ? currentGame.current.phase === 'FINISHED' ? 'finished' : 'playing' : 'idle');
      }
      setError(failure instanceof GameApiError ? failure.message : 'No se pudo completar la solicitud.');
      setCanRetry(
        failure instanceof GameApiError
        && (failure.status === 0 || failure.status >= 500 || failure.code === 'INVALID_RESPONSE')
        && currentId.current !== null,
      );
    } finally {
      if (version.current === requestVersion) {
        busy.current = false;
        setIsSubmitting(false);
      }
    }
  }, [adoptGame]);

  const beginRequest = useCallback((request: () => Promise<GameResponse>, loading: boolean): Promise<void> => {
    // A ref closes the gap before React renders the disabled controls.
    if (busy.current) return Promise.resolve();
    busy.current = true;
    const requestVersion = ++version.current;
    setIsSubmitting(true);
    setError(null);
    setCanRetry(false);
    if (loading) setStatus('loading');
    return resolveRequest(request, requestVersion);
  }, [resolveRequest]);

  useEffect(() => {
    if (initialId) {
      busy.current = true;
      const requestVersion = ++version.current;
      void resolveRequest(() => gameApi.getGame(initialId), requestVersion);
    }
    return () => {
      // Ignore responses from an unmounted or superseded restoration, including
      // the first setup/cleanup cycle performed by React StrictMode.
      version.current += 1;
      busy.current = false;
    };
  }, [initialId, resolveRequest]);

  const startGame = useCallback((playerName: string): Promise<void> =>
    beginRequest(() => gameApi.createGame({ playerName }), true), [beginRequest]);

  const sendAction = useCallback((action: GameAction): Promise<void> => {
    const official = currentGame.current;
    if (!official || official.phase !== 'PLAYER_TURN') return Promise.resolve();
    return beginRequest(() => gameApi.sendAction(official.id, action), false);
  }, [beginRequest]);

  const retry = useCallback((): Promise<void> => {
    const id = currentId.current;
    if (!id) return Promise.resolve();
    return beginRequest(() => gameApi.getGame(id), currentGame.current === null);
  }, [beginRequest]);

  const restart = useCallback(() => {
    version.current += 1;
    busy.current = false;
    currentGame.current = null;
    currentId.current = null;
    sessionStorage.removeItem(STORAGE_KEY);
    setGame(null);
    setStatus('idle');
    setError(null);
    setCanRetry(false);
    setIsSubmitting(false);
  }, []);

  return { game, status, error, canRetry, isSubmitting, startGame, sendAction, retry, restart };
}
