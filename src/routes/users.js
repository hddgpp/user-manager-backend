const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

// GET /api/users — list all users, with optional search
router.get('/', (req, res) => {
  const { q } = req.query;
  let users;

  if (q) {
    const like = `%${q}%`;
    users = db.prepare(`
      SELECT * FROM users
      WHERE name LIKE ? OR id LIKE ? OR createdAt LIKE ? OR expiresAt LIKE ?
      ORDER BY expiresAt ASC
    `).all(like, like, like, like);
  } else {
    users = db.prepare('SELECT * FROM users ORDER BY expiresAt ASC').all();
  }

  // Attach countdown for each user
  const now = new Date();
  const enriched = users.map(user => {
    const msLeft = new Date(user.expiresAt) - now;
    const totalSeconds = Math.max(0, Math.floor(msLeft / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return {
      ...user,
      countdown: { days, hours, minutes },
      daysLeft: Math.ceil(msLeft / (1000 * 60 * 60 * 24)),
      expired: msLeft <= 0,
    };
  });

  res.json(enriched);
});

// POST /api/users — create a new user
router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const id = uuidv4();
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // +30 days

  db.prepare('INSERT INTO users (id, name, createdAt, expiresAt) VALUES (?, ?, ?, ?)')
    .run(id, name.trim(), createdAt, expiresAt);

  res.status(201).json({ id, name: name.trim(), createdAt, expiresAt });
});

// DELETE /api/users/:id — remove a user
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ success: true });
});

// GET /api/users/stats — summary for extension
router.get('/stats', (req, res) => {
  const now = new Date();
  const fiveDaysFromNow = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

  const total = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const expiringSoon = db.prepare(
    'SELECT COUNT(*) as count FROM users WHERE expiresAt <= ?'
  ).get(fiveDaysFromNow).count;

  res.json({ total, expiringSoon });
});

module.exports = router;