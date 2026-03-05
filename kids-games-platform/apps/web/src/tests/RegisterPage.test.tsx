import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RegisterPage } from '../pages/RegisterPage.js';

vi.mock('../services/auth.service.js', () => ({
  register: vi.fn(),
  isLoggedIn: vi.fn(() => false),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
      <a href={to}>{children}</a>
    ),
  };
});

import { register } from '../services/auth.service.js';

describe('RegisterPage', () => {
  const renderPage = () =>
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

  it('renders name, email, and password fields', () => {
    renderPage();
    expect(screen.getByLabelText(/your name/i)).toBeTruthy();
    expect(screen.getByLabelText(/email/i)).toBeTruthy();
    expect(screen.getByLabelText(/password/i)).toBeTruthy();
  });

  it('shows client-side error when password is too short', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/your name/i), {
      target: { value: 'Alex' },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'alex@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'short' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/at least 8 characters/i)).toBeTruthy();
    });
    expect(register).not.toHaveBeenCalled();
  });

  it('calls register service with correct arguments on valid submit', async () => {
    vi.mocked(register).mockResolvedValue({
      accessToken: 'tok',
      refreshToken: 'ref',
      user: { id: '1', email: 'alex@example.com', displayName: 'Alex' },
    });
    renderPage();

    fireEvent.change(screen.getByLabelText(/your name/i), {
      target: { value: 'Alex' },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'alex@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith('alex@example.com', 'password123', 'Alex');
    });
  });

  it('shows "already registered" error on 409', async () => {
    const { ApiError } = await import('../services/api.js');
    vi.mocked(register).mockRejectedValue(new ApiError(409, 'Conflict'));
    renderPage();

    fireEvent.change(screen.getByLabelText(/your name/i), {
      target: { value: 'Alex' },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'taken@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/already registered/i)).toBeTruthy();
    });
  });

  it('shows generic error on unexpected failure', async () => {
    vi.mocked(register).mockRejectedValue(new Error('Network error'));
    renderPage();

    fireEvent.change(screen.getByLabelText(/your name/i), {
      target: { value: 'Alex' },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'alex@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeTruthy();
    });
  });
});
