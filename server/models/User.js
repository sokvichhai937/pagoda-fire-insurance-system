// User.js - User model
// មូលមតិអ្នកប្រើប្រាស់

const { pool, sql } = require('../config/database');
const bcrypt = require('bcrypt');

class User {
  // Create new user - បង្កើតអ្នកប្រើប្រាស់ថ្មី
  static async create(userData) {
    const { username, email, password, full_name, role = 'viewer' } = userData;
    
    // Hash password - បំលែងពាក្យសម្ងាត់
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.request()
      .input('username', sql.NVarChar, username)
      .input('email', sql.NVarChar, email)
      .input('password', sql.NVarChar, hashedPassword)
      .input('full_name', sql.NVarChar, full_name)
      .input('role', sql.NVarChar, role)
      .query(`
        INSERT INTO users (username, email, password, full_name, role)
        OUTPUT INSERTED.id
        VALUES (@username, @email, @password, @full_name, @role)
      `);
    
    return result.recordset[0].id;
  }

  // Find user by ID - ស្វែងរកអ្នកប្រើប្រាស់តាម ID
  static async findById(id) {
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT id, username, email, full_name, role, is_active, created_at FROM users WHERE id = @id');
    return result.recordset[0];
  }

  // Find user by username - ស្វែងរកអ្នកប្រើប្រាស់តាមឈ្មោះ
  static async findByUsername(username) {
    const result = await pool.request()
      .input('username', sql.NVarChar, username)
      .query('SELECT * FROM users WHERE username = @username');
    return result.recordset[0];
  }

  // Find user by email - ស្វែងរកអ្នកប្រើប្រាស់តាមអ៊ីមែល
  static async findByEmail(email) {
    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT * FROM users WHERE email = @email');
    return result.recordset[0];
  }

  // Get all users - ទទួលបានអ្នកប្រើប្រាស់ទាំងអស់
  static async findAll(filters = {}) {
    let query = 'SELECT id, username, email, full_name, role, is_active, created_at FROM users WHERE 1=1';
    const request = pool.request();

    if (filters.role) {
      query += ' AND role = @role';
      request.input('role', sql.NVarChar, filters.role);
    }

    if (filters.is_active !== undefined) {
      query += ' AND is_active = @is_active';
      request.input('is_active', sql.Bit, filters.is_active);
    }

    query += ' ORDER BY created_at DESC';

    const result = await request.query(query);
    return result.recordset;
  }

  // Update user - ធ្វើបច្ចុប្បន្នភាពអ្នកប្រើប្រាស់
  static async update(id, userData) {
    const { username, email, full_name, role, is_active } = userData;
    
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('username', sql.NVarChar, username)
      .input('email', sql.NVarChar, email)
      .input('full_name', sql.NVarChar, full_name)
      .input('role', sql.NVarChar, role)
      .input('is_active', sql.Bit, is_active)
      .query(`
        UPDATE users 
        SET username = @username, email = @email, full_name = @full_name, 
            role = @role, is_active = @is_active, updated_at = GETDATE()
        WHERE id = @id
      `);
    
    return result.rowsAffected[0] > 0;
  }

  // Update password - ធ្វើបច្ចុប្បន្នភាពពាក្យសម្ងាត់
  static async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('password', sql.NVarChar, hashedPassword)
      .query('UPDATE users SET password = @password WHERE id = @id');
    return result.rowsAffected[0] > 0;
  }

  // Delete user - លុបអ្នកប្រើប្រាស់
  static async delete(id) {
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM users WHERE id = @id');
    return result.rowsAffected[0] > 0;
  }

  // Verify password - ផ្ទៀងផ្ទាត់ពាក្យសម្ងាត់
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // Check if username exists - ពិនិត្យមើលថាតើឈ្មោះមានស្រាប់ឬអត់
  static async usernameExists(username, excludeId = null) {
    const request = pool.request()
      .input('username', sql.NVarChar, username);
    
    let query = 'SELECT id FROM users WHERE username = @username';
    
    if (excludeId) {
      query += ' AND id != @excludeId';
      request.input('excludeId', sql.Int, excludeId);
    }
    
    const result = await request.query(query);
    return result.recordset.length > 0;
  }

  // Check if email exists - ពិនិត្យមើលថាតើអ៊ីមែលមានស្រាប់ឬអត់
  static async emailExists(email, excludeId = null) {
    const request = pool.request()
      .input('email', sql.NVarChar, email);
    
    let query = 'SELECT id FROM users WHERE email = @email';
    
    if (excludeId) {
      query += ' AND id != @excludeId';
      request.input('excludeId', sql.Int, excludeId);
    }
    
    const result = await request.query(query);
    return result.recordset.length > 0;
  }
}

module.exports = User;
