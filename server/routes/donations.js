// server/routes/donations.js
const express = require('express');
const router = express.Router();
const { createDonation, getDonations } = require('../controllers/donationController');

// Create new donation
router.post('/', createDonation);

// Get all donations (optional for admin/dashboard)
router.get('/', getDonations);

module.exports = router;
