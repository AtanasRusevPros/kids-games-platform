/**
 * Migration smoke tests — verify the schema was applied correctly.
 * Connects directly to the test DB without the app server.
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

const EXPECTED_TABLES = [
  'cards',
  'decks',
  'games',
  'idempotency_keys',
  'refresh_tokens',
  'sessions',
  'user_deck_progress',
  'user_game_points',
  'user_known_cards',
  'user_points',
  'users',
];

describe('Migration smoke tests', () => {
  it('all required tables exist', async () => {
    const result = await pool.query<{ tablename: string }>(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename",
    );
    const tables = result.rows.map((r) => r.tablename);
    for (const table of EXPECTED_TABLES) {
      expect(tables, `Expected table '${table}' to exist`).toContain(table);
    }
  });

  it('users table has required columns', async () => {
    const result = await pool.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'users' AND table_schema = 'public'`,
    );
    const cols = result.rows.map((r) => r.column_name);
    expect(cols).toContain('id');
    expect(cols).toContain('email');
    expect(cols).toContain('password_hash');
    expect(cols).toContain('display_name');
    expect(cols).toContain('created_at');
  });

  it('cards.audio_path is nullable', async () => {
    const result = await pool.query<{ is_nullable: string }>(
      `SELECT is_nullable FROM information_schema.columns
       WHERE table_name = 'cards' AND column_name = 'audio_path' AND table_schema = 'public'`,
    );
    expect(result.rows[0]?.is_nullable).toBe('YES');
  });

  it('foreign key constraints exist on core tables', async () => {
    const result = await pool.query<{ table_name: string; cnt: string }>(
      `SELECT table_name, COUNT(*) AS cnt
       FROM information_schema.table_constraints
       WHERE constraint_type = 'FOREIGN KEY'
         AND table_schema = 'public'
         AND table_name IN ('refresh_tokens', 'decks', 'cards', 'user_deck_progress')
       GROUP BY table_name`,
    );
    const fkMap: Record<string, number> = {};
    for (const row of result.rows) fkMap[row.table_name] = parseInt(row.cnt);
    expect(fkMap['refresh_tokens']).toBeGreaterThan(0);
    expect(fkMap['decks']).toBeGreaterThan(0);
    expect(fkMap['cards']).toBeGreaterThan(0);
    expect(fkMap['user_deck_progress']).toBeGreaterThan(0);
  });

  it('users.email has a unique constraint', async () => {
    const result = await pool.query<{ cnt: string }>(
      `SELECT COUNT(*) AS cnt FROM information_schema.table_constraints
       WHERE constraint_type = 'UNIQUE' AND table_name = 'users' AND table_schema = 'public'`,
    );
    expect(parseInt(result.rows[0]!.cnt)).toBeGreaterThan(0);
  });

  it('user_deck_progress has composite primary key', async () => {
    const result = await pool.query<{ cnt: string }>(
      `SELECT COUNT(*) AS cnt FROM information_schema.table_constraints
       WHERE constraint_type = 'PRIMARY KEY' AND table_name = 'user_deck_progress'
         AND table_schema = 'public'`,
    );
    expect(parseInt(result.rows[0]!.cnt)).toBe(1);
  });
});
