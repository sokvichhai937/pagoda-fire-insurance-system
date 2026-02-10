// Insurance.js - Insurance policy model
// មូលមតិធានារ៉ាប់រង

const { promisePool } = require('../config/database');

class Insurance {
  // Create new insurance policy - បង្កើតគោលនយោបាយធានារ៉ាប់រងថ្មី
  static async create(policyData) {
    const {
      pagoda_id, policy_number, premium_amount, coverage_start,
      coverage_end, calculation_details, notes, created_by
    } = policyData;
    
    const sql = `
      INSERT INTO insurance_policies (
        pagoda_id, policy_number, premium_amount, coverage_start,
        coverage_end, calculation_details, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const [result] = await promisePool.execute(sql, [
      pagoda_id,
      policy_number,
      premium_amount,
      coverage_start,
      coverage_end,
      calculation_details,
      notes,
      created_by
    ]);
    
    return result.insertId;
  }

  // Find policy by ID - ស្វែងរកគោលនយោបាយតាម ID
  static async findById(id) {
    const sql = `
      SELECT i.*, p.name_km as pagoda_name, p.province,
        u.full_name as created_by_name
      FROM insurance_policies i
      LEFT JOIN pagodas p ON i.pagoda_id = p.id
      LEFT JOIN users u ON i.created_by = u.id
      WHERE i.id = ?
    `;
    const [rows] = await promisePool.execute(sql, [id]);
    return rows[0];
  }

  // Find policies by pagoda ID - ស្វែងរកគោលនយោបាយតាមវត្ត
  static async findByPagodaId(pagodaId) {
    const sql = `
      SELECT i.*, u.full_name as created_by_name
      FROM insurance_policies i
      LEFT JOIN users u ON i.created_by = u.id
      WHERE i.pagoda_id = ?
      ORDER BY i.created_at DESC
    `;
    const [rows] = await promisePool.execute(sql, [pagodaId]);
    return rows;
  }

  // Get all policies with filters and pagination - ទទួលបានគោលនយោបាយទាំងអស់
  static async findAll(filters = {}, pagination = {}) {
    let sql = `
      SELECT i.*, p.name_km as pagoda_name, p.province,
        u.full_name as created_by_name
      FROM insurance_policies i
      LEFT JOIN pagodas p ON i.pagoda_id = p.id
      LEFT JOIN users u ON i.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    // Apply filters
    if (filters.status) {
      sql += ' AND i.status = ?';
      params.push(filters.status);
    }

    if (filters.pagoda_id) {
      sql += ' AND i.pagoda_id = ?';
      params.push(filters.pagoda_id);
    }

    if (filters.search) {
      sql += ' AND (i.policy_number LIKE ? OR p.name_km LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }

    sql += ' ORDER BY i.created_at DESC';

    // Pagination
    if (pagination.limit) {
      const offset = pagination.offset || 0;
      sql += ' LIMIT ? OFFSET ?';
      params.push(parseInt(pagination.limit), parseInt(offset));
    }

    const [rows] = await promisePool.execute(sql, params);
    return rows;
  }

  // Update policy - ធ្វើបច្ចុប្បន្នភាពគោលនយោបាយ
  static async update(id, policyData) {
    const {
      premium_amount, coverage_start, coverage_end,
      calculation_details, notes
    } = policyData;
    
    const sql = `
      UPDATE insurance_policies SET
        premium_amount = ?, coverage_start = ?, coverage_end = ?,
        calculation_details = ?, notes = ?
      WHERE id = ?
    `;
    
    const [result] = await promisePool.execute(sql, [
      premium_amount,
      coverage_start,
      coverage_end,
      calculation_details,
      notes,
      id
    ]);
    
    return result.affectedRows > 0;
  }

  // Update policy status - ធ្វើបច្ចុប្បន្នភាពស្ថានភាពគោលនយោបាយ
  static async updateStatus(id, status) {
    const sql = 'UPDATE insurance_policies SET status = ? WHERE id = ?';
    const [result] = await promisePool.execute(sql, [status, id]);
    return result.affectedRows > 0;
  }

  // Delete policy - លុបគោលនយោបាយ
  static async delete(id) {
    const sql = 'DELETE FROM insurance_policies WHERE id = ?';
    const [result] = await promisePool.execute(sql, [id]);
    return result.affectedRows > 0;
  }

  // Get active policies - ទទួលបានគោលនយោបាយសកម្ម
  static async getActivePolicies() {
    const sql = `
      SELECT i.*, p.name_km as pagoda_name, p.province
      FROM insurance_policies i
      LEFT JOIN pagodas p ON i.pagoda_id = p.id
      WHERE i.status = 'active'
      ORDER BY i.coverage_end ASC
    `;
    const [rows] = await promisePool.execute(sql);
    return rows;
  }

  // Get expiring policies - ទទួលបានគោលនយោបាយដែលហួសកំណត់
  static async getExpiringPolicies(days = 30) {
    const sql = `
      SELECT i.*, p.name_km as pagoda_name, p.province
      FROM insurance_policies i
      LEFT JOIN pagodas p ON i.pagoda_id = p.id
      WHERE i.status = 'active'
        AND i.coverage_end <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
      ORDER BY i.coverage_end ASC
    `;
    const [rows] = await promisePool.execute(sql, [days]);
    return rows;
  }

  // Generate policy number - បង្កើតលេខគោលនយោបាយ
  static async generatePolicyNumber() {
    const year = new Date().getFullYear();
    const prefix = `POL-${year}-`;
    
    const sql = `
      SELECT policy_number
      FROM insurance_policies
      WHERE policy_number LIKE ?
      ORDER BY policy_number DESC
      LIMIT 1
    `;
    
    const [rows] = await promisePool.execute(sql, [`${prefix}%`]);
    
    if (rows.length === 0) {
      return `${prefix}0001`;
    }
    
    const lastNumber = rows[0].policy_number;
    const lastSequence = parseInt(lastNumber.split('-')[2]);
    const newSequence = (lastSequence + 1).toString().padStart(4, '0');
    
    return `${prefix}${newSequence}`;
  }
}

module.exports = Insurance;
