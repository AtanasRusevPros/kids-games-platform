/**
 * Integration tests for /points routes.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../app.js';
import { getPool } from '../db/client.js';
import { testConfig } from '../config.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let accessToken: string;

beforeAll(async () => {
  app = await createApp({ logger: false, databaseUrl: testConfig.databaseUrl });

  const email = `points-test-${Date.now()}@test-integration.com`;
  const regRes = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { email, password: 'TestPass123!', displayName: 'Points Tester' },
  });
  accessToken = regRes.json<{ accessToken: string }>().accessToken;
});

afterAll(async () => {
  await getPool().query('DELETE FROM users WHERE email LIKE $1', ['%@test-integration.com']);
  await app.close();
});

describe('GET /points', () => {
  it('returns zero total points for a new user', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/points',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ totalPoints: number }>().totalPoints).toBe(0);
  });

  it('requires authentication', async () => {
    const res = await app.inject({ method: 'GET', url: '/points' });
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /points/add', () => {
  it('adds points for a valid game and returns the updated total', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/points/add',
      headers: { Authorization: `Bearer ${accessToken}` },
      payload: { gameId: 'flashcards', points: 10 },
    });
    expect(res.statusCode).toBe(200);

    // Total should now be non-zero
    const getRes = await app.inject({
      method: 'GET',
      url: '/points',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(getRes.json<{ totalPoints: number }>().totalPoints).toBeGreaterThan(0);
  });

  it('accumulates points across multiple calls', async () => {
    const before = await app.inject({
      method: 'GET',
      url: '/points',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const prevTotal = before.json<{ totalPoints: number }>().totalPoints;

    await app.inject({
      method: 'POST',
      url: '/points/add',
      headers: { Authorization: `Bearer ${accessToken}` },
      payload: { gameId: 'flashcards', points: 5 },
    });

    const after = await app.inject({
      method: 'GET',
      url: '/points',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(after.json<{ totalPoints: number }>().totalPoints).toBe(prevTotal + 5);
  });

  it('returns 400 for zero points (must be positive)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/points/add',
      headers: { Authorization: `Bearer ${accessToken}` },
      payload: { gameId: 'flashcards', points: 0 },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for negative points', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/points/add',
      headers: { Authorization: `Bearer ${accessToken}` },
      payload: { gameId: 'flashcards', points: -1 },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when gameId is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/points/add',
      headers: { Authorization: `Bearer ${accessToken}` },
      payload: { points: 10 },
    });
    expect(res.statusCode).toBe(400);
  });

  it('requires authentication', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/points/add',
      payload: { gameId: 'flashcards', points: 10 },
    });
    expect(res.statusCode).toBe(401);
  });
});
