#!/usr/bin/env node
/**
 * Drops all tables and re-runs migrations + seed.
 * DEVELOPMENT ONLY — do not run in production.
 */
import { createPool } from './client.js';

const dbUrl = process.env['DATABASE_URL'];
if (!dbUrl) throw new Error('DATABASE_URL is required');
if (dbUrl.includes('production') || dbUrl.includes('prod')) {
  throw new Error('Refusing to reset a production database.');
}

const pool = createPool(dbUrl);
const client = await pool.connect();
try {
  await client.query(`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`);
  console.log('✓ Schema reset');
} finally {
  client.release();
  await pool.end();
}
