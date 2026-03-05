// Core domain types shared between API and web client

export type UserId = string;
export type DeckId = string;
export type CardId = string;
export type GameId = string;

export interface User {
  id: UserId;
  email: string;
  displayName: string;
  createdAt?: string;
}

export interface Game {
  id: GameId;
  title: string;
  status: 'enabled' | 'disabled';
  description?: string;
  iconEmoji?: string;
}

export interface Deck {
  id: DeckId;
  gameId: GameId;
  languageCode: string;
  title: string;
  description: string;
  cardCount: number;
  version: number;
  createdAt: string;
}

export interface Card {
  id: CardId;
  deckId: DeckId;
  term: string;
  imagePath: string | null;
  audioPath: string | null;
  tags: string[];
}

export interface DeckProgress {
  userId: UserId;
  deckId: DeckId;
  lastIndex: number;
  knownCount: number;
  totalCards: number;
  knownCardIds: CardId[];
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
}

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
}
