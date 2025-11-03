// /server/routes/donations.js
const router = require("express").Router();
const { protect } = require("../middleware/authMiddleware");
const donationController = require("../controllers/donationController");

// Stripe session
router.post("/stripe/session", protect, donationController.createStripeSession);

// PayPal order
router.post("/paypal/order", protect, donationController.createPaypalOrder);

// Current user's donations
router.get("/me", protect, donationController.myDonations);

module.exports = router;
