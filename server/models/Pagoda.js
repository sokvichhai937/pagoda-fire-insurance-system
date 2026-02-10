// Pagoda.js - Pagoda model
// មូលមតិវត្ត

const { promisePool } = require('../config/database');

class Pagoda {
  // Create new pagoda - បង្កើតវត្តថ្មី
  static async create(pagodaData) {
    const {
      name_km, name_en, type, size, village, commune, district, province,
      phone, email, latitude, longitude, photo_url, notes, created_by
    } = pagodaData;
    
    const sql = `
      INSERT INTO pagodas (
        name_km, name_en, type, size, village, commune, district, province,
        phone, email, latitude, longitude, photo_url, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const [result] = await promisePool.execute(sql, [
      name_km, name_en, type, size, village, commune, district, province,
      phone, email, latitude, longitude, photo_url, notes, created_by
    ]);
    
    return result.insertId;
  }

  // Find pagoda by ID - ស្វែងរកវត្តតាម ID
  static async findById(id) {
    const sql = `
      SELECT p.*, u.full_name as created_by_name
      FROM pagodas p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id = ?
    `;
    const [rows] = await promisePool.execute(sql, [id]);
    return rows[0];
  }

  // Get all pagodas with filters and pagination - ទទួលបានវត្តទាំងអស់
  static async findAll(filters = {}, pagination = {}) {
    let sql = `
      SELECT p.*, u.full_name as created_by_name,
        COUNT(DISTINCT m.id) as monk_count,
        COUNT(DISTINCT b.id) as building_count
      FROM pagodas p
      LEFT JOIN users u ON p.created_by = u.id
      LEFT JOIN monks m ON p.id = m.pagoda_id
      LEFT JOIN buildings b ON p.id = b.pagoda_id
      WHERE 1=1
    `;
    const params = [];

    // Apply filters
    if (filters.province) {
      sql += ' AND p.province = ?';
      params.push(filters.province);
    }

    if (filters.type) {
      sql += ' AND p.type = ?';
      params.push(filters.type);
    }

    if (filters.size) {
      sql += ' AND p.size = ?';
      params.push(filters.size);
    }

    if (filters.search) {
      sql += ' AND (p.name_km LIKE ? OR p.name_en LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }

    sql += ' GROUP BY p.id';
    sql += ' ORDER BY p.created_at DESC';

    // Pagination
    if (pagination.limit) {
      const offset = pagination.offset || 0;
      sql += ' LIMIT ? OFFSET ?';
      params.push(parseInt(pagination.limit), parseInt(offset));
    }

    const [rows] = await promisePool.execute(sql, params);
    return rows;
  }

  // Count pagodas - រាប់ចំនួនវត្ត
  static async count(filters = {}) {
    let sql = 'SELECT COUNT(*) as total FROM pagodas WHERE 1=1';
    const params = [];

    if (filters.province) {
      sql += ' AND province = ?';
      params.push(filters.province);
    }

    if (filters.type) {
      sql += ' AND type = ?';
      params.push(filters.type);
    }

    if (filters.size) {
      sql += ' AND size = ?';
      params.push(filters.size);
    }

    if (filters.search) {
      sql += ' AND (name_km LIKE ? OR name_en LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }

    const [rows] = await promisePool.execute(sql, params);
    return rows[0].total;
  }

  // Update pagoda - ធ្វើបច្ចុប្បន្នភាពវត្ត
  static async update(id, pagodaData) {
    const {
      name_km, name_en, type, size, village, commune, district, province,
      phone, email, latitude, longitude, photo_url, notes
    } = pagodaData;
    
    const sql = `
      UPDATE pagodas SET
        name_km = ?, name_en = ?, type = ?, size = ?, village = ?,
        commune = ?, district = ?, province = ?, phone = ?, email = ?,
        latitude = ?, longitude = ?, photo_url = ?, notes = ?
      WHERE id = ?
    `;
    
    const [result] = await promisePool.execute(sql, [
      name_km, name_en, type, size, village, commune, district, province,
      phone, email, latitude, longitude, photo_url, notes, id
    ]);
    
    return result.affectedRows > 0;
  }

  // Delete pagoda - លុបវត្ត
  static async delete(id) {
    const sql = 'DELETE FROM pagodas WHERE id = ?';
    const [result] = await promisePool.execute(sql, [id]);
    return result.affectedRows > 0;
  }

  // Get statistics by province - ទទួលបានស្ថិតិតាមខេត្ត
  static async getStatsByProvince() {
    const sql = `
      SELECT province, COUNT(*) as count
      FROM pagodas
      GROUP BY province
      ORDER BY count DESC
    `;
    const [rows] = await promisePool.execute(sql);
    return rows;
  }

  // Get statistics by type - ទទួលបានស្ថិតិតាមប្រភេទ
  static async getStatsByType() {
    const sql = `
      SELECT type, COUNT(*) as count
      FROM pagodas
      GROUP BY type
    `;
    const [rows] = await promisePool.execute(sql);
    return rows;
  }

  // Get statistics by size - ទទួលបានស្ថិតិតាមទំហំ
  static async getStatsBySize() {
    const sql = `
      SELECT size, COUNT(*) as count
      FROM pagodas
      GROUP BY size
    `;
    const [rows] = await promisePool.execute(sql);
    return rows;
  }
}

module.exports = Pagoda;
