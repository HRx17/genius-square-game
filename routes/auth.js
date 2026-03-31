const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'genius_square_secret_2024';
const AVATAR_COLORS = ['#6366f1','#8b5cf6','#ec4899','#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#14b8a6'];

router.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'All fields required' });
    if (username.length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
    if (existing) return res.status(409).json({ error: 'Email or username already taken' });

    const id = uuidv4();
    const password_hash = await bcrypt.hash(password, 12);
    const avatar_color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

    db.prepare('INSERT INTO users (id, username, email, password_hash, avatar_color) VALUES (?, ?, ?, ?, ?)').run(id, username, email, password_hash, avatar_color);
    db.prepare('INSERT INTO user_stats (user_id) VALUES (?)').run(id);

    const token = jwt.sign({ userId: id, username }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 3600 * 1000, sameSite: 'lax' });
    res.json({ user: { id, username, email, avatar_color } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 3600 * 1000, sameSite: 'lax' });
    res.json({ user: { id: user.id, username: user.username, email: user.email, avatar_color: user.avatar_color } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  try {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ error: 'Not authenticated' });
    const payload = jwt.verify(token, JWT_SECRET);
    const db = getDb();
    const user = db.prepare('SELECT id, username, email, avatar_color, created_at FROM users WHERE id = ?').get(payload.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
