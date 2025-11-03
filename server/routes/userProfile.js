const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const userController = require("../controllers/userController");

// --- Get Current User Profile ---
router.get("/me", protect, userController.getProfile);

// --- Update Profile ---
router.put("/me", protect, userController.updateProfile);

module.exports = router;
