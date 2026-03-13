const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Message = require('./models/Message');
const Notification = require('./models/Notification');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

module.exports = { app, server, io };

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

    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    socket.user = { 
      id: user._id.toString(), 
      name: user.name, 
      email: user.email,
      role: user.role
    };
    
    socket.join(`user_${user._id.toString()}`);
    next();
  } catch (err) {
    return next(new Error('Authentication error: Invalid token'));
  }
});

// ─── Online Users Map ─────────────────────────────────────────────────────────
const onlineUsers = new Map();

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

io.on('connection', (socket) => {
  console.log(`🔌 Connected: ${socket.user.name} (${socket.id})`);
  
  onlineUsers.set(socket.user.id, {
    socketId: socket.id,
    name: socket.user.name,
    role: socket.user.role,
    onlineAt: new Date()
  });

  io.emit('users_online', Array.from(onlineUsers.keys()));

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

  socket.on('leave_room', (roomId) => {
    socket.leave(roomId);
  });

  // ─── Send Message with Advanced Features ─────────────────────────────────────
  socket.on('send_message', async ({ roomId, message, type = 'text', attachments, contactCard }) => {
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
      if (!trimmed || trimmed.length > 5000) {
        return socket.emit('error', { message: 'Invalid message length' });
      }

      const newMsg = new Message({
        roomId,
        senderId: socket.user.id,
        senderName: socket.user.name,
        message: trimmed,
        type: type || 'text',
        attachments: attachments || [],
        contactCard: contactCard || null,
        deliveredAt: new Date()
      });
      await newMsg.save();

      const messageData = {
        _id: newMsg._id,
        roomId,
        senderId: socket.user.id,
        senderName: socket.user.name,
        message: trimmed,
        type: newMsg.type,
        attachments: newMsg.attachments,
        contactCard: newMsg.contactCard,
        reactions: [],
        isEdited: false,
        isDeleted: false,
        isPinned: false,
        deliveredAt: newMsg.deliveredAt,
        timestamp: newMsg.timestamp
      };

      io.to(roomId).emit('receive_message', messageData);

      // Send notification to recipient
      const recipientId = id1 === socket.user.id ? id2 : id1;
      const notification = await Notification.create({
        recipient: recipientId,
        sender: socket.user.id,
        type: 'new_message',
        title: 'New Message',
        message: `${socket.user.name}: ${trimmed.substring(0, 100)}`,
        relatedId: newMsg._id,
        relatedType: 'message'
      });
      
      const populatedNotif = await Notification.findById(notification._id)
        .populate('sender', 'name email');
      io.to(`user_${recipientId}`).emit('notification', populatedNotif);

    } catch (err) {
      console.error('send_message error:', err);
      socket.emit('error', { message: 'Message failed to send' });
    }
  });

  // ─── Message Reactions ───────────────────────────────────────────────────────
  socket.on('add_reaction', async ({ messageId, emoji }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return;

      const existingReaction = message.reactions.find(
        r => r.user.toString() === socket.user.id
      );

      if (existingReaction) {
        existingReaction.emoji = emoji;
        existingReaction.timestamp = new Date();
      } else {
        message.reactions.push({ user: socket.user.id, emoji });
      }
      
      await message.save();
      io.to(message.roomId).emit('message_reaction', {
        messageId,
        reactions: message.reactions
      });
    } catch (err) {
      console.error('add_reaction error:', err);
    }
  });

  socket.on('remove_reaction', async ({ messageId }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return;

      message.reactions = message.reactions.filter(
        r => r.user.toString() !== socket.user.id
      );
      
      await message.save();
      io.to(message.roomId).emit('message_reaction', {
        messageId,
        reactions: message.reactions
      });
    } catch (err) {
      console.error('remove_reaction error:', err);
    }
  });

  // ─── Message Editing ─────────────────────────────────────────────────────────
  socket.on('edit_message', async ({ messageId, newMessage }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return;
      
      if (message.senderId.toString() !== socket.user.id) {
        return socket.emit('error', { message: 'Cannot edit others\' messages' });
      }

      message.message = newMessage;
      message.isEdited = true;
      message.editedAt = new Date();
      await message.save();

      io.to(message.roomId).emit('message_edited', {
        messageId,
        newMessage: message.message,
        editedAt: message.editedAt
      });
    } catch (err) {
      console.error('edit_message error:', err);
    }
  });

  // ─── Message Deletion ────────────────────────────────────────────────────────
  socket.on('delete_message', async ({ messageId }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return;
      
      if (message.senderId.toString() !== socket.user.id) {
        return socket.emit('error', { message: 'Cannot delete others\' messages' });
      }

      await Message.findByIdAndUpdate(messageId, {
        isDeleted: true,
        deletedAt: new Date()
      });

      io.to(message.roomId).emit('message_deleted', { messageId });
    } catch (err) {
      console.error('delete_message error:', err);
    }
  });

  // ─── Pin Message ─────────────────────────────────────────────────────────────
  socket.on('pin_message', async ({ messageId }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return;

      message.isPinned = !message.isPinned;
      await message.save();

      io.to(message.roomId).emit('message_pinned', {
        messageId,
        isPinned: message.isPinned
      });
    } catch (err) {
      console.error('pin_message error:', err);
    }
  });

  // ─── Message Read Receipts ───────────────────────────────────────────────────
  socket.on('mark_read', async ({ roomId, messageId }) => {
    try {
      const message = await Message.findById(messageId);
      if (message && !message.readAt) {
        message.readAt = new Date();
        await message.save();
        
        io.to(roomId).emit('message_read', {
          messageId,
          readAt: message.readAt,
          readerId: socket.user.id
        });
      }
    } catch (err) {
      console.error('mark_read error:', err);
    }
  });

  // ─── Typing Indicator ───────────────────────────────────────────────────────
  socket.on('typing', ({ roomId }) => {
    socket.to(roomId).emit('user_typing', {
      userId: socket.user.id,
      name: socket.user.name
    });
  });

  socket.on('stop_typing', ({ roomId }) => {
    socket.to(roomId).emit('user_stop_typing', { userId: socket.user.id });
  });

  // ─── Search Messages ────────────────────────────────────────────────────────
  socket.on('search_messages', async ({ roomId, query }) => {
    try {
      const messages = await Message.find({
        roomId,
        message: { $regex: query, $options: 'i' },
        isDeleted: false
      })
        .sort({ timestamp: -1 })
        .limit(20)
        .select('message senderName timestamp');

      socket.emit('search_results', messages);
    } catch (err) {
      console.error('search_messages error:', err);
    }
  });

  // ─── Get Pinned Messages ────────────────────────────────────────────────────
  socket.on('get_pinned', async ({ roomId }) => {
    try {
      const pinned = await Message.find({ roomId, isPinned: true })
        .sort({ timestamp: -1 })
        .limit(10);
      socket.emit('pinned_messages', pinned);
    } catch (err) {
      console.error('get_pinned error:', err);
    }
  });

  socket.on('disconnect', async () => {
    console.log(`❌ Disconnected: ${socket.user.name}`);
    
    onlineUsers.delete(socket.user.id);
    io.emit('users_online', Array.from(onlineUsers.keys()));
    
    try {
      await User.findByIdAndUpdate(socket.user.id, {
        isOnline: false,
        lastSeen: new Date()
      });
    } catch (err) {
      console.error('Error updating user status:', err);
    }
  });
});

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Upload Route (Cloudinary) ───────────────────────────────────────────────
const { upload } = require('./upload');
const { protect } = require('./middleware/authMiddleware');

app.post('/api/upload', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    res.json({
      success: true,
      file: {
        url: req.file.path,
        filename: req.file.filename,
        fileType: req.file.mimetype,
        size: req.file.size
      }
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/users', require('./routes/users'));

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