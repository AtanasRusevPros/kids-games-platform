import type pg from 'pg';

export interface GameRow {
  id: string;
  title: string;
  description: string;
  icon_emoji: string;
  status: 'enabled' | 'disabled';
  created_at: Date;
}

export async function findAllGames(pool: pg.Pool): Promise<GameRow[]> {
  const result = await pool.query<GameRow>(
    `SELECT * FROM games WHERE status = 'enabled' ORDER BY title`,
  );
  return result.rows;
}

export async function findGameById(
  pool: pg.Pool,
  gameId: string,
): Promise<GameRow | null> {
  const result = await pool.query<GameRow>(
    'SELECT * FROM games WHERE id = $1',
    [gameId],
  );
  return result.rows[0] ?? null;
}
