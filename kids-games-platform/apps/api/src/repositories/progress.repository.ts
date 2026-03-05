import type pg from 'pg';

export interface DeckProgressRow {
  user_id: string;
  deck_id: string;
  last_index: number;
  known_count: number;
  updated_at: Date;
}

export async function getDeckProgress(
  pool: pg.Pool,
  userId: string,
  deckId: string,
): Promise<DeckProgressRow | null> {
  const result = await pool.query<DeckProgressRow>(
    'SELECT * FROM user_deck_progress WHERE user_id = $1 AND deck_id = $2',
    [userId, deckId],
  );
  return result.rows[0] ?? null;
}

export async function getKnownCardIds(
  pool: pg.Pool,
  userId: string,
  deckId: string,
): Promise<string[]> {
  const result = await pool.query<{ card_id: string }>(
    'SELECT card_id FROM user_known_cards WHERE user_id = $1 AND deck_id = $2',
    [userId, deckId],
  );
  return result.rows.map((r) => r.card_id);
}

export async function setCardKnown(
  pool: pg.Pool,
  userId: string,
  deckId: string,
  cardId: string,
  known: boolean,
): Promise<void> {
  if (known) {
    await pool.query(
      `INSERT INTO user_known_cards (user_id, card_id, deck_id)
       VALUES ($1, $2, $3) ON CONFLICT (user_id, card_id) DO NOTHING`,
      [userId, cardId, deckId],
    );
  } else {
    await pool.query(
      'DELETE FROM user_known_cards WHERE user_id = $1 AND card_id = $2',
      [userId, cardId],
    );
  }
  // Update summary
  const countResult = await pool.query<{ count: string }>(
    'SELECT COUNT(*)::int as count FROM user_known_cards WHERE user_id = $1 AND deck_id = $2',
    [userId, deckId],
  );
  const knownCount = parseInt(countResult.rows[0]?.count ?? '0', 10);
  await pool.query(
    `INSERT INTO user_deck_progress (user_id, deck_id, known_count, last_index, updated_at)
     VALUES ($1, $2, $3, 0, NOW())
     ON CONFLICT (user_id, deck_id) DO UPDATE SET known_count = $3, updated_at = NOW()`,
    [userId, deckId, knownCount],
  );
}

export async function savePosition(
  pool: pg.Pool,
  userId: string,
  deckId: string,
  lastIndex: number,
): Promise<void> {
  await pool.query(
    `INSERT INTO user_deck_progress (user_id, deck_id, last_index, known_count, updated_at)
     VALUES ($1, $2, $3, 0, NOW())
     ON CONFLICT (user_id, deck_id) DO UPDATE SET last_index = $3, updated_at = NOW()`,
    [userId, deckId, lastIndex],
  );
}

export interface IdempotencyRow {
  key: string;
  response: unknown;
  expires_at: Date;
}

export async function getIdempotencyKey(
  pool: pg.Pool,
  key: string,
): Promise<IdempotencyRow | null> {
  const result = await pool.query<IdempotencyRow>(
    'SELECT * FROM idempotency_keys WHERE key = $1 AND expires_at > NOW()',
    [key],
  );
  return result.rows[0] ?? null;
}

export async function saveIdempotencyKey(
  pool: pg.Pool,
  key: string,
  userId: string,
  response: unknown,
): Promise<void> {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
  await pool.query(
    `INSERT INTO idempotency_keys (key, user_id, response, expires_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (key) DO NOTHING`,
    [key, userId, JSON.stringify(response), expiresAt],
  );
}
