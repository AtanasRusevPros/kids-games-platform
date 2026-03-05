import type pg from 'pg';
import { createHash } from 'node:crypto';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function saveRefreshToken(
  pool: pg.Pool,
  userId: string,
  token: string,
  expiresAt: Date,
): Promise<void> {
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [userId, hashToken(token), expiresAt],
  );
}

export async function findRefreshToken(
  pool: pg.Pool,
  token: string,
): Promise<{ user_id: string; expires_at: Date } | null> {
  const result = await pool.query<{ user_id: string; expires_at: Date }>(
    `SELECT user_id, expires_at FROM refresh_tokens WHERE token_hash = $1`,
    [hashToken(token)],
  );
  return result.rows[0] ?? null;
}

export async function deleteRefreshToken(pool: pg.Pool, token: string): Promise<void> {
  await pool.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [hashToken(token)]);
}

export async function deleteAllUserRefreshTokens(pool: pg.Pool, userId: string): Promise<void> {
  await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
}

export async function pruneExpiredTokens(pool: pg.Pool): Promise<void> {
  await pool.query('DELETE FROM refresh_tokens WHERE expires_at < NOW()');
}
