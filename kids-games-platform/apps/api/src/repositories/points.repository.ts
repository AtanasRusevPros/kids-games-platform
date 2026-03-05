import type pg from 'pg';

export interface PointsRow {
  user_id: string;
  total_points: number;
  updated_at: Date;
}

export async function getUserPoints(
  pool: pg.Pool,
  userId: string,
): Promise<PointsRow | null> {
  const result = await pool.query<PointsRow>(
    'SELECT * FROM user_points WHERE user_id = $1',
    [userId],
  );
  return result.rows[0] ?? null;
}

export async function addPoints(
  pool: pg.Pool,
  userId: string,
  gameId: string,
  points: number,
): Promise<{ totalPoints: number }> {
  // Upsert total points
  const totalResult = await pool.query<{ total_points: number }>(
    `INSERT INTO user_points (user_id, total_points)
     VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE
       SET total_points = user_points.total_points + $2,
           updated_at = NOW()
     RETURNING total_points`,
    [userId, points],
  );

  // Upsert per-game points
  await pool.query(
    `INSERT INTO user_game_points (user_id, game_id, points)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, game_id) DO UPDATE
       SET points = user_game_points.points + $3,
           updated_at = NOW()`,
    [userId, gameId, points],
  );

  return { totalPoints: totalResult.rows[0]!.total_points };
}
