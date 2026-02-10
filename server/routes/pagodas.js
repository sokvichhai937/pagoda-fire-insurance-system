// ប្រព័ន្ធគ្រប់គ្រងវត្តអារាម
// Pagoda Management System

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
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

// GET /api/pagodas - Get all pagodas (with filters and pagination)
// យកបញ្ជីវត្តអារាមទាំងអស់ (ជាមួយនឹងការត្រង និងការបែងចែកទំព័រ)
router.get('/',
  authenticate,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    query('province').optional().trim(),
    query('type').optional().isIn(['city', 'rural', 'forest']),
    query('size').optional().isIn(['small', 'medium', 'large']),
    query('search').optional().trim()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;
      const { province, type, size, search } = req.query;

      // Build WHERE clause
      const conditions = [];
      const params = [];

      if (province) {
        conditions.push('province = ?');
        params.push(province);
      }
      if (type) {
        conditions.push('type = ?');
        params.push(type);
      }
      if (size) {
        conditions.push('size = ?');
        params.push(size);
      }
      if (search) {
        conditions.push('(name LIKE ? OR nameKhmer LIKE ? OR address LIKE ?)');
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countResult = await db.get(
        `SELECT COUNT(*) as total FROM pagodas ${whereClause}`,
        params
      );

      // Get pagodas
      const pagodas = await db.all(`
        SELECT 
          p.*,
          (SELECT COUNT(*) FROM monks WHERE pagodaId = p.id) as monkCount,
          (SELECT COUNT(*) FROM buildings WHERE pagodaId = p.id) as buildingCount
        FROM pagodas p
        ${whereClause}
        ORDER BY p.createdAt DESC
        OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
      `, [...params, offset, limit]);

      res.json({
        success: true,
        message: 'Pagodas retrieved successfully',
        data: {
          pagodas,
          pagination: {
            total: countResult.total,
            page,
            limit,
            totalPages: Math.ceil(countResult.total / limit)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching pagodas:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve pagodas',
        error: error.message
      });
    }
  }
);

// GET /api/pagodas/:id - Get pagoda details
// យកព័ត៌មានលម្អិតអំពីវត្តអារាម
router.get('/:id',
  authenticate,
  param('id').isInt().withMessage('Pagoda ID must be an integer'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;

      const pagoda = await db.get('SELECT * FROM pagodas WHERE id = ?', [id]);

      if (!pagoda) {
        return res.status(404).json({
          success: false,
          message: 'Pagoda not found'
        });
      }

      // Get related counts
      const monkCount = await db.get(
        'SELECT COUNT(*) as count FROM monks WHERE pagodaId = ?',
        [id]
      );
      const buildingCount = await db.get(
        'SELECT COUNT(*) as count FROM buildings WHERE pagodaId = ?',
        [id]
      );
      const policyCount = await db.get(
        'SELECT COUNT(*) as count FROM insurancePolicies WHERE pagodaId = ?',
        [id]
      );

      res.json({
        success: true,
        message: 'Pagoda retrieved successfully',
        data: {
          ...pagoda,
          monkCount: monkCount.count,
          buildingCount: buildingCount.count,
          policyCount: policyCount.count
        }
      });
    } catch (error) {
      console.error('Error fetching pagoda:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve pagoda',
        error: error.message
      });
    }
  }
);

// POST /api/pagodas - Create pagoda (admin/staff)
// បង្កើតវត្តអារាមថ្មី (សម្រាប់អ្នកគ្រប់គ្រង/បុគ្គលិក)
router.post('/',
  authenticate,
  isAdminOrStaff,
  [
    body('name').trim().notEmpty().withMessage('Pagoda name is required'),
    body('nameKhmer').trim().notEmpty().withMessage('Khmer name is required'),
    body('province').trim().notEmpty().withMessage('Province is required'),
    body('district').trim().notEmpty().withMessage('District is required'),
    body('commune').trim().notEmpty().withMessage('Commune is required'),
    body('village').trim().notEmpty().withMessage('Village is required'),
    body('address').trim().notEmpty().withMessage('Address is required'),
    body('type').isIn(['city', 'rural', 'forest']).withMessage('Invalid pagoda type'),
    body('size').isIn(['small', 'medium', 'large']).withMessage('Invalid pagoda size'),
    body('chiefMonkName').trim().notEmpty().withMessage('Chief monk name is required'),
    body('chiefMonkPhone').optional().trim(),
    body('contactPerson').optional().trim(),
    body('contactPhone').optional().trim(),
    body('latitude').optional().isFloat({ min: -90, max: 90 }),
    body('longitude').optional().isFloat({ min: -180, max: 180 })
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        name, nameKhmer, province, district, commune, village,
        address, type, size, chiefMonkName, chiefMonkPhone,
        contactPerson, contactPhone, latitude, longitude, notes
      } = req.body;

      const result = await db.run(`
        INSERT INTO pagodas (
          name, nameKhmer, province, district, commune, village,
          address, type, size, chiefMonkName, chiefMonkPhone,
          contactPerson, contactPhone, latitude, longitude, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        name, nameKhmer, province, district, commune, village,
        address, type, size, chiefMonkName, chiefMonkPhone,
        contactPerson, contactPhone, latitude, longitude, notes
      ]);

      const pagoda = await db.get('SELECT * FROM pagodas WHERE id = ?', [result.lastID]);

      res.status(201).json({
        success: true,
        message: 'Pagoda created successfully',
        data: pagoda
      });
    } catch (error) {
      console.error('Error creating pagoda:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create pagoda',
        error: error.message
      });
    }
  }
);

// PUT /api/pagodas/:id - Update pagoda (admin/staff)
// កែប្រែព័ត៌មានវត្តអារាម (សម្រាប់អ្នកគ្រប់គ្រង/បុគ្គលិក)
router.put('/:id',
  authenticate,
  isAdminOrStaff,
  [
    param('id').isInt().withMessage('Pagoda ID must be an integer'),
    body('name').optional().trim().notEmpty(),
    body('nameKhmer').optional().trim().notEmpty(),
    body('province').optional().trim().notEmpty(),
    body('district').optional().trim().notEmpty(),
    body('commune').optional().trim().notEmpty(),
    body('village').optional().trim().notEmpty(),
    body('address').optional().trim().notEmpty(),
    body('type').optional().isIn(['city', 'rural', 'forest']),
    body('size').optional().isIn(['small', 'medium', 'large']),
    body('chiefMonkName').optional().trim().notEmpty(),
    body('chiefMonkPhone').optional().trim(),
    body('contactPerson').optional().trim(),
    body('contactPhone').optional().trim(),
    body('latitude').optional().isFloat({ min: -90, max: 90 }),
    body('longitude').optional().isFloat({ min: -180, max: 180 })
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;

      const pagoda = await db.get('SELECT id FROM pagodas WHERE id = ?', [id]);
      if (!pagoda) {
        return res.status(404).json({
          success: false,
          message: 'Pagoda not found'
        });
      }

      // Build update query dynamically
      const updates = [];
      const values = [];
      const allowedFields = [
        'name', 'nameKhmer', 'province', 'district', 'commune', 'village',
        'address', 'type', 'size', 'chiefMonkName', 'chiefMonkPhone',
        'contactPerson', 'contactPhone', 'latitude', 'longitude', 'notes'
      ];

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates.push(`${field} = ?`);
          values.push(req.body[field]);
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
        `UPDATE pagodas SET ${updates.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
        values
      );

      const updatedPagoda = await db.get('SELECT * FROM pagodas WHERE id = ?', [id]);

      res.json({
        success: true,
        message: 'Pagoda updated successfully',
        data: updatedPagoda
      });
    } catch (error) {
      console.error('Error updating pagoda:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update pagoda',
        error: error.message
      });
    }
  }
);

// DELETE /api/pagodas/:id - Delete pagoda (admin only)
// លុបវត្តអារាម (សម្រាប់អ្នកគ្រប់គ្រងតែប៉ុណ្ណោះ)
router.delete('/:id',
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
  param('id').isInt().withMessage('Pagoda ID must be an integer'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;

      const pagoda = await db.get('SELECT id FROM pagodas WHERE id = ?', [id]);
      if (!pagoda) {
        return res.status(404).json({
          success: false,
          message: 'Pagoda not found'
        });
      }

      // Check for active policies
      // ពិនិត្យមើលថាតើមានគោលនយោបាយធានារ៉ាប់រងសកម្ម
      const activePolicy = await db.get(
        'SELECT id FROM insurancePolicies WHERE pagodaId = ? AND status = ?',
        [id, 'active']
      );

      if (activePolicy) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete pagoda with active insurance policy'
        });
      }

      await db.run('DELETE FROM pagodas WHERE id = ?', [id]);

      res.json({
        success: true,
        message: 'Pagoda deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting pagoda:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete pagoda',
        error: error.message
      });
    }
  }
);

// GET /api/pagodas/:id/monks - Get monks of pagoda
// យកបញ្ជីព្រះសង្ឃនៃវត្តអារាម
router.get('/:id/monks',
  authenticate,
  param('id').isInt().withMessage('Pagoda ID must be an integer'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;

      const pagoda = await db.get('SELECT id FROM pagodas WHERE id = ?', [id]);
      if (!pagoda) {
        return res.status(404).json({
          success: false,
          message: 'Pagoda not found'
        });
      }

      const monks = await db.all(
        'SELECT * FROM monks WHERE pagodaId = ? ORDER BY ordinationDate DESC',
        [id]
      );

      res.json({
        success: true,
        message: 'Monks retrieved successfully',
        data: monks
      });
    } catch (error) {
      console.error('Error fetching monks:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve monks',
        error: error.message
      });
    }
  }
);

// GET /api/pagodas/:id/buildings - Get buildings of pagoda
// យកបញ្ជីអគារនៃវត្តអារាម
router.get('/:id/buildings',
  authenticate,
  param('id').isInt().withMessage('Pagoda ID must be an integer'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;

      const pagoda = await db.get('SELECT id FROM pagodas WHERE id = ?', [id]);
      if (!pagoda) {
        return res.status(404).json({
          success: false,
          message: 'Pagoda not found'
        });
      }

      const buildings = await db.all(
        'SELECT * FROM buildings WHERE pagodaId = ? ORDER BY buildingType, name',
        [id]
      );

      res.json({
        success: true,
        message: 'Buildings retrieved successfully',
        data: buildings
      });
    } catch (error) {
      console.error('Error fetching buildings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve buildings',
        error: error.message
      });
    }
  }
);

// GET /api/pagodas/:id/policies - Get insurance policies
// យកបញ្ជីគោលនយោបាយធានារ៉ាប់រង
router.get('/:id/policies',
  authenticate,
  param('id').isInt().withMessage('Pagoda ID must be an integer'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;

      const pagoda = await db.get('SELECT id FROM pagodas WHERE id = ?', [id]);
      if (!pagoda) {
        return res.status(404).json({
          success: false,
          message: 'Pagoda not found'
        });
      }

      const policies = await db.all(
        'SELECT * FROM insurancePolicies WHERE pagodaId = ? ORDER BY startDate DESC',
        [id]
      );

      res.json({
        success: true,
        message: 'Insurance policies retrieved successfully',
        data: policies
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

module.exports = router;
