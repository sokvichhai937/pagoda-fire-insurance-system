// ប្រព័ន្ធគ្រប់គ្រងអ្នកប្រើប្រាស់
// User Management System

const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticate, isAdmin } = require('../middleware/auth');

// Helper function to handle validation errors
// មុខងារជំនួយដើម្បីគ្រប់គ្រងកំហុសនៃការផ្ទៀងផ្ទាត់
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// GET /api/users - Get all users (admin only)
// យកបញ្ជីអ្នកប្រើប្រាស់ទាំងអស់ (សម្រាប់អ្នកគ្រប់គ្រងតែប៉ុណ្ណោះ)
router.get('/', authenticate, isAdmin, async (req, res) => {
  try {
    const users = await User.findAll();

    res.json({
      success: true,
      message: 'Users retrieved successfully',
      data: users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users',
      error: error.message
    });
  }
});

// GET /api/users/:id - Get user by ID
// យកព័ត៌មានអ្នកប្រើប្រាស់តាមលេខសម្គាល់
router.get('/:id', 
  authenticate,
  param('id').isInt().withMessage('User ID must be an integer'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check if user is accessing their own data or is admin
      // ពិនិត្យថាតើអ្នកប្រើប្រាស់កំពុងចូលមើលទិន្នន័យផ្ទាល់ខ្លួន ឬជាអ្នកគ្រប់គ្រង
      if (req.user.id !== parseInt(id) && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const user = await User.findById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        message: 'User retrieved successfully',
        data: user
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve user',
        error: error.message
      });
    }
  }
);

// POST /api/users - Create user (admin only)
// បង្កើតអ្នកប្រើប្រាស់ថ្មី (សម្រាប់អ្នកគ្រប់គ្រងតែប៉ុណ្ណោះ)
router.post('/',
  authenticate,
  isAdmin,
  [
    body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('fullName').trim().isLength({ min: 1, max: 100 }).withMessage('Full name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('role').isIn(['admin', 'staff', 'viewer']).withMessage('Invalid role')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { username, password, fullName, email, role } = req.body;

      // Check if username or email already exists
      // ពិនិត្យថាតើឈ្មោះអ្នកប្រើ ឬអ៊ីមែលមានរួចហើយឬនៅ
      const usernameExists = await User.usernameExists(username);
      const emailExists = await User.emailExists(email);

      if (usernameExists || emailExists) {
        return res.status(409).json({
          success: false,
          message: 'Username or email already exists'
        });
      }

      // Create new user
      const userId = await User.create({
        username,
        password,
        full_name: fullName,
        email,
        role
      });

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: {
          id: userId,
          username,
          full_name: fullName,
          email,
          role
        }
      });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create user',
        error: error.message
      });
    }
  }
);

// PUT /api/users/:id - Update user (admin only)
// កែប្រែព័ត៌មានអ្នកប្រើប្រាស់ (សម្រាប់អ្នកគ្រប់គ្រងតែប៉ុណ្ណោះ)
router.put('/:id',
  authenticate,
  isAdmin,
  [
    param('id').isInt().withMessage('User ID must be an integer'),
    body('username').optional().trim().isLength({ min: 3, max: 50 }),
    body('fullName').optional().trim().isLength({ min: 1, max: 100 }),
    body('email').optional().isEmail().normalizeEmail(),
    body('role').optional().isIn(['admin', 'staff', 'viewer'])
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { username, fullName, email, role } = req.body;

      // Check if user exists
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if username or email already exists for another user
      if (username) {
        const usernameExists = await User.usernameExists(username, id);
        if (usernameExists) {
          return res.status(409).json({
            success: false,
            message: 'Username already exists'
          });
        }
      }
      
      if (email) {
        const emailExists = await User.emailExists(email, id);
        if (emailExists) {
          return res.status(409).json({
            success: false,
            message: 'Email already exists'
          });
        }
      }

      // Prepare update data
      const updateData = {
        username: username || user.username,
        email: email || user.email,
        full_name: fullName || user.full_name,
        role: role || user.role,
        is_active: user.is_active
      };

      await User.update(id, updateData);

      const updatedUser = await User.findById(id);

      res.json({
        success: true,
        message: 'User updated successfully',
        data: updatedUser
      });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user',
        error: error.message
      });
    }
  }
);

// DELETE /api/users/:id - Delete user (admin only)
// លុបអ្នកប្រើប្រាស់ (សម្រាប់អ្នកគ្រប់គ្រងតែប៉ុណ្ណោះ)
router.delete('/:id',
  authenticate,
  isAdmin,
  param('id').isInt().withMessage('User ID must be an integer'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Prevent deleting own account
      // ការពារមិនឱ្យលុបគណនីផ្ទាល់ខ្លួន
      if (req.user.id === parseInt(id)) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete your own account'
        });
      }

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      await User.delete(id);

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete user',
        error: error.message
      });
    }
  }
);

// PUT /api/users/:id/password - Change password (authenticated user or admin)
// ប្តូរពាក្យសម្ងាត់ (អ្នកប្រើប្រាស់ដែលបានផ្ទៀងផ្ទាត់ ឬអ្នកគ្រប់គ្រង)
router.put('/:id/password',
  authenticate,
  [
    param('id').isInt().withMessage('User ID must be an integer'),
    body('currentPassword').if((value, { req }) => req.user.id === parseInt(req.params.id))
      .notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { currentPassword, newPassword } = req.body;

      // Check if user is changing their own password or is admin
      // ពិនិត្យថាតើអ្នកប្រើប្រាស់កំពុងប្តូរពាក្យសម្ងាត់ផ្ទាល់ខ្លួន ឬជាអ្នកគ្រប់គ្រង
      const isOwnPassword = req.user.id === parseInt(id);
      if (!isOwnPassword && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Verify current password if user is changing their own password
      // ផ្ទៀងផ្ទាត់ពាក្យសម្ងាត់បច្ចុប្បន្ន ប្រសិនបើអ្នកប្រើប្រាស់កំពុងប្តូរពាក្យសម្ងាត់ផ្ទាល់ខ្លួន
      if (isOwnPassword) {
        const isValidPassword = await User.verifyPassword(currentPassword, user.password);
        if (!isValidPassword) {
          return res.status(401).json({
            success: false,
            message: 'Current password is incorrect'
          });
        }
      }

      // Update new password
      await User.updatePassword(id, newPassword);

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Error changing password:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to change password',
        error: error.message
      });
    }
  }
);

module.exports = router;
