// ------------------------------------------------------------
// 🛡️ AUTH ROUTES — REGISTRATION, LOGIN, EMAIL VERIFICATION
// ------------------------------------------------------------
const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const router = express.Router();

const User = require("../models/User");
const Token = require("../models/Token");
const sendMail = require("../config/mail");

// ------------------------------------------------------------
// POST /api/auth/register — Create user & send verification
// ------------------------------------------------------------
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password required." });

    let existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "Email already exists." });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hashed, verified: false });

    // Create verification token
    const tokenValue = crypto.randomBytes(32).toString("hex");
    await Token.create({
      userId: user._id,
      token: tokenValue,
      type: "emailVerify",
      expiresAt: new Date(Date.now() + 3600000), // 1 hr
    });

    const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${tokenValue}`;
    await sendMail({
      to: email,
      subject: "Verify your Goodies account",
      html: `
        <h2>Welcome to Goodies!</h2>
        <p>Click below to verify your account:</p>
        <p><a href="${verifyUrl}" target="_blank">Verify Account</a></p>
        <p>This link expires in 1 hour.</p>
      `,
    });

    res.json({ message: "Registration successful. Please check your email to verify your account." });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ message: "Server error during registration." });
  }
});

// ------------------------------------------------------------
// GET /api/auth/verify-email — Verify user token
// ------------------------------------------------------------
router.get("/verify-email", async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).send("Missing token.");

    const record = await Token.findOne({ token, type: "emailVerify" });
    if (!record) return res.status(400).send("Invalid or expired token.");

    await User.findByIdAndUpdate(record.userId, { verified: true });
    await record.deleteOne();

    res.sendFile(path.join(__dirname, "../../public/verified.html"));
  } catch (err) {
    console.error("Email verification error:", err);
    res.status(500).send("Server error verifying email.");
  }
});

// ------------------------------------------------------------
// POST /api/auth/login — Authenticate and issue JWT
// ------------------------------------------------------------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "Invalid email or password." });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(400).json({ message: "Invalid email or password." });

    if (!user.verified)
      return res.status(403).json({ message: "Please verify your email before logging in." });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      message: "Login successful.",
      token,
      user: { id: user._id, email: user.email },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error during login." });
  }
});

module.exports = router;
