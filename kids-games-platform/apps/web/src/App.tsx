import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage.js';
import { RegisterPage } from './pages/RegisterPage.js';
import { MenuPage } from './pages/MenuPage.js';
import { DeckPickerPage } from './pages/flashcards/DeckPickerPage.js';
import { FlashcardGamePage } from './pages/flashcards/FlashcardGamePage.js';
import { ProtectedRoute } from './components/ProtectedRoute.js';

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MenuPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/flashcards',
    element: (
      <ProtectedRoute>
        <DeckPickerPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/flashcards/:deckId',
    element: (
      <ProtectedRoute>
        <FlashcardGamePage />
      </ProtectedRoute>
    ),
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
