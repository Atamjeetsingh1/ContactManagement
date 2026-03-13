const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Review = require('../models/Review');
const Request = require('../models/Request');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/authMiddleware');
const { io } = require('../server');

router.use(protect);

router.post('/', [
  body('provider').notEmpty().withMessage('Provider is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }

  try {
    const { provider, request, rating, comment, responseTime } = req.body;

    const existingReview = await Review.findOne({ reviewer: req.user._id, provider });
    if (existingReview) {
      return res.status(400).json({ success: false, message: 'You have already reviewed this provider' });
    }

    const review = await Review.create({
      reviewer: req.user._id,
      provider,
      request,
      rating,
      comment,
      responseTime
    });

    const [stats] = await Review.aggregate([
      { $match: { provider: req.body.provider } },
      {
        $group: {
          _id: '$provider',
          avgRating: { $avg: '$rating' },
          count: { $sum: 1 }
        }
      }
    ]);

    if (stats) {
      await User.findByIdAndUpdate(provider, {
        averageRating: Math.round(stats.avgRating * 10) / 10,
        totalReviews: stats.count
      });
    }

    if (request) {
      await Request.findByIdAndUpdate(request, {
        status: 'completed',
        completedAt: new Date()
      });

      await User.findByIdAndUpdate(provider, {
        $inc: { successfulRequests: 1 }
      });
    }

    const notification = await Notification.create({
      recipient: provider,
      sender: req.user._id,
      type: 'review_received',
      title: 'New Review',
      message: `You received a ${rating}-star review${comment ? `: "${comment}"` : ''}`,
      relatedId: review._id,
      relatedType: 'review'
    });

    io.to(`user_${provider}`).emit('notification', notification);

    const populatedReview = await Review.findById(review._id)
      .populate('reviewer', 'name email')
      .populate('provider', 'name email');

    res.status(201).json({ success: true, review: populatedReview });
  } catch (err) {
    console.error('Create review error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/provider/:providerId', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [reviews, total, stats] = await Promise.all([
      Review.find({ provider: req.params.providerId })
        .populate('reviewer', 'name email avatar')
        .populate('request', 'title')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Review.countDocuments({ provider: req.params.providerId }),
      Review.aggregate([
        { $match: { provider: require('mongoose').Types.ObjectId.createFromHexString(req.params.providerId) } },
        {
          $group: {
            _id: '$provider',
            avgRating: { $avg: '$rating' },
            count: { $sum: 1 },
            avgResponseTime: { $avg: '$responseTime' }
          }
        }
      ])
    ]);

    const provider = await User.findById(req.params.providerId)
      .select('averageRating totalReviews totalContactsShared successfulRequests');

    res.json({
      success: true,
      reviews,
      provider,
      stats: stats[0] || { avgRating: 0, count: 0, avgResponseTime: null },
      count: reviews.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    console.error('Get provider reviews error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/my-reviews', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [reviews, total] = await Promise.all([
      Review.find({ reviewer: req.user._id })
        .populate('provider', 'name email avatar averageRating')
        .populate('request', 'title status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Review.countDocuments({ reviewer: req.user._id })
    ]);

    res.json({
      success: true,
      reviews,
      count: reviews.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.patch('/:id/helpful', async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { $inc: { helpful: 1 } },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    res.json({ success: true, review });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
