Goodies server (Stripe Checkout example)

1. Create .env or set env vars:
   export STRIPE_SECRET_KEY=sk_test_xxx
   export STRIPE_PUBLISHABLE_KEY=pk_test_xxx

2. Install:
   cd server
   npm install

3. Start:
   npm start

4. Open browser to your frontend (index.html / create.html).
   The client makes a POST to /create-checkout-session and redirects to Stripe Checkout.