// /server/controllers/mfaController.js
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const User = require("../models/User");

exports.generateMFA = async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({ length: 20 });
    const qr = await qrcode.toDataURL(secret.otpauth_url);

    req.user.mfa = { enabled: false, secret: secret.base32 };
    await req.user.save();

    res.json({ qr, secret: secret.base32 });
  } catch (err) {
    res.status(500).json({ message: "Error generating MFA", error: err.message });
  }
};

exports.verifyMFA = async (req, res) => {
  try {
    const { token } = req.body;
    const verified = speakeasy.totp.verify({
      secret: req.user.mfa.secret,
      encoding: "base32",
      token,
    });

    if (!verified) return res.status(400).json({ message: "Invalid code" });
    req.user.mfa.enabled = true;
    await req.user.save();

    res.json({ message: "MFA enabled successfully" });
  } catch (err) {
    res.status(500).json({ message: "Verification failed", error: err.message });
  }
};
