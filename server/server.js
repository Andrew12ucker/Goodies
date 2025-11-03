// ------------------------------------------------------------
// 🌐 GOODIES SERVER — PRODUCTION VERSION (Phase F)
// OAuth + JWT + Stripe + PayPal + Maintenance + Clean URLs
// ------------------------------------------------------------
require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const passport = require("./config/oauth");
const connectDB = require("./config/db");
const path = require("path");

const maintenanceMode = require("./middleware/maintenanceMode");
const errorHandler = require("./middleware/errorHandler");

// --- init ---
const app = express();

// --- DB ---
connectDB();

// --- core middleware ---
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(compression());

// --- CORS ---
const allowedOrigin = process.env.CLIENT_URL || "http://localhost:3000";
app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  })
);

// --- sessions (for OAuth) ---
app.use(
  session({
    secret: process.env.SESSION_SECRET || "goodies_secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      ttl: 14 * 24 * 60 * 60,
    }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      maxAge: 14 * 24 * 60 * 60 * 1000,
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());

// --- Stripe webhook (raw) ---
app.post(
  "/api/webhooks/stripe",
  express.raw({ type: "application/json" }),
  (req, res) => {
    console.log("✅ Stripe webhook received");
    res.status(200).send("ok");
  }
);

// --- maintenance gate (after webhook, before everything else) ---
app.use(maintenanceMode);

// --- static frontend ---
const publicPath = path.join(__dirname, "..", "public");
app.use(express.static(publicPath));
console.log(`🌐 Serving static files from: ${publicPath}`);

// --- API routes ---
try {
  app.use("/api/auth", require("./routes/auth"));
  console.log("✅ Auth routes loaded successfully.");
} catch (err) {
  console.warn("⚠️ Auth routes not found:", err.message);
}

app.use("/api/oauth", require("./routes/oauth"));
app.use("/api/user", require("./routes/userProfile"));
app.use("/api/donations", require("./routes/donations"));
app.use("/api/campaigns", require("./routes/campaigns")); // ✅ new

// --- clean URLs for frontend ---
[
  "index",
  "directory",
  "fundraise",
  "campaigns",
  "about",
  "login",
  "register",
  "reset",
  "maintenance",
  "404",
  "500",
].forEach((route) => {
  app.get(`/${route}`, (req, res) =>
    res.sendFile(path.join(publicPath, `${route}.html`))
  );
});

// --- root ---
app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

// --- error handler (must be before 404 if you want JSON for APIs) ---
app.use(errorHandler);

// --- 404 fallback (HTML) ---
app.use((req, res) => {
  res.status(404).sendFile(path.join(publicPath, "404.html"), (err) => {
    if (err) res.status(404).send("Page not found");
  });
});

// --- start server with port retry ---
const PORT = parseInt(process.env.PORT, 10) || 8080;
function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`✅ Server running at: http://localhost:${port}`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.warn(`⚠️ Port ${port} in use, retrying on ${port + 1} ...`);
      startServer(port + 1);
    } else {
      console.error("❌ Server startup error:", err);
      process.exit(1);
    }
  });
}
startServer(PORT);
