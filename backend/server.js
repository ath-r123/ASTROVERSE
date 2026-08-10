require('dotenv').config();
require('./utils/ephemeris');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDatabase = require('./config/db');
const { notFound, handleError } = require('./middleware/errors');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Dynamic allowed origins for development, staging, and production (Vercel)
const allowedOrigins = [
  'https://astroverse-iota.vercel.app',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
  process.env.CLIENT_URL
].filter(Boolean);

// CORS Origin Validation Function
const corsOriginValidator = function (origin, callback) {
  // Allow requests with no origin (like mobile apps, Postman, or server-to-server curl)
  if (!origin) return callback(null, true);

  if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
    return callback(null, true);
  }
  return callback(new Error(`CORS policy violation: Origin '${origin}' not allowed.`));
};

// Initialize Socket.io with updated CORS configuration
const io = new Server(server, {
  cors: {
    origin: corsOriginValidator,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Configure Express CORS middleware
app.use(cors({
  origin: corsOriginValidator,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Express Body Parsers & Routes
app.use(express.json({ limit: '1mb' }));
app.use('/api/wallet', require('./routes/wallet'));

// Health Check
app.get('/api/health', (req, res) => res.json({ message: 'Astroverse API is running.' }));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/astrologers', require('./routes/astrologers'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/calculations', require('./routes/calculations'));

// ============================================================
// REAL-TIME SOCKET.IO CONSULTATION CHAT ENGINE
// ============================================================
io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  // Join Consultation Room
  socket.on('join_session', ({ sessionId, userId, role }) => {
    socket.join(sessionId);
    socket.sessionId = sessionId;
    socket.userId = userId;
    socket.role = role;

    console.log(`[Socket] User ${userId} (${role}) joined session: ${sessionId}`);

    io.to(sessionId).emit('user_joined', {
      userId,
      role,
      message: `${role === 'astrologer' ? 'Astrologer' : 'Client'} connected to consultation.`
    });
  });

  // Handle Real-Time Chat Message
  socket.on('send_message', ({ sessionId, senderId, senderName, text }) => {
    const messageData = {
      id: Date.now().toString(),
      senderId,
      senderName,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    io.to(sessionId).emit('receive_message', messageData);
  });

  // End Consultation Session
  socket.on('end_session', ({ sessionId }) => {
    io.to(sessionId).emit('session_ended', { message: 'Consultation session ended.' });
    socket.leave(sessionId);
  });

  socket.on('disconnect', () => {
    if (socket.sessionId) {
      io.to(socket.sessionId).emit('user_disconnected', { userId: socket.userId, role: socket.role });
    }
    console.log(`[Socket] Disconnected: ${socket.id}`);
  });
});

// Error Handlers
app.use(notFound);
app.use(handleError);

// Start Server with Database Connection
const port = process.env.PORT || 5000;
connectDatabase()
  .then(() => server.listen(port, () => console.log(`API & Socket.io server running on http://localhost:${port}`)))
  .catch((error) => {
    console.error(`Database connection failed: ${error.message}`);
    process.exit(1);
  });