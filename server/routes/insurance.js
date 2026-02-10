// ប្រព័ន្ធគណនា និងគ្រប់គ្រងធានារ៉ាប់រង
// Insurance Calculation and Policy Management System

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const db = require('../database/db');
const { authenticate, isAdminOrStaff } = require('../middleware/auth');
const insuranceCalculator = require('../utils/insuranceCalculator');

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

// POST /api/insurance/calculate - Calculate premium
// គណនាបុព្វលាភធានារ៉ាប់រង
router.post('/calculate',
  authenticate,
  [
    body('pagodaType').isIn(['city', 'rural', 'forest']).withMessage('Invalid pagoda type'),
    body('pagodaSize').isIn(['small', 'medium', 'large']).withMessage('Invalid pagoda size'),
    body('buildings').isArray({ min: 1 }).withMessage('At least one building is required'),
    body('buildings.*.buildingType').isIn(['shrine', 'hall', 'residence', 'kitchen', 'storage', 'other']),
    body('buildings.*.constructionType').isIn(['concrete', 'wood', 'mixed']),
    body('buildings.*.estimatedValue').isFloat({ min: 0 }),
    body('buildings.*.area').optional().isFloat({ min: 0 }),
    body('buildings.*.yearBuilt').optional().isInt({ min: 1900, max: new Date().getFullYear() })
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { pagodaType, pagodaSize, buildings } = req.body;

      // Calculate premium using insurance calculator utility
      // គណនាបុព្វលាភដោយប្រើឧបករណ៍គណនាធានារ៉ាប់រង
      const calculation = insuranceCalculator.calculatePremium({
        pagodaType,
        pagodaSize,
        buildings
      });

      res.json({
        success: true,
        message: 'Premium calculated successfully',
        data: calculation
      });
    } catch (error) {
      console.error('Error calculating premium:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to calculate premium',
        error: error.message
      });
    }
  }
);

// GET /api/insurance/policies - Get all policies (with filters and pagination)
// យកបញ្ជីគោលនយោបាយធានារ៉ាប់រងទាំងអស់ (ជាមួយការត្រង និងការបែងចែកទំព័រ)
router.get('/policies',
  authenticate,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['active', 'expired', 'cancelled']),
    query('province').optional().trim(),
    query('search').optional().trim()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;
      const { status, province, search } = req.query;

      // Build WHERE clause
      const conditions = [];
      const params = [];

      if (status) {
        conditions.push('ip.status = ?');
        params.push(status);
      }
      if (province) {
        conditions.push('p.province = ?');
        params.push(province);
      }
      if (search) {
        conditions.push('(ip.policy_number LIKE ? OR p.name LIKE ? OR p.name_khmer LIKE ?)');
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countResult = await db.get(`
        SELECT COUNT(*) as total 
        FROM insurance_policies ip
        JOIN pagodas p ON ip.pagoda_id = p.id
        ${whereClause}
      `, params);

      // Get policies
      const policies = await db.all(`
        SELECT 
          ip.*,
          p.name as pagoda_name,
          p.name_khmer as pagoda_name_khmer,
          p.province,
          (SELECT SUM(amount) FROM payments WHERE policy_id = ip.id) as total_paid
        FROM insurance_policies ip
        JOIN pagodas p ON ip.pagoda_id = p.id
        ${whereClause}
        ORDER BY ip.created_at DESC
        OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
      `, [...params, offset, limit]);

      res.json({
        success: true,
        message: 'Policies retrieved successfully',
        data: {
          policies,
          pagination: {
            total: countResult.total,
            page,
            limit,
            totalPages: Math.ceil(countResult.total / limit)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching policies:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve policies',
        error: error.message
      });
    }
  }
);

// GET /api/insurance/policies/:id - Get policy details
// យកព័ត៌មានលម្អិតអំពីគោលនយោបាយធានារ៉ាប់រង
router.get('/policies/:id',
  authenticate,
  param('id').isInt().withMessage('Policy ID must be an integer'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;

      const policy = await db.get(`
        SELECT 
          ip.*,
          p.name as pagoda_name,
          p.name_khmer as pagoda_name_khmer,
          p.province,
          p.district,
          p.address,
          (SELECT SUM(amount) FROM payments WHERE policy_id = ip.id) as total_paid,
          (SELECT COUNT(*) FROM payments WHERE policy_id = ip.id) as payment_count
        FROM insurance_policies ip
        JOIN pagodas p ON ip.pagoda_id = p.id
        WHERE ip.id = ?
      `, [id]);

      if (!policy) {
        return res.status(404).json({
          success: false,
          message: 'Policy not found'
        });
      }

      // Get buildings covered by this policy
      const buildings = await db.all(
        'SELECT * FROM buildings WHERE pagoda_id = ?',
        [policy.pagoda_id]
      );

      // Get payment history
      const payments = await db.all(
        'SELECT * FROM payments WHERE policy_id = ? ORDER BY payment_date DESC',
        [id]
      );

      res.json({
        success: true,
        message: 'Policy retrieved successfully',
        data: {
          ...policy,
          buildings,
          payments
        }
      });
    } catch (error) {
      console.error('Error fetching policy:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve policy',
        error: error.message
      });
    }
  }
);

// POST /api/insurance/policies - Create policy (admin/staff)
// បង្កើតគោលនយោបាយធានារ៉ាប់រងថ្មី (សម្រាប់អ្នកគ្រប់គ្រង/បុគ្គលិក)
router.post('/policies',
  authenticate,
  isAdminOrStaff,
  [
    body('pagodaId').isInt().withMessage('Valid pagoda ID is required'),
    body('startDate').isISO8601().withMessage('Valid start date is required'),
    body('endDate').isISO8601().withMessage('Valid end date is required'),
    body('coverageAmount').isFloat({ min: 0 }).withMessage('Valid coverage amount is required'),
    body('premiumAmount').isFloat({ min: 0 }).withMessage('Valid premium amount is required'),
    body('paymentFrequency').isIn(['annual', 'semi-annual', 'quarterly', 'monthly'])
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        pagodaId, startDate, endDate, coverageAmount, premiumAmount,
        paymentFrequency, notes
      } = req.body;

      // Verify pagoda exists
      const pagoda = await db.get('SELECT id FROM pagodas WHERE id = ?', [pagodaId]);
      if (!pagoda) {
        return res.status(404).json({
          success: false,
          message: 'Pagoda not found'
        });
      }

      // Check for overlapping active policies
      // ពិនិត្យមើលថាតើមានគោលនយោបាយសកម្មដែលមានរយៈពេលជាប់គ្នា
      const existingPolicy = await db.get(`
        SELECT id FROM insurance_policies 
        WHERE pagoda_id = ? 
        AND status = 'active'
        AND (
          (start_date <= ? AND end_date >= ?)
          OR (start_date <= ? AND end_date >= ?)
        )
      `, [pagodaId, startDate, startDate, endDate, endDate]);

      if (existingPolicy) {
        return res.status(409).json({
          success: false,
          message: 'An active policy already exists for this period'
        });
      }

      // Generate policy number
      // បង្កើតលេខគោលនយោបាយ
      const year = new Date(startDate).getFullYear();
      const count = await db.get(
        'SELECT COUNT(*) as count FROM insurance_policies WHERE YEAR(start_date) = ?',
        [year]
      );
      const policyNumber = `POL-${year}-${String(count.count + 1).padStart(4, '0')}`;

      const result = await db.run(`
        INSERT INTO insurance_policies (
          policy_number, pagoda_id, start_date, end_date,
          coverage_amount, premium_amount, payment_frequency,
          status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)
      `, [
        policyNumber, pagodaId, startDate, endDate,
        coverageAmount, premiumAmount, paymentFrequency, notes
      ]);

      const policy = await db.get(
        'SELECT * FROM insurance_policies WHERE id = ?',
        [result.lastID]
      );

      res.status(201).json({
        success: true,
        message: 'Policy created successfully',
        data: policy
      });
    } catch (error) {
      console.error('Error creating policy:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create policy',
        error: error.message
      });
    }
  }
);

// PUT /api/insurance/policies/:id - Update policy (admin/staff)
// កែប្រែគោលនយោបាយធានារ៉ាប់រង (សម្រាប់អ្នកគ្រប់គ្រង/បុគ្គលិក)
router.put('/policies/:id',
  authenticate,
  isAdminOrStaff,
  [
    param('id').isInt().withMessage('Policy ID must be an integer'),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
    body('coverageAmount').optional().isFloat({ min: 0 }),
    body('premiumAmount').optional().isFloat({ min: 0 }),
    body('paymentFrequency').optional().isIn(['annual', 'semi-annual', 'quarterly', 'monthly']),
    body('status').optional().isIn(['active', 'expired', 'cancelled'])
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;

      const policy = await db.get('SELECT * FROM insurance_policies WHERE id = ?', [id]);
      if (!policy) {
        return res.status(404).json({
          success: false,
          message: 'Policy not found'
        });
      }

      // Build update query dynamically
      const updates = [];
      const values = [];
      const fieldMapping = {
        'startDate': 'start_date',
        'endDate': 'end_date',
        'coverageAmount': 'coverage_amount',
        'premiumAmount': 'premium_amount',
        'paymentFrequency': 'payment_frequency',
        'status': 'status',
        'notes': 'notes'
      };

      for (const [camelField, snakeField] of Object.entries(fieldMapping)) {
        if (req.body[camelField] !== undefined) {
          updates.push(`${snakeField} = ?`);
          values.push(req.body[camelField]);
        }
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No fields to update'
        });
      }

      values.push(id);

      await db.run(
        `UPDATE insurance_policies SET ${updates.join(', ')}, updated_at = GETDATE() WHERE id = ?`,
        values
      );

      const updatedPolicy = await db.get(
        'SELECT * FROM insurance_policies WHERE id = ?',
        [id]
      );

      res.json({
        success: true,
        message: 'Policy updated successfully',
        data: updatedPolicy
      });
    } catch (error) {
      console.error('Error updating policy:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update policy',
        error: error.message
      });
    }
  }
);

// DELETE /api/insurance/policies/:id - Cancel policy (admin only)
// បោះបង់គោលនយោបាយធានារ៉ាប់រង (សម្រាប់អ្នកគ្រប់គ្រងតែប៉ុណ្ណោះ)
router.delete('/policies/:id',
  authenticate,
  async (req, res, next) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }
    next();
  },
  param('id').isInt().withMessage('Policy ID must be an integer'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;

      const policy = await db.get('SELECT * FROM insurance_policies WHERE id = ?', [id]);
      if (!policy) {
        return res.status(404).json({
          success: false,
          message: 'Policy not found'
        });
      }

      // Mark as cancelled instead of deleting
      // សម្គាល់ថាបានបោះបង់ជំនួសឱ្យការលុប
      await db.run(
        'UPDATE insurance_policies SET status = ?, updated_at = GETDATE() WHERE id = ?',
        ['cancelled', id]
      );

      res.json({
        success: true,
        message: 'Policy cancelled successfully'
      });
    } catch (error) {
      console.error('Error cancelling policy:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel policy',
        error: error.message
      });
    }
  }
);

module.exports = router;
