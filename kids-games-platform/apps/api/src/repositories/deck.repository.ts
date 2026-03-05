import type pg from 'pg';

export interface DeckRow {
  id: string;
  game_id: string;
  language_code: string;
  title: string;
  description: string;
  version: number;
  card_count: number;
  created_at: Date;
}

export interface CardRow {
  id: string;
  deck_id: string;
  term: string;
  image_path: string | null;
  audio_path: string | null;
  tags: string[];
  sort_order: number;
}

export async function findDecks(
  pool: pg.Pool,
  gameId: string,
  languageCode?: string,
): Promise<DeckRow[]> {
  const params: unknown[] = [gameId];
  let query = `
    SELECT d.*, COUNT(c.id)::int AS card_count
    FROM decks d
    LEFT JOIN cards c ON c.deck_id = d.id
    WHERE d.game_id = $1
  `;
  if (languageCode) {
    params.push(languageCode);
    query += ` AND d.language_code = $${params.length}`;
  }
  query += ' GROUP BY d.id ORDER BY d.title';
  const result = await pool.query<DeckRow>(query, params);
  return result.rows;
}

export async function findDeckById(pool: pg.Pool, deckId: string): Promise<DeckRow | null> {
  const result = await pool.query<DeckRow>(
    `SELECT d.*, COUNT(c.id)::int AS card_count
     FROM decks d LEFT JOIN cards c ON c.deck_id = d.id
     WHERE d.id = $1 GROUP BY d.id`,
    [deckId],
  );
  return result.rows[0] ?? null;
}

export async function findCardsByDeck(pool: pg.Pool, deckId: string): Promise<CardRow[]> {
  const result = await pool.query<CardRow>(
    'SELECT * FROM cards WHERE deck_id = $1 ORDER BY sort_order',
    [deckId],
  );
  return result.rows;
}

export async function findCardById(pool: pg.Pool, cardId: string): Promise<CardRow | null> {
  const result = await pool.query<CardRow>('SELECT * FROM cards WHERE id = $1', [cardId]);
  return result.rows[0] ?? null;
}
