// auth.js - Authentication Routes
// ផ្លូវផ្ទៀងផ្ទាត់អត្តសញ្ញាណ

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const config = require('../config/config');
const { authenticate } = require('../middleware/auth');

// Generate JWT token - បង្កើត JWT token
const generateToken = (userId, userRole) => {
  return jwt.sign(
    { userId, role: userRole },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

// @route   POST /api/auth/login
// @desc    User login / ចូលគណនី
// @access  Public
router.post('/login', [
  body('username').notEmpty().withMessage('Username is required / ត្រូវការឈ្មោះ'),
  body('password').notEmpty().withMessage('Password is required / ត្រូវការពាក្យសម្ងាត់')
], async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { username, password } = req.body;

    // Find user by username
    const user = await User.findByUsername(username);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password / ឈ្មោះ ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ'
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account is inactive / គណនីមិនសកម្ម'
      });
    }

    // Verify password
    const isPasswordValid = await User.verifyPassword(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password / ឈ្មោះ ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ'
      });
    }

    // Generate token
    const token = generateToken(user.id, user.role);

    // Return user info and token
    res.json({
      success: true,
      message: 'Login successful / ចូលគណនីបានជោគជ័យ',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          full_name: user.full_name,
          role: user.role
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed / ចូលគណនីបានបរាជ័យ',
      error: error.message
    });
  }
});

// @route   POST /api/auth/logout
// @desc    User logout / ចេញគណនី
// @access  Private
router.post('/logout', authenticate, async (req, res) => {
  try {
    // In a stateless JWT system, logout is handled on the client side
    // by removing the token from storage
    res.json({
      success: true,
      message: 'Logout successful / ចេញគណនីបានជោគជ័យ'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Logout failed / ចេញគណនីបានបរាជ័យ',
      error: error.message
    });
  }
});

// @route   POST /api/auth/refresh
// @desc    Refresh JWT token / ធ្វើបច្ចុប្បន្នភាព token
// @access  Private
router.post('/refresh', authenticate, async (req, res) => {
  try {
    // Generate new token
    const token = generateToken(req.user.id, req.user.role);

    res.json({
      success: true,
      message: 'Token refreshed / Token ត្រូវបានធ្វើបច្ចុប្បន្នភាព',
      data: { token }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Token refresh failed / ការធ្វើបច្ចុប្បន្នភាព token បានបរាជ័យ',
      error: error.message
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user / ទទួលបានព័ត៌មានអ្នកប្រើប្រាស់បច្ចុប្បន្ន
// @access  Private
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found / រកមិនឃើញអ្នកប្រើប្រាស់'
      });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        is_active: user.is_active,
        created_at: user.created_at
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get user info / ទទួលបានព័ត៌មានអ្នកប្រើប្រាស់បានបរាជ័យ',
      error: error.message
    });
  }
});

module.exports = router;
