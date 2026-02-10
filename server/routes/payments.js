// ប្រព័ន្ធគ្រប់គ្រងការទូទាត់
// Payment Processing System

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const db = require('../database/db');
const { authenticate, isAdminOrStaff } = require('../middleware/auth');
const pdfGenerator = require('../utils/pdfGenerator');

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

// GET /api/payments - Get all payments (with filters and pagination)
// យកបញ្ជីការទូទាត់ទាំងអស់ (ជាមួយការត្រង និងការបែងចែកទំព័រ)
router.get('/',
  authenticate,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('policyId').optional().isInt(),
    query('paymentMethod').optional().isIn(['cash', 'transfer', 'check']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;
      const { policyId, paymentMethod, startDate, endDate } = req.query;

      // Build WHERE clause
      const conditions = [];
      const params = [];

      if (policyId) {
        conditions.push('pm.policy_id = ?');
        params.push(policyId);
      }
      if (paymentMethod) {
        conditions.push('pm.payment_method = ?');
        params.push(paymentMethod);
      }
      if (startDate) {
        conditions.push('pm.payment_date >= ?');
        params.push(startDate);
      }
      if (endDate) {
        conditions.push('pm.payment_date <= ?');
        params.push(endDate);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countResult = await db.get(`
        SELECT COUNT(*) as total 
        FROM payments pm
        ${whereClause}
      `, params);

      // Get payments
      const payments = await db.all(`
        SELECT 
          pm.*,
          ip.policy_number,
          p.name_en as pagoda_name,
          p.name_km as pagoda_name_khmer
        FROM payments pm
        JOIN insurance_policies ip ON pm.policy_id = ip.id
        JOIN pagodas p ON ip.pagoda_id = p.id
        ${whereClause}
        ORDER BY pm.payment_date DESC
        OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
      `, [...params, offset, limit]);

      res.json({
        success: true,
        message: 'Payments retrieved successfully',
        data: {
          payments,
          pagination: {
            total: countResult.total,
            page,
            limit,
            totalPages: Math.ceil(countResult.total / limit)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching payments:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve payments',
        error: error.message
      });
    }
  }
);

// GET /api/payments/:id - Get payment details
// យកព័ត៌មានលម្អិតអំពីការទូទាត់
router.get('/:id',
  authenticate,
  param('id').isInt().withMessage('Payment ID must be an integer'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;

      const payment = await db.get(`
        SELECT 
          pm.*,
          ip.policy_number,
          ip.premium_amount,
          p.name_en as pagoda_name,
          p.name_km as pagoda_name_khmer,
          p.province,
          p.district,
          p.village,
          p.commune
        FROM payments pm
        JOIN insurance_policies ip ON pm.policy_id = ip.id
        JOIN pagodas p ON ip.pagoda_id = p.id
        WHERE pm.id = ?
      `, [id]);

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found'
        });
      }

      res.json({
        success: true,
        message: 'Payment retrieved successfully',
        data: payment
      });
    } catch (error) {
      console.error('Error fetching payment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve payment',
        error: error.message
      });
    }
  }
);

// POST /api/payments - Record payment (admin/staff)
// កត់ត្រាការទូទាត់ (សម្រាប់អ្នកគ្រប់គ្រង/បុគ្គលិក)
router.post('/',
  authenticate,
  isAdminOrStaff,
  [
    body('policyId').isInt().withMessage('Valid policy ID is required'),
    body('amount').isFloat({ min: 0 }).withMessage('Valid amount is required'),
    body('paymentDate').isISO8601().withMessage('Valid payment date is required'),
    body('paymentMethod').isIn(['cash', 'transfer', 'check']).withMessage('Invalid payment method'),
    body('referenceNumber').optional().trim(),
    body('notes').optional().trim()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { policyId, amount, paymentDate, paymentMethod, referenceNumber, notes } = req.body;

      // Verify policy exists
      const policy = await db.get('SELECT * FROM insurance_policies WHERE id = ?', [policyId]);
      if (!policy) {
        return res.status(404).json({
          success: false,
          message: 'Policy not found'
        });
      }

      // Generate receipt number
      // បង្កើតលេខបង្កាន់ដៃ
      const year = new Date(paymentDate).getFullYear();
      const count = await db.get(
        'SELECT COUNT(*) as count FROM payments WHERE YEAR(payment_date) = ?',
        [year]
      );
      const receiptNumber = `RCP-${year}-${String(count.count + 1).padStart(5, '0')}`;

      const result = await db.run(`
        INSERT INTO payments (
          policy_id, amount, payment_date, payment_method,
          reference_number, receipt_number, notes,
          processed_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        policyId, amount, paymentDate, paymentMethod,
        referenceNumber, receiptNumber, notes, req.user.id
      ]);

      const payment = await db.get('SELECT * FROM payments WHERE id = ?', [result.lastID]);

      res.status(201).json({
        success: true,
        message: 'Payment recorded successfully',
        data: payment
      });
    } catch (error) {
      console.error('Error recording payment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to record payment',
        error: error.message
      });
    }
  }
);

// GET /api/payments/:id/receipt - Generate receipt PDF
// បង្កើតបង្កាន់ដៃជា PDF
router.get('/:id/receipt',
  authenticate,
  param('id').isInt().withMessage('Payment ID must be an integer'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;

      const payment = await db.get(`
        SELECT 
          pm.*,
          ip.policy_number,
          ip.premium_amount,
          ip.coverage_start,
          ip.coverage_end,
          p.name_en as pagoda_name,
          p.name_km as pagoda_name_khmer,
          p.province,
          p.district,
          p.commune,
          p.village,
          u.full_name as recorded_by_name
        FROM payments pm
        JOIN insurance_policies ip ON pm.policy_id = ip.id
        JOIN pagodas p ON ip.pagoda_id = p.id
        LEFT JOIN users u ON pm.processed_by = u.id
        WHERE pm.id = ?
      `, [id]);

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found'
        });
      }

      // Generate PDF using pdfGenerator utility
      // បង្កើត PDF ដោយប្រើឧបករណ៍បង្កើត PDF
      const pdfBuffer = await pdfGenerator.generateReceipt(payment);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=receipt-${payment.receipt_number}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error generating receipt:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate receipt',
        error: error.message
      });
    }
  }
);

// GET /api/payments/policy/:policyId - Get payments for policy
// យកបញ្ជីការទូទាត់សម្រាប់គោលនយោបាយ
router.get('/policy/:policyId',
  authenticate,
  param('policyId').isInt().withMessage('Policy ID must be an integer'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { policyId } = req.params;

      // Verify policy exists
      const policy = await db.get('SELECT id FROM insurance_policies WHERE id = ?', [policyId]);
      if (!policy) {
        return res.status(404).json({
          success: false,
          message: 'Policy not found'
        });
      }

      const payments = await db.all(`
        SELECT 
          pm.*,
          u.full_name as recorded_by_name
        FROM payments pm
        LEFT JOIN users u ON pm.processed_by = u.id
        WHERE pm.policy_id = ?
        ORDER BY pm.payment_date DESC
      `, [policyId]);

      // Calculate total paid
      const totalPaid = payments.reduce((sum, payment) => {
        return sum + parseFloat(payment.amount || 0);
      }, 0);

      res.json({
        success: true,
        message: 'Payments retrieved successfully',
        data: {
          payments,
          totalPaid,
          count: payments.length
        }
      });
    } catch (error) {
      console.error('Error fetching payments:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve payments',
        error: error.message
      });
    }
  }
);

module.exports = router;
