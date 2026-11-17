const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * JWT authentication middleware.
 *
 * Expects an Authorization header in the form "Bearer <token>".
 * On success the full user document (minus password) is attached to req.user.
 */
const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided. Authorization denied.' });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'foodshare_secret_key_change_in_production');

    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'Token is valid but user no longer exists.' });
    }

    if (user.isBanned) {
      return res.status(403).json({ message: 'Your account has been banned. Contact support.' });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired. Please log in again.' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token. Authorization denied.' });
    }
    return res.status(500).json({ message: 'Server error during authentication.' });
  }
};

/**
 * Optional authentication middleware.
 * If token is present and valid, attaches req.user; otherwise proceeds as guest.
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'foodshare_secret_key_change_in_production');
      const user = await User.findById(decoded.id).select('-password');
      if (user && !user.isBanned) {
        req.user = user;
        req.token = token;
      }
    }
    next();
  } catch (error) {
    // Proceed as unauthenticated guest
    next();
  }
};

/**
 * Role-based authorization middleware factory.
 *
 * @param  {...string} roles - Allowed roles (e.g. 'admin', 'donor').
 * @returns {Function} Express middleware that checks req.user.role.
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Role '${req.user.role}' is not authorized to access this resource.`,
      });
    }

    next();
  };
};

// Export as both callable middleware and object with helpers
auth.auth = auth;
auth.optionalAuth = optionalAuth;
auth.authorize = authorize;

module.exports = auth;
