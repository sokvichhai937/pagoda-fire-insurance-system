// ប្រព័ន្ធគ្រប់គ្រងការរំលឹក
// Reminder Management System

const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const Reminder = require('../models/Reminder');
const Insurance = require('../models/Insurance');
const { authenticate, isAdminOrStaff } = require('../middleware/auth');
const { pool, sql } = require('../config/database');

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

// GET /api/reminders - Get all reminders
// យកបញ្ជីការរំលឹកទាំងអស់
router.get('/',
  authenticate,
  async (req, res) => {
    try {
      const result = await pool.request().query(`
        SELECT 
          r.*,
          ip.policy_number as policyNumber,
          p.name_km as pagodaNameKhmer,
          p.name_en as pagodaName,
          p.phone as contactPhone
        FROM reminders r
        JOIN insurance_policies ip ON r.policy_id = ip.id
        JOIN pagodas p ON ip.pagoda_id = p.id
        ORDER BY r.reminder_date DESC
      `);

      res.json({
        success: true,
        message: 'Reminders retrieved successfully',
        data: result.recordset
      });
    } catch (error) {
      console.error('Error fetching reminders:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve reminders',
        error: error.message
      });
    }
  }
);

// GET /api/reminders/pending - Get pending reminders
// យកបញ្ជីការរំលឹកដែលរង់ចាំ
router.get('/pending',
  authenticate,
  async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const result = await pool.request()
        .input('today', sql.Date, today)
        .query(`
          SELECT 
            r.*,
            ip.policy_number as policyNumber,
            ip.premium_amount as premiumAmount,
            p.name_km as pagodaNameKhmer,
            p.name_en as pagodaName,
            p.province,
            p.phone as contactPhone,
            (SELECT SUM(amount) FROM payments WHERE policy_id = ip.id) as totalPaid
          FROM reminders r
          JOIN insurance_policies ip ON r.policy_id = ip.id
          JOIN pagodas p ON ip.pagoda_id = p.id
          WHERE r.status = 'pending'
          AND r.reminder_date <= @today
          ORDER BY r.reminder_date ASC
        `);

      res.json({
        success: true,
        message: 'Pending reminders retrieved successfully',
        data: result.recordset
      });
    } catch (error) {
      console.error('Error fetching pending reminders:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve pending reminders',
        error: error.message
      });
    }
  }
);

// POST /api/reminders/send - Send reminder manually (admin/staff)
// ផ្ញើការរំលឹកដោយដៃ (សម្រាប់អ្នកគ្រប់គ្រង/បុគ្គលិក)
router.post('/send',
  authenticate,
  isAdminOrStaff,
  [
    body('policyId').isInt().withMessage('Valid policy ID is required'),
    body('reminderType').isIn(['payment_due', 'payment_overdue', 'policy_expiring', 'policy_expired'])
      .withMessage('Invalid reminder type'),
    body('scheduledDate').optional().isISO8601().withMessage('Valid date is required'),
    body('message').optional().trim(),
    body('sendMethod').optional().isIn(['sms', 'email', 'phone', 'letter']).withMessage('Invalid send method')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        policyId,
        reminderType,
        scheduledDate = new Date().toISOString().split('T')[0],
        message,
        sendMethod = 'phone'
      } = req.body;

      // Verify policy exists
      const result = await pool.request()
        .input('policyId', sql.Int, policyId)
        .query(`
          SELECT 
            ip.*,
            p.name_km as pagodaNameKhmer,
            p.phone as contactPhone
          FROM insurance_policies ip
          JOIN pagodas p ON ip.pagoda_id = p.id
          WHERE ip.id = @policyId
        `);

      const policy = result.recordset[0];
      if (!policy) {
        return res.status(404).json({
          success: false,
          message: 'Policy not found'
        });
      }

      // Generate default message if not provided
      // បង្កើតសារលំនាំដើម ប្រសិនបើមិនបានផ្តល់
      let reminderMessage = message;
      if (!reminderMessage) {
        switch (reminderType) {
          case 'payment_due':
            reminderMessage = `សូមរំលឹកថា ការទូទាត់បុព្វលាភធានារ៉ាប់រងនឹងដល់កំណត់។ លេខគោលនយោបាយ: ${policy.policy_number}`;
            break;
          case 'payment_overdue':
            reminderMessage = `ការទូទាត់បុព្វលាភធានារ៉ាប់រងរបស់លោកអ្នកហួសកាលកំណត់ហើយ។ លេខគោលនយោបាយ: ${policy.policy_number}`;
            break;
          case 'policy_expiring':
            reminderMessage = `គោលនយោបាយធានារ៉ាប់រងរបស់លោកអ្នកនឹងផុតកំណត់ក្នុងពេលឆាប់ៗនេះ។ លេខគោលនយោបាយ: ${policy.policy_number}`;
            break;
          case 'policy_expired':
            reminderMessage = `គោលនយោបាយធានារ៉ាប់រងរបស់លោកអ្នកបានផុតកំណត់ហើយ។ លេខគោលនយោបាយ: ${policy.policy_number}`;
            break;
        }
      }

      // Create reminder with status 'sent'
      // Map sendMethod to schema-compliant reminder_type
      // NOTE: Schema only supports 'email', 'sms', 'both'. 
      // For backward compatibility, 'phone' and 'letter' are mapped to 'sms'
      // TODO: Consider extending schema to support additional reminder types
      let dbReminderType = sendMethod;
      if (sendMethod === 'phone' || sendMethod === 'letter') {
        dbReminderType = 'sms';
      }
      
      const insertResult = await pool.request()
        .input('policy_id', sql.Int, policyId)
        .input('reminder_type', sql.NVarChar, dbReminderType)
        .input('reminder_date', sql.Date, scheduledDate)
        .input('notes', sql.NVarChar(sql.MAX), reminderMessage)
        .input('status', sql.NVarChar, 'sent')
        .input('sent_at', sql.DateTime, new Date())
        .query(`
          INSERT INTO reminders (
            policy_id, reminder_type, reminder_date, notes,
            status, sent_at
          )
          OUTPUT INSERTED.id
          VALUES (@policy_id, @reminder_type, @reminder_date, @notes, @status, @sent_at)
        `);

      const reminderId = insertResult.recordset[0].id;

      const reminderResult = await pool.request()
        .input('id', sql.Int, reminderId)
        .query(`
          SELECT 
            r.*,
            ip.policy_number as policyNumber,
            p.name_km as pagodaNameKhmer,
            p.name_en as pagodaName
          FROM reminders r
          JOIN insurance_policies ip ON r.policy_id = ip.id
          JOIN pagodas p ON ip.pagoda_id = p.id
          WHERE r.id = @id
        `);

      res.status(201).json({
        success: true,
        message: 'Reminder sent successfully',
        data: reminderResult.recordset[0]
      });
    } catch (error) {
      console.error('Error sending reminder:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send reminder',
        error: error.message
      });
    }
  }
);

// PUT /api/reminders/:id - Update reminder status
// កែប្រែស្ថានភាពការរំលឹក
router.put('/:id',
  authenticate,
  isAdminOrStaff,
  [
    param('id').isInt().withMessage('Reminder ID must be an integer'),
    body('status').isIn(['pending', 'sent', 'failed', 'cancelled']).withMessage('Invalid status')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const reminder = await Reminder.findById(id);
      if (!reminder) {
        return res.status(404).json({
          success: false,
          message: 'Reminder not found'
        });
      }

      // Update status
      // ប្រសិនបើសម្គាល់ថាបានផ្ញើ កែសម្រួលកាលបរិច្ឆេទផ្ញើ
      const sent_at = status === 'sent' ? new Date() : reminder.sent_at;
      await Reminder.updateStatus(id, status, sent_at);

      const updatedResult = await pool.request()
        .input('id', sql.Int, id)
        .query(`
          SELECT 
            r.*,
            ip.policy_number as policyNumber,
            p.name_km as pagodaNameKhmer,
            p.name_en as pagodaName
          FROM reminders r
          JOIN insurance_policies ip ON r.policy_id = ip.id
          JOIN pagodas p ON ip.pagoda_id = p.id
          WHERE r.id = @id
        `);

      res.json({
        success: true,
        message: 'Reminder updated successfully',
        data: updatedResult.recordset[0]
      });
    } catch (error) {
      console.error('Error updating reminder:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update reminder',
        error: error.message
      });
    }
  }
);

module.exports = router;
