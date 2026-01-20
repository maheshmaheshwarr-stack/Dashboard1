const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'dashboard1_secret_key_change_in_production';

// Required authentication middleware
const auth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No valid token provided.'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if user still exists and is active
    const user = await User.findById(decoded.userId).select('isActive role');
    
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. User not found or inactive.'
      });
    }

    // Add user info to request
    req.user = {
      userId: decoded.userId,
      role: user.role
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Invalid token.'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Token expired.'
      });
    }
    
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during authentication'
    });
  }
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without authentication
      return next();
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Check if user exists and is active
      const user = await User.findById(decoded.userId).select('isActive role');
      
      if (user && user.isActive) {
        req.user = {
          userId: decoded.userId,
          role: user.role
        };
      }
    } catch (tokenError) {
      // Invalid token, but continue without authentication
      console.log('Optional auth - invalid token:', tokenError.message);
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next(); // Continue even if there's an error
  }
};

// Admin role middleware
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Authentication required.'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }

  next();
};

// Moderator or Admin role middleware
const requireModerator = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Authentication required.'
    });
  }

  if (!['admin', 'moderator'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Moderator privileges required.'
    });
  }

  next();
};

// Check if user owns resource or is admin
const requireOwnershipOrAdmin = (resourceUserIdField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Authentication required.'
      });
    }

    // Admin can access any resource
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user owns the resource
    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    
    if (req.user.userId !== resourceUserId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own resources.'
      });
    }

    next();
  };
};

// Rate limiting for sensitive operations
const sensitiveOperationLimit = (maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  const attempts = new Map();

  return (req, res, next) => {
    const key = req.ip + (req.user ? req.user.userId : '');
    const now = Date.now();
    
    // Clean old attempts
    for (const [attemptKey, data] of attempts.entries()) {
      if (now - data.timestamp > windowMs) {
        attempts.delete(attemptKey);
      }
    }

    const userAttempts = attempts.get(key);
    
    if (userAttempts && userAttempts.count >= maxAttempts) {
      return res.status(429).json({
        success: false,
        message: 'Too many attempts. Please try again later.',
        retryAfter: Math.ceil((userAttempts.timestamp + windowMs - now) / 1000)
      });
    }

    // Record attempt
    attempts.set(key, {
      count: userAttempts ? userAttempts.count + 1 : 1,
      timestamp: userAttempts ? userAttempts.timestamp : now
    });

    next();
  };
};

module.exports = {
  auth,
  optionalAuth,
  requireAdmin,
  requireModerator,
  requireOwnershipOrAdmin,
  sensitiveOperationLimit
};