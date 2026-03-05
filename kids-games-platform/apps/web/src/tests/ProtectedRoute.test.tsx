import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute.js';

vi.mock('../services/auth.service.js', () => ({
  isLoggedIn: vi.fn(),
}));

import { isLoggedIn } from '../services/auth.service.js';

function renderWithRoutes(loggedIn: boolean) {
  vi.mocked(isLoggedIn).mockReturnValue(loggedIn);
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route
          path="/protected"
          element={
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  it('renders children when user is logged in', () => {
    renderWithRoutes(true);
    expect(screen.getByText('Protected Content')).toBeTruthy();
    expect(screen.queryByText('Login Page')).toBeNull();
  });

  it('redirects to /login when user is not logged in', () => {
    renderWithRoutes(false);
    expect(screen.getByText('Login Page')).toBeTruthy();
    expect(screen.queryByText('Protected Content')).toBeNull();
  });
});
