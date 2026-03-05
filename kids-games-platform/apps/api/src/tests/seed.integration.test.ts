/**
 * Seed data validation tests — verify the initial game/deck/card data loaded correctly.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createPool } from '../db/client.js';
import { testConfig } from '../config.js';
import type pg from 'pg';

let pool: pg.Pool;

beforeAll(() => {
  pool = createPool(testConfig.databaseUrl);
});

afterAll(async () => {
  await pool.end();
});

describe('Seed data validation', () => {
  it('at least one game exists', async () => {
    const result = await pool.query<{ cnt: string }>('SELECT COUNT(*) AS cnt FROM games');
    expect(parseInt(result.rows[0]!.cnt)).toBeGreaterThan(0);
  });

  it('flashcards game exists and is enabled', async () => {
    const result = await pool.query<{ id: string; status: string }>(
      "SELECT id, status FROM games WHERE id = 'flashcards'",
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]!.status).toBe('enabled');
  });

  it('at least one English deck exists', async () => {
    const result = await pool.query<{ cnt: string }>(
      "SELECT COUNT(*) AS cnt FROM decks WHERE language_code = 'en'",
    );
    expect(parseInt(result.rows[0]!.cnt)).toBeGreaterThan(0);
  });

  it('decks have associated cards', async () => {
    const result = await pool.query<{ cnt: string }>(
      `SELECT COUNT(*) AS cnt FROM cards c JOIN decks d ON c.deck_id = d.id`,
    );
    expect(parseInt(result.rows[0]!.cnt)).toBeGreaterThan(0);
  });

  it('all cards have a non-empty term', async () => {
    const result = await pool.query<{ cnt: string }>(
      `SELECT COUNT(*) AS cnt FROM cards WHERE term IS NULL OR term = ''`,
    );
    expect(parseInt(result.rows[0]!.cnt)).toBe(0);
  });

  it('cards have placeholder image_path set', async () => {
    const result = await pool.query<{ cnt: string }>(
      'SELECT COUNT(*) AS cnt FROM cards WHERE image_path IS NOT NULL',
    );
    expect(parseInt(result.rows[0]!.cnt)).toBeGreaterThan(0);
  });

  it('audio_path is null for all seeded cards (MVP — no audio files)', async () => {
    const result = await pool.query<{ cnt: string }>(
      'SELECT COUNT(*) AS cnt FROM cards WHERE audio_path IS NOT NULL',
    );
    expect(parseInt(result.rows[0]!.cnt)).toBe(0);
  });
});
