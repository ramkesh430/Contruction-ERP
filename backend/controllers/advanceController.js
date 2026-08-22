import { pool } from '../config/db.js';
import { audit } from '../services/audit.js';

export async function listAdvances(req, res, next) { try {
  const [rows] = await pool.query(
    `SELECT a.*,e.name employee_name,(a.amount-a.recovered_amount) outstanding FROM employee_advances a
     JOIN employees e ON e.id=a.employee_id WHERE a.company_id=? AND a.is_deleted=0 ORDER BY a.id DESC`,
    [req.user.company_id]
  );
  res.json(rows);
} catch (e) { next(e); } }

export async function createAdvance(req, res, next) { try {
  const b = req.body, c = req.user.company_id;
  if (!b.employee_id || !b.amount) return res.status(422).json({ message: 'Employee and amount are required' });
  const [r] = await pool.query(
    `INSERT INTO employee_advances(company_id,employee_id,advance_date,amount,remarks,created_by) VALUES(?,?,?,?,?,?)`,
    [c, b.employee_id, b.advance_date || new Date(), b.amount, b.remarks || null, req.user.id]
  );
  await audit(req, 'CREATE', 'employee_advances', r.insertId, { amount: b.amount });
  res.status(201).json({ id: r.insertId });
} catch (e) { next(e); } }

export async function updateAdvance(req, res, next) { try {
  const b = req.body, c = req.user.company_id;
  const [[a]] = await pool.query('SELECT * FROM employee_advances WHERE id=? AND company_id=? AND is_deleted=0', [req.params.id, c]);
  if (!a) return res.status(404).json({ message: 'Advance not found' });
  const amount = b.amount !== undefined ? Number(b.amount) : Number(a.amount);
  if (amount < Number(a.recovered_amount)) return res.status(422).json({ message: 'Amount cannot be less than the amount already recovered' });
  await pool.query(`UPDATE employee_advances SET advance_date=?,amount=?,remarks=? WHERE id=? AND company_id=?`,
    [b.advance_date || a.advance_date, amount, b.remarks ?? a.remarks, req.params.id, c]);
  await audit(req, 'UPDATE', 'employee_advances', req.params.id, { amount });
  res.json({ message: 'Updated' });
} catch (e) { next(e); } }

export async function deleteAdvance(req, res, next) { try {
  await pool.query(`UPDATE employee_advances SET is_deleted=1 WHERE id=? AND company_id=?`, [req.params.id, req.user.company_id]);
  await audit(req, 'DELETE', 'employee_advances', req.params.id);
  res.json({ message: 'Deleted' });
} catch (e) { next(e); } }

export async function outstandingAdvance(req, res, next) { try {
  const [[r]] = await pool.query(
    `SELECT COALESCE(SUM(amount-recovered_amount),0) outstanding FROM employee_advances WHERE company_id=? AND employee_id=? AND is_deleted=0`,
    [req.user.company_id, req.params.employeeId]
  );
  res.json({ outstanding: Number(r.outstanding) });
} catch (e) { next(e); } }
