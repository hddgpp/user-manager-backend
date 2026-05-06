const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Parse comma-separated recipients from .env
function getRecipients() {
  return process.env.EMAIL_RECIPIENTS
    ? process.env.EMAIL_RECIPIENTS.split(',').map(e => e.trim())
    : [];
}

async function sendExpiryWarning(user, daysLeft, recipients) {
  // Use passed recipients, fall back to .env if none passed
  const to = recipients && recipients.length > 0
    ? recipients
    : getRecipients();

  if (to.length === 0) return;

  const urgency = daysLeft <= 1 ? '🚨 URGENT' : '⚠️ Warning';
  const subject = `${urgency}: User "${user.name}" expires in ${daysLeft} day(s)`;

  const html = `
    <div style="font-family: sans-serif; max-width: 500px;">
      <h2 style="color: ${daysLeft <= 1 ? '#dc2626' : '#d97706'}">
        ${urgency}: User Expiring Soon
      </h2>
      <table style="border-collapse: collapse; width: 100%;">
        <tr><td style="padding: 8px; font-weight: bold;">Name</td><td>${user.name}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">ID</td><td style="font-family: monospace">${user.id}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Created</td><td>${new Date(user.createdAt).toLocaleDateString()}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Expires</td><td>${new Date(user.expiresAt).toLocaleDateString()}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Days Left</td><td style="color: #dc2626; font-weight: bold;">${daysLeft}</td></tr>
      </table>
      <p style="color: #6b7280; font-size: 12px; margin-top: 16px;">Sent by User Management System</p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: to.join(', '),
    subject,
    html,
  });

  console.log(`Email sent for ${user.name} (${daysLeft}d left) → ${to.join(', ')}`);
}

module.exports = { sendExpiryWarning };