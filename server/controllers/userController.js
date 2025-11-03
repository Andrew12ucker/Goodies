// /server/controllers/userController.js
// ------------------------------------------------------------
// 👤 USER CONTROLLER — Handles fetching, updating, and deleting
// authenticated user profiles (JWT or OAuth)
// ------------------------------------------------------------

const User = require("../models/User"); // assumes a Mongoose User model exists

// ------------------------------------------------------------
// GET /api/user/me — Return authenticated user profile
// ------------------------------------------------------------
exports.getProfile = async (req, res) => {
  try {
    // user object populated by authMiddleware (JWT) or Passport (OAuth)
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // If req.user is a token payload, fetch the latest data from DB
    const dbUser =
      user._id || user.id
        ? await User.findById(user._id || user.id).select("-password")
        : user;

    if (!dbUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      message: "Profile fetched successfully",
      user: dbUser,
    });
  } catch (err) {
    console.error("❌ Error fetching profile:", err);
    res.status(500).json({
      success: false,
      message: "Server error fetching profile",
      error: err.message,
    });
  }
};

// ------------------------------------------------------------
// PUT /api/user/me — Update authenticated user profile
// ------------------------------------------------------------
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const allowedUpdates = ["name", "email", "avatar", "bio", "location"];
    const updates = {};
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
      select: "-password",
    });

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    console.error("❌ Error updating profile:", err);
    res.status(500).json({
      success: false,
      message: "Server error updating profile",
      error: err.message,
    });
  }
};

// ------------------------------------------------------------
// DELETE /api/user/me — Delete user account
// ------------------------------------------------------------
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    await User.findByIdAndDelete(userId);
    res.status(200).json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (err) {
    console.error("❌ Error deleting account:", err);
    res.status(500).json({
      success: false,
      message: "Server error deleting account",
      error: err.message,
    });
  }
};
