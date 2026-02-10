// ប្រព័ន្ធគ្រប់គ្រងវត្តអារាម
// Pagoda Management System

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const Pagoda = require('../models/Pagoda');
const Monk = require('../models/Monk');
const Building = require('../models/Building');
const Insurance = require('../models/Insurance');
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
    query('type').optional().isIn(['dhammayut', 'mahanikay']),
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

      // Build filters object
      const filters = {};
      if (province) filters.province = province;
      if (type) filters.type = type;
      if (size) filters.size = size;
      if (search) filters.search = search;

      // Get total count
      const total = await Pagoda.count(filters);

      // Get pagodas (with monk_count and building_count included)
      const pagodas = await Pagoda.findAll(filters, { offset, limit });

      res.json({
        success: true,
        message: 'Pagodas retrieved successfully',
        data: {
          pagodas,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
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

      const pagoda = await Pagoda.findById(id);

      if (!pagoda) {
        return res.status(404).json({
          success: false,
          message: 'Pagoda not found'
        });
      }

      // Get related counts
      const monks = await Monk.findByPagodaId(id);
      const buildings = await Building.findByPagodaId(id);
      const policies = await Insurance.findByPagodaId(id);

      res.json({
        success: true,
        message: 'Pagoda retrieved successfully',
        data: {
          ...pagoda,
          monkCount: monks.length,
          buildingCount: buildings.length,
          policyCount: policies.length
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
    body('nameEn').trim().notEmpty().withMessage('English name is required'),
    body('nameKm').trim().notEmpty().withMessage('Khmer name is required'),
    body('province').trim().notEmpty().withMessage('Province is required'),
    body('district').trim().notEmpty().withMessage('District is required'),
    body('commune').trim().notEmpty().withMessage('Commune is required'),
    body('village').trim().notEmpty().withMessage('Village is required'),
    body('type').isIn(['dhammayut', 'mahanikay']).withMessage('Invalid pagoda type'),
    body('size').isIn(['small', 'medium', 'large']).withMessage('Invalid pagoda size'),
    body('phone').optional().trim(),
    body('email').optional().trim().isEmail(),
    body('latitude').optional().isFloat({ min: -90, max: 90 }),
    body('longitude').optional().isFloat({ min: -180, max: 180 }),
    body('photoUrl').optional().trim(),
    body('notes').optional().trim()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        nameEn, nameKm, province, district, commune, village,
        type, size, phone, email, latitude, longitude, photoUrl, notes
      } = req.body;

      // Map camelCase to snake_case
      const pagodaData = {
        name_en: nameEn,
        name_km: nameKm,
        province,
        district,
        commune,
        village,
        type,
        size,
        phone,
        email,
        latitude,
        longitude,
        photo_url: photoUrl,
        notes,
        created_by: req.user.id
      };

      const pagodaId = await Pagoda.create(pagodaData);
      const pagoda = await Pagoda.findById(pagodaId);

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
    body('nameEn').optional().trim().notEmpty(),
    body('nameKm').optional().trim().notEmpty(),
    body('province').optional().trim().notEmpty(),
    body('district').optional().trim().notEmpty(),
    body('commune').optional().trim().notEmpty(),
    body('village').optional().trim().notEmpty(),
    body('type').optional().isIn(['dhammayut', 'mahanikay']),
    body('size').optional().isIn(['small', 'medium', 'large']),
    body('phone').optional().trim(),
    body('email').optional().trim().isEmail(),
    body('latitude').optional().isFloat({ min: -90, max: 90 }),
    body('longitude').optional().isFloat({ min: -180, max: 180 }),
    body('photoUrl').optional().trim(),
    body('notes').optional().trim()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;

      const pagoda = await Pagoda.findById(id);
      if (!pagoda) {
        return res.status(404).json({
          success: false,
          message: 'Pagoda not found'
        });
      }

      // Map camelCase to snake_case and merge with existing data
      const updateData = {
        name_en: req.body.nameEn !== undefined ? req.body.nameEn : pagoda.name_en,
        name_km: req.body.nameKm !== undefined ? req.body.nameKm : pagoda.name_km,
        province: req.body.province !== undefined ? req.body.province : pagoda.province,
        district: req.body.district !== undefined ? req.body.district : pagoda.district,
        commune: req.body.commune !== undefined ? req.body.commune : pagoda.commune,
        village: req.body.village !== undefined ? req.body.village : pagoda.village,
        type: req.body.type !== undefined ? req.body.type : pagoda.type,
        size: req.body.size !== undefined ? req.body.size : pagoda.size,
        phone: req.body.phone !== undefined ? req.body.phone : pagoda.phone,
        email: req.body.email !== undefined ? req.body.email : pagoda.email,
        latitude: req.body.latitude !== undefined ? req.body.latitude : pagoda.latitude,
        longitude: req.body.longitude !== undefined ? req.body.longitude : pagoda.longitude,
        photo_url: req.body.photoUrl !== undefined ? req.body.photoUrl : pagoda.photo_url,
        notes: req.body.notes !== undefined ? req.body.notes : pagoda.notes
      };

      // Check if any field is being updated
      const hasChanges = Object.keys(req.body).some(key => 
        ['nameEn', 'nameKm', 'province', 'district', 'commune', 'village', 
         'type', 'size', 'phone', 'email', 'latitude', 'longitude', 'photoUrl', 'notes'].includes(key)
      );

      if (!hasChanges) {
        return res.status(400).json({
          success: false,
          message: 'No fields to update'
        });
      }

      await Pagoda.update(id, updateData);
      const updatedPagoda = await Pagoda.findById(id);

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

      const pagoda = await Pagoda.findById(id);
      if (!pagoda) {
        return res.status(404).json({
          success: false,
          message: 'Pagoda not found'
        });
      }

      // Check for active policies
      // ពិនិត្យមើលថាតើមានគោលនយោបាយធានារ៉ាប់រងសកម្ម
      const policies = await Insurance.findByPagodaId(id);
      const activePolicy = policies.find(p => p.status === 'active');

      if (activePolicy) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete pagoda with active insurance policy'
        });
      }

      await Pagoda.delete(id);

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

      const pagoda = await Pagoda.findById(id);
      if (!pagoda) {
        return res.status(404).json({
          success: false,
          message: 'Pagoda not found'
        });
      }

      const monks = await Monk.findByPagodaId(id);

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

      const pagoda = await Pagoda.findById(id);
      if (!pagoda) {
        return res.status(404).json({
          success: false,
          message: 'Pagoda not found'
        });
      }

      const buildings = await Building.findByPagodaId(id);

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

      const pagoda = await Pagoda.findById(id);
      if (!pagoda) {
        return res.status(404).json({
          success: false,
          message: 'Pagoda not found'
        });
      }

      const policies = await Insurance.findByPagodaId(id);

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
