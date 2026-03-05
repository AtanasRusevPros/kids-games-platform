import { apiFetch } from './api.js';
import { enqueue, flushQueue } from './offlineQueue.js';
import { v4 as uuidv4 } from 'uuid';

export interface DeckProgress {
  lastIndex: number;
  knownCount: number;
  knownCardIds: string[];
  updatedAt: string | null;
}

export async function getDeckProgress(deckId: string): Promise<DeckProgress> {
  return apiFetch<DeckProgress>(`/flashcards/decks/${deckId}/progress`, {
    auth: true,
  });
}

export async function savePosition(deckId: string, lastIndex: number): Promise<void> {
  const key = uuidv4();
  if (!navigator.onLine) {
    enqueue(`/flashcards/decks/${deckId}/progress/position`, 'POST', { lastIndex });
    return;
  }
  try {
    await apiFetch(`/flashcards/decks/${deckId}/progress/position`, {
      method: 'POST',
      auth: true,
      headers: { 'Idempotency-Key': key },
      body: JSON.stringify({ lastIndex }),
    });
    await flushQueue();
  } catch {
    enqueue(`/flashcards/decks/${deckId}/progress/position`, 'POST', { lastIndex });
  }
}

export async function markKnown(
  deckId: string,
  cardId: string,
  known: boolean,
): Promise<void> {
  const key = uuidv4();
  if (!navigator.onLine) {
    enqueue(`/flashcards/decks/${deckId}/progress/known`, 'POST', { cardId, known });
    return;
  }
  try {
    await apiFetch(`/flashcards/decks/${deckId}/progress/known`, {
      method: 'POST',
      auth: true,
      headers: { 'Idempotency-Key': key },
      body: JSON.stringify({ cardId, known }),
    });
    await flushQueue();
  } catch {
    enqueue(`/flashcards/decks/${deckId}/progress/known`, 'POST', { cardId, known });
  }
}
