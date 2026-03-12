const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Message = require('./models/Message');

dotenv.config();

const app = express();
const server = http.createServer(app);

// ─── Socket.io Setup ──────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// ─── Socket Auth Middleware ───────────────────────────────────────────────────
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return next(new Error('Authentication error: User not found'));

    socket.user = { id: user._id.toString(), name: user.name, email: user.email };
    next();
  } catch (err) {
    return next(new Error('Authentication error: Invalid token'));
  }
});

// ─── Rate Limiter (in-memory) ─────────────────────────────────────────────────
const rateLimiter = new Map();

const isRateLimited = (userId) => {
  const now = Date.now();
  const last = rateLimiter.get(userId);
  if (last && now - last < 500) return true;
  rateLimiter.set(userId, now);
  return false;
};

// Cleanup rate limiter every 5 min
setInterval(() => {
  const cutoff = Date.now() - 60000;
  for (const [key, val] of rateLimiter) {
    if (val < cutoff) rateLimiter.delete(key);
  }
}, 5 * 60 * 1000);

// ─── Socket Events ────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`🔌 Connected: ${socket.user.name} (${socket.id})`);

  // Join room — roomId is a sorted pair of two userIds: "userId1_userId2"
  socket.on('join_room', (roomId) => {
    try {
      const [id1, id2] = roomId.split('_');
      if (socket.user.id !== id1 && socket.user.id !== id2) {
        return socket.emit('error', { message: 'Access denied to this room' });
      }
      socket.join(roomId);
      console.log(`👤 ${socket.user.name} joined room: ${roomId}`);
    } catch (err) {
      socket.emit('error', { message: 'Could not join room' });
    }
  });

  socket.on('send_message', async ({ roomId, message }) => {
    try {
      const [id1, id2] = roomId.split('_');
      if (socket.user.id !== id1 && socket.user.id !== id2) {
        return socket.emit('error', { message: 'Access denied' });
      }

      if (isRateLimited(socket.user.id)) {
        return socket.emit('error', { message: 'Sending too fast. Slow down!' });
      }

      if (!message || typeof message !== 'string') return;
      const trimmed = message.trim();
      if (!trimmed || trimmed.length > 1000) {
        return socket.emit('error', { message: 'Invalid message length' });
      }

      const newMsg = new Message({
        roomId,
        senderId: socket.user.id,
        senderName: socket.user.name,
        message: trimmed,
      });
      await newMsg.save();

      io.to(roomId).emit('receive_message', {
        _id: newMsg._id,
        senderId: socket.user.id,
        senderName: socket.user.name,
        message: trimmed,
        timestamp: newMsg.timestamp,
      });
    } catch (err) {
      console.error('send_message error:', err);
      socket.emit('error', { message: 'Message failed to send' });
    }
  });

  socket.on('typing', ({ roomId }) => {
    socket.to(roomId).emit('user_typing', socket.user.name);
  });

  socket.on('stop_typing', ({ roomId }) => {
    socket.to(roomId).emit('user_stop_typing');
  });

  socket.on('disconnect', () => {
    console.log(`❌ Disconnected: ${socket.user.name}`);
  });
});

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/chat', require('./routes/chat'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Contact Manager API is running' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// ─── Connect DB & Start Server ────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/contact_manager';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 API: http://localhost:${PORT}/api`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

module.exports = server;