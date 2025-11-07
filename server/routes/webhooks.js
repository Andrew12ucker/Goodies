// server/routes/webhooks.js
const express = require('express');
const { handleStripeWebhook } = require('../controllers/webhookController');

const router = express.Router();

// Stripe requires raw body for signature verification
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  handleStripeWebhook
);

module.exports = router;
