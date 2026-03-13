const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const Contact = require('../models/Contact');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', async (req, res) => {
  try {
    const {
      search,
      category,
      favorite,
      shared,
      customerId,
      sortBy = 'createdAt',
      order = 'desc',
      page = 1,
      limit = 50
    } = req.query;

    const filter = {};

    if (req.user.role === 'provider') {
      filter.provider = req.user._id;
    } else if (req.user.role === 'customer') {
      filter.customer = req.user._id;
    }

    if (customerId) {
      filter.customer = customerId;
    }

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

    if (shared === 'true') {
      filter.isShared = true;
    }

    const sortOptions = {};
    sortOptions[sortBy] = order === 'asc' ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [contacts, total] = await Promise.all([
      Contact.find(filter)
        .populate('provider', 'name email')
        .populate('customer', 'name email')
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

router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;

    let filter = {};
    if (req.user.role === 'provider') {
      filter.provider = userId;
    } else if (req.user.role === 'customer') {
      filter.customer = userId;
    }

    const [total, favorites, shared, byCategory] = await Promise.all([
      Contact.countDocuments(filter),
      Contact.countDocuments({ ...filter, isFavorite: true }),
      Contact.countDocuments({ ...filter, isShared: true }),
      Contact.aggregate([
        { $match: filter },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ])
    ]);

    const categoryStats = {};
    byCategory.forEach(item => {
      categoryStats[item._id] = item.count;
    });

    res.json({
      success: true,
      stats: { total, favorites, shared, byCategory: categoryStats }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id)
      .populate('provider', 'name email')
      .populate('customer', 'name email');
    
    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found.' });
    }

    const isOwner = contact.provider && contact.provider._id.toString() === req.user._id.toString();
    const isCustomer = contact.customer && contact.customer._id.toString() === req.user._id.toString();

    if (!isOwner && !isCustomer && req.user.role !== 'provider') {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    res.json({ success: true, contact });
  } catch (err) {
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ success: false, message: 'Contact not found.' });
    }
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.post('/', authorizeRoles('provider'), [
  body('firstName').trim().notEmpty().withMessage('First name is required')
    .isLength({ max: 30 }).withMessage('First name cannot exceed 30 characters'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Invalid email format'),
  body('phone').optional({ checkFalsy: true }).isLength({ max: 20 }).withMessage('Phone too long'),
  body('category').optional().isIn(['developer', 'designer', 'marketer', 'writer', 'other', 'personal', 'work', 'family', 'friend'])
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
    const contactData = { ...req.body };
    if (req.user.role === 'provider') {
      contactData.provider = req.user.id;
    } else {
      contactData.customer = req.user.id;
    }
    const contact = await Contact.create(contactData);
    res.status(201).json({ success: true, contact });
  } catch (err) {
    console.error('Create contact error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.post('/share/:id', async (req, res) => {
  try {
    const { customerId } = req.body;
    const contact = await Contact.findOne({ _id: req.params.id, provider: req.user._id });
    
    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found.' });
    }

    contact.customer = customerId;
    contact.isShared = true;
    contact.sharedAt = new Date();
    await contact.save();

    await User.findByIdAndUpdate(req.user._id, {
      $inc: { totalContactsShared: 1 }
    });

    res.json({ success: true, contact });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.put('/:id', authorizeRoles('provider'), async (req, res) => {
  try {
    let contact = await Contact.findOne({
      _id: req.params.id,
      $or: [
        { provider: req.user._id },
        { customer: req.user._id }
      ]
    });
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

router.patch('/:id/favorite', async (req, res) => {
  try {
    let contact = await Contact.findOne({
      _id: req.params.id,
      $or: [
        { provider: req.user._id },
        { customer: req.user._id }
      ]
    });
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

router.patch('/:id/rate', async (req, res) => {
  try {
    const { usefulnessRating } = req.body;
    
    if (!usefulnessRating || usefulnessRating < 1 || usefulnessRating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    const contact = await Contact.findOne({ _id: req.params.id, customer: req.user._id });
    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found.' });
    }

    contact.usefulnessRating = usefulnessRating;
    await contact.save();

    res.json({ success: true, contact });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.patch('/:id/notes', async (req, res) => {
  try {
    const { customerNotes, tags } = req.body;
    
    const contact = await Contact.findOne({
      _id: req.params.id,
      $or: [
        { provider: req.user._id },
        { customer: req.user._id }
      ]
    });
    
    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found.' });
    }

    if (customerNotes !== undefined) contact.customerNotes = customerNotes;
    if (tags) contact.tags = tags;
    await contact.save();

    res.json({ success: true, contact });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Bulk delete contacts
router.delete('/', authorizeRoles('provider'), [
  body('ids').isArray().withMessage('Contact IDs are required')
], async (req, res) => {
  try {
    const filter = {
      _id: { $in: req.body.ids },
      $or: [
        { provider: req.user._id },
        { customer: req.user._id }
      ]
    };
    const result = await Contact.deleteMany(filter);
    res.json({ success: true, count: result.deletedCount });
  } catch (err) {
    console.error('Bulk delete error:', err);
    res.status(500).json({ success: false, message: 'Server error while deleting contacts.' });
  }
});

router.delete('/:id', authorizeRoles('provider'), async (req, res) => {
  try {
    const contact = await Contact.findOne({
      _id: req.params.id,
      $or: [
        { provider: req.user._id },
        { customer: req.user._id }
      ]
    });
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

module.exports = router;