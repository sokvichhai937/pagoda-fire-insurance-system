// Monk.js - Monk model
// មូលមតិព្រះសង្ឃ

const { pool, sql } = require('../config/database');

class Monk {
  // Create new monk - បង្កើតព្រះសង្ឃថ្មី
  static async create(monkData) {
    const { pagoda_id, name, role, phone, notes } = monkData;
    
    const result = await pool.request()
      .input('pagoda_id', sql.Int, pagoda_id)
      .input('name', sql.NVarChar, name)
      .input('role', sql.NVarChar, role)
      .input('phone', sql.NVarChar, phone)
      .input('notes', sql.NVarChar(sql.MAX), notes)
      .query(`
        INSERT INTO monks (pagoda_id, name, role, phone, notes)
        OUTPUT INSERTED.id
        VALUES (@pagoda_id, @name, @role, @phone, @notes)
      `);
    
    return result.recordset[0].id;
  }

  // Find monk by ID - ស្វែងរកព្រះសង្ឃតាម ID
  static async findById(id) {
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT m.*, p.name_km as pagoda_name
        FROM monks m
        LEFT JOIN pagodas p ON m.pagoda_id = p.id
        WHERE m.id = @id
      `);
    return result.recordset[0];
  }

  // Find monks by pagoda ID - ស្វែងរកព្រះសង្ឃតាមវត្ត
  static async findByPagodaId(pagodaId) {
    const result = await pool.request()
      .input('pagoda_id', sql.Int, pagodaId)
      .query(`
        SELECT * FROM monks
        WHERE pagoda_id = @pagoda_id
        ORDER BY created_at DESC
      `);
    return result.recordset;
  }

  // Update monk - ធ្វើបច្ចុប្បន្នភាពព្រះសង្ឃ
  static async update(id, monkData) {
    const { name, role, phone, notes } = monkData;
    
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('name', sql.NVarChar, name)
      .input('role', sql.NVarChar, role)
      .input('phone', sql.NVarChar, phone)
      .input('notes', sql.NVarChar(sql.MAX), notes)
      .query(`
        UPDATE monks SET
          name = @name, role = @role, phone = @phone, notes = @notes, updated_at = GETDATE()
        WHERE id = @id
      `);
    
    return result.rowsAffected[0] > 0;
  }

  // Delete monk - លុបព្រះសង្ឃ
  static async delete(id) {
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM monks WHERE id = @id');
    return result.rowsAffected[0] > 0;
  }
}

module.exports = Monk;
