/**
 * Integration tests for /games routes.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../app.js';
import { testConfig } from '../config.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

beforeAll(async () => {
  app = await createApp({ logger: false, databaseUrl: testConfig.databaseUrl });
});

afterAll(async () => {
  await app.close();
});

describe('GET /games', () => {
  it('returns a list of enabled games', async () => {
    const res = await app.inject({ method: 'GET', url: '/games' });
    expect(res.statusCode).toBe(200);
    const games = res.json<Array<{ id: string; title: string; status: string }>>();
    expect(Array.isArray(games)).toBe(true);
    expect(games.length).toBeGreaterThan(0);
    expect(games.every((g) => g.status === 'enabled')).toBe(true);
  });

  it('each game has required fields', async () => {
    const res = await app.inject({ method: 'GET', url: '/games' });
    const games = res.json<Array<{ id: string; title: string; iconEmoji: string }>>();
    for (const game of games) {
      expect(game.id).toBeTruthy();
      expect(game.title).toBeTruthy();
    }
  });
});

describe('GET /games/:gameId', () => {
  it('returns a single game by id', async () => {
    const res = await app.inject({ method: 'GET', url: '/games/flashcards' });
    expect(res.statusCode).toBe(200);
    const game = res.json<{ id: string; title: string }>();
    expect(game.id).toBe('flashcards');
    expect(game.title).toBeTruthy();
  });

  it('returns 404 for unknown game', async () => {
    const res = await app.inject({ method: 'GET', url: '/games/unknown-game' });
    expect(res.statusCode).toBe(404);
  });
});
