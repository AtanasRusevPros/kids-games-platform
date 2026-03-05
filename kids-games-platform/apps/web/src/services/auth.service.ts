import { apiFetch, setTokens, clearTokens, getAccessToken } from './api.js';
import type { User } from '@kids-games/shared';

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export async function register(
  email: string,
  password: string,
  displayName: string,
): Promise<LoginResult> {
  const result = await apiFetch<LoginResult>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, displayName }),
  });
  setTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
  return result;
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const result = await apiFetch<LoginResult>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
  return result;
}

export async function logout(): Promise<void> {
  const refreshToken = localStorage.getItem('kg_refresh_token');
  try {
    await apiFetch('/auth/logout', {
      method: 'POST',
      auth: true,
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    // Best-effort logout
  } finally {
    clearTokens();
  }
}

export function isLoggedIn(): boolean {
  return !!getAccessToken();
}

export async function getMe(): Promise<User> {
  return apiFetch<User>('/auth/me', { auth: true });
}
