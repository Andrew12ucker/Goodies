// server/routes/campaigns.js
const express = require('express');
const router = express.Router();
const Campaign = require('../models/Campaign');
const { protect, optionalAuth } = require('../middleware/auth');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// ---------- Multer config ----------
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

// ---------- PUBLIC ROUTES ----------
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { status = 'active', page = 1, limit = 12 } = req.query;
    const query = !req.user ? { status: 'active' } : { status };
    const skip = (page - 1) * limit;

    const [campaigns, total] = await Promise.all([
      Campaign.find(query)
        .sort('-createdAt')
        .limit(Number(limit))
        .skip(Number(skip))
        .select('-comments -updates'),
      Campaign.countDocuments(query),
    ]);

    res.json({
      campaigns,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
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

// ---------- AUTHENTICATED ROUTES ----------
router.post('/', protect, upload.single('image'), async (req, res) => {
  try {
    const { title, description, goal, category, deadline } = req.body;
    if (!title || !description || !goal || !category || !deadline)
      return res.status(400).json({ message: 'Missing required fields' });

    if (!req.file)
      return res.status(400).json({ message: 'Image is required' });

    const campaign = await Campaign.create({
      title,
      description,
      goal: parseFloat(goal),
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

// GET current user's campaigns
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
