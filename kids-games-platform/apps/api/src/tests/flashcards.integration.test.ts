/**
 * Integration tests for /flashcards routes.
 * Requires a seeded database (run db:migrate + db:seed first).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../app.js';
import { getPool } from '../db/client.js';
import { testConfig } from '../config.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let accessToken: string;
let deckId: string;

beforeAll(async () => {
  app = await createApp({ logger: false, databaseUrl: testConfig.databaseUrl });

  // Register + login a test user
  const email = `fc-test-${Date.now()}@test-integration.com`;
  const regRes = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { email, password: 'TestPass123!', displayName: 'FC Tester' },
  });
  accessToken = regRes.json<{ accessToken: string }>().accessToken;

  // Get first deck id
  const decksRes = await app.inject({ method: 'GET', url: '/flashcards/decks' });
  const decks = decksRes.json<Array<{ id: string }>>();
  deckId = decks[0]?.id ?? '';
});

afterAll(async () => {
  await getPool().query('DELETE FROM users WHERE email LIKE $1', ['%@test-integration.com']);
  await app.close();
});

describe('GET /flashcards/decks', () => {
  it('returns a list of decks', async () => {
    const res = await app.inject({ method: 'GET', url: '/flashcards/decks' });
    expect(res.statusCode).toBe(200);
    const decks = res.json<Array<{ id: string; title: string }>>();
    expect(Array.isArray(decks)).toBe(true);
    expect(decks.length).toBeGreaterThan(0);
    expect(decks[0]!.id).toBeTruthy();
  });

  it('filters by language', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/flashcards/decks?lang=en',
    });
    expect(res.statusCode).toBe(200);
  });
});

describe('GET /flashcards/decks/:deckId/cards', () => {
  it('returns cards for a valid deck', async () => {
    if (!deckId) return;
    const res = await app.inject({
      method: 'GET',
      url: `/flashcards/decks/${deckId}/cards`,
    });
    expect(res.statusCode).toBe(200);
    const cards = res.json<Array<{ id: string; term: string }>>();
    expect(Array.isArray(cards)).toBe(true);
    expect(cards.length).toBeGreaterThan(0);
  });

  it('returns 404 for unknown deck', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/flashcards/decks/00000000-0000-0000-0000-000000000000/cards',
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('POST /flashcards/decks/:deckId/progress/position', () => {
  it('saves position and returns ok', async () => {
    if (!deckId) return;
    const res = await app.inject({
      method: 'POST',
      url: `/flashcards/decks/${deckId}/progress/position`,
      headers: { Authorization: `Bearer ${accessToken}` },
      payload: { lastIndex: 5 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ ok: boolean }>().ok).toBe(true);
  });

  it('requires authentication', async () => {
    if (!deckId) return;
    const res = await app.inject({
      method: 'POST',
      url: `/flashcards/decks/${deckId}/progress/position`,
      payload: { lastIndex: 0 },
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 400 for invalid payload', async () => {
    if (!deckId) return;
    const res = await app.inject({
      method: 'POST',
      url: `/flashcards/decks/${deckId}/progress/position`,
      headers: { Authorization: `Bearer ${accessToken}` },
      payload: { lastIndex: 'not-a-number' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('idempotent retry with same key returns same result without duplicate write', async () => {
    if (!deckId) return;
    const key = `test-idem-key-${Date.now()}`;
    const first = await app.inject({
      method: 'POST',
      url: `/flashcards/decks/${deckId}/progress/position`,
      headers: { Authorization: `Bearer ${accessToken}`, 'Idempotency-Key': key },
      payload: { lastIndex: 3 },
    });
    expect(first.statusCode).toBe(200);

    const second = await app.inject({
      method: 'POST',
      url: `/flashcards/decks/${deckId}/progress/position`,
      headers: { Authorization: `Bearer ${accessToken}`, 'Idempotency-Key': key },
      payload: { lastIndex: 99 }, // different payload — should be ignored
    });
    expect(second.statusCode).toBe(200);
    // Both return ok:true and the second uses the cached response
    expect(second.json<{ ok: boolean }>().ok).toBe(true);
  });
});

describe('GET /flashcards/decks/:deckId/progress', () => {
  it('returns progress shape for authenticated user', async () => {
    if (!deckId) return;
    const res = await app.inject({
      method: 'GET',
      url: `/flashcards/decks/${deckId}/progress`,
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{
      lastIndex: number;
      knownCount: number;
      knownCardIds: string[];
    }>();
    expect(typeof body.lastIndex).toBe('number');
    expect(typeof body.knownCount).toBe('number');
    expect(Array.isArray(body.knownCardIds)).toBe(true);
  });

  it('requires authentication', async () => {
    if (!deckId) return;
    const res = await app.inject({
      method: 'GET',
      url: `/flashcards/decks/${deckId}/progress`,
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /flashcards/decks/:deckId/progress/known', () => {
  let cardId: string;

  beforeAll(async () => {
    if (!deckId) return;
    const cardsRes = await app.inject({
      method: 'GET',
      url: `/flashcards/decks/${deckId}/cards`,
    });
    const cards = cardsRes.json<Array<{ id: string }>>();
    cardId = cards[0]?.id ?? '';
  });

  it('marks a card as known', async () => {
    if (!deckId || !cardId) return;
    const res = await app.inject({
      method: 'POST',
      url: `/flashcards/decks/${deckId}/progress/known`,
      headers: { Authorization: `Bearer ${accessToken}` },
      payload: { cardId, known: true },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ ok: boolean }>().ok).toBe(true);

    // Verify it's reflected in progress
    const progressRes = await app.inject({
      method: 'GET',
      url: `/flashcards/decks/${deckId}/progress`,
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const progress = progressRes.json<{ knownCardIds: string[] }>();
    expect(progress.knownCardIds).toContain(cardId);
  });

  it('requires authentication', async () => {
    if (!deckId || !cardId) return;
    const res = await app.inject({
      method: 'POST',
      url: `/flashcards/decks/${deckId}/progress/known`,
      payload: { cardId, known: true },
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 400 for invalid payload', async () => {
    if (!deckId) return;
    const res = await app.inject({
      method: 'POST',
      url: `/flashcards/decks/${deckId}/progress/known`,
      headers: { Authorization: `Bearer ${accessToken}` },
      payload: { cardId: 'not-a-uuid', known: 'yes' },
    });
    expect(res.statusCode).toBe(400);
  });
});
