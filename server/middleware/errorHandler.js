// /server/middleware/errorHandler.js
module.exports = function errorHandler(err, req, res, next) {
  console.error("💥 Global error:", err);
  // API wants JSON
  if (req.path.startsWith("/api/")) {
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
  // otherwise let 500.html be served by frontend
  return next(err);
};
