#!/usr/bin/env node
/**
 * Seeds the database with initial game, deck, and card data.
 * Run via: pnpm db:seed
 */
import { createPool } from './client.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const dbUrl = process.env['DATABASE_URL'] ?? 'postgresql://postgres:postgres@localhost:5432/kids_games_dev';
const pool = createPool(dbUrl);

function makeSvgDataUri(emoji: string, bgColor: string, term: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
    <rect width="200" height="200" fill="${bgColor}" rx="16"/>
    <text x="100" y="110" font-size="80" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
    <text x="100" y="175" font-size="18" text-anchor="middle" fill="white" font-family="sans-serif" font-weight="bold">${term}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

const BG_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
  '#3b82f6', '#ef4444', '#14b8a6', '#f97316', '#84cc16',
  '#06b6d4', '#a855f7', '#e11d48', '#65a30d', '#0891b2',
  '#7c3aed', '#d97706', '#059669', '#dc2626', '#2563eb',
];

interface SeedCard {
  term: string;
  tags: string[];
  emoji: string;
}

interface SeedData {
  game: { id: string; title: string; description: string; iconEmoji: string; status: string };
  deck: { languageCode: string; title: string; description: string; version: number };
  cards: SeedCard[];
}

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const dataPath = join(__dirname, 'seed-data', 'english-deck.json');
    const data = JSON.parse(readFileSync(dataPath, 'utf8')) as SeedData;

    // Upsert game
    await client.query(
      `INSERT INTO games (id, title, description, icon_emoji, status)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET title=$2, description=$3, icon_emoji=$4, status=$5`,
      [data.game.id, data.game.title, data.game.description, data.game.iconEmoji, data.game.status],
    );
    console.log(`✓ Upserted game: ${data.game.id}`);

    // Check if deck already exists
    const existing = await client.query(
      'SELECT id FROM decks WHERE game_id=$1 AND language_code=$2 AND title=$3',
      [data.game.id, data.deck.languageCode, data.deck.title],
    );

    let deckId: string;
    if (existing.rows.length > 0) {
      deckId = existing.rows[0].id as string;
      console.log(`✓ Deck already exists: ${deckId}`);
    } else {
      const deckResult = await client.query(
        `INSERT INTO decks (game_id, language_code, title, description, version)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [data.game.id, data.deck.languageCode, data.deck.title, data.deck.description, data.deck.version],
      );
      deckId = deckResult.rows[0].id as string;
      console.log(`✓ Created deck: ${deckId}`);

      // Insert cards
      for (let i = 0; i < data.cards.length; i++) {
        const card = data.cards[i]!;
        const imagePath = makeSvgDataUri(card.emoji, BG_COLORS[i % BG_COLORS.length]!, card.term);
        await client.query(
          `INSERT INTO cards (deck_id, term, image_path, audio_path, tags, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [deckId, card.term, imagePath, null, card.tags, i],
        );
      }
      console.log(`✓ Inserted ${data.cards.length} cards`);
    }

    await client.query('COMMIT');
    console.log('✓ Seed complete');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
