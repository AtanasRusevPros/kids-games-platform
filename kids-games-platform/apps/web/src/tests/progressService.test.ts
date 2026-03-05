vi.mock('../services/api.js', () => ({
  apiFetch: vi.fn(),
}));

vi.mock('../services/offlineQueue.js', () => ({
  enqueue: vi.fn(),
  flushQueue: vi.fn().mockResolvedValue(undefined),
}));

import { savePosition, markKnown, getDeckProgress } from '../services/progress.service.js';
import { apiFetch } from '../services/api.js';
import { enqueue } from '../services/offlineQueue.js';

describe('progress.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  describe('getDeckProgress', () => {
    it('fetches progress from API with auth flag', async () => {
      vi.mocked(apiFetch).mockResolvedValue({
        lastIndex: 2,
        knownCount: 5,
        knownCardIds: ['id1'],
        updatedAt: null,
      });
      const result = await getDeckProgress('deck-1');
      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/progress'),
        expect.objectContaining({ auth: true }),
      );
      expect(result.lastIndex).toBe(2);
      expect(result.knownCount).toBe(5);
      expect(result.knownCardIds).toContain('id1');
    });
  });

  describe('savePosition', () => {
    it('calls API when online', async () => {
      vi.mocked(apiFetch).mockResolvedValue({ ok: true });
      await savePosition('deck-1', 3);
      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/progress/position'),
        expect.objectContaining({ method: 'POST' }),
      );
      expect(enqueue).not.toHaveBeenCalled();
    });

    it('includes lastIndex in request body', async () => {
      vi.mocked(apiFetch).mockResolvedValue({ ok: true });
      await savePosition('deck-1', 7);
      expect(apiFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ body: JSON.stringify({ lastIndex: 7 }) }),
      );
    });

    it('enqueues write when offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
      await savePosition('deck-1', 3);
      expect(apiFetch).not.toHaveBeenCalled();
      expect(enqueue).toHaveBeenCalledWith(
        expect.stringContaining('/progress/position'),
        'POST',
        { lastIndex: 3 },
      );
    });

    it('enqueues write when API call throws', async () => {
      vi.mocked(apiFetch).mockRejectedValue(new Error('Network error'));
      await savePosition('deck-1', 3);
      expect(enqueue).toHaveBeenCalled();
    });
  });

  describe('markKnown', () => {
    it('calls API when online', async () => {
      vi.mocked(apiFetch).mockResolvedValue({ ok: true });
      await markKnown('deck-1', 'card-1', true);
      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/progress/known'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('includes cardId and known in request body', async () => {
      vi.mocked(apiFetch).mockResolvedValue({ ok: true });
      await markKnown('deck-1', 'card-abc', false);
      expect(apiFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ body: JSON.stringify({ cardId: 'card-abc', known: false }) }),
      );
    });

    it('enqueues write when offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
      await markKnown('deck-1', 'card-1', true);
      expect(enqueue).toHaveBeenCalledWith(
        expect.stringContaining('/progress/known'),
        'POST',
        { cardId: 'card-1', known: true },
      );
    });

    it('enqueues write when API call throws', async () => {
      vi.mocked(apiFetch).mockRejectedValue(new Error('error'));
      await markKnown('deck-1', 'card-1', true);
      expect(enqueue).toHaveBeenCalled();
    });
  });
});
