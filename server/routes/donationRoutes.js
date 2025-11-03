const express = require("express");
const router = express.Router();
const Donation = require("../models/Donation");

// Record a donation
router.post("/", async (req, res) => {
  try {
    const donation = await Donation.create(req.body);
    res.status(201).json(donation);
  } catch (err) {
    res.status(500).json({ message: "Error recording donation", error: err.message });
  }
});

// Get all donations
router.get("/", async (req, res) => {
  try {
    const donations = await Donation.find().populate("campaign donor");
    res.status(200).json(donations);
  } catch (err) {
    res.status(500).json({ message: "Error fetching donations", error: err.message });
  }
});

module.exports = router;
