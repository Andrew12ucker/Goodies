const Stripe = require('stripe');
const ProcessedEvent = require('../models/ProcessedEvent');
const Donation = require('../models/Donation');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

exports.handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('❌ Invalid Stripe signature:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    await ProcessedEvent.create({ eventId: event.id });
  } catch (err) {
    if (err.code === 11000) {
      console.log(`⚠️ Duplicate event ignored: ${event.id}`);
      return res.sendStatus(200);
    }
    console.error('❌ Failed inserting ProcessedEvent:', err);
    return res.status(500).send('Database error');
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('💳 Checkout session completed:', session.id);
        await Donation.create({
          stripeSessionId: session.id,
          campaignId: session.metadata?.campaignId || null,
          amount: session.amount_total / 100,
          currency: session.currency,
          donorEmail: session.customer_details?.email || null,
          paymentStatus: session.payment_status,
          status: 'succeeded',
          source: 'stripe',
        });
        break;
      }
      case 'payment_intent.succeeded':
        console.log('✅ Payment succeeded:', event.data.object.id);
        break;
      default:
        console.log(`ℹ️ Unhandled Stripe event type: ${event.type}`);
    }
    return res.sendStatus(200);
  } catch (err) {
    console.error('❌ Webhook processing error:', err);
    return res.status(500).send('Internal Server Error');
  }
};
