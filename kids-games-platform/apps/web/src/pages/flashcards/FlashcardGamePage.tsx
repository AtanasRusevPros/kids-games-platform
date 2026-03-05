import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Layout } from '../../components/Layout.js';
import { FlashCard } from '../../components/flashcards/FlashCard.js';
import { ProgressBar } from '../../components/flashcards/ProgressBar.js';
import { apiFetch } from '../../services/api.js';
import {
  getDeckProgress,
  savePosition,
  markKnown,
} from '../../services/progress.service.js';
import { isLoggedIn } from '../../services/auth.service.js';
import type { Card, Deck } from '@kids-games/shared';

/** Fisher-Yates shuffle (in-place) */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

export function FlashcardGamePage() {
  const { deckId } = useParams<{ deckId: string }>();

  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [knownIds, setKnownIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shuffled, setShuffled] = useState(false);

  useEffect(() => {
    if (!deckId) return;

    Promise.all([
      apiFetch<Deck>(`/flashcards/decks/${deckId}`),
      apiFetch<Card[]>(`/flashcards/decks/${deckId}/cards`),
      isLoggedIn()
        ? getDeckProgress(deckId).catch(() => null)
        : Promise.resolve(null),
    ])
      .then(([d, c, progress]) => {
        setDeck(d);
        setCards(c);
        if (progress) {
          setKnownIds(new Set(progress.knownCardIds));
          setIndex(Math.min(progress.lastIndex, c.length - 1));
        }
      })
      .catch(() => setError('Could not load this deck.'))
      .finally(() => setLoading(false));
  }, [deckId]);

  const currentCard = cards[index];
  const isCurrentKnown = currentCard ? knownIds.has(currentCard.id) : false;

  const handleNext = useCallback(() => {
    const next = Math.min(index + 1, cards.length - 1);
    setIndex(next);
    if (isLoggedIn() && deckId) {
      savePosition(deckId, next).catch(() => undefined);
    }
  }, [index, cards.length, deckId]);

  const handlePrev = useCallback(() => {
    const prev = Math.max(index - 1, 0);
    setIndex(prev);
    if (isLoggedIn() && deckId) {
      savePosition(deckId, prev).catch(() => undefined);
    }
  }, [index, deckId]);

  const handleToggleKnown = useCallback(() => {
    if (!currentCard || !deckId) return;
    const nowKnown = !knownIds.has(currentCard.id);
    const next = new Set(knownIds);
    if (nowKnown) next.add(currentCard.id);
    else next.delete(currentCard.id);
    setKnownIds(next);
    if (isLoggedIn()) {
      markKnown(deckId, currentCard.id, nowKnown).catch(() => undefined);
    }
  }, [currentCard, knownIds, deckId]);

  const handleShuffle = useCallback(() => {
    setCards((prev) => shuffle([...prev]));
    setIndex(0);
    setShuffled(true);
  }, []);

  if (loading) {
    return (
      <Layout showBack>
        <div className="flex justify-center py-20">
          <div className="text-5xl animate-bounce">🃏</div>
        </div>
      </Layout>
    );
  }

  if (error || !deck || !currentCard) {
    return (
      <Layout showBack>
        <div className="alert-error max-w-sm mx-auto mt-8">
          {error || 'Deck not found.'}
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={deck.title} showBack>
      <div className="max-w-sm mx-auto">
        {/* Progress bar */}
        <div className="mb-5">
          <ProgressBar known={knownIds.size} total={cards.length} />
        </div>

        {/* Flash card */}
        <FlashCard
          card={currentCard}
          isKnown={isCurrentKnown}
          index={index}
          total={cards.length}
          onNext={handleNext}
          onPrev={handlePrev}
          onToggleKnown={handleToggleKnown}
        />

        {/* Shuffle */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={handleShuffle}
            className="btn-secondary text-xs gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {shuffled ? 'Shuffle again' : 'Shuffle cards'}
          </button>
        </div>

        {/* Completion state */}
        {knownIds.size === cards.length && cards.length > 0 && (
          <div className="mt-6 card text-center bg-emerald-50 border-emerald-200">
            <div className="text-4xl mb-2">🎉</div>
            <p className="font-semibold text-emerald-800">All cards known!</p>
            <p className="text-sm text-emerald-600 mt-1">
              Amazing work — you know all {cards.length} words in this deck.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
