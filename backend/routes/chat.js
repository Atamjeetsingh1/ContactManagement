const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Message = require('../models/Message');
const User = require('../models/User');

// All chat routes are protected
router.use(protect);

// @route   GET /api/chat/users
// @desc    Get all registered users (except the requester) for chat selection
// @access  Private
router.get('/users', async (req, res) => {
  try {
    let query = { _id: { $ne: req.user._id } };
    if (req.user.role === 'customer') {
      query.role = 'provider';
    }
    
    const users = await User.find(query)
      .select('name email avatar role createdAt')
      .sort({ name: 1 })
      .lean();

    res.json({ success: true, users });
  } catch (err) {
    console.error('Get chat users error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

// @route   GET /api/chat/messages/:roomId
// @desc    Get chat history for a room (paginated)
// @access  Private
router.get('/messages/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;

    // Ensure requesting user is part of this room
    const [id1, id2] = roomId.split('_');
    if (req.user._id.toString() !== id1 && req.user._id.toString() !== id2) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const skip = (page - 1) * limit;

    const messages = await Message.find({ roomId })
      .sort({ timestamp: -1 }) // newest first
      .skip(skip)
      .limit(limit);

    res.json({ success: true, messages: messages.reverse() }); // return oldest first
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
});

module.exports = router;
