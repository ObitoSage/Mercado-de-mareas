import { describe, expect, it } from 'vitest';
import request from 'supertest';
import type { ActionResponse, ErrorResponse, GameResponse } from '@mercado/shared';
import { createApp } from '../src/app.js';
import { createGameStore } from '../src/game-store.js';
import type { GameStore } from '../src/game-store.js';

describe('game API', () => {
  it('projects current sale prices without mutating the stored base prices', async () => {
    const store = createGameStore();
    const stored = store.create({ playerName: 'Marina', seed: 1209 });
    expect(stored.tide).toBe('RISING');
    expect(stored.prices).toEqual({ FISH: 3, SPICE: 5, PEARL: 7 });

    const response = await request(createApp({ store }))
      .get(`/api/games/${stored.id}`)
      .expect(200);

    expect(response.body).toMatchObject({
      game: { prices: { FISH: 3, SPICE: 6, PEARL: 7 } },
    });
    expect(store.get(stored.id)?.prices).toEqual({ FISH: 3, SPICE: 5, PEARL: 7 });
  });

  it('creates, reads and advances a game through JSON', async () => {
    const store = createGameStore();
    const app = createApp({ store });
    const created = await request(app).post('/api/games')
      .send({ playerName: 'Marina', seed: 1209 }).expect(201).expect('Content-Type', /json/);
    const { game } = created.body as GameResponse;
    expect(game.board).toHaveLength(49);
    expect(game.players.PLAYER.name).toBe('Marina');
    expect(game.seed).toBe(1209);
    expect(game).toEqual({
      ...store.get(game.id),
      prices: { FISH: 3, SPICE: 6, PEARL: 7 },
    });
    const read = await request(app).get(`/api/games/${game.id}`).expect(200).expect('Content-Type', /json/);
    expect(read.body).toEqual({ game });

    const moved = await request(app).post(`/api/games/${game.id}/actions`)
      .send({ type: 'MOVE', payload: { row: 6, column: 1 } }).expect(200).expect('Content-Type', /json/);
    const first = moved.body as ActionResponse;
    expect(first.game).toMatchObject({ round: 1, actionPoints: 1, phase: 'PLAYER_TURN' });
    expect(first.game.players.PLAYER.position).toEqual({ row: 6, column: 1 });
    expect(first.game.players.AI).toEqual(game.players.AI);
    expect(first.newEvents).toEqual([expect.objectContaining({ type: 'MOVED', actor: 'PLAYER' })]);
    expect(store.get(game.id)).toEqual({
      ...first.game,
      prices: { FISH: 3, SPICE: 5, PEARL: 7 },
    });

    const second = await request(app).post(`/api/games/${game.id}/actions`)
      .send({ type: 'MOVE', payload: { row: 5, column: 1 } }).expect(200);
    const resolved = second.body as ActionResponse;
    expect(resolved.game).toMatchObject({ round: 2, tide: 'HIGH', actionPoints: 2, activeActor: 'PLAYER' });
    expect(resolved.game.players.AI.position).toEqual({ row: 1, column: 5 });
    expect(resolved.newEvents.map((event) => event.type)).toEqual(['MOVED', 'MOVED', 'MOVED', 'TIDE_CHANGED', 'RESTOCKED']);
    const latest = await request(app).get(`/api/games/${game.id}`).expect(200);
    expect(latest.body).toEqual({ game: resolved.game });
  });

  it('accepts omitted options and normalizes a long name', async () => {
    const app = createApp();
    const defaults = await request(app).post('/api/games').send({}).expect(201);
    const { game } = defaults.body as GameResponse;
    expect(game.players.PLAYER.name).toBe('Capitana');
    expect(Number.isInteger(game.seed)).toBe(true);
    const named = await request(app).post('/api/games')
      .send({ playerName: `  ${'M'.repeat(40)}  `, seed: 0 }).expect(201);
    expect(named.body).toMatchObject({ game: { seed: 0, players: { PLAYER: { name: 'M'.repeat(30) } } } });
  });

  it('uses a separate store for each default app', async () => {
    const created = await request(createApp()).post('/api/games').send({}).expect(201);
    const { game } = created.body as GameResponse;
    await request(createApp()).get(`/api/games/${game.id}`).expect(404);
  });

  it.each([
    { playerName: 123 }, { playerName: null }, { playerName: [] },
    { seed: '1209' }, { seed: 1.5 }, { seed: null }, { seed: true },
    [], null, 'Marina', 42,
  ])('rejects invalid create input %j as JSON 400', async (body) => {
    const response = await request(createApp()).post('/api/games')
      .set('Content-Type', 'application/json').send(JSON.stringify(body)).expect(400).expect('Content-Type', /json/);
    const { error } = response.body as ErrorResponse;
    expect(typeof error.code).toBe('string');
    expect(typeof error.message).toBe('string');
    expect(response.body).not.toHaveProperty('game');
  });

  it('rejects a missing request body', async () => {
    await request(createApp()).post('/api/games').expect(400).expect('Content-Type', /json/);
  });

  it('returns JSON 400 for malformed JSON without exposing parser internals', async () => {
    const response = await request(createApp()).post('/api/games')
      .set('Content-Type', 'application/json').send('{"playerName":').expect(400).expect('Content-Type', /json/);
    expect(response.body).toEqual({ error: { code: 'INVALID_JSON', message: 'El cuerpo debe contener JSON válido.' } });
  });

  it.each(['large body', 'unsupported charset', 'unsupported encoding'])('rejects %s as JSON 400', async (scenario) => {
    const app = createApp();
    const call = request(app).post('/api/games').set('Content-Type', 'application/json');
    if (scenario === 'unsupported charset') call.set('Content-Type', 'application/json; charset=iso-8859-1');
    if (scenario === 'unsupported encoding') call.set('Content-Encoding', 'unknown');
    const response = await call.send(scenario === 'large body' ? { playerName: 'M'.repeat(110_000) } : {})
      .expect(400).expect('Content-Type', /json/);
    expect(response.body).toEqual({ error: { code: 'INVALID_REQUEST', message: 'El tamaño o la codificación de la solicitud no son válidos.' } });
  });

  it.each([
    {}, { type: 'DELETE_GAME' }, { type: 'MOVE' },
    { type: 'MOVE', payload: { row: 6.5, column: 1 } },
    { type: 'MOVE', payload: { row: '6', column: 1 } },
    { type: 'SELL', payload: { good: 'GOLD' } },
    { type: 'LOAD', payload: {} }, { type: 'END_TURN', actor: 'AI' },
  ])('rejects malformed action %j without changing the official state', async (action) => {
    const store = createGameStore();
    const game = store.create({ seed: 1209 });
    const before = structuredClone(game);
    const response = await request(createApp({ store })).post(`/api/games/${game.id}/actions`)
      .send(action).expect(400).expect('Content-Type', /json/);
    expect(response.body).toMatchObject({ error: { code: 'INVALID_ACTION' } });
    expect(store.get(game.id)).toEqual(before);
  });

  it('returns JSON 404 for an unknown game on reads and actions', async () => {
    const app = createApp();
    const read = await request(app).get('/api/games/missing').expect(404).expect('Content-Type', /json/);
    const acted = await request(app).post('/api/games/missing/actions').send({ type: 'END_TURN' })
      .expect(404).expect('Content-Type', /json/);
    expect(read.body).toMatchObject({ error: { code: 'GAME_NOT_FOUND' } });
    expect(acted.body).toEqual(read.body);
  });

  it('returns the unchanged authoritative game with a rule rejection', async () => {
    const store = createGameStore();
    const game = store.create({ seed: 1209 });
    const before = structuredClone(game);
    const app = createApp({ store });
    const response = await request(app).post(`/api/games/${game.id}/actions`)
      .send({ type: 'LOAD' }).expect(409).expect('Content-Type', /json/);
    const presented = { ...before, prices: { FISH: 3, SPICE: 6, PEARL: 7 } };
    expect(response.body).toMatchObject({ error: { code: 'NOT_AT_SUPPLY_PORT' }, game: presented });
    const read = await request(app).get(`/api/games/${game.id}`).expect(200);
    expect(read.body).toEqual({ game: presented });
    expect(game).toEqual(before);
  });

  it('keeps the final state readable and rejects subsequent actions', async () => {
    const store = createGameStore();
    const initial = store.create({ seed: 1209 });
    store.save({ ...initial, round: 10 });
    const app = createApp({ store });
    const response = await request(app).post(`/api/games/${initial.id}/actions`)
      .send({ type: 'END_TURN' }).expect(200);
    const { game, newEvents } = response.body as ActionResponse;
    expect(game.phase).toBe('FINISHED');
    expect(newEvents.at(-1)?.type).toBe('GAME_FINISHED');
    const rejected = await request(app).post(`/api/games/${game.id}/actions`).send({ type: 'END_TURN' }).expect(409);
    expect(rejected.body).toMatchObject({ error: { code: 'GAME_FINISHED' }, game });
    const read = await request(app).get(`/api/games/${game.id}`).expect(200);
    expect(read.body).toEqual({ game });
  });

  it('reports health and the local or configured commit', async () => {
    const response = await request(createApp()).get('/api/health').expect(200).expect('Content-Type', /json/);
    expect(response.body).toEqual({ status: 'ok', commit: process.env.RENDER_GIT_COMMIT ?? 'local' });
  });

  it('reports the Render commit configured for the running service', async () => {
    const previousCommit = process.env.RENDER_GIT_COMMIT;
    try {
      process.env.RENDER_GIT_COMMIT = 'abc123';
      const response = await request(createApp()).get('/api/health').expect(200).expect('Content-Type', /json/);
      expect(response.body).toEqual({ status: 'ok', commit: 'abc123' });
    } finally {
      if (previousCommit === undefined) delete process.env.RENDER_GIT_COMMIT;
      else process.env.RENDER_GIT_COMMIT = previousCommit;
    }
  });

  it('returns JSON 404 for an unknown API route', async () => {
    const response = await request(createApp()).get('/api/missing').expect(404).expect('Content-Type', /json/);
    expect(response.body).toMatchObject({ error: { code: 'NOT_FOUND' } });
  });

  it('rejects a malformed URL parameter as JSON 400', async () => {
    await request(createApp()).get('/api/games/%E0%A4%A').expect(400).expect('Content-Type', /json/);
  });

  it.each(['create', 'get', 'save'] as const)('hides unexpected %s failures behind JSON 500', async (method) => {
    const store = createGameStore();
    const game = store.create({ seed: 1209 });
    const broken: GameStore = { ...store, [method]: () => { throw new Error('private database details'); } };
    const app = createApp({ store: broken });
    const response = await (method === 'create'
      ? request(app).post('/api/games').send({})
      : method === 'get' ? request(app).get(`/api/games/${game.id}`)
        : request(app).post(`/api/games/${game.id}/actions`).send({ type: 'END_TURN' }))
      .expect(500).expect('Content-Type', /json/);
    expect(response.body).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error interno.' } });
    expect(response.text).not.toContain('private database details');
  });
});
