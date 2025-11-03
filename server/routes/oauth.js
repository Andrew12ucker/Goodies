const express = require("express");
const router = express.Router();
const passport = require("passport");

// --- Google OAuth ---
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
    session: true,
  }),
  (req, res) => {
    res.redirect("/dashboard");
  }
);

// --- Apple OAuth Placeholder ---
router.get("/apple", (req, res) => {
  res.json({ message: "Apple OAuth integration placeholder" });
});

// --- Facebook OAuth Placeholder ---
router.get("/facebook", (req, res) => {
  res.json({ message: "Facebook OAuth integration placeholder" });
});

// --- Logout ---
router.get("/logout", (req, res) => {
  req.logout(() => {
    res.redirect("/");
  });
});

module.exports = router;
