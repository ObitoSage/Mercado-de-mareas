import type { ActionResponse, CreateGameRequest, ErrorResponse, GameAction, GameResponse, GameState } from '@mercado/shared';

export class GameApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly game: GameState | undefined;

  constructor(status: number, code: string, message: string, game?: GameState) {
    super(message);
    this.name = 'GameApiError';
    this.status = status;
    this.code = code;
    this.game = game;
  }
}

async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    throw new GameApiError(0, 'NETWORK_ERROR', 'No se pudo conectar con el servidor.');
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new GameApiError(response.status, 'INVALID_RESPONSE', 'El servidor devolvió una respuesta inválida.');
  }
  if (!response.ok) {
    const failure = body as Partial<ErrorResponse> | null;
    throw new GameApiError(response.status, failure?.error?.code ?? 'HTTP_ERROR',
      failure?.error?.message ?? 'No se pudo completar la solicitud.', failure?.game);
  }
  return body as T;
}

function post(body: unknown): RequestInit {
  return { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

export const gameApi = {
  createGame: (input: CreateGameRequest): Promise<GameResponse> => requestJson('/api/games', post(input)),
  getGame: (id: string): Promise<GameResponse> => requestJson(`/api/games/${encodeURIComponent(id)}`, { method: 'GET' }),
  sendAction: (id: string, action: GameAction): Promise<ActionResponse> => requestJson(`/api/games/${encodeURIComponent(id)}/actions`, post(action)),
};
