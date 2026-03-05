/**
 * Unit tests for mappers.ts — snake_case DB rows → camelCase API DTOs.
 * No DB required.
 */
import { describe, it, expect } from 'vitest';
import { mapGame, mapDeck, mapCard } from '../mappers.js';
import type { GameRow } from '../repositories/game.repository.js';
import type { DeckRow, CardRow } from '../repositories/deck.repository.js';

const now = new Date('2024-01-01T00:00:00.000Z');

const gameRow: GameRow = {
  id: 'flashcards',
  title: 'Flashcards',
  description: 'Learn vocabulary',
  icon_emoji: '🃏',
  status: 'enabled',
  created_at: now,
};

const deckRow: DeckRow = {
  id: 'deck-uuid',
  game_id: 'flashcards',
  language_code: 'en',
  title: 'English Basics',
  description: 'Basic English words',
  card_count: 20,
  version: 1,
  created_at: now,
};

const cardRow: CardRow = {
  id: 'card-uuid',
  deck_id: 'deck-uuid',
  term: 'Cat',
  image_path: '/images/cat.svg',
  audio_path: null,
  tags: ['animal'],
  sort_order: 1,
};

describe('mapGame', () => {
  it('maps all fields from snake_case to camelCase', () => {
    const result = mapGame(gameRow);
    expect(result.id).toBe('flashcards');
    expect(result.title).toBe('Flashcards');
    expect(result.description).toBe('Learn vocabulary');
    expect(result.iconEmoji).toBe('🃏');
    expect(result.status).toBe('enabled');
  });

  it('does not include raw snake_case fields', () => {
    const result = mapGame(gameRow) as Record<string, unknown>;
    expect(result['icon_emoji']).toBeUndefined();
  });
});

describe('mapDeck', () => {
  it('maps all fields from snake_case to camelCase', () => {
    const result = mapDeck(deckRow);
    expect(result.id).toBe('deck-uuid');
    expect(result.gameId).toBe('flashcards');
    expect(result.languageCode).toBe('en');
    expect(result.title).toBe('English Basics');
    expect(result.cardCount).toBe(20);
    expect(result.version).toBe(1);
    expect(result.createdAt).toBe(now);
  });

  it('does not include raw snake_case fields', () => {
    const result = mapDeck(deckRow) as Record<string, unknown>;
    expect(result['game_id']).toBeUndefined();
    expect(result['language_code']).toBeUndefined();
    expect(result['card_count']).toBeUndefined();
    expect(result['created_at']).toBeUndefined();
  });
});

describe('mapCard', () => {
  it('maps all fields from snake_case to camelCase', () => {
    const result = mapCard(cardRow);
    expect(result.id).toBe('card-uuid');
    expect(result.deckId).toBe('deck-uuid');
    expect(result.term).toBe('Cat');
    expect(result.imagePath).toBe('/images/cat.svg');
    expect(result.audioPath).toBeNull();
    expect(result.tags).toEqual(['animal']);
    expect(result.sortOrder).toBe(1);
  });

  it('preserves null audioPath', () => {
    const result = mapCard({ ...cardRow, audio_path: null });
    expect(result.audioPath).toBeNull();
  });

  it('does not include raw snake_case fields', () => {
    const result = mapCard(cardRow) as Record<string, unknown>;
    expect(result['deck_id']).toBeUndefined();
    expect(result['image_path']).toBeUndefined();
    expect(result['audio_path']).toBeUndefined();
    expect(result['sort_order']).toBeUndefined();
  });
});
