-- Migration: 001_initial_schema
-- Creates all MVP tables

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);

-- Refresh tokens (for server-side logout)
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS refresh_tokens_user_id_idx ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_expires_idx ON refresh_tokens(expires_at);

-- Games catalog
CREATE TABLE IF NOT EXISTS games (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon_emoji  TEXT NOT NULL DEFAULT '🎮',
  status      TEXT NOT NULL DEFAULT 'enabled' CHECK (status IN ('enabled', 'disabled')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Decks (for flashcards; multi-language ready)
CREATE TABLE IF NOT EXISTS decks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id       TEXT NOT NULL REFERENCES games(id),
  language_code TEXT NOT NULL DEFAULT 'en',
  title         TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  version       INT NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS decks_game_id_lang_idx ON decks(game_id, language_code);

-- Cards
CREATE TABLE IF NOT EXISTS cards (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id     UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  term        TEXT NOT NULL,
  image_path  TEXT,
  audio_path  TEXT,
  tags        TEXT[] NOT NULL DEFAULT '{}',
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cards_deck_id_idx ON cards(deck_id, sort_order);

-- User deck progress (summary)
CREATE TABLE IF NOT EXISTS user_deck_progress (
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deck_id     UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  last_index  INT NOT NULL DEFAULT 0,
  known_count INT NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, deck_id)
);

-- User known cards (normalized)
CREATE TABLE IF NOT EXISTS user_known_cards (
  user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id  UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  deck_id  UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  known_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, card_id)
);

CREATE INDEX IF NOT EXISTS user_known_cards_deck_idx ON user_known_cards(user_id, deck_id);

-- Points
CREATE TABLE IF NOT EXISTS user_points (
  user_id      UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_points INT NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_game_points (
  user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id  TEXT NOT NULL REFERENCES games(id),
  points   INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, game_id)
);

-- Idempotency keys (for retried writes)
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key         TEXT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  response    JSONB NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idempotency_expires_idx ON idempotency_keys(expires_at);

-- Sessions (future-ready for multiplayer)
CREATE TABLE IF NOT EXISTS sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id     TEXT NOT NULL REFERENCES games(id),
  mode        TEXT NOT NULL DEFAULT 'single' CHECK (mode IN ('single', 'pvp', 'bot')),
  state_json  JSONB NOT NULL DEFAULT '{}',
  version     INT NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
