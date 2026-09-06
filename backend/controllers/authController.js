import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';

// Super Admin implicitly has every permission (see requirePermission), so
// the frontend needs the same rule to decide what to show in the sidebar —
// returning every known code for them keeps that logic in one place rather
// than duplicating "is Super Admin" checks in the UI.
async function permissionsForRole(roleId, roleName) {
  if (roleName === 'Super Admin') {
    const [rows] = await pool.query('SELECT code FROM permissions');
    return rows.map(r => r.code);
  }
  const [rows] = await pool.query(
    `SELECT p.code FROM role_permissions rp JOIN permissions p ON p.id=rp.permission_id WHERE rp.role_id=?`,
    [roleId]
  );
  return rows.map(r => r.code);
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.validatedBody;
    const [rows] = await pool.query(
      `SELECT u.*,r.name role_name,c.name company_name
       FROM users u JOIN roles r ON r.id=u.role_id JOIN companies c ON c.id=u.company_id
       WHERE u.email=? AND u.is_deleted=0 LIMIT 1`, [email]
    );
    if (!rows.length || !(await bcrypt.compare(password, rows[0].password_hash))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    if (!rows[0].is_active) return res.status(403).json({ message: 'Account disabled' });
    const user = rows[0];
    const token = jwt.sign({ sub: user.id, companyId: user.company_id, roleId: user.role_id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
    const permissions = await permissionsForRole(user.role_id, user.role_name);
    res.json({ token, user: { id:user.id,name:user.name,email:user.email,role:user.role_name,companyId:user.company_id,company:user.company_name,permissions } });
  } catch (e) { next(e); }
}

export async function me(req, res) {
  const permissions = await permissionsForRole(req.user.role_id, req.user.role_name);
  res.json({ user: { ...req.user, permissions } });
}
