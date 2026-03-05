import type { ComponentType } from 'react';

export interface GameRoute {
  path: string;
  component: ComponentType;
}

export interface GameContext {
  api: ApiClient;
  auth: AuthStore;
  i18n: I18nHelper;
  points: PointsService;
}

export interface ApiClient {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
}

export interface AuthStore {
  getAccessToken(): string | null;
  getUserId(): string | null;
  isAuthenticated(): boolean;
}

export interface I18nHelper {
  t(key: string): string;
  locale: string;
}

export interface PointsService {
  award(gameId: string, points: number): Promise<void>;
}

export interface GameModule {
  id: string;
  title: string;
  description: string;
  iconEmoji: string;
  routes: GameRoute[];
  requiresAuth: boolean;
  init?: (ctx: GameContext) => Promise<void>;
}
