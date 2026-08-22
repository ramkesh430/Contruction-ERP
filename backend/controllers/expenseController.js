import { pool } from '../config/db.js';
import { audit } from '../services/audit.js';

const FIELDS=['project_id','expense_date','expense_type','category_id','description','amount','payment_method','reference_no','paid_by'];

export async function listExpenses(req,res,next){ try{
  const c=req.user.company_id, q=req.query;
  const where=['e.company_id=?','e.is_deleted=0']; const params=[c];
  if(q.status){ where.push('e.status=?'); params.push(q.status); }
  if(q.expense_type){ where.push('e.expense_type=?'); params.push(q.expense_type); }
  if(q.project_id){ where.push('e.project_id=?'); params.push(q.project_id); }
  const [rows]=await pool.query(
    `SELECT e.*,p.project_name,ec.name category_name FROM expenses e
     LEFT JOIN projects p ON p.id=e.project_id LEFT JOIN expense_categories ec ON ec.id=e.category_id
     WHERE ${where.join(' AND ')} ORDER BY e.id DESC`,params);
  res.json(rows);
}catch(e){next(e);} }

export async function createExpense(req,res,next){ try{
  const b=req.body,c=req.user.company_id; const data={};
  for(const f of FIELDS) if(b[f]!==undefined) data[f]=b[f];
  data.company_id=c; data.created_by=req.user.id; data.status='Pending';
  const keys=Object.keys(data); const values=Object.values(data);
  const [r]=await pool.query(`INSERT INTO expenses(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`,values);
  await audit(req,'CREATE','expenses',r.insertId,{amount:b.amount});
  const [[row]]=await pool.query('SELECT * FROM expenses WHERE id=? AND company_id=?',[r.insertId,c]);
  res.status(201).json(row);
}catch(e){next(e);} }

export async function updateExpense(req,res,next){ try{
  const b=req.body,c=req.user.company_id; const sets=[],values=[];
  for(const f of FIELDS) if(b[f]!==undefined){ sets.push(`${f}=?`); values.push(b[f]===''?null:b[f]); }
  if(!sets.length) return res.status(400).json({message:'No fields to update'});
  values.push(req.user.id,req.params.id,c);
  await pool.query(`UPDATE expenses SET ${sets.join(',')},updated_by=?,updated_at=NOW() WHERE id=? AND company_id=? AND is_deleted=0`,values);
  await audit(req,'UPDATE','expenses',req.params.id,b);
  const [[row]]=await pool.query('SELECT * FROM expenses WHERE id=? AND company_id=?',[req.params.id,c]);
  if(!row) return res.status(404).json({message:'Expense not found'});
  res.json(row);
}catch(e){next(e);} }

export async function deleteExpense(req,res,next){ try{
  await pool.query(`UPDATE expenses SET is_deleted=1,deleted_at=NOW(),deleted_by=? WHERE id=? AND company_id=?`,[req.user.id,req.params.id,req.user.company_id]);
  await audit(req,'DELETE','expenses',req.params.id);
  res.json({message:'Deleted'});
}catch(e){next(e);} }

export async function approveExpense(req,res,next){ try{
  await pool.query(`UPDATE expenses SET status='Approved',approved_by=?,approved_at=NOW() WHERE id=? AND company_id=?`,[req.user.id,req.params.id,req.user.company_id]);
  await audit(req,'APPROVE','expenses',req.params.id);
  res.json({message:'Approved'});
}catch(e){next(e);} }

export async function rejectExpense(req,res,next){ try{
  await pool.query(`UPDATE expenses SET status='Rejected',approved_by=?,approved_at=NOW() WHERE id=? AND company_id=?`,[req.user.id,req.params.id,req.user.company_id]);
  await audit(req,'REJECT','expenses',req.params.id);
  res.json({message:'Rejected'});
}catch(e){next(e);} }

export async function uploadBill(req,res,next){ try{
  if(!req.file) return res.status(422).json({message:'File is required'});
  const filePath=`/uploads/${req.file.filename}`;
  await pool.query('UPDATE expenses SET bill_file=? WHERE id=? AND company_id=?',[filePath,req.params.id,req.user.company_id]);
  await audit(req,'UPDATE','expenses',req.params.id,{bill_file:filePath});
  res.json({bill_file:filePath});
}catch(e){next(e);} }

export async function listExpenseCategories(req,res,next){ try{
  const [rows]=await pool.query('SELECT * FROM expense_categories WHERE company_id=? AND is_deleted=0 ORDER BY name',[req.user.company_id]);
  res.json(rows);
}catch(e){next(e);} }

export async function createExpenseCategory(req,res,next){ try{
  const c=req.user.company_id;
  const [r]=await pool.query('INSERT INTO expense_categories(company_id,name,expense_type) VALUES(?,?,?)',[c,req.body.name,req.body.expense_type||null]);
  await audit(req,'CREATE','expense_categories',r.insertId,{name:req.body.name});
  const [[row]]=await pool.query('SELECT * FROM expense_categories WHERE id=? AND company_id=?',[r.insertId,c]);
  res.status(201).json(row);
}catch(e){ if(e.code==='ER_DUP_ENTRY') return res.status(409).json({message:'A category with this name already exists'}); next(e); } }

export async function updateExpenseCategory(req,res,next){ try{
  await pool.query('UPDATE expense_categories SET name=?,expense_type=? WHERE id=? AND company_id=? AND is_deleted=0',[req.body.name,req.body.expense_type||null,req.params.id,req.user.company_id]);
  await audit(req,'UPDATE','expense_categories',req.params.id,req.body);
  const [[row]]=await pool.query('SELECT * FROM expense_categories WHERE id=? AND company_id=?',[req.params.id,req.user.company_id]);
  res.json(row);
}catch(e){next(e);} }

export async function deleteExpenseCategory(req,res,next){ try{
  await pool.query('UPDATE expense_categories SET is_deleted=1 WHERE id=? AND company_id=?',[req.params.id,req.user.company_id]);
  await audit(req,'DELETE','expense_categories',req.params.id);
  res.json({message:'Deleted'});
}catch(e){next(e);} }
