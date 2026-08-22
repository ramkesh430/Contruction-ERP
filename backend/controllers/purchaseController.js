import { pool } from '../config/db.js';
import { buildCode } from '../utils/codes.js';
import { audit } from '../services/audit.js';
import { notify } from '../services/notify.js';

async function fy(companyId) {
  const [[r]] = await pool.query('SELECT code FROM fiscal_years WHERE company_id=? AND is_current=1 LIMIT 1', [companyId]);
  return (r?.code || '2083-84').split('-')[0];
}

export async function listPurchases(req, res, next) { try {
  const [rows] = await pool.query(
    `SELECT mp.*,s.name supplier_name,p.project_name FROM material_purchases mp
     LEFT JOIN suppliers s ON s.id=mp.supplier_id LEFT JOIN projects p ON p.id=mp.project_id
     WHERE mp.company_id=? AND mp.is_deleted=0 ORDER BY mp.id DESC`,
    [req.user.company_id]
  );
  res.json(rows);
} catch (e) { next(e); } }

export async function getPurchase(req, res, next) { try {
  const [[mp]] = await pool.query(
    `SELECT mp.*,s.name supplier_name,p.project_name FROM material_purchases mp
     LEFT JOIN suppliers s ON s.id=mp.supplier_id LEFT JOIN projects p ON p.id=mp.project_id
     WHERE mp.id=? AND mp.company_id=? AND mp.is_deleted=0`,
    [req.params.id, req.user.company_id]
  );
  if (!mp) return res.status(404).json({ message: 'Purchase not found' });
  const [items] = await pool.query(
    `SELECT mpi.*,m.name material_name,m.unit FROM material_purchase_items mpi JOIN materials m ON m.id=mpi.material_id WHERE mpi.material_purchase_id=? AND mpi.company_id=?`,
    [req.params.id, req.user.company_id]
  );
  res.json({ ...mp, items });
} catch (e) { next(e); } }

export async function createPurchase(req, res, next) { try {
  const b = req.body, c = req.user.company_id, items = Array.isArray(b.items) ? b.items : [];
  if (!b.supplier_id) return res.status(422).json({ message: 'Supplier is required' });
  if (!items.length) return res.status(422).json({ message: 'At least one item is required' });
  const [[seq]] = await pool.query(`SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(purchase_no,'-',-1) AS UNSIGNED)),0)+1 n FROM material_purchases WHERE company_id=?`, [c]);
  const purchase_no = buildCode('PUR', await fy(c), seq.n, 5);
  const subtotal = items.reduce((s, x) => s + Number(x.quantity || 0) * Number(x.unit_cost || 0), 0);
  const vatRate = Number(b.vat_rate || 0);
  const vat = subtotal * vatRate / 100;
  const grand = subtotal + vat;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [r] = await conn.query(
      `INSERT INTO material_purchases(company_id,supplier_id,project_id,purchase_no,purchase_date,invoice_ref,subtotal,vat_amount,grand_total,paid_amount,due_amount,status,remarks,created_by)
       VALUES(?,?,?,?,?,?,?,?,?,0,?,'Posted',?,?)`,
      [c, b.supplier_id, b.project_id || null, purchase_no, b.purchase_date || new Date(), b.invoice_ref || null, subtotal, vat, grand, grand, b.remarks || null, req.user.id]
    );
    for (const x of items) {
      const amount = Number(x.quantity || 0) * Number(x.unit_cost || 0);
      await conn.query(
        `INSERT INTO material_purchase_items(company_id,material_purchase_id,material_id,quantity,unit_cost,amount) VALUES(?,?,?,?,?,?)`,
        [c, r.insertId, x.material_id, x.quantity, x.unit_cost, amount]
      );
      await conn.query(
        `INSERT INTO stock_transactions(company_id,material_id,project_id,transaction_date,transaction_type,quantity,unit_cost,reference_type,reference_id,created_by)
         VALUES(?,?,?,?, 'Purchase',?,?,?,?,?)`,
        [c, x.material_id, b.project_id || null, b.purchase_date || new Date(), x.quantity, x.unit_cost, 'material_purchase', r.insertId, req.user.id]
      );
    }
    await conn.commit();
    await audit(req, 'CREATE', 'material_purchases', r.insertId, { purchase_no, grand_total: grand });
    res.status(201).json({ id: r.insertId, purchase_no, grand_total: grand });
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
} catch (e) { next(e); } }

export async function updatePurchase(req, res, next) { try {
  const b = req.body, c = req.user.company_id;
  const [[mp]] = await pool.query('SELECT id FROM material_purchases WHERE id=? AND company_id=? AND is_deleted=0', [req.params.id, c]);
  if (!mp) return res.status(404).json({ message: 'Purchase not found' });
  await pool.query(`UPDATE material_purchases SET purchase_date=COALESCE(?,purchase_date),invoice_ref=?,remarks=? WHERE id=? AND company_id=?`,
    [b.purchase_date || null, b.invoice_ref ?? null, b.remarks ?? null, req.params.id, c]);
  await audit(req, 'UPDATE', 'material_purchases', req.params.id);
  res.json({ message: 'Updated' });
} catch (e) { next(e); } }

export async function deletePurchase(req, res, next) { try {
  const c = req.user.company_id;
  const [[mp]] = await pool.query('SELECT id FROM material_purchases WHERE id=? AND company_id=? AND is_deleted=0', [req.params.id, c]);
  if (!mp) return res.status(404).json({ message: 'Purchase not found' });
  await pool.query(`UPDATE material_purchases SET is_deleted=1 WHERE id=? AND company_id=?`, [req.params.id, c]);
  await pool.query(`UPDATE stock_transactions SET is_deleted=1 WHERE reference_type='material_purchase' AND reference_id=? AND company_id=?`, [req.params.id, c]);
  await audit(req, 'DELETE', 'material_purchases', req.params.id);
  res.json({ message: 'Deleted' });
} catch (e) { next(e); } }

export async function getSupplierPayment(req, res, next) { try {
  const [[row]] = await pool.query(
    `SELECT sp.*,s.name supplier_name,s.phone supplier_phone,s.address supplier_address,s.pan_vat_no supplier_pan_vat,mp.purchase_no,mp.project_id,p.project_name
     FROM supplier_payments sp LEFT JOIN suppliers s ON s.id=sp.supplier_id LEFT JOIN material_purchases mp ON mp.id=sp.material_purchase_id LEFT JOIN projects p ON p.id=mp.project_id
     WHERE sp.id=? AND sp.company_id=? AND sp.is_deleted=0`,
    [req.params.id, req.user.company_id]
  );
  if (!row) return res.status(404).json({ message: 'Payment not found' });
  res.json(row);
} catch (e) { next(e); } }

export async function payPurchase(req, res, next) { try {
  const c = req.user.company_id, b = req.body;
  const amount = Number(b.amount || 0);
  if (amount <= 0) return res.status(422).json({ message: 'Valid amount required' });
  const [[mp]] = await pool.query('SELECT * FROM material_purchases WHERE id=? AND company_id=? AND is_deleted=0', [req.params.id, c]);
  if (!mp) return res.status(404).json({ message: 'Purchase not found' });
  const pay = Math.min(amount, Number(mp.due_amount));
  await pool.query(
    `UPDATE material_purchases SET paid_amount=paid_amount+?,due_amount=due_amount-? WHERE id=? AND company_id=?`,
    [pay, pay, req.params.id, c]
  );
  await pool.query(
    `INSERT INTO supplier_payments(company_id,supplier_id,material_purchase_id,payment_date,amount,payment_method,reference_no,remarks,created_by) VALUES(?,?,?,?,?,?,?,?,?)`,
    [c, mp.supplier_id, req.params.id, b.payment_date || new Date(), pay, b.payment_method || 'Cash', b.reference_no || null, b.remarks || null, req.user.id]
  );
  await audit(req, 'PAY', 'material_purchases', req.params.id, { amount: pay });
  res.json({ message: 'Payment recorded', paid: pay });
} catch (e) { next(e); } }
