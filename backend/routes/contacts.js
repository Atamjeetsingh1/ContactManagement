const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const Contact = require('../models/Contact');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// All routes are protected
router.use(protect);

// @route   GET /api/contacts
// @desc    Get all contacts for the logged-in user
// @access  Private
router.get('/', async (req, res) => {
  try {
    const {
      search,
      category,
      favorite,
      sortBy = 'createdAt',
      order = 'desc',
      page = 1,
      limit = 50
    } = req.query;

    // Build filter
    const filter = { user: req.user.id };

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (favorite === 'true') {
      filter.isFavorite = true;
    }

    // Sort
    const sortOptions = {};
    sortOptions[sortBy] = order === 'asc' ? 1 : -1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [contacts, total] = await Promise.all([
      Contact.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      Contact.countDocuments(filter)
    ]);

    res.json({
      success: true,
      count: contacts.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      contacts
    });
  } catch (err) {
    console.error('Get contacts error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// @route   GET /api/contacts/stats
// @desc    Get contact statistics for the dashboard
// @access  Private
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;

    const [total, favorites, byCategory] = await Promise.all([
      Contact.countDocuments({ user: userId }),
      Contact.countDocuments({ user: userId, isFavorite: true }),
      Contact.aggregate([
        { $match: { user: userId } },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ])
    ]);

    const categoryStats = {};
    byCategory.forEach(item => {
      categoryStats[item._id] = item.count;
    });

    res.json({
      success: true,
      stats: { total, favorites, byCategory: categoryStats }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// @route   GET /api/contacts/:id
// @desc    Get a single contact
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const contact = await Contact.findOne({ _id: req.params.id, user: req.user.id });
    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found.' });
    }
    res.json({ success: true, contact });
  } catch (err) {
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ success: false, message: 'Contact not found.' });
    }
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// @route   POST /api/contacts
// @desc    Create a new contact
// @access  Private (Provider only)
router.post('/', authorizeRoles('provider'), [
  body('firstName').trim().notEmpty().withMessage('First name is required')
    .isLength({ max: 30 }).withMessage('First name cannot exceed 30 characters'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Invalid email format'),
  body('phone').optional({ checkFalsy: true }).isLength({ max: 20 }).withMessage('Phone too long'),
  body('category').optional().isIn(['personal', 'work', 'family', 'friend', 'other'])
    .withMessage('Invalid category')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array()
    });
  }

  try {
    const contact = await Contact.create({
      ...req.body,
      user: req.user.id
    });
    res.status(201).json({ success: true, contact });
  } catch (err) {
    console.error('Create contact error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// @route   PUT /api/contacts/:id
// @desc    Update a contact
// @access  Private (Provider only)
router.put('/:id', authorizeRoles('provider'), [
  body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty')
    .isLength({ max: 30 }).withMessage('First name too long'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Invalid email format'),
  body('category').optional().isIn(['personal', 'work', 'family', 'friend', 'other'])
    .withMessage('Invalid category')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg
    });
  }

  try {
    let contact = await Contact.findOne({ _id: req.params.id, user: req.user.id });
    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found.' });
    }

    contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    res.json({ success: true, contact });
  } catch (err) {
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ success: false, message: 'Contact not found.' });
    }
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// @route   PATCH /api/contacts/:id/favorite
// @desc    Toggle favorite status
// @access  Private (Provider only)
router.patch('/:id/favorite', authorizeRoles('provider'), async (req, res) => {
  try {
    const contact = await Contact.findOne({ _id: req.params.id, user: req.user.id });
    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found.' });
    }

    contact.isFavorite = !contact.isFavorite;
    await contact.save();

    res.json({ success: true, contact, isFavorite: contact.isFavorite });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// @route   DELETE /api/contacts/:id
// @desc    Delete a contact
// @access  Private (Provider only)
router.delete('/:id', authorizeRoles('provider'), async (req, res) => {
  try {
    const contact = await Contact.findOne({ _id: req.params.id, user: req.user.id });
    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found.' });
    }

    await contact.deleteOne();
    res.json({ success: true, message: 'Contact deleted successfully.' });
  } catch (err) {
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ success: false, message: 'Contact not found.' });
    }
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// @route   DELETE /api/contacts
// @desc    Delete multiple contacts
// @access  Private (Provider only)
router.delete('/', authorizeRoles('provider'), async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No contact IDs provided.' });
    }

    await Contact.deleteMany({ _id: { $in: ids }, user: req.user.id });
    res.json({ success: true, message: `${ids.length} contact(s) deleted.` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;