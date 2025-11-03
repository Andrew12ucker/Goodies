// /server/controllers/campaignController.js
const Campaign = require("../models/Campaign");

exports.getMyCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find({ owner: req.user._id }).sort({
      createdAt: -1,
    });
    res.json(campaigns);
  } catch (err) {
    console.error("getMyCampaigns error:", err);
    res.status(500).json({ message: "Error fetching campaigns" });
  }
};

exports.createCampaign = async (req, res) => {
  try {
    const { title, description, goal, image } = req.body;
    const campaign = await Campaign.create({
      title,
      description,
      goal,
      image,
      owner: req.user._id,
      creatorId: req.user._id,
    });
    res.status(201).json({ success: true, campaign });
  } catch (err) {
    console.error("createCampaign error:", err);
    res.status(500).json({ message: "Error creating campaign" });
  }
};
