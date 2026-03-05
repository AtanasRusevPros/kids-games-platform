import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout.js';
import { apiFetch } from '../services/api.js';
import type { Game } from '@kids-games/shared';

export function MenuPage() {
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<Game[]>('/games')
      .then(setGames)
      .catch(() => setError('Could not load games. Is the server running?'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800">Game Library</h1>
          <p className="text-slate-500 mt-1">Choose a game to start learning!</p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-4xl animate-bounce">🎮</div>
          </div>
        )}

        {error && <div className="alert-error">{error}</div>}

        {!loading && !error && games.length === 0 && (
          <div className="card text-center py-12">
            <div className="text-5xl mb-4">🌱</div>
            <p className="text-slate-500">No games available yet.</p>
            <p className="text-slate-400 text-sm mt-1">Run the seed script to add content.</p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {games.map((game) => (
            <button
              key={game.id}
              onClick={() => navigate(`/flashcards`)}
              className="card hover:shadow-md hover:border-indigo-200 transition-all text-left group cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="text-4xl shrink-0">{game.iconEmoji}</div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                    {game.title}
                  </h2>
                  {game.description && (
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                      {game.description}
                    </p>
                  )}
                </div>
                <svg
                  className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      </div>
    </Layout>
  );
}
