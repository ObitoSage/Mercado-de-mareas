import express from 'express';
import type { ErrorRequestHandler, Express, RequestHandler } from 'express';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGameStore } from './game-store.js';
import type { GameStore } from './game-store.js';
import { createGameRoutes } from './http/game-routes.js';

export function createApp(options: { store?: GameStore; frontendDist?: string } = {}): Express {
  const app = express();
  const notFound: RequestHandler = (_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'La ruta no existe.' } });
  };
  app.use(express.json());
  app.use('/api', createGameRoutes(options.store ?? createGameStore()), notFound);

  const frontendDist = resolve(options.frontendDist ?? fileURLToPath(new URL('../../frontend/dist/', import.meta.url)));
  if (existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get(/.*/, (_req, res) => {
      res.sendFile('index.html', { root: frontendDist });
    });
  }
  app.use(notFound);

  const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, next) => {
    if (res.headersSent) {
      next(error);
      return;
    }
    if (typeof error === 'object' && error !== null && 'type' in error && error.type === 'entity.parse.failed') {
      res.status(400).json({ error: { code: 'INVALID_JSON', message: 'El cuerpo debe contener JSON válido.' } });
      return;
    }
    if (typeof error === 'object' && error !== null && 'type' in error
      && (error.type === 'entity.too.large' || error.type === 'charset.unsupported' || error.type === 'encoding.unsupported')) {
      res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'El tamaño o la codificación de la solicitud no son válidos.' } });
      return;
    }
    if (error instanceof URIError) {
      res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'El parámetro de la URL no es válido.' } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error interno.' } });
  };
  app.use(errorHandler);
  return app;
}
