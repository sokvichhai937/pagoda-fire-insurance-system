// Reminder.js - Reminder model
// មូលមតិការរំលឹក

const { promisePool } = require('../config/database');

class Reminder {
  // Create new reminder - បង្កើតការរំលឹកថ្មី
  static async create(reminderData) {
    const { policy_id, reminder_date, reminder_type, notes } = reminderData;
    
    const sql = `
      INSERT INTO reminders (policy_id, reminder_date, reminder_type, notes)
      VALUES (?, ?, ?, ?)
    `;
    
    const [result] = await promisePool.execute(sql, [
      policy_id,
      reminder_date,
      reminder_type,
      notes
    ]);
    
    return result.insertId;
  }

  // Find reminder by ID - ស្វែងរកការរំលឹកតាម ID
  static async findById(id) {
    const sql = `
      SELECT r.*, i.policy_number, i.pagoda_id,
        p.name_km as pagoda_name
      FROM reminders r
      LEFT JOIN insurance_policies i ON r.policy_id = i.id
      LEFT JOIN pagodas p ON i.pagoda_id = p.id
      WHERE r.id = ?
    `;
    const [rows] = await promisePool.execute(sql, [id]);
    return rows[0];
  }

  // Find reminders by policy ID - ស្វែងរកការរំលឹកតាមគោលនយោបាយ
  static async findByPolicyId(policyId) {
    const sql = `
      SELECT * FROM reminders
      WHERE policy_id = ?
      ORDER BY reminder_date ASC, created_at DESC
    `;
    const [rows] = await promisePool.execute(sql, [policyId]);
    return rows;
  }

  // Find pending reminders - ស្វែងរកការរំលឹកដែលមិនទាន់ផ្ញើ
  static async findPending() {
    const sql = `
      SELECT r.*, i.policy_number, i.pagoda_id,
        p.name_km as pagoda_name, p.phone as pagoda_phone
      FROM reminders r
      LEFT JOIN insurance_policies i ON r.policy_id = i.id
      LEFT JOIN pagodas p ON i.pagoda_id = p.id
      WHERE r.status = 'pending'
        AND r.reminder_date <= CURDATE()
      ORDER BY r.reminder_date ASC
    `;
    const [rows] = await promisePool.execute(sql);
    return rows;
  }

  // Update reminder status - ធ្វើបច្ចុប្បន្នភាពស្ថានភាពការរំលឹក
  static async updateStatus(id, status, sent_at = null) {
    const sql = `
      UPDATE reminders SET
        status = ?, sent_at = ?
      WHERE id = ?
    `;
    
    const [result] = await promisePool.execute(sql, [
      status,
      sent_at,
      id
    ]);
    
    return result.affectedRows > 0;
  }

  // Delete reminder - លុបការរំលឹក
  static async delete(id) {
    const sql = 'DELETE FROM reminders WHERE id = ?';
    const [result] = await promisePool.execute(sql, [id]);
    return result.affectedRows > 0;
  }
}

module.exports = Reminder;
