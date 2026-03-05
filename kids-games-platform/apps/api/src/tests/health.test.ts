import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApp } from '../app.js';

// Mock the DB so unit tests don't need a real database
vi.mock('../db/client.js', () => ({
  initPool: vi.fn(),
  getPool: vi.fn(() => ({
    query: vi.fn().mockResolvedValue({ rows: [] }),
    end: vi.fn(),
  })),
  closePool: vi.fn(),
}));

// Mock ioredis (optionally loaded in rateLimit plugin)
vi.mock('ioredis', () => ({ default: vi.fn() }));

describe('GET /health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with status ok', async () => {
    const app = await createApp({ logger: false });
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    const body = response.json<{ status: string; db: string }>();
    expect(body.status).toBe('ok');
    expect(body.db).toBe('ok');
    await app.close();
  });
});
