// /server/models/Donation.js
const mongoose = require("mongoose");

const donationSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    donor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    campaign: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign" },
    paymentMethod: { type: String, enum: ["Stripe", "PayPal"], default: "Stripe" },
    status: { type: String, enum: ["pending", "completed", "failed"], default: "pending" },
    providerSessionId: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.models.Donation || mongoose.model("Donation", donationSchema);

