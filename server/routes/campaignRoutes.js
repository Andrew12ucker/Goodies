const express = require("express");
const router = express.Router();
const Campaign = require("../models/Campaign");

// Create campaign
router.post("/", async (req, res) => {
  try {
    const campaign = await Campaign.create(req.body);
    res.status(201).json(campaign);
  } catch (err) {
    res.status(500).json({ message: "Error creating campaign", error: err.message });
  }
});

// Get all campaigns
router.get("/", async (req, res) => {
  try {
    const campaigns = await Campaign.find();
    res.status(200).json(campaigns);
  } catch (err) {
    res.status(500).json({ message: "Error fetching campaigns", error: err.message });
  }
});

module.exports = router;
