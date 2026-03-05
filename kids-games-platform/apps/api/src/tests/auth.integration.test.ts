/**
 * Integration tests for /auth routes.
 * Requires a running PostgreSQL database (TEST_DATABASE_URL).
 * Run dev-db.sh first, then these tests will create/cleanup test data.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../app.js';
import { getPool } from '../db/client.js';
import { testConfig } from '../config.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

beforeAll(async () => {
  app = await createApp({ logger: false, databaseUrl: testConfig.databaseUrl });
  await getPool().query('DELETE FROM users WHERE email LIKE $1', ['%@test-integration.com']);
});

afterAll(async () => {
  await getPool().query('DELETE FROM users WHERE email LIKE $1', ['%@test-integration.com']);
  await app.close();
});

const TEST_EMAIL = 'user@test-integration.com';
const TEST_PASS = 'TestPass123!';
const TEST_NAME = 'Integration User';

describe('POST /auth/register', () => {
  it('creates a new user and returns tokens', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: TEST_EMAIL, password: TEST_PASS, displayName: TEST_NAME },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json<{
      accessToken: string;
      refreshToken: string;
      user: { id: string; email: string; displayName: string };
    }>();
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();
    expect(body.user.email).toBe(TEST_EMAIL);
    expect(body.user.displayName).toBe(TEST_NAME);
  });

  it('returns 409 when email already taken', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: TEST_EMAIL, password: TEST_PASS, displayName: TEST_NAME },
    });
    expect(res.statusCode).toBe(409);
  });

  it('returns 400 for invalid email', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'not-an-email', password: TEST_PASS, displayName: TEST_NAME },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('POST /auth/login', () => {
  it('returns tokens for valid credentials', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: TEST_EMAIL, password: TEST_PASS },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ accessToken: string; refreshToken: string }>();
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();
  });

  it('returns 401 for wrong password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: TEST_EMAIL, password: 'wrongpassword' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 for unknown email', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'nobody@test-integration.com', password: TEST_PASS },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /auth/refresh', () => {
  it('rotates refresh token and returns new access token', async () => {
    // Login to get tokens
    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: TEST_EMAIL, password: TEST_PASS },
    });
    const { refreshToken } = loginRes.json<{ refreshToken: string }>();

    const refreshRes = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken },
    });
    expect(refreshRes.statusCode).toBe(200);
    const body = refreshRes.json<{ accessToken: string; refreshToken: string }>();
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).not.toBe(refreshToken);
  });

  it('returns 401 for invalid refresh token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken: 'invalid-token-abc123' },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /auth/me', () => {
  it('returns user info with valid token', async () => {
    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: TEST_EMAIL, password: TEST_PASS },
    });
    const { accessToken } = loginRes.json<{ accessToken: string }>();

    const meRes = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(meRes.statusCode).toBe(200);
    const body = meRes.json<{ email: string }>();
    expect(body.email).toBe(TEST_EMAIL);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/auth/me' });
    expect(res.statusCode).toBe(401);
  });
});
