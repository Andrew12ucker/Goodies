// /server/routes/campaigns.js
const router = require("express").Router();
const { protect } = require("../middleware/authMiddleware");
const campaignController = require("../controllers/campaignController");

// GET /api/campaigns/user → campaigns owned by logged-in user
router.get("/user", protect, campaignController.getMyCampaigns);

// (optional) create campaign
router.post("/", protect, campaignController.createCampaign);

module.exports = router;
