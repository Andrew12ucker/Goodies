// server/controllers/campaignController.js
const Campaign = require('../models/Campaign');

exports.getMyCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find({ creator: req.user._id })
      .sort('-createdAt');
    res.json(campaigns);
  } catch (err) {
    console.error('getMyCampaigns error:', err);
    res.status(500).json({ message: 'Error fetching campaigns' });
  }
};

exports.createCampaign = async (req, res) => {
  try {
    const { title, description, goal, category, deadline } = req.body;
    if (!title || !description || !goal)
      return res.status(400).json({ message: 'Missing required fields' });

    const campaign = await Campaign.create({
      title,
      description,
      goal: parseFloat(goal),
      category,
      deadline: new Date(deadline),
      creator: req.user._id,
      status: 'draft',
    });
    res.status(201).json({ message: 'Campaign created', campaign });
  } catch (err) {
    console.error('createCampaign error:', err);
    res.status(500).json({ message: 'Error creating campaign' });
  }
};
