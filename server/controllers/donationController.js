// ------------------------------------------------------------
// 💝 DONATION CONTROLLER — STRIPE, PAYPAL & RECEIPTS
// ------------------------------------------------------------
const Donation = require("../models/Donation");
const Campaign = require("../models/Campaign");
const stripe = require("../config/stripe");
const paypalClient = require("../config/paypal");
const sendDonationReceipt = require("../utils/sendDonationReceipt");

// ------------------------------------------------------------
// 🟣 Stripe Donation Session
// ------------------------------------------------------------
exports.createStripeSession = async (req, res) => {
  try {
    const { campaignId, amount } = req.body;
    if (!campaignId || !amount)
      return res.status(400).json({ message: "Missing campaignId or amount." });

    const campaign = await Campaign.findById(campaignId);
    if (!campaign)
      return res.status(404).json({ message: "Campaign not found." });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `Donation to ${campaign.title}` },
            unit_amount: Math.round(Number(amount) * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.CLIENT_URL || "http://localhost:3000"}/dashboard?donation=success`,
      cancel_url: `${process.env.CLIENT_URL || "http://localhost:3000"}/dashboard?donation=cancel`,
      metadata: { campaignId },
    });

    const donation = await Donation.create({
      amount,
      campaign: campaignId,
      donor: req.user ? req.user._id : undefined,
      paymentMethod: "Stripe",
      status: "pending",
      providerSessionId: session.id,
    });

    // send receipt (pre-confirmation email)
    if (req.user?.email) {
      await sendDonationReceipt(req.user.email, {
        campaignTitle: campaign.title,
        amount,
        createdAt: new Date(),
        transactionId: session.id,
      });
    }

    return res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe session error:", err);
    res.status(500).json({ message: "Server error creating Stripe session." });
  }
};

// ------------------------------------------------------------
// 💲 PayPal Donation Order
// ------------------------------------------------------------
exports.createPaypalOrder = async (req, res) => {
  try {
    const { campaignId, amount } = req.body;
    if (!campaignId || !amount)
      return res.status(400).json({ message: "Missing campaignId or amount." });

    const campaign = await Campaign.findById(campaignId);
    if (!campaign)
      return res.status(404).json({ message: "Campaign not found." });

    if (!paypalClient || !paypalClient.client)
      return res.status(500).json({ message: "PayPal not configured." });

    const request = new paypalClient.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: { currency_code: "USD", value: Number(amount).toFixed(2) },
          description: `Donation to ${campaign.title}`,
        },
      ],
    });

    const order = await paypalClient.client().execute(request);
    const approveLink = order.result.links.find((l) => l.rel === "approve");

    const donation = await Donation.create({
      amount,
      campaign: campaignId,
      donor: req.user ? req.user._id : undefined,
      paymentMethod: "PayPal",
      status: "pending",
      providerSessionId: order.result.id,
    });

    // send receipt (pre-confirmation)
    if (req.user?.email) {
      await sendDonationReceipt(req.user.email, {
        campaignTitle: campaign.title,
        amount,
        createdAt: new Date(),
        transactionId: order.result.id,
      });
    }

    return res.json({
      id: order.result.id,
      approveLink: approveLink ? approveLink.href : null,
    });
  } catch (err) {
    console.error("PayPal order error:", err);
    res.status(500).json({ message: "Server error creating PayPal order." });
  }
};

// ------------------------------------------------------------
// 📜 Get Current User’s Donations
// ------------------------------------------------------------
exports.myDonations = async (req, res) => {
  try {
    const donations = await Donation.find({ donor: req.user._id })
      .populate("campaign", "title goal currentAmount")
      .sort({ createdAt: -1 });

    const shaped = donations.map((d) => ({
      id: d._id,
      amount: d.amount,
      paymentMethod: d.paymentMethod,
      createdAt: d.createdAt,
      campaignId: d.campaign ? d.campaign._id : null,
      campaignTitle: d.campaign ? d.campaign.title : "",
    }));

    res.json(shaped);
  } catch (err) {
    console.error("Fetch donations error:", err);
    res.status(500).json({ message: "Server error fetching donations." });
  }
};
