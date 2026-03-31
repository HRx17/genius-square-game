-- Genius Square Database Schema

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_color TEXT NOT NULL DEFAULT '#6366f1',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

CREATE TABLE IF NOT EXISTS game_results (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  winner_id TEXT,
  loser_id TEXT,
  mode TEXT NOT NULL DEFAULT 'online',
  duration_ms INTEGER,
  dice_roll TEXT NOT NULL,
  played_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  FOREIGN KEY (winner_id) REFERENCES users(id),
  FOREIGN KEY (loser_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS user_stats (
  user_id TEXT PRIMARY KEY,
  games_played INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  total_solve_ms INTEGER NOT NULL DEFAULT 0,
  best_solve_ms INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
