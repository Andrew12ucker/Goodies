// /server/config/stripe.js
const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_dummy");
module.exports = stripe;
