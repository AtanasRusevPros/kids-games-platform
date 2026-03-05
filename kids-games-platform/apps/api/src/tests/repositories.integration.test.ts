/**
 * Repository / data-access layer integration tests.
 * Exercises user, deck, card, and progress repositories against the test DB.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../app.js';
import { getPool } from '../db/client.js';
import { testConfig } from '../config.js';
import * as userRepo from '../repositories/user.repository.js';
import * as deckRepo from '../repositories/deck.repository.js';
import * as progressRepo from '../repositories/progress.repository.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

beforeAll(async () => {
  app = await createApp({ logger: false, databaseUrl: testConfig.databaseUrl });
  await getPool().query('DELETE FROM users WHERE email LIKE $1', ['%@repo-test.com']);
});

afterAll(async () => {
  await getPool().query('DELETE FROM users WHERE email LIKE $1', ['%@repo-test.com']);
  await app.close();
});

describe('User repository', () => {
  it('creates and finds a user by email', async () => {
    const created = await userRepo.createUser(
      getPool(),
      'create@repo-test.com',
      'hash123',
      'Repo User',
    );
    expect(created.id).toBeTruthy();
    expect(created.email).toBe('create@repo-test.com');
    expect(created.display_name).toBe('Repo User');

    const found = await userRepo.findUserByEmail(getPool(), 'create@repo-test.com');
    expect(found?.id).toBe(created.id);
  });

  it('stores email as lowercase', async () => {
    const created = await userRepo.createUser(
      getPool(),
      'UPPER@REPO-TEST.COM',
      'hash',
      'Upper User',
    );
    expect(created.email).toBe('upper@repo-test.com');
  });

  it('returns null for non-existent email', async () => {
    const found = await userRepo.findUserByEmail(getPool(), 'nobody@repo-test.com');
    expect(found).toBeNull();
  });

  it('finds a user by id', async () => {
    const created = await userRepo.createUser(
      getPool(),
      'byid@repo-test.com',
      'hash',
      'ID User',
    );
    const found = await userRepo.findUserById(getPool(), created.id);
    expect(found?.id).toBe(created.id);
  });

  it('returns null for non-existent id', async () => {
    const found = await userRepo.findUserById(
      getPool(),
      '00000000-0000-0000-0000-000000000000',
    );
    expect(found).toBeNull();
  });
});

describe('Deck repository', () => {
  it('finds decks for flashcards game', async () => {
    const decks = await deckRepo.findDecks(getPool(), 'flashcards');
    expect(Array.isArray(decks)).toBe(true);
    expect(decks.length).toBeGreaterThan(0);
  });

  it('filters decks by language code', async () => {
    const decks = await deckRepo.findDecks(getPool(), 'flashcards', 'en');
    expect(decks.every((d) => d.language_code === 'en')).toBe(true);
  });

  it('returns empty array for unknown game', async () => {
    const decks = await deckRepo.findDecks(getPool(), 'unknown-game');
    expect(decks).toEqual([]);
  });

  it('finds a deck by id', async () => {
    const decks = await deckRepo.findDecks(getPool(), 'flashcards', 'en');
    const id = decks[0]!.id;
    const found = await deckRepo.findDeckById(getPool(), id);
    expect(found?.id).toBe(id);
    expect(found?.card_count).toBeGreaterThan(0);
  });

  it('returns null for unknown deck id', async () => {
    const deck = await deckRepo.findDeckById(getPool(), '00000000-0000-0000-0000-000000000000');
    expect(deck).toBeNull();
  });
});

describe('Card repository', () => {
  it('returns cards for a valid deck ordered by sort_order', async () => {
    const decks = await deckRepo.findDecks(getPool(), 'flashcards', 'en');
    const cards = await deckRepo.findCardsByDeck(getPool(), decks[0]!.id);
    expect(cards.length).toBeGreaterThan(0);
    expect(cards[0]!.term).toBeTruthy();
    // Verify sort_order is ascending
    for (let i = 1; i < cards.length; i++) {
      expect(cards[i]!.sort_order).toBeGreaterThanOrEqual(cards[i - 1]!.sort_order);
    }
  });

  it('returns empty array for unknown deck', async () => {
    const cards = await deckRepo.findCardsByDeck(
      getPool(),
      '00000000-0000-0000-0000-000000000000',
    );
    expect(cards).toEqual([]);
  });
});

describe('Progress repository', () => {
  let userId: string;
  let deckId: string;
  let cardId: string;

  beforeAll(async () => {
    const user = await userRepo.createUser(
      getPool(),
      'progress@repo-test.com',
      'hash',
      'Progress User',
    );
    userId = user.id;
    const decks = await deckRepo.findDecks(getPool(), 'flashcards', 'en');
    deckId = decks[0]!.id;
    const cards = await deckRepo.findCardsByDeck(getPool(), deckId);
    cardId = cards[0]!.id;
  });

  it('returns null progress when none exists', async () => {
    const progress = await progressRepo.getDeckProgress(getPool(), userId, deckId);
    expect(progress).toBeNull();
  });

  it('saves and retrieves deck position', async () => {
    await progressRepo.savePosition(getPool(), userId, deckId, 5);
    const progress = await progressRepo.getDeckProgress(getPool(), userId, deckId);
    expect(progress?.last_index).toBe(5);
  });

  it('updates position on repeated saves', async () => {
    await progressRepo.savePosition(getPool(), userId, deckId, 10);
    const progress = await progressRepo.getDeckProgress(getPool(), userId, deckId);
    expect(progress?.last_index).toBe(10);
  });

  it('marks a card as known and increments known_count', async () => {
    await progressRepo.setCardKnown(getPool(), userId, deckId, cardId, true);
    const ids = await progressRepo.getKnownCardIds(getPool(), userId, deckId);
    expect(ids).toContain(cardId);
    const progress = await progressRepo.getDeckProgress(getPool(), userId, deckId);
    expect(progress?.known_count).toBeGreaterThan(0);
  });

  it('unmarks a card as known and decrements known_count', async () => {
    await progressRepo.setCardKnown(getPool(), userId, deckId, cardId, false);
    const ids = await progressRepo.getKnownCardIds(getPool(), userId, deckId);
    expect(ids).not.toContain(cardId);
    const progress = await progressRepo.getDeckProgress(getPool(), userId, deckId);
    expect(progress?.known_count).toBe(0);
  });
});
