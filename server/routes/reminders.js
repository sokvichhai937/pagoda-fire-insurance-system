// ប្រព័ន្ធគ្រប់គ្រងការរំលឹក
// Reminder Management System

const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const db = require('../database/db');
const { authenticate, isAdminOrStaff } = require('../middleware/auth');

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
      const reminders = await db.all(`
        SELECT 
          r.*,
          ip.policyNumber,
          p.name as pagodaName,
          p.nameKhmer as pagodaNameKhmer,
          p.contactPerson,
          p.contactPhone
        FROM reminders r
        JOIN insurancePolicies ip ON r.policyId = ip.id
        JOIN pagodas p ON ip.pagodaId = p.id
        ORDER BY r.scheduledDate DESC
      `);

      res.json({
        success: true,
        message: 'Reminders retrieved successfully',
        data: reminders
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

      const pendingReminders = await db.all(`
        SELECT 
          r.*,
          ip.policyNumber,
          ip.premiumAmount,
          p.name as pagodaName,
          p.nameKhmer as pagodaNameKhmer,
          p.province,
          p.contactPerson,
          p.contactPhone,
          p.chiefMonkName,
          p.chiefMonkPhone,
          (SELECT SUM(amount) FROM payments WHERE policyId = ip.id AND status = 'completed') as totalPaid
        FROM reminders r
        JOIN insurancePolicies ip ON r.policyId = ip.id
        JOIN pagodas p ON ip.pagodaId = p.id
        WHERE r.status = 'pending'
        AND r.scheduledDate <= ?
        ORDER BY r.scheduledDate ASC
      `, [today]);

      res.json({
        success: true,
        message: 'Pending reminders retrieved successfully',
        data: pendingReminders
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
      const policy = await db.get(`
        SELECT 
          ip.*,
          p.name as pagodaName,
          p.contactPerson,
          p.contactPhone
        FROM insurancePolicies ip
        JOIN pagodas p ON ip.pagodaId = p.id
        WHERE ip.id = ?
      `, [policyId]);

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
            reminderMessage = `សូមរំលឹកថា ការទូទាត់បុព្វលាភធានារ៉ាប់រងនឹងដល់កំណត់។ លេខគោលនយោបាយ: ${policy.policyNumber}`;
            break;
          case 'payment_overdue':
            reminderMessage = `ការទូទាត់បុព្វលាភធានារ៉ាប់រងរបស់លោកអ្នកហួសកាលកំណត់ហើយ។ លេខគោលនយោបាយ: ${policy.policyNumber}`;
            break;
          case 'policy_expiring':
            reminderMessage = `គោលនយោបាយធានារ៉ាប់រងរបស់លោកអ្នកនឹងផុតកំណត់ក្នុងពេលឆាប់ៗនេះ។ លេខគោលនយោបាយ: ${policy.policyNumber}`;
            break;
          case 'policy_expired':
            reminderMessage = `គោលនយោបាយធានារ៉ាប់រងរបស់លោកអ្នកបានផុតកំណត់ហើយ។ លេខគោលនយោបាយ: ${policy.policyNumber}`;
            break;
        }
      }

      // Create reminder
      const result = await db.run(`
        INSERT INTO reminders (
          policyId, reminderType, scheduledDate, message,
          sendMethod, status
        ) VALUES (?, ?, ?, ?, ?, 'sent')
      `, [policyId, reminderType, scheduledDate, reminderMessage, sendMethod]);

      // Update sent date
      await db.run(
        'UPDATE reminders SET sentDate = CURRENT_TIMESTAMP WHERE id = ?',
        [result.lastID]
      );

      const reminder = await db.get(`
        SELECT 
          r.*,
          ip.policyNumber,
          p.name as pagodaName,
          p.nameKhmer as pagodaNameKhmer
        FROM reminders r
        JOIN insurancePolicies ip ON r.policyId = ip.id
        JOIN pagodas p ON ip.pagodaId = p.id
        WHERE r.id = ?
      `, [result.lastID]);

      res.status(201).json({
        success: true,
        message: 'Reminder sent successfully',
        data: reminder
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

      const reminder = await db.get('SELECT id FROM reminders WHERE id = ?', [id]);
      if (!reminder) {
        return res.status(404).json({
          success: false,
          message: 'Reminder not found'
        });
      }

      // Update status
      await db.run('UPDATE reminders SET status = ? WHERE id = ?', [status, id]);

      // If marked as sent, update sent date
      // ប្រសិនបើសម្គាល់ថាបានផ្ញើ កែសម្រួលកាលបរិច្ឆេទផ្ញើ
      if (status === 'sent') {
        await db.run(
          'UPDATE reminders SET sentDate = CURRENT_TIMESTAMP WHERE id = ?',
          [id]
        );
      }

      const updatedReminder = await db.get(`
        SELECT 
          r.*,
          ip.policyNumber,
          p.name as pagodaName,
          p.nameKhmer as pagodaNameKhmer
        FROM reminders r
        JOIN insurancePolicies ip ON r.policyId = ip.id
        JOIN pagodas p ON ip.pagodaId = p.id
        WHERE r.id = ?
      `, [id]);

      res.json({
        success: true,
        message: 'Reminder updated successfully',
        data: updatedReminder
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
