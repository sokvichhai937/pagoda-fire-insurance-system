// User.js - User model
// មូលមតិអ្នកប្រើប្រាស់

const { promisePool } = require('../config/database');
const bcrypt = require('bcrypt');

class User {
  // Create new user - បង្កើតអ្នកប្រើប្រាស់ថ្មី
  static async create(userData) {
    const { username, email, password, full_name, role = 'viewer' } = userData;
    
    // Hash password - បំលែងពាក្យសម្ងាត់
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const sql = `
      INSERT INTO users (username, email, password, full_name, role)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const [result] = await promisePool.execute(sql, [
      username,
      email,
      hashedPassword,
      full_name,
      role
    ]);
    
    return result.insertId;
  }

  // Find user by ID - ស្វែងរកអ្នកប្រើប្រាស់តាម ID
  static async findById(id) {
    const sql = 'SELECT id, username, email, full_name, role, is_active, created_at FROM users WHERE id = ?';
    const [rows] = await promisePool.execute(sql, [id]);
    return rows[0];
  }

  // Find user by username - ស្វែងរកអ្នកប្រើប្រាស់តាមឈ្មោះ
  static async findByUsername(username) {
    const sql = 'SELECT * FROM users WHERE username = ?';
    const [rows] = await promisePool.execute(sql, [username]);
    return rows[0];
  }

  // Find user by email - ស្វែងរកអ្នកប្រើប្រាស់តាមអ៊ីមែល
  static async findByEmail(email) {
    const sql = 'SELECT * FROM users WHERE email = ?';
    const [rows] = await promisePool.execute(sql, [email]);
    return rows[0];
  }

  // Get all users - ទទួលបានអ្នកប្រើប្រាស់ទាំងអស់
  static async findAll(filters = {}) {
    let sql = 'SELECT id, username, email, full_name, role, is_active, created_at FROM users WHERE 1=1';
    const params = [];

    if (filters.role) {
      sql += ' AND role = ?';
      params.push(filters.role);
    }

    if (filters.is_active !== undefined) {
      sql += ' AND is_active = ?';
      params.push(filters.is_active);
    }

    sql += ' ORDER BY created_at DESC';

    const [rows] = await promisePool.execute(sql, params);
    return rows;
  }

  // Update user - ធ្វើបច្ចុប្បន្នភាពអ្នកប្រើប្រាស់
  static async update(id, userData) {
    const { username, email, full_name, role, is_active } = userData;
    
    const sql = `
      UPDATE users 
      SET username = ?, email = ?, full_name = ?, role = ?, is_active = ?
      WHERE id = ?
    `;
    
    const [result] = await promisePool.execute(sql, [
      username,
      email,
      full_name,
      role,
      is_active,
      id
    ]);
    
    return result.affectedRows > 0;
  }

  // Update password - ធ្វើបច្ចុប្បន្នភាពពាក្យសម្ងាត់
  static async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const sql = 'UPDATE users SET password = ? WHERE id = ?';
    const [result] = await promisePool.execute(sql, [hashedPassword, id]);
    return result.affectedRows > 0;
  }

  // Delete user - លុបអ្នកប្រើប្រាស់
  static async delete(id) {
    const sql = 'DELETE FROM users WHERE id = ?';
    const [result] = await promisePool.execute(sql, [id]);
    return result.affectedRows > 0;
  }

  // Verify password - ផ្ទៀងផ្ទាត់ពាក្យសម្ងាត់
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // Check if username exists - ពិនិត្យមើលថាតើឈ្មោះមានស្រាប់ឬអត់
  static async usernameExists(username, excludeId = null) {
    let sql = 'SELECT id FROM users WHERE username = ?';
    const params = [username];
    
    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }
    
    const [rows] = await promisePool.execute(sql, params);
    return rows.length > 0;
  }

  // Check if email exists - ពិនិត្យមើលថាតើអ៊ីមែលមានស្រាប់ឬអត់
  static async emailExists(email, excludeId = null) {
    let sql = 'SELECT id FROM users WHERE email = ?';
    const params = [email];
    
    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }
    
    const [rows] = await promisePool.execute(sql, params);
    return rows.length > 0;
  }
}

module.exports = User;
