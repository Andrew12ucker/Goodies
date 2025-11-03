// /server/middleware/maintenanceMode.js
const path = require("path");

module.exports = function maintenanceMode(req, res, next) {
  // 0 or unset → site is live
  const on = process.env.MAINTENANCE_MODE === "true";

  // always allow webhook + auth flows even in maintenance
  const allowed =
    req.path.startsWith("/api/webhooks") ||
    req.path.startsWith("/api/auth") ||
    req.path.startsWith("/api/oauth");

  if (!on || allowed) return next();

  // serve static maintenance page
  const publicPath = path.join(__dirname, "..", "..", "public");
  return res.status(503).sendFile(path.join(publicPath, "maintenance.html"));
};
