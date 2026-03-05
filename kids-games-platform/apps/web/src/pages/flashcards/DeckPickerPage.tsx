import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout.js';
import { ProgressBar } from '../../components/flashcards/ProgressBar.js';
import { apiFetch } from '../../services/api.js';
import { getDeckProgress } from '../../services/progress.service.js';
import { isLoggedIn } from '../../services/auth.service.js';
import type { Deck } from '@kids-games/shared';

export function DeckPickerPage() {
  const navigate = useNavigate();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [progress, setProgress] = useState<Record<string, { knownCount: number }>>({});
  const [lang, setLang] = useState('en');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const langs = [...new Set(decks.map((d) => d.languageCode))];

  useEffect(() => {
    setLoading(true);
    apiFetch<Deck[]>(`/flashcards/decks?lang=${lang}`)
      .then(async (loaded) => {
        setDecks(loaded);
        if (isLoggedIn()) {
          const progressMap: Record<string, { knownCount: number }> = {};
          await Promise.allSettled(
            loaded.map(async (d) => {
              const p = await getDeckProgress(d.id).catch(() => null);
              if (p) progressMap[d.id] = { knownCount: p.knownCount };
            }),
          );
          setProgress(progressMap);
        }
      })
      .catch(() => setError('Could not load decks.'))
      .finally(() => setLoading(false));
  }, [lang]);

  return (
    <Layout title="Flashcards" showBack>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Choose a deck</h1>
          <p className="text-slate-500 text-sm mt-1">Pick a vocabulary set to practice</p>
        </div>

        {/* Language filter */}
        {langs.length > 1 && (
          <div className="flex gap-2 mb-5 overflow-x-auto">
            {langs.map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition whitespace-nowrap ${
                  lang === l
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-16">
            <div className="text-4xl animate-bounce">📚</div>
          </div>
        )}

        {error && <div className="alert-error">{error}</div>}

        <div className="grid gap-3">
          {decks.map((deck) => {
            const p = progress[deck.id];
            return (
              <button
                key={deck.id}
                onClick={() => navigate(`/flashcards/${deck.id}`)}
                className="card hover:shadow-md hover:border-indigo-200 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                      {deck.title}
                    </h3>
                    {deck.description && (
                      <p className="text-xs text-slate-500 mt-0.5">{deck.description}</p>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 font-medium shrink-0 ml-3">
                    {deck.cardCount} cards
                  </span>
                </div>
                {p && (
                  <ProgressBar known={p.knownCount} total={deck.cardCount} />
                )}
                {!p && (
                  <div className="text-xs text-slate-400 mt-1">
                    {isLoggedIn() ? 'Not started' : 'Sign in to track progress'}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {!loading && !error && decks.length === 0 && (
          <div className="card text-center py-10">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-slate-500">No decks found for this language.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
