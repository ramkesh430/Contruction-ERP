import { pool } from '../config/db.js';

export async function listNotifications(req, res, next) { try {
  const [rows] = await pool.query(
    `SELECT * FROM notifications WHERE company_id=? AND (user_id IS NULL OR user_id=?) ORDER BY id DESC LIMIT 50`,
    [req.user.company_id, req.user.id]
  );
  res.json(rows);
} catch (e) { next(e); } }

export async function markNotificationRead(req, res, next) { try {
  await pool.query(
    `UPDATE notifications SET is_read=1,read_at=NOW() WHERE id=? AND company_id=? AND (user_id IS NULL OR user_id=?)`,
    [req.params.id, req.user.company_id, req.user.id]
  );
  res.json({ message: 'ok' });
} catch (e) { next(e); } }

export async function markAllRead(req, res, next) { try {
  await pool.query(
    `UPDATE notifications SET is_read=1,read_at=NOW() WHERE company_id=? AND (user_id IS NULL OR user_id=?) AND is_read=0`,
    [req.user.company_id, req.user.id]
  );
  res.json({ message: 'ok' });
} catch (e) { next(e); } }
