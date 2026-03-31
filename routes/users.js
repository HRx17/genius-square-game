const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { getDb } = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'genius_square_secret_2024';

function authMiddleware(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Get user profile + stats
router.get('/profile/:username', (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, username, avatar_color, created_at FROM users WHERE username = ?').get(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const stats = db.prepare('SELECT * FROM user_stats WHERE user_id = ?').get(user.id);
  const recentGames = db.prepare(`
    SELECT gr.*, 
      wu.username as winner_name, lu.username as loser_name
    FROM game_results gr
    LEFT JOIN users wu ON gr.winner_id = wu.id
    LEFT JOIN users lu ON gr.loser_id = lu.id
    WHERE gr.winner_id = ? OR gr.loser_id = ?
    ORDER BY gr.played_at DESC LIMIT 10
  `).all(user.id, user.id);
  res.json({ user, stats: stats || {}, recentGames });
});

// Leaderboard
router.get('/leaderboard', (req, res) => {
  const db = getDb();
  const leaders = db.prepare(`
    SELECT u.id, u.username, u.avatar_color,
      s.games_played, s.wins, s.losses, s.best_solve_ms,
      CASE WHEN s.games_played >= 3 THEN CAST(s.wins AS REAL) / s.games_played ELSE 0 END as win_rate
    FROM users u
    JOIN user_stats s ON u.id = s.user_id
    WHERE s.games_played >= 1
    ORDER BY win_rate DESC, s.wins DESC
    LIMIT 50
  `).all();
  res.json({ leaderboard: leaders });
});

module.exports = { router, authMiddleware };
