require('dotenv').config();
const express = require('express');
const cors = require('cors');
const usersRouter = require('./src/routes/users');
const { startScheduler } = require('./src/scheduler');

const app = express();
const PORT = process.env.PORT || 3001;

// Allow requests from any origin (extension + website)
app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Routes
app.use('/api/users', usersRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startScheduler();
});