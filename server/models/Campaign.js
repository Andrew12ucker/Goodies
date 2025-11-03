const mongoose = require("mongoose");

const CampaignSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    goal: { type: Number, required: true, min: 1 },
    currentAmount: { type: Number, default: 0 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isActive: { type: Boolean, default: true },
    raised: { type: Number, default: 0 },
    image: { type: String },
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: { type: String, enum: ["active", "paused", "completed"], default: "active" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Campaign", CampaignSchema);
