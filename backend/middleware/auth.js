import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';

export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Authentication required' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await pool.query(
      `SELECT u.id,u.company_id,u.name,u.email,u.role_id,u.is_active,r.name AS role_name
       FROM users u JOIN roles r ON r.id=u.role_id
       WHERE u.id=? AND u.is_deleted=0 LIMIT 1`,
      [payload.sub]
    );
    if (!rows.length || !rows[0].is_active) return res.status(401).json({ message: 'Invalid user' });
    req.user = rows[0];
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// Not async: this returns the middleware function itself, synchronously.
// Marking it `async` (as before) made every call return a Promise instead
// of a function — Express would have thrown "argument handler must be a
// function" the moment any route actually tried to use it, which is
// exactly why no route ever did.
export function requirePermission(code) {
  return async (req, res, next) => {
    try {
      if (req.user?.role_name === 'Super Admin') return next();
      const [rows] = await pool.query(
        `SELECT 1
         FROM role_permissions rp
         JOIN permissions p ON p.id=rp.permission_id
         WHERE rp.role_id=? AND p.code=? LIMIT 1`,
        [req.user.role_id, code]
      );
      if (!rows.length) return res.status(403).json({ message: `Permission denied: ${code}` });
      next();
    } catch (error) { next(error); }
  };
}
