const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Request = require('../models/Request');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/authMiddleware');
const { io } = require('../server');

router.use(protect);

const addActivity = async (request, action, description, performedBy) => {
  request.activity.push({ action, description, performedBy });
  await request.save();
};

const createNotification = async (recipient, sender, type, title, message, relatedId = null, relatedType = null) => {
  const notification = await Notification.create({
    recipient,
    sender,
    type,
    title,
    message,
    relatedId,
    relatedType
  });
  
  io.to(`user_${recipient}`).emit('notification', notification);
  return notification;
};

router.post('/', [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('category').optional().isIn(['developer', 'designer', 'marketer', 'writer', 'other'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }

  try {
    const { title, description, category, budget, timeline } = req.body;
    
    const request = await Request.create({
      customer: req.user._id,
      title,
      description,
      category,
      budget,
      timeline,
      activity: [{
        action: 'created',
        description: 'Request created',
        performedBy: req.user._id
      }]
    });

    const populatedRequest = await Request.findById(request._id)
      .populate('customer', 'name email')
      .populate('provider', 'name email');

    io.emit('new_request', populatedRequest);

    res.status(201).json({ success: true, request: populatedRequest });
  } catch (err) {
    console.error('Create request error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (req.user.role === 'customer') {
      filter.customer = req.user._id;
    } else if (req.user.role === 'provider') {
      filter.$or = [
        { provider: req.user._id },
        { status: 'requested', viewedBy: { $ne: req.user._id } }
      ];
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [requests, total] = await Promise.all([
      Request.find(filter)
        .populate('customer', 'name email avatar isOnline lastSeen')
        .populate('provider', 'name email avatar isOnline lastSeen averageRating totalContactsShared')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Request.countDocuments(filter)
    ]);

    res.json({
      success: true,
      requests,
      count: requests.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    console.error('Get requests error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const filter = req.user.role === 'customer' 
      ? { customer: req.user._id }
      : { provider: req.user._id };

    const [total, byStatus, recentActivity] = await Promise.all([
      Request.countDocuments(filter),
      Request.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Request.find(filter)
        .populate('customer', 'name')
        .populate('provider', 'name')
        .sort({ updatedAt: -1 })
        .limit(5)
    ]);

    const statusCounts = {};
    byStatus.forEach(item => {
      statusCounts[item._id] = item.count;
    });

    res.json({
      success: true,
      stats: { total, byStatus: statusCounts, recentActivity }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const request = await Request.findById(req.params.id)
      .populate('customer', 'name email avatar isOnline lastSeen')
      .populate('provider', 'name email avatar isOnline lastSeen averageRating totalContactsShared')
      .populate('activity.performedBy', 'name');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.customer._id.toString() !== req.user._id.toString() && 
        (!request.provider || request.provider._id.toString() !== req.user._id.toString())) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, request });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.patch('/:id/view', async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.status !== 'requested') {
      return res.status(400).json({ success: false, message: 'Request is no longer available' });
    }

    if (!request.viewedBy.includes(req.user._id)) {
      request.viewedBy.push(req.user._id);
      await request.save();

      await createNotification(
        request.customer._id,
        req.user._id,
        'request_viewed',
        'Request Viewed',
        `${req.user.name} viewed your request: ${request.title}`,
        request._id,
        'request'
      );
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.patch('/:id/accept', async (req, res) => {
  try {
    let request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.status !== 'requested' && request.status !== 'reviewing') {
      return res.status(400).json({ success: false, message: 'Request cannot be accepted' });
    }

    if (request.provider && request.provider.toString() !== req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Request already accepted by another provider' });
    }

    request.provider = req.user._id;
    request.status = 'chatting';
    request.acceptedAt = new Date();
    await addActivity(request, 'accepted', 'Request accepted', req.user._id);
    await request.save();

    request = await Request.findById(request._id)
      .populate('customer', 'name email')
      .populate('provider', 'name email');

    io.to(`user_${request.customer._id}`).emit('request_accepted', request);

    await createNotification(
      request.customer._id,
      req.user._id,
      'request_accepted',
      'Request Accepted',
      `${req.user.name} accepted your request!`,
      request._id,
      'request'
    );

    res.json({ success: true, request });
  } catch (err) {
    console.error('Accept request error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { status, contactId } = req.body;
    const validStatuses = ['reviewing', 'chatting', 'contact_shared', 'completed', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    let request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const isOwner = request.customer.toString() === req.user._id.toString();
    const isProvider = request.provider && request.provider.toString() === req.user._id.toString();

    if (!isOwner && !isProvider) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    request.status = status;

    if (status === 'contact_shared' && contactId) {
      request.sharedContact = contactId;
      await addActivity(request, 'contact_shared', 'Contact shared with customer', req.user._id);

      await createNotification(
        request.customer._id,
        req.user._id,
        'contact_shared',
        'Contact Shared',
        `A contact has been shared for your request: ${request.title}`,
        request._id,
        'request'
      );
    }

    if (status === 'completed') {
      request.completedAt = new Date();
      await addActivity(request, 'completed', 'Request completed', req.user._id);

      await createNotification(
        request.provider,
        req.user._id,
        'request_completed',
        'Request Completed',
        `Request "${request.title}" has been marked as completed`,
        request._id,
        'request'
      );
    }

    if (status === 'cancelled') {
      await addActivity(request, 'cancelled', 'Request cancelled', req.user._id);
    }

    await request.save();

    request = await Request.findById(request._id)
      .populate('customer', 'name email')
      .populate('provider', 'name email')
      .populate('sharedContact');

    io.emit('request_updated', request);

    res.json({ success: true, request });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.patch('/:id/request-info', async (req, res) => {
  try {
    const { description, budget, timeline } = req.body;
    
    let request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.provider && request.provider.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (description) request.description = description;
    if (budget) request.budget = budget;
    if (timeline) request.timeline = timeline;

    await addActivity(request, 'info_requested', 'Provider requested more details', req.user._id);
    await request.save();

    await createNotification(
      request.customer._id,
      req.user._id,
      'new_message',
      'More Info Requested',
      `${req.user.name} requested more details for your request`,
      request._id,
      'request'
    );

    request = await Request.findById(request._id)
      .populate('customer', 'name email')
      .populate('provider', 'name email');

    res.json({ success: true, request });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
