require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDatabase = require('./config/db');
const { notFound, handleError } = require('./middleware/errors');

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => res.json({ message: 'Astroverse API is running.' }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/astrologers', require('./routes/astrologers'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/calculations', require('./routes/calculations'));
app.use(notFound);
app.use(handleError);

const port = process.env.PORT || 5000;
connectDatabase()
  .then(() => app.listen(port, () => console.log(`API running on http://localhost:${port}`)))
  .catch((error) => {
    console.error(`Database connection failed: ${error.message}`);
    process.exit(1);
  });
