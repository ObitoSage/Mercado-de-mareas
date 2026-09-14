import { isGameAction } from '@mercado/shared';
import type { ApiError, CreateGameRequest, GameAction } from '@mercado/shared';

type ParseResult<T> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{ ok: false; error: ApiError }>;

export function parseCreateGameBody(body: unknown): ParseResult<CreateGameRequest> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, error: { code: 'INVALID_REQUEST', message: 'La solicitud debe ser un objeto JSON.' } };
  }
  if ('playerName' in body && typeof body.playerName !== 'string') {
    return { ok: false, error: { code: 'INVALID_REQUEST', message: 'El nombre debe ser texto.' } };
  }
  if ('seed' in body && (typeof body.seed !== 'number' || !Number.isInteger(body.seed))) {
    return { ok: false, error: { code: 'INVALID_REQUEST', message: 'La semilla debe ser un número entero.' } };
  }
  return {
    ok: true,
    value: {
      ...('playerName' in body && typeof body.playerName === 'string'
        ? { playerName: body.playerName.trim().slice(0, 30) } : {}),
      ...('seed' in body && typeof body.seed === 'number' ? { seed: body.seed } : {}),
    },
  };
}

export function parseActionBody(body: unknown): ParseResult<GameAction> {
  return isGameAction(body)
    ? { ok: true, value: body }
    : { ok: false, error: { code: 'INVALID_ACTION', message: 'La acción o su carga útil no son válidas.' } };
}
