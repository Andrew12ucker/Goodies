const express = require('express');
const router = express.Router();
const Campaign = require('../models/Campaign');
const { protect, optionalAuth } = require('../middleware/auth');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Joi = require('joi');

// --- Upload config ---
const uploadDir = path.join(__dirname, '..', 'uploads', 'campaigns');
fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `campaign-${unique}${path.extname(file.originalname)}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ok =
      allowed.test(file.mimetype) &&
      allowed.test(path.extname(file.originalname).toLowerCase());
    cb(ok ? null : new Error('Only image files are allowed!'));
  },
});

// --- Validation ---
const createSchema = Joi.object({
  title: Joi.string().min(3).max(120).required(),
  description: Joi.string().min(10).max(5000).required(),
  goal: Joi.number().positive().precision(2).required(),
  category: Joi.string().min(2).max(100).required(),
  deadline: Joi.date().iso().required(),
});

// --- Routes ---
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { status = 'active', page = 1, limit = 12 } = req.query;
    const qStatus = !req.user ? 'active' : status;
    const query = { status: qStatus };
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    const [campaigns, total] = await Promise.all([
      Campaign.find(query)
        .sort('-createdAt')
        .limit(limitNum)
        .skip(skip)
        .select('-comments -updates'),
      Campaign.countDocuments(query),
    ]);

    res.json({
      campaigns,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('Error fetching campaigns:', err);
    res.status(500).json({ message: 'Failed to fetch campaigns' });
  }
});

router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('creator', 'name email profilePicture');
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    res.json(campaign);
  } catch (err) {
    console.error('Error fetching campaign:', err);
    res.status(500).json({ message: 'Failed to fetch campaign' });
  }
});

router.post('/', protect, upload.single('image'), async (req, res) => {
  try {
    const { error, value } = createSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({ message: 'Validation failed', details: error.details.map(d => d.message) });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'Image is required' });
    }

    const { title, description, goal, category, deadline } = value;
    const campaign = await Campaign.create({
      title,
      description,
      goal: Number(goal),
      category,
      deadline: new Date(deadline),
      image: `/uploads/campaigns/${req.file.filename}`,
      creator: req.user._id,
      status: 'draft',
    });
    res.status(201).json({ message: 'Campaign created successfully', campaign });
  } catch (err) {
    console.error('Error creating campaign:', err);
    res.status(500).json({ message: 'Failed to create campaign' });
  }
});

router.get('/my/campaigns', protect, async (req, res) => {
  try {
    const campaigns = await Campaign.find({ creator: req.user._id }).sort('-createdAt');
    res.json(campaigns);
  } catch (err) {
    console.error('Error fetching user campaigns:', err);
    res.status(500).json({ message: 'Failed to fetch user campaigns' });
  }
});

module.exports = router;
