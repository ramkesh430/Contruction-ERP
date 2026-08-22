import { pool } from '../config/db.js';

export async function globalSearch(req,res,next){try{
  const c=req.user.company_id;
  const q=(req.query.q||'').trim();
  if(q.length<2) return res.json({clients:[],suppliers:[],projects:[],employees:[],invoices:[],quotations:[],payments:[]});
  const like=`%${q}%`;

  const [clients]=await pool.query(
    `SELECT id,name,phone FROM clients WHERE company_id=? AND is_deleted=0 AND (name LIKE ? OR phone LIKE ?) LIMIT 5`,
    [c,like,like]
  );
  const [suppliers]=await pool.query(
    `SELECT id,name,phone FROM suppliers WHERE company_id=? AND is_deleted=0 AND (name LIKE ? OR phone LIKE ?) LIMIT 5`,
    [c,like,like]
  );
  const [projects]=await pool.query(
    `SELECT id,project_name,project_code FROM projects WHERE company_id=? AND is_deleted=0 AND (project_name LIKE ? OR project_code LIKE ?) LIMIT 5`,
    [c,like,like]
  );
  const [employees]=await pool.query(
    `SELECT id,name,employee_code FROM employees WHERE company_id=? AND is_deleted=0 AND (name LIKE ? OR employee_code LIKE ?) LIMIT 5`,
    [c,like,like]
  );
  const [invoices]=await pool.query(
    `SELECT i.id,i.invoice_no,cl.name client_name FROM invoices i LEFT JOIN clients cl ON cl.id=i.client_id WHERE i.company_id=? AND i.is_deleted=0 AND i.invoice_no LIKE ? LIMIT 5`,
    [c,like]
  );
  const [quotations]=await pool.query(
    `SELECT q.id,q.quotation_no,cl.name client_name FROM quotations q LEFT JOIN clients cl ON cl.id=q.client_id WHERE q.company_id=? AND q.is_deleted=0 AND q.quotation_no LIKE ? LIMIT 5`,
    [c,like]
  );
  const [payments]=await pool.query(
    `SELECT p.id,p.receipt_no,cl.name client_name FROM payments p LEFT JOIN clients cl ON cl.id=p.client_id WHERE p.company_id=? AND p.is_deleted=0 AND p.receipt_no LIKE ? LIMIT 5`,
    [c,like]
  );

  res.json({clients,suppliers,projects,employees,invoices,quotations,payments});
}catch(e){next(e)}}
