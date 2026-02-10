// Building.js - Building model
// មូលមតិអគារ

const { pool, sql } = require('../config/database');

class Building {
  // Create new building - បង្កើតអគារថ្មី
  static async create(buildingData) {
    const { pagoda_id, type, name, year_built, area_sqm, condition, notes } = buildingData;
    
    const result = await pool.request()
      .input('pagoda_id', sql.Int, pagoda_id)
      .input('type', sql.NVarChar, type)
      .input('name', sql.NVarChar, name)
      .input('year_built', sql.Int, year_built)
      .input('area_sqm', sql.Decimal(10, 2), area_sqm)
      .input('condition', sql.NVarChar, condition)
      .input('notes', sql.NVarChar(sql.MAX), notes)
      .query(`
        INSERT INTO buildings (pagoda_id, type, name, year_built, area_sqm, condition, notes)
        OUTPUT INSERTED.id
        VALUES (@pagoda_id, @type, @name, @year_built, @area_sqm, @condition, @notes)
      `);
    
    return result.recordset[0].id;
  }

  // Find building by ID - ស្វែងរកអគារតាម ID
  static async findById(id) {
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT b.*, p.name_km as pagoda_name
        FROM buildings b
        LEFT JOIN pagodas p ON b.pagoda_id = p.id
        WHERE b.id = @id
      `);
    return result.recordset[0];
  }

  // Find buildings by pagoda ID - ស្វែងរកអគារតាមវត្ត
  static async findByPagodaId(pagodaId) {
    const result = await pool.request()
      .input('pagoda_id', sql.Int, pagodaId)
      .query(`
        SELECT * FROM buildings
        WHERE pagoda_id = @pagoda_id
        ORDER BY created_at DESC
      `);
    return result.recordset;
  }

  // Update building - ធ្វើបច្ចុប្បន្នភាពអគារ
  static async update(id, buildingData) {
    const { type, name, year_built, area_sqm, condition, notes } = buildingData;
    
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('type', sql.NVarChar, type)
      .input('name', sql.NVarChar, name)
      .input('year_built', sql.Int, year_built)
      .input('area_sqm', sql.Decimal(10, 2), area_sqm)
      .input('condition', sql.NVarChar, condition)
      .input('notes', sql.NVarChar(sql.MAX), notes)
      .query(`
        UPDATE buildings SET
          type = @type, name = @name, year_built = @year_built, 
          area_sqm = @area_sqm, condition = @condition, notes = @notes
        WHERE id = @id
      `);
    
    return result.rowsAffected[0] > 0;
  }

  // Delete building - លុបអគារ
  static async delete(id) {
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM buildings WHERE id = @id');
    return result.rowsAffected[0] > 0;
  }

  // Get total area by pagoda - ទទួលបានផ្ទៃសរុបតាមវត្ត
  static async getTotalAreaByPagoda(pagodaId) {
    const result = await pool.request()
      .input('pagoda_id', sql.Int, pagodaId)
      .query(`
        SELECT ISNULL(SUM(area_sqm), 0) as total_area
        FROM buildings
        WHERE pagoda_id = @pagoda_id
      `);
    return result.recordset[0].total_area;
  }
}

module.exports = Building;
