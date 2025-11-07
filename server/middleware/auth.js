// server/middleware/auth.js
const jwt = require('jsonwebtoken');

/**
 * Strict JWT protection middleware.
 * Blocks requests without a valid Bearer token.
 */
exports.protect = (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer '))
      return res.status(401).json({ message: 'No token provided' });

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'goodies_secret');
    req.user = decoded;
    next();
  } catch (err) {
    console.error('protect error:', err.message);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

/**
 * Optional JWT authentication.
 * Allows public access but attaches user if token exists.
 */
exports.optionalAuth = (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      const token = header.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'goodies_secret');
      req.user = decoded;
    }
  } catch (err) {
    // Silently ignore invalid tokens for optional auth
    console.warn('optionalAuth: invalid token');
  }
  next();
};
