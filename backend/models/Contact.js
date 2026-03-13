const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [30, 'First name cannot exceed 30 characters']
  },
  lastName: {
    type: String,
    trim: true,
    maxlength: [30, 'Last name cannot exceed 30 characters'],
    default: ''
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    default: ''
  },
  phone: {
    type: String,
    trim: true,
    maxlength: [20, 'Phone cannot exceed 20 characters'],
    default: ''
  },
  company: {
    type: String,
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters'],
    default: ''
  },
  jobTitle: {
    type: String,
    trim: true,
    maxlength: [100, 'Job title cannot exceed 100 characters'],
    default: ''
  },
  linkedin: {
    type: String,
    default: ''
  },
  experience: {
    type: String,
    default: ''
  },
  location: {
    type: String,
    default: ''
  },
  address: {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    country: { type: String, default: '' },
    zipCode: { type: String, default: '' }
  },
  website: {
    type: String,
    trim: true,
    default: ''
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
    default: ''
  },
  customerNotes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
    default: ''
  },
  tags: [{
    type: String
  }],
  category: {
    type: String,
    enum: ['developer', 'designer', 'marketer', 'writer', 'other', 'personal', 'work', 'family', 'friend'],
    default: 'other'
  },
  isFavorite: {
    type: Boolean,
    default: false
  },
  isShared: {
    type: Boolean,
    default: false
  },
  sharedAt: {
    type: Date,
    default: null
  },
  usefulnessRating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  avatar: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

contactSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

contactSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`.trim();
});

contactSchema.set('toJSON', { virtuals: true });
contactSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Contact', contactSchema);