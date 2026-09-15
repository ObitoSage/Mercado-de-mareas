import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('frontend static serving', () => {
  let directory: string;
  const html = '<!doctype html><html><body><main>Mercado de Mareas</main></body></html>';
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'mercado-static-'));
    await writeFile(join(directory, 'index.html'), html);
    await mkdir(join(directory, 'assets'));
    await writeFile(join(directory, 'assets', 'app.js'), 'console.log("frontend");');
    await mkdir(join(directory, 'api'));
    await writeFile(join(directory, 'api', 'missing'), 'Not an API response');
  });
  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('serves index.html at the root', async () => {
    const response = await request(createApp({ frontendDist: directory })).get('/').expect(200).expect('Content-Type', /html/);
    expect(response.text).toBe(html);
  });

  it('serves a frontend asset', async () => {
    const response = await request(createApp({ frontendDist: directory })).get('/assets/app.js').expect(200).expect('Content-Type', /javascript/);
    expect(response.text).toBe('console.log("frontend");');
  });

  it('falls back to index.html for a non-API GET', async () => {
    const response = await request(createApp({ frontendDist: directory })).get('/partida/ejemplo').expect(200).expect('Content-Type', /html/);
    expect(response.text).toBe(html);
  });

  it.each(['/api/missing', '/api', '/API/missing'])('keeps %s as JSON 404 even with frontend files present', async (path) => {
    const response = await request(createApp({ frontendDist: directory })).get(path).expect(404).expect('Content-Type', /json/);
    expect(response.body).toMatchObject({ error: { code: 'NOT_FOUND' } });
  });

  it('keeps health available alongside the frontend', async () => {
    await request(createApp({ frontendDist: directory })).get('/api/health').expect(200).expect('Content-Type', /json/);
  });

  it('does not use the SPA fallback for a POST', async () => {
    await request(createApp({ frontendDist: directory })).post('/partida').send({}).expect(404).expect('Content-Type', /json/);
  });

  it('skips static serving when the requested directory does not exist', async () => {
    const app = createApp({ frontendDist: join(directory, 'absent') });
    await request(app).get('/').expect(404).expect('Content-Type', /json/);
    await request(app).get('/api/health').expect(200);
  });
});
