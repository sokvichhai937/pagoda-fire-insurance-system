// Monk.js - Monk model
// មូលមតិព្រះសង្ឃ

const { promisePool } = require('../config/database');

class Monk {
  // Create new monk - បង្កើតព្រះសង្ឃថ្មី
  static async create(monkData) {
    const { pagoda_id, name, role, phone, notes } = monkData;
    
    const sql = `
      INSERT INTO monks (pagoda_id, name, role, phone, notes)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const [result] = await promisePool.execute(sql, [
      pagoda_id,
      name,
      role,
      phone,
      notes
    ]);
    
    return result.insertId;
  }

  // Find monk by ID - ស្វែងរកព្រះសង្ឃតាម ID
  static async findById(id) {
    const sql = `
      SELECT m.*, p.name_km as pagoda_name
      FROM monks m
      LEFT JOIN pagodas p ON m.pagoda_id = p.id
      WHERE m.id = ?
    `;
    const [rows] = await promisePool.execute(sql, [id]);
    return rows[0];
  }

  // Find monks by pagoda ID - ស្វែងរកព្រះសង្ឃតាមវត្ត
  static async findByPagodaId(pagodaId) {
    const sql = `
      SELECT * FROM monks
      WHERE pagoda_id = ?
      ORDER BY created_at DESC
    `;
    const [rows] = await promisePool.execute(sql, [pagodaId]);
    return rows;
  }

  // Update monk - ធ្វើបច្ចុប្បន្នភាពព្រះសង្ឃ
  static async update(id, monkData) {
    const { name, role, phone, notes } = monkData;
    
    const sql = `
      UPDATE monks SET
        name = ?, role = ?, phone = ?, notes = ?
      WHERE id = ?
    `;
    
    const [result] = await promisePool.execute(sql, [
      name,
      role,
      phone,
      notes,
      id
    ]);
    
    return result.affectedRows > 0;
  }

  // Delete monk - លុបព្រះសង្ឃ
  static async delete(id) {
    const sql = 'DELETE FROM monks WHERE id = ?';
    const [result] = await promisePool.execute(sql, [id]);
    return result.affectedRows > 0;
  }
}

module.exports = Monk;
