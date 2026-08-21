import { pool } from '../config/db.js';

export async function audit(req, action, entityType, entityId, meta = null) {
  try {
    await pool.query(
      `INSERT INTO audit_logs(company_id,user_id,action,entity_type,entity_id,ip_address,user_agent,metadata)
       VALUES(?,?,?,?,?,?,?,?)`,
      [req.user?.company_id || null, req.user?.id || null, action, entityType, entityId || null,
       req.ip || null, req.headers['user-agent'] || null, meta ? JSON.stringify(meta) : null]
    );
  } catch (e) { console.error('Audit log failed:', e.message); }
}
