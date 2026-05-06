const express = require('express');
const router = express.Router();
const db = require('../db');
const { sendExpiryWarning } = require('../email');

// GET /api/emails — list all recipient emails
router.get('/', (req, res) => {
  const emails = db.prepare('SELECT * FROM emails ORDER BY id ASC').all();
  res.json(emails);
});

// POST /api/emails — add a new email
router.post('/', (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }
  try {
    const result = db.prepare('INSERT INTO emails (email) VALUES (?)').run(email.trim());
    res.status(201).json({ id: result.lastInsertRowid, email: email.trim() });
  } catch {
    res.status(409).json({ error: 'Email already exists' });
  }
});

// DELETE /api/emails/:id — remove an email
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM emails WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

// POST /api/emails/send-blast — manually send email to all recipients
router.post('/send-blast', async (req, res) => {
  const emails = db.prepare('SELECT email FROM emails').all();
  if (emails.length === 0) {
    return res.status(400).json({ error: 'No recipients configured' });
  }

  const now = new Date();
  const fiveDaysFromNow = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  const users = db.prepare(
    'SELECT * FROM users WHERE expiresAt <= ? ORDER BY expiresAt ASC'
  ).all(fiveDaysFromNow.toISOString());

  if (users.length === 0) {
    return res.status(400).json({ error: 'No users expiring within 5 days' });
  }

  try {
    for (const user of users) {
      const msLeft = new Date(user.expiresAt) - now;
      const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
      await sendExpiryWarning(user, daysLeft, emails.map(e => e.email));
    }
    res.json({ success: true, sent: users.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send emails: ' + err.message });
  }
});

module.exports = router;