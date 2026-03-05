import { Link, useNavigate } from 'react-router-dom';
import { logout, isLoggedIn } from '../services/auth.service.js';
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';

interface Props {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
}

export function Layout({ children, title, showBack }: Props) {
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const loggedIn = isLoggedIn();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Offline banner */}
      {!isOnline && (
        <div className="alert-info text-center text-xs py-1.5 rounded-none border-x-0 border-t-0">
          {"You're offline — progress will sync when reconnected"}
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          {showBack && (
            <button
              onClick={() => navigate(-1)}
              className="text-slate-500 hover:text-slate-700 p-1 -ml-1 rounded-lg hover:bg-slate-100 transition"
              aria-label="Go back"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          <Link to="/" className="flex items-center gap-2 mr-auto">
            <span className="text-2xl">🎮</span>
            {title ? (
              <span className="text-lg font-semibold text-slate-800">{title}</span>
            ) : (
              <span className="text-lg font-bold text-indigo-600">KidsGames</span>
            )}
          </Link>

          {loggedIn && (
            <button
              onClick={handleLogout}
              className="text-sm text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition"
            >
              Sign out
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">{children}</main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 py-4">
        KidsGames Platform MVP
      </footer>
    </div>
  );
}
