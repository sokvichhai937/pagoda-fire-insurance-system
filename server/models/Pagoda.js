// Pagoda.js - Pagoda model
// មូលមតិវត្ត

const { pool, sql } = require('../config/database');

class Pagoda {
  // Create new pagoda - បង្កើតវត្តថ្មី
  static async create(pagodaData) {
    const {
      name_km, name_en, type, size, village, commune, district, province,
      phone, email, latitude, longitude, photo_url, notes, created_by
    } = pagodaData;
    
    const result = await pool.request()
      .input('name_km', sql.NVarChar, name_km)
      .input('name_en', sql.NVarChar, name_en)
      .input('type', sql.NVarChar, type)
      .input('size', sql.NVarChar, size)
      .input('village', sql.NVarChar, village)
      .input('commune', sql.NVarChar, commune)
      .input('district', sql.NVarChar, district)
      .input('province', sql.NVarChar, province)
      .input('phone', sql.NVarChar, phone)
      .input('email', sql.NVarChar, email)
      .input('latitude', sql.Decimal(10, 8), latitude)
      .input('longitude', sql.Decimal(11, 8), longitude)
      .input('photo_url', sql.NVarChar, photo_url)
      .input('notes', sql.NVarChar(sql.MAX), notes)
      .input('created_by', sql.Int, created_by)
      .query(`
        INSERT INTO pagodas (
          name_km, name_en, type, size, village, commune, district, province,
          phone, email, latitude, longitude, photo_url, notes, created_by
        )
        OUTPUT INSERTED.id
        VALUES (
          @name_km, @name_en, @type, @size, @village, @commune, @district, @province,
          @phone, @email, @latitude, @longitude, @photo_url, @notes, @created_by
        )
      `);
    
    return result.recordset[0].id;
  }

  // Find pagoda by ID - ស្វែងរកវត្តតាម ID
  static async findById(id) {
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT p.*, u.full_name as created_by_name
        FROM pagodas p
        LEFT JOIN users u ON p.created_by = u.id
        WHERE p.id = @id
      `);
    return result.recordset[0];
  }

  // Get all pagodas with filters and pagination - ទទួលបានវត្តទាំងអស់
  static async findAll(filters = {}, pagination = {}) {
    let query = `
      SELECT p.*, u.full_name as created_by_name,
        COUNT(DISTINCT m.id) as monk_count,
        COUNT(DISTINCT b.id) as building_count
      FROM pagodas p
      LEFT JOIN users u ON p.created_by = u.id
      LEFT JOIN monks m ON p.id = m.pagoda_id
      LEFT JOIN buildings b ON p.id = b.pagoda_id
      WHERE 1=1
    `;
    const request = pool.request();

    // Apply filters
    if (filters.province) {
      query += ' AND p.province = @province';
      request.input('province', sql.NVarChar, filters.province);
    }

    if (filters.type) {
      query += ' AND p.type = @type';
      request.input('type', sql.NVarChar, filters.type);
    }

    if (filters.size) {
      query += ' AND p.size = @size';
      request.input('size', sql.NVarChar, filters.size);
    }

    if (filters.search) {
      query += ' AND (p.name_km LIKE @search OR p.name_en LIKE @search)';
      request.input('search', sql.NVarChar, `%${filters.search}%`);
    }

    query += ' GROUP BY p.id, p.name_km, p.name_en, p.type, p.size, p.village, p.commune, p.district, p.province, p.phone, p.email, p.latitude, p.longitude, p.photo_url, p.notes, p.created_by, p.created_at, p.updated_at, u.full_name';
    query += ' ORDER BY p.created_at DESC';

    // Pagination
    if (pagination.limit) {
      const offset = pagination.offset || 0;
      query += ' OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';
      request.input('offset', sql.Int, parseInt(offset));
      request.input('limit', sql.Int, parseInt(pagination.limit));
    }

    const result = await request.query(query);
    return result.recordset;
  }

  // Count pagodas - រាប់ចំនួនវត្ត
  static async count(filters = {}) {
    let query = 'SELECT COUNT(*) as total FROM pagodas WHERE 1=1';
    const request = pool.request();

    if (filters.province) {
      query += ' AND province = @province';
      request.input('province', sql.NVarChar, filters.province);
    }

    if (filters.type) {
      query += ' AND type = @type';
      request.input('type', sql.NVarChar, filters.type);
    }

    if (filters.size) {
      query += ' AND size = @size';
      request.input('size', sql.NVarChar, filters.size);
    }

    if (filters.search) {
      query += ' AND (name_km LIKE @search OR name_en LIKE @search)';
      request.input('search', sql.NVarChar, `%${filters.search}%`);
    }

    const result = await request.query(query);
    return result.recordset[0].total;
  }

  // Update pagoda - ធ្វើបច្ចុប្បន្នភាពវត្ត
  static async update(id, pagodaData) {
    const {
      name_km, name_en, type, size, village, commune, district, province,
      phone, email, latitude, longitude, photo_url, notes
    } = pagodaData;
    
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('name_km', sql.NVarChar, name_km)
      .input('name_en', sql.NVarChar, name_en)
      .input('type', sql.NVarChar, type)
      .input('size', sql.NVarChar, size)
      .input('village', sql.NVarChar, village)
      .input('commune', sql.NVarChar, commune)
      .input('district', sql.NVarChar, district)
      .input('province', sql.NVarChar, province)
      .input('phone', sql.NVarChar, phone)
      .input('email', sql.NVarChar, email)
      .input('latitude', sql.Decimal(10, 8), latitude)
      .input('longitude', sql.Decimal(11, 8), longitude)
      .input('photo_url', sql.NVarChar, photo_url)
      .input('notes', sql.NVarChar(sql.MAX), notes)
      .query(`
        UPDATE pagodas SET
          name_km = @name_km, name_en = @name_en, type = @type, size = @size, 
          village = @village, commune = @commune, district = @district, province = @province, 
          phone = @phone, email = @email, latitude = @latitude, longitude = @longitude, 
          photo_url = @photo_url, notes = @notes, updated_at = GETDATE()
        WHERE id = @id
      `);
    
    return result.rowsAffected[0] > 0;
  }

  // Delete pagoda - លុបវត្ត
  static async delete(id) {
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM pagodas WHERE id = @id');
    return result.rowsAffected[0] > 0;
  }

  // Get statistics by province - ទទួលបានស្ថិតិតាមខេត្ត
  static async getStatsByProvince() {
    const result = await pool.request()
      .query(`
        SELECT province, COUNT(*) as count
        FROM pagodas
        GROUP BY province
        ORDER BY count DESC
      `);
    return result.recordset;
  }

  // Get statistics by type - ទទួលបានស្ថិតិតាមប្រភេទ
  static async getStatsByType() {
    const result = await pool.request()
      .query(`
        SELECT type, COUNT(*) as count
        FROM pagodas
        GROUP BY type
      `);
    return result.recordset;
  }

  // Get statistics by size - ទទួលបានស្ថិតិតាមទំហំ
  static async getStatsBySize() {
    const result = await pool.request()
      .query(`
        SELECT size, COUNT(*) as count
        FROM pagodas
        GROUP BY size
      `);
    return result.recordset;
  }
}

module.exports = Pagoda;
