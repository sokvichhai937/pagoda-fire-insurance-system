// ប្រព័ន្ធគ្រប់គ្រងការទូទាត់
// Payment Processing System

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const Payment = require('../models/Payment');
const Insurance = require('../models/Insurance');
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

      // Build filters for model
      const filters = {};
      if (policyId) filters.policy_id = policyId;
      if (paymentMethod) filters.payment_method = paymentMethod;
      if (startDate) filters.start_date = startDate;
      if (endDate) filters.end_date = endDate;

      // Get payments with pagination
      const payments = await Payment.findAll(filters, { limit, offset });
      
      // Get total count (reuse findAll without pagination)
      const allPayments = await Payment.findAll(filters);
      const total = allPayments.length;

      res.json({
        success: true,
        message: 'Payments retrieved successfully',
        data: {
          payments,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
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

      const payment = await Payment.findById(id);

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

      // Verify policy exists (map camelCase to snake_case)
      const policy = await Insurance.findById(policyId);
      if (!policy) {
        return res.status(404).json({
          success: false,
          message: 'Policy not found'
        });
      }

      // Generate receipt number
      // បង្កើតលេខបង្កាន់ដៃ
      const receiptNumber = await Payment.generateReceiptNumber();

      // Map camelCase to snake_case for model
      const paymentData = {
        policy_id: policyId,
        amount,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        reference_number: referenceNumber,
        receipt_number: receiptNumber,
        notes,
        processed_by: req.user.id
      };

      const paymentId = await Payment.create(paymentData);
      const payment = await Payment.findById(paymentId);

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

      const payment = await Payment.findById(id);

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

      // Verify policy exists (map camelCase to snake_case)
      const policy = await Insurance.findById(policyId);
      if (!policy) {
        return res.status(404).json({
          success: false,
          message: 'Policy not found'
        });
      }

      const payments = await Payment.findByPolicyId(policyId);

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
