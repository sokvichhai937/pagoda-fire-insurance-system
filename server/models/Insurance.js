// Insurance.js - Insurance policy model
// មូលមតិធានារ៉ាប់រង

const { pool, sql } = require('../config/database');

class Insurance {
  // Create new insurance policy - បង្កើតគោលនយោបាយធានារ៉ាប់រងថ្មី
  static async create(policyData) {
    const {
      pagoda_id, policy_number, premium_amount, coverage_start,
      coverage_end, calculation_details, notes, created_by
    } = policyData;
    
    const query = `
      INSERT INTO insurance_policies (
        pagoda_id, policy_number, premium_amount, coverage_start,
        coverage_end, calculation_details, notes, created_by
      )
      OUTPUT INSERTED.id
      VALUES (@pagoda_id, @policy_number, @premium_amount, @coverage_start,
        @coverage_end, @calculation_details, @notes, @created_by)
    `;
    
    const result = await pool.request()
      .input('pagoda_id', sql.Int, pagoda_id)
      .input('policy_number', sql.NVarChar, policy_number)
      .input('premium_amount', sql.Decimal(10, 2), premium_amount)
      .input('coverage_start', sql.Date, coverage_start)
      .input('coverage_end', sql.Date, coverage_end)
      .input('calculation_details', sql.NVarChar(sql.MAX), calculation_details)
      .input('notes', sql.NVarChar(sql.MAX), notes)
      .input('created_by', sql.Int, created_by)
      .query(query);
    
    return result.recordset[0].id;
  }

  // Find policy by ID - ស្វែងរកគោលនយោបាយតាម ID
  static async findById(id) {
    const query = `
      SELECT i.*, p.name_km as pagoda_name, p.province,
        u.full_name as created_by_name
      FROM insurance_policies i
      LEFT JOIN pagodas p ON i.pagoda_id = p.id
      LEFT JOIN users u ON i.created_by = u.id
      WHERE i.id = @id
    `;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(query);
    return result.recordset[0];
  }

  // Find policies by pagoda ID - ស្វែងរកគោលនយោបាយតាមវត្ត
  static async findByPagodaId(pagodaId) {
    const query = `
      SELECT i.*, u.full_name as created_by_name
      FROM insurance_policies i
      LEFT JOIN users u ON i.created_by = u.id
      WHERE i.pagoda_id = @pagodaId
      ORDER BY i.created_at DESC
    `;
    const result = await pool.request()
      .input('pagodaId', sql.Int, pagodaId)
      .query(query);
    return result.recordset;
  }

  // Get all policies with filters and pagination - ទទួលបានគោលនយោបាយទាំងអស់
  static async findAll(filters = {}, pagination = {}) {
    let query = `
      SELECT i.*, p.name_km as pagoda_name, p.province,
        u.full_name as created_by_name
      FROM insurance_policies i
      LEFT JOIN pagodas p ON i.pagoda_id = p.id
      LEFT JOIN users u ON i.created_by = u.id
      WHERE 1=1
    `;
    
    const request = pool.request();

    // Apply filters
    if (filters.status) {
      query += ' AND i.status = @status';
      request.input('status', sql.NVarChar, filters.status);
    }

    if (filters.pagoda_id) {
      query += ' AND i.pagoda_id = @pagoda_id';
      request.input('pagoda_id', sql.Int, filters.pagoda_id);
    }

    if (filters.search) {
      query += ' AND (i.policy_number LIKE @searchTerm OR p.name_km LIKE @searchTerm)';
      const searchTerm = `%${filters.search}%`;
      request.input('searchTerm', sql.NVarChar, searchTerm);
    }

    query += ' ORDER BY i.created_at DESC';

    // Pagination
    if (pagination.limit) {
      const offset = pagination.offset || 0;
      query += ' OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';
      request.input('limit', sql.Int, parseInt(pagination.limit));
      request.input('offset', sql.Int, parseInt(offset));
    }

    const result = await request.query(query);
    return result.recordset;
  }

  // Update policy - ធ្វើបច្ចុប្បន្នភាពគោលនយោបាយ
  static async update(id, policyData) {
    const {
      premium_amount, coverage_start, coverage_end,
      calculation_details, notes
    } = policyData;
    
    const query = `
      UPDATE insurance_policies SET
        premium_amount = @premium_amount, coverage_start = @coverage_start, coverage_end = @coverage_end,
        calculation_details = @calculation_details, notes = @notes
      WHERE id = @id
    `;
    
    const result = await pool.request()
      .input('premium_amount', sql.Decimal(10, 2), premium_amount)
      .input('coverage_start', sql.Date, coverage_start)
      .input('coverage_end', sql.Date, coverage_end)
      .input('calculation_details', sql.NVarChar(sql.MAX), calculation_details)
      .input('notes', sql.NVarChar(sql.MAX), notes)
      .input('id', sql.Int, id)
      .query(query);
    
    return result.rowsAffected[0] > 0;
  }

  // Update policy status - ធ្វើបច្ចុប្បន្នភាពស្ថានភាពគោលនយោបាយ
  static async updateStatus(id, status) {
    const query = 'UPDATE insurance_policies SET status = @status WHERE id = @id';
    const result = await pool.request()
      .input('status', sql.NVarChar, status)
      .input('id', sql.Int, id)
      .query(query);
    return result.rowsAffected[0] > 0;
  }

  // Delete policy - លុបគោលនយោបាយ
  static async delete(id) {
    const query = 'DELETE FROM insurance_policies WHERE id = @id';
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(query);
    return result.rowsAffected[0] > 0;
  }

  // Get active policies - ទទួលបានគោលនយោបាយសកម្ម
  static async getActivePolicies() {
    const query = `
      SELECT i.*, p.name_km as pagoda_name, p.province
      FROM insurance_policies i
      LEFT JOIN pagodas p ON i.pagoda_id = p.id
      WHERE i.status = 'active'
      ORDER BY i.coverage_end ASC
    `;
    const result = await pool.request().query(query);
    return result.recordset;
  }

  // Get expiring policies - ទទួលបានគោលនយោបាយដែលហួសកំណត់
  static async getExpiringPolicies(days = 30) {
    const query = `
      SELECT i.*, p.name_km as pagoda_name, p.province
      FROM insurance_policies i
      LEFT JOIN pagodas p ON i.pagoda_id = p.id
      WHERE i.status = 'active'
        AND i.coverage_end <= DATEADD(DAY, @days, CAST(GETDATE() AS DATE))
      ORDER BY i.coverage_end ASC
    `;
    const result = await pool.request()
      .input('days', sql.Int, days)
      .query(query);
    return result.recordset;
  }

  // Generate policy number - បង្កើតលេខគោលនយោបាយ
  static async generatePolicyNumber() {
    const year = new Date().getFullYear();
    const prefix = `POL-${year}-`;
    
    const query = `
      SELECT TOP 1 policy_number
      FROM insurance_policies
      WHERE policy_number LIKE @prefix
      ORDER BY policy_number DESC
    `;
    
    const result = await pool.request()
      .input('prefix', sql.NVarChar, `${prefix}%`)
      .query(query);
    
    if (result.recordset.length === 0) {
      return `${prefix}0001`;
    }
    
    const lastNumber = result.recordset[0].policy_number;
    const lastSequence = parseInt(lastNumber.split('-')[2]);
    const newSequence = (lastSequence + 1).toString().padStart(4, '0');
    
    return `${prefix}${newSequence}`;
  }
}

module.exports = Insurance;
