const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    index: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderName: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: function() { return !this.isDeleted; },
    maxlength: 5000,
    default: ''
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'contact'],
    default: 'text'
  },
  attachments: [{
    url: String,
    filename: String,
    fileType: String,
    size: Number
  }],
  contactCard: {
    name: String,
    phone: String,
    email: String,
    linkedin: String,
    company: String,
    experience: String,
    location: String,
    notes: String
  },
  reactions: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    emoji: String,
    timestamp: { type: Date, default: Date.now }
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date,
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  deliveredAt: {
    type: Date,
    default: null
  },
  readAt: {
    type: Date,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

messageSchema.index({ roomId: 1, timestamp: -1 });
messageSchema.index({ roomId: 1, isPinned: 1 });

module.exports = mongoose.model('Message', messageSchema);
