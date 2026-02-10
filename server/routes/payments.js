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
    query('paymentMethod').optional().isIn(['cash', 'bank_transfer', 'cheque', 'mobile_payment']),
    query('status').optional().isIn(['pending', 'completed', 'failed']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;
      const { policyId, paymentMethod, status, startDate, endDate } = req.query;

      // Build WHERE clause
      const conditions = [];
      const params = [];

      if (policyId) {
        conditions.push('pm.policyId = ?');
        params.push(policyId);
      }
      if (paymentMethod) {
        conditions.push('pm.paymentMethod = ?');
        params.push(paymentMethod);
      }
      if (status) {
        conditions.push('pm.status = ?');
        params.push(status);
      }
      if (startDate) {
        conditions.push('pm.paymentDate >= ?');
        params.push(startDate);
      }
      if (endDate) {
        conditions.push('pm.paymentDate <= ?');
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
          ip.policyNumber,
          p.name as pagodaName,
          p.nameKhmer as pagodaNameKhmer
        FROM payments pm
        JOIN insurancePolicies ip ON pm.policyId = ip.id
        JOIN pagodas p ON ip.pagodaId = p.id
        ${whereClause}
        ORDER BY pm.paymentDate DESC
        LIMIT ? OFFSET ?
      `, [...params, limit, offset]);

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
          ip.policyNumber,
          ip.coverageAmount,
          ip.premiumAmount,
          p.name as pagodaName,
          p.nameKhmer as pagodaNameKhmer,
          p.province,
          p.district,
          p.address
        FROM payments pm
        JOIN insurancePolicies ip ON pm.policyId = ip.id
        JOIN pagodas p ON ip.pagodaId = p.id
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
    body('paymentMethod').isIn(['cash', 'bank_transfer', 'cheque', 'mobile_payment']).withMessage('Invalid payment method'),
    body('referenceNumber').optional().trim(),
    body('notes').optional().trim()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { policyId, amount, paymentDate, paymentMethod, referenceNumber, notes } = req.body;

      // Verify policy exists
      const policy = await db.get('SELECT * FROM insurancePolicies WHERE id = ?', [policyId]);
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
        'SELECT COUNT(*) as count FROM payments WHERE strftime("%Y", paymentDate) = ?',
        [year.toString()]
      );
      const receiptNumber = `RCP-${year}-${String(count.count + 1).padStart(5, '0')}`;

      const result = await db.run(`
        INSERT INTO payments (
          policyId, amount, paymentDate, paymentMethod,
          referenceNumber, receiptNumber, status, notes,
          recordedBy
        ) VALUES (?, ?, ?, ?, ?, ?, 'completed', ?, ?)
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
          ip.policyNumber,
          ip.coverageAmount,
          ip.startDate,
          ip.endDate,
          p.name as pagodaName,
          p.nameKhmer as pagodaNameKhmer,
          p.province,
          p.district,
          p.commune,
          p.village,
          p.address,
          u.fullName as recordedByName
        FROM payments pm
        JOIN insurancePolicies ip ON pm.policyId = ip.id
        JOIN pagodas p ON ip.pagodaId = p.id
        LEFT JOIN users u ON pm.recordedBy = u.id
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
      res.setHeader('Content-Disposition', `attachment; filename=receipt-${payment.receiptNumber}.pdf`);
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
      const policy = await db.get('SELECT id FROM insurancePolicies WHERE id = ?', [policyId]);
      if (!policy) {
        return res.status(404).json({
          success: false,
          message: 'Policy not found'
        });
      }

      const payments = await db.all(`
        SELECT 
          pm.*,
          u.fullName as recordedByName
        FROM payments pm
        LEFT JOIN users u ON pm.recordedBy = u.id
        WHERE pm.policyId = ?
        ORDER BY pm.paymentDate DESC
      `, [policyId]);

      // Calculate total paid
      const totalPaid = payments.reduce((sum, payment) => {
        return sum + (payment.status === 'completed' ? payment.amount : 0);
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
