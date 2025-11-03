// /server/routes/stripeWebhook.js
const express = require("express");
const router = express.Router();

router.post("/", (req, res) => {
  try {
    console.log("✅ Stripe webhook payload received:", req.body);
    res.status(200).send("Webhook received");
  } catch (err) {
    console.error("❌ Stripe webhook error:", err);
    res.status(400).send("Webhook error");
  }
});

module.exports = router;
