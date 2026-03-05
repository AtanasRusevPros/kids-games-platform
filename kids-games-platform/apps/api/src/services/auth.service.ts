import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { getPool } from '../db/client.js';
import * as userRepo from '../repositories/user.repository.js';
import * as tokenRepo from '../repositories/token.repository.js';
import type { UserRow } from '../repositories/user.repository.js';
import { config } from '../config.js';

const SALT_ROUNDS = 12;

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export async function registerUser(
  email: string,
  password: string,
  displayName: string,
): Promise<UserRow> {
  const pool = getPool();
  const existing = await userRepo.findUserByEmail(pool, email);
  if (existing) {
    throw new AuthError('Email already registered', 'EMAIL_TAKEN');
  }
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  return userRepo.createUser(pool, email, passwordHash, displayName);
}

export async function validateCredentials(
  email: string,
  password: string,
): Promise<UserRow> {
  const pool = getPool();
  const user = await userRepo.findUserByEmail(pool, email);
  if (!user) {
    throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS');
  }
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS');
  }
  return user;
}

export function generateRefreshToken(): string {
  return randomBytes(40).toString('hex');
}

export async function persistRefreshToken(
  userId: string,
  token: string,
): Promise<void> {
  const pool = getPool();
  const expiresAt = new Date(Date.now() + config.refreshExpiresInMs);
  await tokenRepo.saveRefreshToken(pool, userId, token, expiresAt);
}

export async function rotateRefreshToken(
  oldToken: string,
): Promise<{ userId: string; newRefreshToken: string }> {
  const pool = getPool();
  const row = await tokenRepo.findRefreshToken(pool, oldToken);
  if (!row || row.expires_at < new Date()) {
    throw new AuthError('Invalid or expired refresh token', 'INVALID_TOKEN');
  }
  // Rotate: delete old, issue new
  await tokenRepo.deleteRefreshToken(pool, oldToken);
  const newRefreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + config.refreshExpiresInMs);
  await tokenRepo.saveRefreshToken(pool, row.user_id, newRefreshToken, expiresAt);
  return { userId: row.user_id, newRefreshToken };
}

export async function logout(refreshToken: string): Promise<void> {
  const pool = getPool();
  await tokenRepo.deleteRefreshToken(pool, refreshToken);
}

export async function logoutAll(userId: string): Promise<void> {
  const pool = getPool();
  await tokenRepo.deleteAllUserRefreshTokens(pool, userId);
}

export async function getUserById(userId: string): Promise<UserRow | null> {
  const pool = getPool();
  return userRepo.findUserById(pool, userId);
}
