// auth.js - JWT Authentication Middleware
// មីឌលវែរផ្ទៀងផ្ទាត់អត្តសញ្ញាណ JWT

const jwt = require('jsonwebtoken');
const config = require('../config/config');
const User = require('../models/User');

// Verify JWT token and authenticate user
// ផ្ទៀងផ្ទាត់ token JWT និងផ្ទៀងផ្ទាត់អ្នកប្រើប្រាស់
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided / មិនមាន token'
      });
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);

    // Check if user still exists and is active
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found / រកមិនឃើញអ្នកប្រើប្រាស់'
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'User account is inactive / គណនីអ្នកប្រើប្រាស់មិនសកម្ម'
      });
    }

    // Attach user info to request
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      role: user.role
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token / Token មិនត្រឹមត្រូវ'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired / Token ផុតកំណត់'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication failed / ការផ្ទៀងផ្ទាត់បានបរាជ័យ',
      error: error.message
    });
  }
};

// Optional authentication (doesn't fail if no token)
// ការផ្ទៀងផ្ទាត់ស្រេចចិត្ត (មិនបរាជ័យប្រសិនបើគ្មាន token)
const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, config.jwt.secret);
      const user = await User.findById(decoded.userId);
      
      if (user && user.is_active) {
        req.user = {
          id: user.id,
          username: user.username,
          email: user.email,
          full_name: user.full_name,
          role: user.role
        };
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

module.exports = {
  authenticate,
  optionalAuthenticate
};
