// Building.js - Building model
// មូលមតិអគារ

const { promisePool } = require('../config/database');

class Building {
  // Create new building - បង្កើតអគារថ្មី
  static async create(buildingData) {
    const { pagoda_id, type, name, year_built, area_sqm, condition, notes } = buildingData;
    
    const sql = `
      INSERT INTO buildings (pagoda_id, type, name, year_built, area_sqm, \`condition\`, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const [result] = await promisePool.execute(sql, [
      pagoda_id,
      type,
      name,
      year_built,
      area_sqm,
      condition,
      notes
    ]);
    
    return result.insertId;
  }

  // Find building by ID - ស្វែងរកអគារតាម ID
  static async findById(id) {
    const sql = `
      SELECT b.*, p.name_km as pagoda_name
      FROM buildings b
      LEFT JOIN pagodas p ON b.pagoda_id = p.id
      WHERE b.id = ?
    `;
    const [rows] = await promisePool.execute(sql, [id]);
    return rows[0];
  }

  // Find buildings by pagoda ID - ស្វែងរកអគារតាមវត្ត
  static async findByPagodaId(pagodaId) {
    const sql = `
      SELECT * FROM buildings
      WHERE pagoda_id = ?
      ORDER BY created_at DESC
    `;
    const [rows] = await promisePool.execute(sql, [pagodaId]);
    return rows;
  }

  // Update building - ធ្វើបច្ចុប្បន្នភាពអគារ
  static async update(id, buildingData) {
    const { type, name, year_built, area_sqm, condition, notes } = buildingData;
    
    const sql = `
      UPDATE buildings SET
        type = ?, name = ?, year_built = ?, area_sqm = ?, \`condition\` = ?, notes = ?
      WHERE id = ?
    `;
    
    const [result] = await promisePool.execute(sql, [
      type,
      name,
      year_built,
      area_sqm,
      condition,
      notes,
      id
    ]);
    
    return result.affectedRows > 0;
  }

  // Delete building - លុបអគារ
  static async delete(id) {
    const sql = 'DELETE FROM buildings WHERE id = ?';
    const [result] = await promisePool.execute(sql, [id]);
    return result.affectedRows > 0;
  }

  // Get total area by pagoda - ទទួលបានផ្ទៃសរុបតាមវត្ត
  static async getTotalAreaByPagoda(pagodaId) {
    const sql = `
      SELECT COALESCE(SUM(area_sqm), 0) as total_area
      FROM buildings
      WHERE pagoda_id = ?
    `;
    const [rows] = await promisePool.execute(sql, [pagodaId]);
    return rows[0].total_area;
  }
}

module.exports = Building;
