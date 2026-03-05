import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DeckPickerPage } from '../pages/flashcards/DeckPickerPage.js';

vi.mock('../services/api.js', () => ({
  apiFetch: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

vi.mock('../services/auth.service.js', () => ({
  isLoggedIn: vi.fn(() => false),
}));

vi.mock('../services/progress.service.js', () => ({
  getDeckProgress: vi.fn().mockResolvedValue({ lastIndex: 0, knownCount: 0, knownCardIds: [], updatedAt: null }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, useNavigate: () => mockNavigate };
});

import { apiFetch } from '../services/api.js';

const MOCK_DECKS = [
  {
    id: 'deck-1',
    gameId: 'flashcards',
    languageCode: 'en',
    title: 'Animals',
    description: 'Animal vocabulary',
    cardCount: 20,
    version: 1,
    createdAt: '2024-01-01',
  },
];

describe('DeckPickerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner initially', () => {
    vi.mocked(apiFetch).mockReturnValue(new Promise(() => {}));
    render(<MemoryRouter><DeckPickerPage /></MemoryRouter>);
    expect(screen.getByText('📚')).toBeTruthy();
  });

  it('renders deck list after load', async () => {
    vi.mocked(apiFetch).mockResolvedValue(MOCK_DECKS);
    render(<MemoryRouter><DeckPickerPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Animals')).toBeTruthy());
    expect(screen.getByText('20 cards')).toBeTruthy();
    expect(screen.getByText('Animal vocabulary')).toBeTruthy();
  });

  it('navigates to game page on deck click', async () => {
    vi.mocked(apiFetch).mockResolvedValue(MOCK_DECKS);
    render(<MemoryRouter><DeckPickerPage /></MemoryRouter>);
    await waitFor(() => screen.getByText('Animals'));
    screen.getByText('Animals').click();
    expect(mockNavigate).toHaveBeenCalledWith('/flashcards/deck-1');
  });

  it('shows error when API fails', async () => {
    vi.mocked(apiFetch).mockRejectedValue(new Error('Network error'));
    render(<MemoryRouter><DeckPickerPage /></MemoryRouter>);
    await waitFor(() =>
      expect(screen.getByText(/could not load decks/i)).toBeTruthy(),
    );
  });

  it('shows empty state when no decks', async () => {
    vi.mocked(apiFetch).mockResolvedValue([]);
    render(<MemoryRouter><DeckPickerPage /></MemoryRouter>);
    await waitFor(() =>
      expect(screen.getByText(/no decks found/i)).toBeTruthy(),
    );
  });

  it('shows sign-in prompt for progress when not logged in', async () => {
    vi.mocked(apiFetch).mockResolvedValue(MOCK_DECKS);
    render(<MemoryRouter><DeckPickerPage /></MemoryRouter>);
    await waitFor(() => screen.getByText('Animals'));
    expect(screen.getByText(/sign in to track progress/i)).toBeTruthy();
  });
});
