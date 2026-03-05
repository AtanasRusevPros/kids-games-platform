import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';

// Mock the DB modules
vi.mock('../db/client.js', () => ({
  getPool: vi.fn(() => ({})),
}));

vi.mock('../repositories/user.repository.js', () => ({
  findUserByEmail: vi.fn(),
  findUserById: vi.fn(),
  createUser: vi.fn(),
}));

vi.mock('../repositories/token.repository.js', () => ({
  saveRefreshToken: vi.fn(),
  findRefreshToken: vi.fn(),
  deleteRefreshToken: vi.fn(),
  deleteAllUserRefreshTokens: vi.fn(),
}));

import * as userRepo from '../repositories/user.repository.js';
import * as tokenRepo from '../repositories/token.repository.js';
import {
  registerUser,
  validateCredentials,
  generateRefreshToken,
  rotateRefreshToken,
} from '../services/auth.service.js';

beforeEach(() => { vi.clearAllMocks(); });

describe('registerUser', () => {
  it('throws EMAIL_TAKEN when email already exists', async () => {
    vi.mocked(userRepo.findUserByEmail).mockResolvedValue({
      id: '1',
      email: 'a@b.com',
      password_hash: 'x',
      display_name: 'A',
      created_at: new Date(),
      updated_at: new Date(),
    });

    await expect(
      registerUser('a@b.com', 'password', 'A'),
    ).rejects.toMatchObject({ code: 'EMAIL_TAKEN' });
  });

  it('creates user when email is new', async () => {
    vi.mocked(userRepo.findUserByEmail).mockResolvedValue(null);
    vi.mocked(userRepo.createUser).mockResolvedValue({
      id: 'uuid-1',
      email: 'new@test.com',
      password_hash: 'hash',
      display_name: 'New User',
      created_at: new Date(),
      updated_at: new Date(),
    });

    const user = await registerUser('new@test.com', 'password123', 'New User');
    expect(user.email).toBe('new@test.com');
    expect(userRepo.createUser).toHaveBeenCalledOnce();
  });
});

describe('validateCredentials', () => {
  it('throws INVALID_CREDENTIALS when user not found', async () => {
    vi.mocked(userRepo.findUserByEmail).mockResolvedValue(null);
    await expect(
      validateCredentials('x@x.com', 'pass'),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });

  it('throws INVALID_CREDENTIALS when password wrong', async () => {
    const hash = await bcrypt.hash('correct', 10);
    vi.mocked(userRepo.findUserByEmail).mockResolvedValue({
      id: '1',
      email: 'x@x.com',
      password_hash: hash,
      display_name: 'X',
      created_at: new Date(),
      updated_at: new Date(),
    });
    await expect(
      validateCredentials('x@x.com', 'wrong'),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });

  it('returns user when credentials are correct', async () => {
    const hash = await bcrypt.hash('correct', 10);
    const mockUser = {
      id: '1',
      email: 'x@x.com',
      password_hash: hash,
      display_name: 'X',
      created_at: new Date(),
      updated_at: new Date(),
    };
    vi.mocked(userRepo.findUserByEmail).mockResolvedValue(mockUser);
    const user = await validateCredentials('x@x.com', 'correct');
    expect(user.id).toBe('1');
  });
});

describe('generateRefreshToken', () => {
  it('returns a hex string of 80 chars', () => {
    const token = generateRefreshToken();
    expect(token).toMatch(/^[0-9a-f]{80}$/);
  });

  it('returns unique tokens', () => {
    expect(generateRefreshToken()).not.toBe(generateRefreshToken());
  });
});

describe('rotateRefreshToken', () => {
  it('throws INVALID_TOKEN when token not in DB', async () => {
    vi.mocked(tokenRepo.findRefreshToken).mockResolvedValue(null);
    await expect(rotateRefreshToken('bad-token')).rejects.toMatchObject({
      code: 'INVALID_TOKEN',
    });
  });

  it('throws INVALID_TOKEN when token is expired', async () => {
    vi.mocked(tokenRepo.findRefreshToken).mockResolvedValue({
      user_id: '1',
      expires_at: new Date(Date.now() - 1000), // expired
    });
    await expect(rotateRefreshToken('expired')).rejects.toMatchObject({
      code: 'INVALID_TOKEN',
    });
  });
});
