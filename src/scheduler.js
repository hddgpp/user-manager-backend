const cron = require('node-cron');
const db = require('./db');
const { sendExpiryWarning } = require('./email');

// Runs every day at 8:00 AM
function startScheduler() {
  cron.schedule('0 8 * * *', async () => {
    console.log('Running daily expiry check...');
    const now = new Date();

    const users = db.prepare('SELECT * FROM users').all();

    for (const user of users) {
      const expiresAt = new Date(user.expiresAt);
      const msLeft = expiresAt - now;
      const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

      if (daysLeft === 5) {
        await sendExpiryWarning(user, 5);
      } else if (daysLeft === 1) {
        await sendExpiryWarning(user, 1);
      }
    }
  });

  console.log('Scheduler started — checks daily at 8:00 AM');
}

module.exports = { startScheduler };