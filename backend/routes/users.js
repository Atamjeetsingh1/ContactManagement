const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Review = require('../models/Review');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/providers', async (req, res) => {
  try {
    const {
      search,
      skill,
      category,
      location,
      minRating,
      available,
      sortBy = 'averageRating',
      page = 1,
      limit = 20
    } = req.query;

    const filter = { role: 'provider' };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'providerProfile.title': { $regex: search, $options: 'i' } },
        { 'providerProfile.bio': { $regex: search, $options: 'i' } },
        { 'providerProfile.skills': { $regex: search, $options: 'i' } }
      ];
    }

    if (skill) {
      filter['providerProfile.skills'] = { $regex: skill, $options: 'i' };
    }

    if (category) {
      filter['providerProfile.title'] = { $regex: category, $options: 'i' };
    }

    if (location) {
      filter['providerProfile.location'] = { $regex: location, $options: 'i' };
    }

    if (minRating) {
      filter.averageRating = { $gte: parseFloat(minRating) };
    }

    if (available === 'true') {
      filter['providerProfile.isAvailable'] = true;
      filter.isOnline = true;
    }

    const sortOptions = {};
    switch (sortBy) {
      case 'topRated':
        sortOptions.averageRating = -1;
        break;
      case 'mostContacts':
        sortOptions.totalContactsShared = -1;
        break;
      case 'mostReviews':
        sortOptions.totalReviews = -1;
        break;
      case 'recentlyActive':
        sortOptions.lastSeen = -1;
        break;
      default:
        sortOptions.averageRating = -1;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [providers, total] = await Promise.all([
      User.find(filter)
        .select('name email avatar isOnline lastSeen averageRating totalReviews totalContactsShared successfulRequests providerProfile')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(filter)
    ]);

    res.json({
      success: true,
      providers,
      count: providers.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    console.error('Get providers error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/providers/stats', async (req, res) => {
  try {
    const [totalProviders, onlineNow, availableNow, topRated] = await Promise.all([
      User.countDocuments({ role: 'provider' }),
      User.countDocuments({ role: 'provider', isOnline: true }),
      User.countDocuments({ role: 'provider', 'providerProfile.isAvailable': true, isOnline: true }),
      User.find({ role: 'provider', averageRating: { $gt: 0 } })
        .sort({ averageRating: -1 })
        .limit(5)
        .select('name averageRating totalReviews')
    ]);

    res.json({
      success: true,
      stats: {
        totalProviders,
        onlineNow,
        availableNow,
        topRated
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'provider') {
      const [reviews, stats] = await Promise.all([
        Review.find({ provider: user._id })
          .populate('reviewer', 'name avatar')
          .sort({ createdAt: -1 })
          .limit(5),
        Review.aggregate([
          { $match: { provider: user._id } },
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

      user.reviews = reviews;
      user.stats = stats[0] || { avgRating: 0, count: 0, avgResponseTime: null };
    }

    const isFavorite = await User.exists({
      _id: req.user._id,
      favorites: user._id
    });

    user.isFavorite = !!isFavorite;

    res.json({ success: true, user });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      User.find({ _id: { $ne: req.user._id } })
        .select('name email role avatar isOnline lastSeen averageRating providerProfile')
        .sort({ name: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments({ _id: { $ne: req.user._id } })
    ]);

    res.json({
      success: true,
      users,
      count: users.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.patch('/favorites/:providerId', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const providerId = req.params.providerId;

    const isFavorite = user.favorites.includes(providerId);

    if (isFavorite) {
      user.favorites = user.favorites.filter(id => id.toString() !== providerId);
    } else {
      user.favorites.push(providerId);
    }

    await user.save();

    res.json({
      success: true,
      isFavorite: !isFavorite,
      favoritesCount: user.favorites.length
    });
  } catch (err) {
    console.error('Toggle favorite error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/me/favorites', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const user = await User.findById(req.user._id);
    const favoriteIds = user.favorites;

    const [favorites, total] = await Promise.all([
      User.find({ _id: { $in: favoriteIds } })
        .select('name email role avatar isOnline lastSeen averageRating totalReviews providerProfile')
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments({ _id: { $in: favoriteIds } })
    ]);

    res.json({
      success: true,
      favorites,
      count: favorites.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/profile', async (req, res) => {
  try {
    const { name, avatar, providerProfile } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (avatar) updateData.avatar = avatar;
    if (providerProfile) updateData.providerProfile = providerProfile;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ success: true, user });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.patch('/availability', async (req, res) => {
  try {
    const { isAvailable } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { 'providerProfile.isAvailable': isAvailable },
      { new: true }
    ).select('-password');

    io.emit('provider_availability', {
      providerId: user._id,
      isAvailable: user.providerProfile.isAvailable,
      isOnline: user.isOnline
    });

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
