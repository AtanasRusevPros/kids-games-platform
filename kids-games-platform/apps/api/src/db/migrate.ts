#!/usr/bin/env node
/**
 * Simple custom migration runner.
 * Reads *.sql files from the migrations directory in sorted order,
 * tracks applied migrations in a `migrations` table, and runs new ones.
 */
import pg from 'pg';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, 'migrations');
const DB_URL =
  process.env['DATABASE_URL'] ??
  'postgresql://postgres:postgres@localhost:5432/kids_games_dev';

const client = new pg.Client({ connectionString: DB_URL });

try {
  await client.connect();
  console.log('Connected to database:', DB_URL.replace(/:\/\/[^@]+@/, '://*:*@'));

  await client.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id     SERIAL PRIMARY KEY,
      name   TEXT NOT NULL UNIQUE,
      run_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const { rows } = await client.query<{ name: string }>(
    'SELECT name FROM migrations ORDER BY id',
  );
  const ran = new Set(rows.map((r) => r.name));

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  let applied = 0;
  for (const file of files) {
    if (ran.has(file)) {
      console.log(`  skip   ${file}`);
      continue;
    }
    const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf8');
    console.log(`  apply  ${file}`);
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      applied++;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
    console.log(`  done   ${file}`);
  }

  console.log(
    `\nMigrations complete: ${applied} applied, ${ran.size} already run.`,
  );
} finally {
  await client.end();
}
