// ប្រព័ន្ធគណនា និងគ្រប់គ្រងធានារ៉ាប់រង
// Insurance Calculation and Policy Management System

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const { pool, sql } = require('../config/database');
const Insurance = require('../models/Insurance');
const Pagoda = require('../models/Pagoda');
const Building = require('../models/Building');
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

      // Build filters object
      const filters = {};
      if (status) filters.status = status;
      if (province) filters.province = province;
      if (search) filters.search = search;

      // Get total count
      let countQuery = `
        SELECT COUNT(*) as total 
        FROM insurance_policies i
        JOIN pagodas p ON i.pagoda_id = p.id
        WHERE 1=1
      `;
      const countRequest = pool.request();
      
      if (status) {
        countQuery += ' AND i.status = @status';
        countRequest.input('status', sql.NVarChar, status);
      }
      if (province) {
        countQuery += ' AND p.province = @province';
        countRequest.input('province', sql.NVarChar, province);
      }
      if (search) {
        countQuery += ' AND (i.policy_number LIKE @search OR p.name_km LIKE @search OR p.name_en LIKE @search)';
        countRequest.input('search', sql.NVarChar, `%${search}%`);
      }

      const countResult = await countRequest.query(countQuery);
      const total = countResult.recordset[0].total;

      // Get policies
      const policies = await Insurance.findAll(filters, { limit, offset });

      res.json({
        success: true,
        message: 'Policies retrieved successfully',
        data: {
          policies,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
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

      const policy = await Insurance.findById(id);

      if (!policy) {
        return res.status(404).json({
          success: false,
          message: 'Policy not found'
        });
      }

      // Get buildings and payments for this policy
      const buildings = await Building.findByPagodaId(policy.pagoda_id);
      
      const paymentsResult = await pool.request()
        .input('policy_id', sql.Int, id)
        .query('SELECT * FROM payments WHERE policy_id = @policy_id ORDER BY payment_date DESC');

      res.json({
        success: true,
        message: 'Policy retrieved successfully',
        data: {
          ...policy,
          buildings,
          payments: paymentsResult.recordset
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
    body('premiumAmount').isFloat({ min: 0 }).withMessage('Valid premium amount is required'),
    body('calculationDetails').optional().isString(),
    body('notes').optional().isString()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        pagodaId, startDate, endDate, premiumAmount,
        calculationDetails, notes
      } = req.body;

      // Verify pagoda exists
      const pagoda = await Pagoda.findById(pagodaId);
      if (!pagoda) {
        return res.status(404).json({
          success: false,
          message: 'Pagoda not found'
        });
      }

      // Check for overlapping active policies
      // ពិនិត្យមើលថាតើមានគោលនយោបាយសកម្មដែលមានរយៈពេលជាប់គ្នា
      const existingPolicyResult = await pool.request()
        .input('pagoda_id', sql.Int, pagodaId)
        .input('start_date', sql.Date, startDate)
        .input('end_date', sql.Date, endDate)
        .query(`
          SELECT id FROM insurance_policies 
          WHERE pagoda_id = @pagoda_id 
          AND status = 'active'
          AND (
            (coverage_start <= @start_date AND coverage_end >= @start_date)
            OR (coverage_start <= @end_date AND coverage_end >= @end_date)
          )
        `);

      if (existingPolicyResult.recordset.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'An active policy already exists for this period'
        });
      }

      // Generate policy number
      // បង្កើតលេខគោលនយោបាយ
      const policyNumber = await Insurance.generatePolicyNumber();

      // Create policy with correct field mapping
      const policyId = await Insurance.create({
        pagoda_id: pagodaId,
        policy_number: policyNumber,
        premium_amount: premiumAmount,
        coverage_start: startDate,
        coverage_end: endDate,
        calculation_details: calculationDetails ? JSON.stringify(calculationDetails) : null,
        notes: notes || null,
        created_by: req.user.id
      });

      const policy = await Insurance.findById(policyId);

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
    body('premiumAmount').optional().isFloat({ min: 0 }),
    body('calculationDetails').optional(),
    body('status').optional().isIn(['active', 'expired', 'cancelled']),
    body('notes').optional().isString()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;

      const policy = await Insurance.findById(id);
      if (!policy) {
        return res.status(404).json({
          success: false,
          message: 'Policy not found'
        });
      }

      // Build update data with camelCase to snake_case mapping
      const updateData = {};
      if (req.body.premiumAmount !== undefined) {
        updateData.premium_amount = req.body.premiumAmount;
      }
      if (req.body.startDate !== undefined) {
        updateData.coverage_start = req.body.startDate;
      }
      if (req.body.endDate !== undefined) {
        updateData.coverage_end = req.body.endDate;
      }
      if (req.body.calculationDetails !== undefined) {
        updateData.calculation_details = typeof req.body.calculationDetails === 'string' 
          ? req.body.calculationDetails 
          : JSON.stringify(req.body.calculationDetails);
      }
      if (req.body.notes !== undefined) {
        updateData.notes = req.body.notes;
      }

      if (Object.keys(updateData).length === 0 && req.body.status === undefined) {
        return res.status(400).json({
          success: false,
          message: 'No fields to update'
        });
      }

      // Update policy fields if any
      if (Object.keys(updateData).length > 0) {
        await Insurance.update(id, updateData);
      }

      // Update status separately if provided
      if (req.body.status !== undefined) {
        await Insurance.updateStatus(id, req.body.status);
      }

      const updatedPolicy = await Insurance.findById(id);

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

      const policy = await Insurance.findById(id);
      if (!policy) {
        return res.status(404).json({
          success: false,
          message: 'Policy not found'
        });
      }

      // Mark as cancelled instead of deleting
      // សម្គាល់ថាបានបោះបង់ជំនួសឱ្យការលុប
      await Insurance.updateStatus(id, 'cancelled');

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
