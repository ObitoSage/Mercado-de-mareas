import { Router } from 'express';
import type { RequestHandler } from 'express';
import type { ActionResponse, ErrorResponse, GameResponse } from '@mercado/shared';
import { dispatchPlayerAction } from '../domain/game-engine.js';
import type { GameStore } from '../game-store.js';
import { parseActionBody, parseCreateGameBody } from './parse-action.js';

const GAME_NOT_FOUND: ErrorResponse = {
  error: { code: 'GAME_NOT_FOUND', message: 'La partida no existe.' },
};

export function createGameRoutes(store: GameStore): Router {
  const router = Router();
  const createGameHandler: RequestHandler<Record<string, string>, GameResponse | ErrorResponse, unknown> = (req, res) => {
    const parsed = parseCreateGameBody(req.body);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    res.status(201).json({ game: store.create(parsed.value) });
  };

  const getGameHandler: RequestHandler<{ gameId: string }, GameResponse | ErrorResponse> = (req, res) => {
    const game = store.get(req.params.gameId);
    if (!game) {
      res.status(404).json(GAME_NOT_FOUND);
      return;
    }
    res.json({ game });
  };

  const actionHandler: RequestHandler<{ gameId: string }, ActionResponse | ErrorResponse, unknown> = (req, res) => {
    const parsed = parseActionBody(req.body);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const game = store.get(req.params.gameId);
    if (!game) {
      res.status(404).json(GAME_NOT_FOUND);
      return;
    }
    const result = dispatchPlayerAction(game, parsed.value);
    if (!result.ok) {
      res.status(409).json({ error: result.error, game });
      return;
    }
    store.save(result.game);
    res.json({ game: result.game, newEvents: result.events });
  };

  const healthHandler: RequestHandler = (_req, res) => {
    res.json({ status: 'ok', commit: process.env.RENDER_GIT_COMMIT ?? 'local' });
  };

  router.post('/games', createGameHandler);
  router.get('/games/:gameId', getGameHandler);
  router.post('/games/:gameId/actions', actionHandler);
  router.get('/health', healthHandler);
  return router;
}
