// Payment.js - Payment model
// មូលមតិការបង់ប្រាក់

const { pool, sql } = require('../config/database');

class Payment {
  // Create new payment - បង្កើតការបង់ប្រាក់ថ្មី
  static async create(paymentData) {
    const {
      policy_id, receipt_number, amount, payment_date,
      payment_method, reference_number, notes, processed_by
    } = paymentData;
    
    const query = `
      INSERT INTO payments (
        policy_id, receipt_number, amount, payment_date,
        payment_method, reference_number, notes, processed_by
      )
      OUTPUT INSERTED.id
      VALUES (
        @policy_id, @receipt_number, @amount, @payment_date,
        @payment_method, @reference_number, @notes, @processed_by
      )
    `;
    
    const request = pool.request()
      .input('policy_id', sql.Int, policy_id)
      .input('receipt_number', sql.NVarChar, receipt_number)
      .input('amount', sql.Decimal(10, 2), amount)
      .input('payment_date', sql.Date, payment_date)
      .input('payment_method', sql.NVarChar, payment_method)
      .input('reference_number', sql.NVarChar, reference_number)
      .input('notes', sql.NVarChar(sql.MAX), notes)
      .input('processed_by', sql.Int, processed_by);
    
    const result = await request.query(query);
    return result.recordset[0].id;
  }

  // Find payment by ID - ស្វែងរកការបង់ប្រាក់តាម ID
  static async findById(id) {
    const query = `
      SELECT p.*, i.policy_number, i.pagoda_id,
        pg.name_km as pagoda_name,
        u.full_name as processed_by_name
      FROM payments p
      LEFT JOIN insurance_policies i ON p.policy_id = i.id
      LEFT JOIN pagodas pg ON i.pagoda_id = pg.id
      LEFT JOIN users u ON p.processed_by = u.id
      WHERE p.id = @id
    `;
    const request = pool.request()
      .input('id', sql.Int, id);
    const result = await request.query(query);
    return result.recordset[0];
  }

  // Find payments by policy ID - ស្វែងរកការបង់ប្រាក់តាមគោលនយោបាយ
  static async findByPolicyId(policyId) {
    const query = `
      SELECT p.*, u.full_name as processed_by_name
      FROM payments p
      LEFT JOIN users u ON p.processed_by = u.id
      WHERE p.policy_id = @policyId
      ORDER BY p.payment_date DESC, p.created_at DESC
    `;
    const request = pool.request()
      .input('policyId', sql.Int, policyId);
    const result = await request.query(query);
    return result.recordset;
  }

  // Get all payments with filters and pagination - ទទួលបានការបង់ប្រាក់ទាំងអស់
  static async findAll(filters = {}, pagination = {}) {
    let query = `
      SELECT p.*, i.policy_number, pg.name_km as pagoda_name,
        u.full_name as processed_by_name
      FROM payments p
      LEFT JOIN insurance_policies i ON p.policy_id = i.id
      LEFT JOIN pagodas pg ON i.pagoda_id = pg.id
      LEFT JOIN users u ON p.processed_by = u.id
      WHERE 1=1
    `;
    const request = pool.request();

    // Apply filters
    if (filters.policy_id) {
      query += ' AND p.policy_id = @policy_id';
      request.input('policy_id', sql.Int, filters.policy_id);
    }

    if (filters.payment_method) {
      query += ' AND p.payment_method = @payment_method';
      request.input('payment_method', sql.NVarChar, filters.payment_method);
    }

    if (filters.start_date) {
      query += ' AND p.payment_date >= @start_date';
      request.input('start_date', sql.Date, filters.start_date);
    }

    if (filters.end_date) {
      query += ' AND p.payment_date <= @end_date';
      request.input('end_date', sql.Date, filters.end_date);
    }

    if (filters.search) {
      query += ' AND (p.receipt_number LIKE @search OR i.policy_number LIKE @search OR pg.name_km LIKE @search)';
      const searchTerm = `%${filters.search}%`;
      request.input('search', sql.NVarChar, searchTerm);
    }

    query += ' ORDER BY p.payment_date DESC, p.created_at DESC';

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

  // Count payments with filters - រាប់ការបង់ប្រាក់
  static async count(filters = {}) {
    let query = 'SELECT COUNT(*) as total FROM payments WHERE 1=1';
    const request = pool.request();

    // Apply filters
    if (filters.policy_id) {
      query += ' AND policy_id = @policy_id';
      request.input('policy_id', sql.Int, filters.policy_id);
    }

    if (filters.payment_method) {
      query += ' AND payment_method = @payment_method';
      request.input('payment_method', sql.NVarChar, filters.payment_method);
    }

    if (filters.start_date) {
      query += ' AND payment_date >= @start_date';
      request.input('start_date', sql.Date, filters.start_date);
    }

    if (filters.end_date) {
      query += ' AND payment_date <= @end_date';
      request.input('end_date', sql.Date, filters.end_date);
    }

    const result = await request.query(query);
    return result.recordset[0].total;
  }

  // Delete payment - លុបការបង់ប្រាក់
  static async delete(id) {
    const query = 'DELETE FROM payments WHERE id = @id';
    const request = pool.request()
      .input('id', sql.Int, id);
    const result = await request.query(query);
    return result.rowsAffected[0] > 0;
  }

  // Get total payments by period - ទទួលបានការបង់ប្រាក់សរុបតាមរយៈពេល
  static async getTotalByPeriod(startDate, endDate) {
    const query = `
      SELECT 
        COUNT(*) as payment_count,
        ISNULL(SUM(amount), 0) as total_amount
      FROM payments
      WHERE payment_date BETWEEN @startDate AND @endDate
    `;
    const request = pool.request()
      .input('startDate', sql.Date, startDate)
      .input('endDate', sql.Date, endDate);
    const result = await request.query(query);
    return result.recordset[0];
  }

  // Generate receipt number - បង្កើតលេខបង្កាន់ដៃ
  static async generateReceiptNumber() {
    const year = new Date().getFullYear();
    const prefix = `RCP-${year}-`;
    
    const query = `
      SELECT TOP 1 receipt_number
      FROM payments
      WHERE receipt_number LIKE @prefix
      ORDER BY receipt_number DESC
    `;
    
    const request = pool.request()
      .input('prefix', sql.NVarChar, `${prefix}%`);
    const result = await request.query(query);
    
    if (result.recordset.length === 0) {
      return `${prefix}0001`;
    }
    
    const lastNumber = result.recordset[0].receipt_number;
    const lastSequence = parseInt(lastNumber.split('-')[2]);
    const newSequence = (lastSequence + 1).toString().padStart(4, '0');
    
    return `${prefix}${newSequence}`;
  }
}

module.exports = Payment;
