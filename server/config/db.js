// /server/config/db.js
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

let isConnected = false;

async function connectDB() {
  if (isConnected) {
    console.log("✅ MongoDB already connected.");
    return;
  }

  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("❌ MONGO_URI missing from /server/.env");
    return;
  }

  try {
    const conn = await mongoose.connect(uri);
    isConnected = true;
    console.log(`🔗 Mongoose default connection is open at: ${conn.connection.host}`);
  } catch (err) {
    console.error(`❌ MongoDB connection attempt failed: ${err.message}`);
    console.log("🔁 Retrying MongoDB connection in 1000ms...");
    setTimeout(connectDB, 1000);
  }
}

module.exports = connectDB;
