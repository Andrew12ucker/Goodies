// /server/config/paypal.js
const paypal = require("@paypal/checkout-server-sdk");

const clientId = process.env.PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.warn("⚠️ PayPal credentials not set. PayPal routes will be limited.");
  module.exports = null;
} else {
  const environment =
    process.env.NODE_ENV === "production"
      ? new paypal.core.LiveEnvironment(clientId, clientSecret)
      : new paypal.core.SandboxEnvironment(clientId, clientSecret);

  const client = new paypal.core.PayPalHttpClient(environment);

  module.exports = {
    client: () => client,
    orders: paypal.orders,
  };
}
