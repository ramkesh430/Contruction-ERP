import { pool } from '../config/db.js';

export async function notify(companyId, { type, title, message, entityType, entityId, userId = null }) {
  try {
    await pool.query(
      `INSERT INTO notifications(company_id,user_id,type,title,message,entity_type,entity_id) VALUES(?,?,?,?,?,?,?)`,
      [companyId, userId, type || null, title, message || null, entityType || null, entityId || null]
    );
  } catch (e) { console.error('notify failed:', e.message); }
}
