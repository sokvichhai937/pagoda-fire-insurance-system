// Payment.js - Payment model
// មូលមតិការបង់ប្រាក់

const { promisePool } = require('../config/database');

class Payment {
  // Create new payment - បង្កើតការបង់ប្រាក់ថ្មី
  static async create(paymentData) {
    const {
      policy_id, receipt_number, amount, payment_date,
      payment_method, reference_number, notes, processed_by
    } = paymentData;
    
    const sql = `
      INSERT INTO payments (
        policy_id, receipt_number, amount, payment_date,
        payment_method, reference_number, notes, processed_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const [result] = await promisePool.execute(sql, [
      policy_id,
      receipt_number,
      amount,
      payment_date,
      payment_method,
      reference_number,
      notes,
      processed_by
    ]);
    
    return result.insertId;
  }

  // Find payment by ID - ស្វែងរកការបង់ប្រាក់តាម ID
  static async findById(id) {
    const sql = `
      SELECT p.*, i.policy_number, i.pagoda_id,
        pg.name_km as pagoda_name,
        u.full_name as processed_by_name
      FROM payments p
      LEFT JOIN insurance_policies i ON p.policy_id = i.id
      LEFT JOIN pagodas pg ON i.pagoda_id = pg.id
      LEFT JOIN users u ON p.processed_by = u.id
      WHERE p.id = ?
    `;
    const [rows] = await promisePool.execute(sql, [id]);
    return rows[0];
  }

  // Find payments by policy ID - ស្វែងរកការបង់ប្រាក់តាមគោលនយោបាយ
  static async findByPolicyId(policyId) {
    const sql = `
      SELECT p.*, u.full_name as processed_by_name
      FROM payments p
      LEFT JOIN users u ON p.processed_by = u.id
      WHERE p.policy_id = ?
      ORDER BY p.payment_date DESC, p.created_at DESC
    `;
    const [rows] = await promisePool.execute(sql, [policyId]);
    return rows;
  }

  // Get all payments with filters and pagination - ទទួលបានការបង់ប្រាក់ទាំងអស់
  static async findAll(filters = {}, pagination = {}) {
    let sql = `
      SELECT p.*, i.policy_number, pg.name_km as pagoda_name,
        u.full_name as processed_by_name
      FROM payments p
      LEFT JOIN insurance_policies i ON p.policy_id = i.id
      LEFT JOIN pagodas pg ON i.pagoda_id = pg.id
      LEFT JOIN users u ON p.processed_by = u.id
      WHERE 1=1
    `;
    const params = [];

    // Apply filters
    if (filters.policy_id) {
      sql += ' AND p.policy_id = ?';
      params.push(filters.policy_id);
    }

    if (filters.payment_method) {
      sql += ' AND p.payment_method = ?';
      params.push(filters.payment_method);
    }

    if (filters.start_date) {
      sql += ' AND p.payment_date >= ?';
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      sql += ' AND p.payment_date <= ?';
      params.push(filters.end_date);
    }

    if (filters.search) {
      sql += ' AND (p.receipt_number LIKE ? OR i.policy_number LIKE ? OR pg.name_km LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    sql += ' ORDER BY p.payment_date DESC, p.created_at DESC';

    // Pagination
    if (pagination.limit) {
      const offset = pagination.offset || 0;
      sql += ' LIMIT ? OFFSET ?';
      params.push(parseInt(pagination.limit), parseInt(offset));
    }

    const [rows] = await promisePool.execute(sql, params);
    return rows;
  }

  // Delete payment - លុបការបង់ប្រាក់
  static async delete(id) {
    const sql = 'DELETE FROM payments WHERE id = ?';
    const [result] = await promisePool.execute(sql, [id]);
    return result.affectedRows > 0;
  }

  // Get total payments by period - ទទួលបានការបង់ប្រាក់សរុបតាមរយៈពេល
  static async getTotalByPeriod(startDate, endDate) {
    const sql = `
      SELECT 
        COUNT(*) as payment_count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM payments
      WHERE payment_date BETWEEN ? AND ?
    `;
    const [rows] = await promisePool.execute(sql, [startDate, endDate]);
    return rows[0];
  }

  // Generate receipt number - បង្កើតលេខបង្កាន់ដៃ
  static async generateReceiptNumber() {
    const year = new Date().getFullYear();
    const prefix = `RCP-${year}-`;
    
    const sql = `
      SELECT receipt_number
      FROM payments
      WHERE receipt_number LIKE ?
      ORDER BY receipt_number DESC
      LIMIT 1
    `;
    
    const [rows] = await promisePool.execute(sql, [`${prefix}%`]);
    
    if (rows.length === 0) {
      return `${prefix}0001`;
    }
    
    const lastNumber = rows[0].receipt_number;
    const lastSequence = parseInt(lastNumber.split('-')[2]);
    const newSequence = (lastSequence + 1).toString().padStart(4, '0');
    
    return `${prefix}${newSequence}`;
  }
}

module.exports = Payment;
