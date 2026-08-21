import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';

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
    res.json({ token, user: { id:user.id,name:user.name,email:user.email,role:user.role_name,companyId:user.company_id,company:user.company_name } });
  } catch (e) { next(e); }
}

export async function me(req, res) {
  res.json({ user: req.user });
}
