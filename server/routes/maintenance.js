// ------------------------------------------------------------
// 🛠️ Maintenance Mode Control API
// Secure Admin Toggle — Goodies Platform
// ------------------------------------------------------------
const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();

// Path to .env file for persistence
const envPath = path.join(__dirname, "..", ".env");

// Utility: Update or insert MAINTENANCE_MODE in .env
function updateEnvVariable(key, value) {
  const envData = fs.existsSync(envPath)
    ? fs.readFileSync(envPath, "utf-8").split("\n")
    : [];
  const keyIndex = envData.findIndex((line) => line.startsWith(`${key}=`));

  if (keyIndex >= 0) envData[keyIndex] = `${key}=${value}`;
  else envData.push(`${key}=${value}`);

  fs.writeFileSync(envPath, envData.join("\n"));
}

// --- Middleware: Admin Authentication (basic JWT gate) ---
function verifyAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
  const adminKey = process.env.ADMIN_KEY;

  if (!token || token !== adminKey) {
    return res.status(403).json({ message: "Unauthorized access" });
  }
  next();
}

// --- Get Maintenance Status ---
router.get("/", verifyAdmin, (req, res) => {
  const mode = process.env.MAINTENANCE_MODE === "true";
  res.json({ maintenance: mode });
});

// --- Enable Maintenance Mode ---
router.post("/enable", verifyAdmin, (req, res) => {
  process.env.MAINTENANCE_MODE = "true";
  updateEnvVariable("MAINTENANCE_MODE", "true");
  console.log("⚠️ Maintenance mode ENABLED.");
  res.json({ message: "Maintenance mode enabled" });
});

// --- Disable Maintenance Mode ---
router.post("/disable", verifyAdmin, (req, res) => {
  process.env.MAINTENANCE_MODE = "false";
  updateEnvVariable("MAINTENANCE_MODE", "false");
  console.log("✅ Maintenance mode DISABLED.");
  res.json({ message: "Maintenance mode disabled" });
});

module.exports = router;
