const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  title: {
    type: String,
    required: [true, 'Request title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
    default: ''
  },
  category: {
    type: String,
    enum: ['developer', 'designer', 'marketer', 'writer', 'other'],
    default: 'other'
  },
  status: {
    type: String,
    enum: ['requested', 'reviewing', 'chatting', 'contact_shared', 'completed', 'cancelled'],
    default: 'requested'
  },
  budget: {
    type: String,
    default: ''
  },
  timeline: {
    type: String,
    default: ''
  },
  sharedContact: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact',
    default: null
  },
  viewedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  acceptedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  activity: [{
    action: {
      type: String,
      required: true
    },
    description: String,
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

requestSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

requestSchema.index({ customer: 1, status: 1 });
requestSchema.index({ provider: 1, status: 1 });
requestSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Request', requestSchema);
