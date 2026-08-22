import { pool } from '../config/db.js';
import { audit } from '../services/audit.js';

export async function listAssignments(req, res, next) { try {
  const [rows] = await pool.query(
    `SELECT ea.*,e.name equipment_name,p.project_name FROM equipment_assignments ea
     JOIN equipment e ON e.id=ea.equipment_id LEFT JOIN projects p ON p.id=ea.project_id
     WHERE ea.company_id=? AND ea.is_deleted=0 ORDER BY ea.id DESC`,
    [req.user.company_id]
  );
  res.json(rows);
} catch (e) { next(e); } }

export async function createAssignment(req, res, next) { try {
  const b = req.body, c = req.user.company_id;
  if (!b.equipment_id || !b.project_id) return res.status(422).json({ message: 'Equipment and project are required' });
  const [r] = await pool.query(
    `INSERT INTO equipment_assignments(company_id,equipment_id,project_id,assigned_date,fuel_cost,remarks,created_by) VALUES(?,?,?,?,?,?,?)`,
    [c, b.equipment_id, b.project_id, b.assigned_date || new Date(), b.fuel_cost || 0, b.remarks || null, req.user.id]
  );
  await pool.query(`UPDATE equipment SET status='On Site' WHERE id=? AND company_id=?`, [b.equipment_id, c]);
  await audit(req, 'CREATE', 'equipment_assignments', r.insertId);
  res.status(201).json({ id: r.insertId });
} catch (e) { next(e); } }

export async function returnAssignment(req, res, next) { try {
  const c = req.user.company_id;
  const [[a]] = await pool.query('SELECT equipment_id FROM equipment_assignments WHERE id=? AND company_id=?', [req.params.id, c]);
  if (!a) return res.status(404).json({ message: 'Assignment not found' });
  await pool.query('UPDATE equipment_assignments SET returned_date=? WHERE id=? AND company_id=?', [req.body.returned_date || new Date(), req.params.id, c]);
  await pool.query(`UPDATE equipment SET status='Available' WHERE id=? AND company_id=?`, [a.equipment_id, c]);
  await audit(req, 'RETURN', 'equipment_assignments', req.params.id);
  res.json({ message: 'Marked returned' });
} catch (e) { next(e); } }

export async function updateAssignment(req, res, next) { try {
  const b = req.body, c = req.user.company_id;
  await pool.query(`UPDATE equipment_assignments SET project_id=COALESCE(?,project_id),assigned_date=COALESCE(?,assigned_date),returned_date=?,fuel_cost=?,remarks=? WHERE id=? AND company_id=?`,
    [b.project_id || null, b.assigned_date || null, b.returned_date ?? null, b.fuel_cost || 0, b.remarks || null, req.params.id, c]);
  await audit(req, 'UPDATE', 'equipment_assignments', req.params.id);
  res.json({ message: 'Updated' });
} catch (e) { next(e); } }

export async function deleteAssignment(req, res, next) { try {
  await pool.query(`UPDATE equipment_assignments SET is_deleted=1 WHERE id=? AND company_id=?`, [req.params.id, req.user.company_id]);
  await audit(req, 'DELETE', 'equipment_assignments', req.params.id);
  res.json({ message: 'Deleted' });
} catch (e) { next(e); } }

export async function listMaintenance(req, res, next) { try {
  const [rows] = await pool.query(
    `SELECT em.*,e.name equipment_name FROM equipment_maintenance em JOIN equipment e ON e.id=em.equipment_id
     WHERE em.company_id=? AND em.is_deleted=0 ORDER BY em.id DESC`,
    [req.user.company_id]
  );
  res.json(rows);
} catch (e) { next(e); } }

export async function createMaintenance(req, res, next) { try {
  const b = req.body, c = req.user.company_id;
  if (!b.equipment_id) return res.status(422).json({ message: 'Equipment is required' });
  const [r] = await pool.query(
    `INSERT INTO equipment_maintenance(company_id,equipment_id,maintenance_date,description,cost,next_service_date,created_by) VALUES(?,?,?,?,?,?,?)`,
    [c, b.equipment_id, b.maintenance_date || new Date(), b.description || null, b.cost || 0, b.next_service_date || null, req.user.id]
  );
  await pool.query(`UPDATE equipment SET status='Maintenance' WHERE id=? AND company_id=?`, [b.equipment_id, c]);
  await audit(req, 'CREATE', 'equipment_maintenance', r.insertId);
  res.status(201).json({ id: r.insertId });
} catch (e) { next(e); } }

export async function updateMaintenance(req, res, next) { try {
  const b = req.body, c = req.user.company_id;
  await pool.query(`UPDATE equipment_maintenance SET maintenance_date=COALESCE(?,maintenance_date),description=?,cost=?,next_service_date=? WHERE id=? AND company_id=?`,
    [b.maintenance_date || null, b.description || null, b.cost || 0, b.next_service_date || null, req.params.id, c]);
  await audit(req, 'UPDATE', 'equipment_maintenance', req.params.id);
  res.json({ message: 'Updated' });
} catch (e) { next(e); } }

export async function deleteMaintenance(req, res, next) { try {
  await pool.query(`UPDATE equipment_maintenance SET is_deleted=1 WHERE id=? AND company_id=?`, [req.params.id, req.user.company_id]);
  await audit(req, 'DELETE', 'equipment_maintenance', req.params.id);
  res.json({ message: 'Deleted' });
} catch (e) { next(e); } }

export async function listRentals(req, res, next) { try {
  const [rows] = await pool.query(
    `SELECT er.*,e.name equipment_name FROM equipment_rentals er JOIN equipment e ON e.id=er.equipment_id
     WHERE er.company_id=? AND er.is_deleted=0 ORDER BY er.id DESC`,
    [req.user.company_id]
  );
  res.json(rows);
} catch (e) { next(e); } }

export async function createRental(req, res, next) { try {
  const b = req.body, c = req.user.company_id;
  if (!b.equipment_id) return res.status(422).json({ message: 'Equipment is required' });
  const [r] = await pool.query(
    `INSERT INTO equipment_rentals(company_id,equipment_id,customer_name,start_date,end_date,rental_income,rental_expense,status,created_by) VALUES(?,?,?,?,?,?,?,?,?)`,
    [c, b.equipment_id, b.customer_name || null, b.start_date || null, b.end_date || null, b.rental_income || 0, b.rental_expense || 0, b.status || 'Active', req.user.id]
  );
  await pool.query(`UPDATE equipment SET status='Rented Out' WHERE id=? AND company_id=?`, [b.equipment_id, c]);
  await audit(req, 'CREATE', 'equipment_rentals', r.insertId);
  res.status(201).json({ id: r.insertId });
} catch (e) { next(e); } }

export async function updateRental(req, res, next) { try {
  const b = req.body, c = req.user.company_id;
  await pool.query(`UPDATE equipment_rentals SET customer_name=?,start_date=?,end_date=?,rental_income=?,rental_expense=?,status=? WHERE id=? AND company_id=?`,
    [b.customer_name || null, b.start_date || null, b.end_date || null, b.rental_income || 0, b.rental_expense || 0, b.status || 'Active', req.params.id, c]);
  await audit(req, 'UPDATE', 'equipment_rentals', req.params.id);
  res.json({ message: 'Updated' });
} catch (e) { next(e); } }

export async function deleteRental(req, res, next) { try {
  await pool.query(`UPDATE equipment_rentals SET is_deleted=1 WHERE id=? AND company_id=?`, [req.params.id, req.user.company_id]);
  await audit(req, 'DELETE', 'equipment_rentals', req.params.id);
  res.json({ message: 'Deleted' });
} catch (e) { next(e); } }
