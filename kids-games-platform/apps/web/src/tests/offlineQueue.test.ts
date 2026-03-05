import { enqueue, flushQueue, queueSize } from '../services/offlineQueue.js';

vi.mock('../services/api.js', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from '../services/api.js';

describe('offlineQueue', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('enqueue adds an item and queueSize reflects it', () => {
    expect(queueSize()).toBe(0);
    enqueue('/test', 'POST', { data: 1 });
    expect(queueSize()).toBe(1);
  });

  it('enqueue returns a unique id each time', () => {
    const id1 = enqueue('/test', 'POST', { a: 1 });
    const id2 = enqueue('/test', 'POST', { a: 2 });
    expect(id1).not.toBe(id2);
    expect(queueSize()).toBe(2);
  });

  it('flushQueue sends each item and clears the queue on success', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ ok: true });
    enqueue('/path1', 'POST', { a: 1 });
    enqueue('/path2', 'POST', { b: 2 });

    await flushQueue();

    expect(apiFetch).toHaveBeenCalledTimes(2);
    expect(queueSize()).toBe(0);
  });

  it('flushQueue uses the item id as the Idempotency-Key header', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ ok: true });
    const id = enqueue('/path', 'POST', { x: 1 });

    await flushQueue();

    expect(apiFetch).toHaveBeenCalledWith(
      '/path',
      expect.objectContaining({
        headers: expect.objectContaining({ 'Idempotency-Key': id }),
      }),
    );
  });

  it('flushQueue keeps failed items in queue', async () => {
    vi.mocked(apiFetch).mockRejectedValue(new Error('Network error'));
    enqueue('/path1', 'POST', { a: 1 });

    await flushQueue();

    expect(queueSize()).toBe(1);
  });

  it('flushQueue retries only failed items on next flush', async () => {
    vi.mocked(apiFetch)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValue({ ok: true });

    enqueue('/path', 'POST', { x: 1 });
    await flushQueue();
    expect(queueSize()).toBe(1); // still there

    await flushQueue();
    expect(queueSize()).toBe(0); // cleared on second flush
  });

  it('flushQueue does nothing when queue is empty', async () => {
    await flushQueue();
    expect(apiFetch).not.toHaveBeenCalled();
  });
});
