// Reminder.js - Reminder model
// មូលមតិការរំលឹក

const { pool, sql } = require('../config/database');

class Reminder {
  // Create new reminder - បង្កើតការរំលឹកថ្មី
  static async create(reminderData) {
    const { policy_id, reminder_date, reminder_type, notes } = reminderData;
    
    const query = `
      INSERT INTO reminders (policy_id, reminder_date, reminder_type, notes)
      OUTPUT INSERTED.id
      VALUES (@policy_id, @reminder_date, @reminder_type, @notes)
    `;
    
    const result = await pool.request()
      .input('policy_id', sql.Int, policy_id)
      .input('reminder_date', sql.Date, reminder_date)
      .input('reminder_type', sql.NVarChar, reminder_type)
      .input('notes', sql.NVarChar(sql.MAX), notes)
      .query(query);
    
    return result.recordset[0].id;
  }

  // Find reminder by ID - ស្វែងរកការរំលឹកតាម ID
  static async findById(id) {
    const query = `
      SELECT r.*, i.policy_number, i.pagoda_id,
        p.name_km as pagoda_name
      FROM reminders r
      LEFT JOIN insurance_policies i ON r.policy_id = i.id
      LEFT JOIN pagodas p ON i.pagoda_id = p.id
      WHERE r.id = @id
    `;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(query);
    return result.recordset[0];
  }

  // Find reminders by policy ID - ស្វែងរកការរំលឹកតាមគោលនយោបាយ
  static async findByPolicyId(policyId) {
    const query = `
      SELECT * FROM reminders
      WHERE policy_id = @policyId
      ORDER BY reminder_date ASC, created_at DESC
    `;
    const result = await pool.request()
      .input('policyId', sql.Int, policyId)
      .query(query);
    return result.recordset;
  }

  // Find pending reminders - ស្វែងរកការរំលឹកដែលមិនទាន់ផ្ញើ
  static async findPending() {
    const query = `
      SELECT r.*, i.policy_number, i.pagoda_id,
        p.name_km as pagoda_name, p.phone as pagoda_phone
      FROM reminders r
      LEFT JOIN insurance_policies i ON r.policy_id = i.id
      LEFT JOIN pagodas p ON i.pagoda_id = p.id
      WHERE r.status = 'pending'
        AND r.reminder_date <= CAST(GETDATE() AS DATE)
      ORDER BY r.reminder_date ASC
    `;
    const result = await pool.request()
      .query(query);
    return result.recordset;
  }

  // Update reminder status - ធ្វើបច្ចុប្បន្នភាពស្ថានភាពការរំលឹក
  static async updateStatus(id, status, sent_at = null) {
    const query = `
      UPDATE reminders SET
        status = @status, sent_at = @sent_at
      WHERE id = @id
    `;
    
    const result = await pool.request()
      .input('status', sql.NVarChar, status)
      .input('sent_at', sql.DateTime, sent_at)
      .input('id', sql.Int, id)
      .query(query);
    
    return result.rowsAffected[0] > 0;
  }

  // Delete reminder - លុបការរំលឹក
  static async delete(id) {
    const query = 'DELETE FROM reminders WHERE id = @id';
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(query);
    return result.rowsAffected[0] > 0;
  }
}

module.exports = Reminder;
