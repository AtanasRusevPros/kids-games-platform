import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { FlashcardGamePage } from '../pages/flashcards/FlashcardGamePage.js';

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
  savePosition: vi.fn().mockResolvedValue(undefined),
  markKnown: vi.fn().mockResolvedValue(undefined),
}));

import { apiFetch } from '../services/api.js';
import { markKnown } from '../services/progress.service.js';
import { isLoggedIn } from '../services/auth.service.js';

const MOCK_DECK = {
  id: 'deck-1',
  gameId: 'flashcards',
  languageCode: 'en',
  title: 'Animals',
  description: '',
  cardCount: 3,
  version: 1,
  createdAt: '',
};

const MOCK_CARDS = [
  { id: 'c1', deckId: 'deck-1', term: 'Cat', imagePath: null, audioPath: null, tags: [], sortOrder: 0 },
  { id: 'c2', deckId: 'deck-1', term: 'Dog', imagePath: null, audioPath: null, tags: [], sortOrder: 1 },
  { id: 'c3', deckId: 'deck-1', term: 'Bird', imagePath: null, audioPath: null, tags: [], sortOrder: 2 },
];

function renderPage(deckId = 'deck-1') {
  return render(
    <MemoryRouter initialEntries={[`/flashcards/${deckId}`]}>
      <Routes>
        <Route path="/flashcards/:deckId" element={<FlashcardGamePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('FlashcardGamePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isLoggedIn).mockReturnValue(false);
    vi.mocked(apiFetch).mockImplementation(async (path: unknown) => {
      if (typeof path === 'string' && path.endsWith('/cards')) return MOCK_CARDS;
      return MOCK_DECK;
    });
  });

  it('shows loading state initially', () => {
    vi.mocked(apiFetch).mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText('🃏')).toBeTruthy();
  });

  it('renders the first card term', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Cat')).toBeTruthy());
  });

  it('shows card counter', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Cat'));
    expect(screen.getByText('3')).toBeTruthy(); // total cards in counter
    expect(screen.getByText('0/3 known')).toBeTruthy(); // progress bar total
  });

  it('navigates to next card on Next click', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Cat'));
    fireEvent.click(screen.getByRole('button', { name: /next card/i }));
    await waitFor(() => expect(screen.getByText('Dog')).toBeTruthy());
  });

  it('navigates to previous card on Prev click', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Cat'));
    fireEvent.click(screen.getByRole('button', { name: /next card/i }));
    await waitFor(() => screen.getByText('Dog'));
    fireEvent.click(screen.getByRole('button', { name: /previous card/i }));
    await waitFor(() => expect(screen.getByText('Cat')).toBeTruthy());
  });

  it('prev button is disabled on first card', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Cat'));
    const prevBtn = screen.getByRole('button', { name: /previous card/i });
    expect(prevBtn).toBeDisabled();
  });

  it('toggles known state — changes button label', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Cat'));
    const knownBtn = screen.getByRole('button', { name: /mark as known/i });
    fireEvent.click(knownBtn);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /known!/i })).toBeTruthy(),
    );
  });

  it('calls markKnown service when logged in', async () => {
    vi.mocked(isLoggedIn).mockReturnValue(true);
    renderPage();
    await waitFor(() => screen.getByText('Cat'));
    fireEvent.click(screen.getByRole('button', { name: /mark as known/i }));
    expect(markKnown).toHaveBeenCalledWith('deck-1', 'c1', true);
  });

  it('shows shuffle button and changes label after shuffle', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Cat'));
    expect(screen.getByText(/shuffle cards/i)).toBeTruthy();
    fireEvent.click(screen.getByText(/shuffle cards/i));
    await waitFor(() =>
      expect(screen.getByText(/shuffle again/i)).toBeTruthy(),
    );
  });

  it('shows completion message when all cards are marked known', async () => {
    const oneCard = [MOCK_CARDS[0]!];
    vi.mocked(apiFetch).mockImplementation(async (path: unknown) => {
      if (typeof path === 'string' && path.endsWith('/cards')) return oneCard;
      return { ...MOCK_DECK, cardCount: 1 };
    });
    renderPage();
    await waitFor(() => screen.getByText('Cat'));
    fireEvent.click(screen.getByRole('button', { name: /mark as known/i }));
    await waitFor(() =>
      expect(screen.getByText(/all cards known/i)).toBeTruthy(),
    );
  });

  it('shows error state when API fails', async () => {
    vi.mocked(apiFetch).mockRejectedValue(new Error('Network error'));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/could not load this deck/i)).toBeTruthy(),
    );
  });
});
