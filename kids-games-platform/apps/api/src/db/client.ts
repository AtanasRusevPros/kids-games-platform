import pg from 'pg';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function createPool(databaseUrl: string): pg.Pool {
  return new Pool({ connectionString: databaseUrl, max: 10 });
}

export function getPool(): pg.Pool {
  if (!pool) throw new Error('DB pool not initialized. Call initPool() first.');
  return pool;
}

export function initPool(databaseUrl: string): pg.Pool {
  pool = createPool(databaseUrl);
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export type { pg };
