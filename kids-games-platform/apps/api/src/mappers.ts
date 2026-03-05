/**
 * Maps DB row shapes (snake_case) to the camelCase API response format
 * matching the shared type definitions.
 */
import type { GameRow } from './repositories/game.repository.js';
import type { DeckRow, CardRow } from './repositories/deck.repository.js';

export function mapGame(row: GameRow) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    iconEmoji: row.icon_emoji,
    status: row.status,
  };
}

export function mapDeck(row: DeckRow) {
  return {
    id: row.id,
    gameId: row.game_id,
    languageCode: row.language_code,
    title: row.title,
    description: row.description,
    cardCount: row.card_count,
    version: row.version,
    createdAt: row.created_at,
  };
}

export function mapCard(row: CardRow) {
  return {
    id: row.id,
    deckId: row.deck_id,
    term: row.term,
    imagePath: row.image_path,
    audioPath: row.audio_path,
    tags: row.tags,
    sortOrder: row.sort_order,
  };
}
