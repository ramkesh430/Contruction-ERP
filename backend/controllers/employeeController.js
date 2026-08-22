import { pool } from '../config/db.js';
import { audit } from '../services/audit.js';

const FIELDS=['employee_code','name','employee_type','phone','email','address','join_date','salary_type','basic_salary','daily_wage','designation','is_active'];

export async function listEmployees(req,res,next){ try{
  const c=req.user.company_id, q=req.query;
  const where=['e.company_id=?','e.is_deleted=0']; const params=[c];
  if(q.search){ where.push('(e.name LIKE ? OR e.employee_code LIKE ? OR e.phone LIKE ?)'); params.push(`%${q.search}%`,`%${q.search}%`,`%${q.search}%`); }
  if(q.employee_type){ where.push('e.employee_type=?'); params.push(q.employee_type); }
  if(q.status){ where.push('e.is_active=?'); params.push(q.status==='active'?1:0); }
  const [rows]=await pool.query(
    `SELECT e.*,
       (SELECT COALESCE(SUM(a.amount-a.recovered_amount),0) FROM employee_advances a WHERE a.employee_id=e.id AND a.is_deleted=0) advance_outstanding
     FROM employees e WHERE ${where.join(' AND ')} ORDER BY e.id DESC`,params);
  res.json(rows);
}catch(e){next(e);} }

export async function createEmployee(req,res,next){ try{
  const b=req.body,c=req.user.company_id; const data={};
  for(const f of FIELDS) if(b[f]!==undefined) data[f]=b[f];
  data.company_id=c; data.created_by=req.user.id;
  const keys=Object.keys(data); const values=Object.values(data);
  const [r]=await pool.query(`INSERT INTO employees(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`,values);
  await audit(req,'CREATE','employees',r.insertId,{name:b.name});
  const [[row]]=await pool.query('SELECT * FROM employees WHERE id=? AND company_id=?',[r.insertId,c]);
  res.status(201).json(row);
}catch(e){ if(e.code==='ER_DUP_ENTRY') return res.status(409).json({message:'An employee with this code already exists'}); next(e); } }

export async function updateEmployee(req,res,next){ try{
  const b=req.body,c=req.user.company_id; const sets=[],values=[];
  for(const f of FIELDS) if(b[f]!==undefined){ sets.push(`${f}=?`); values.push(b[f]===''?null:b[f]); }
  if(!sets.length) return res.status(400).json({message:'No fields to update'});
  values.push(req.user.id,req.params.id,c);
  await pool.query(`UPDATE employees SET ${sets.join(',')},updated_by=?,updated_at=NOW() WHERE id=? AND company_id=? AND is_deleted=0`,values);
  await audit(req,'UPDATE','employees',req.params.id,b);
  const [[row]]=await pool.query('SELECT * FROM employees WHERE id=? AND company_id=?',[req.params.id,c]);
  if(!row) return res.status(404).json({message:'Employee not found'});
  res.json(row);
}catch(e){next(e);} }

export async function deleteEmployee(req,res,next){ try{
  await pool.query(`UPDATE employees SET is_deleted=1,deleted_at=NOW(),deleted_by=? WHERE id=? AND company_id=?`,[req.user.id,req.params.id,req.user.company_id]);
  await audit(req,'DELETE','employees',req.params.id);
  res.json({message:'Deleted'});
}catch(e){next(e);} }

export async function getEmployeeDetail(req,res,next){ try{
  const c=req.user.company_id, eid=req.params.id;
  const [[employee]]=await pool.query('SELECT * FROM employees WHERE id=? AND company_id=? AND is_deleted=0',[eid,c]);
  if(!employee) return res.status(404).json({message:'Employee not found'});

  const [attendance]=await pool.query(`SELECT a.*,p.project_name FROM attendance a LEFT JOIN projects p ON p.id=a.project_id WHERE a.employee_id=? AND a.company_id=? AND a.is_deleted=0 ORDER BY a.attendance_date DESC LIMIT 60`,[eid,c]);
  const [advances]=await pool.query(`SELECT *,(amount-recovered_amount) outstanding FROM employee_advances WHERE employee_id=? AND company_id=? AND is_deleted=0 ORDER BY advance_date DESC`,[eid,c]);
  const [salaryRecords]=await pool.query(`SELECT * FROM salary_records WHERE employee_id=? AND company_id=? AND is_deleted=0 ORDER BY salary_month DESC`,[eid,c]);
  const [documents]=await pool.query(`SELECT * FROM employee_documents WHERE employee_id=? AND company_id=? AND is_deleted=0 ORDER BY id DESC`,[eid,c]);
  const [timeline]=await pool.query(`SELECT al.action,al.metadata,al.created_at,u.name user_name FROM audit_logs al LEFT JOIN users u ON u.id=al.user_id WHERE al.entity_type='employees' AND al.entity_id=? AND al.company_id=? ORDER BY al.created_at DESC LIMIT 30`,[eid,c]);

  const advanceOutstanding=advances.reduce((s,a)=>s+Number(a.outstanding||0),0);
  const attendanceSummary={
    present:attendance.filter(a=>a.status==='Present').length,
    absent:attendance.filter(a=>a.status==='Absent').length,
    halfDay:attendance.filter(a=>a.status==='Half Day').length,
    leave:attendance.filter(a=>a.status==='Leave').length,
    totalWage:attendance.reduce((s,a)=>s+Number(a.calculated_amount||0),0)
  };

  res.json({employee,attendance,advances,salaryRecords,documents,timeline,advanceOutstanding,attendanceSummary});
}catch(e){next(e);} }

export async function listEmployeeDocuments(req,res,next){ try{
  const [rows]=await pool.query('SELECT * FROM employee_documents WHERE employee_id=? AND company_id=? AND is_deleted=0 ORDER BY id DESC',[req.params.id,req.user.company_id]);
  res.json(rows);
}catch(e){next(e);} }

export async function addEmployeeDocument(req,res,next){ try{
  if(!req.file) return res.status(422).json({message:'File is required'});
  const filePath=`/uploads/${req.file.filename}`;
  const [r]=await pool.query('INSERT INTO employee_documents(company_id,employee_id,document_type,title,file_path,created_by) VALUES(?,?,?,?,?,?)',[req.user.company_id,req.params.id,req.body.document_type||'Other',req.body.title||req.file.originalname,filePath,req.user.id]);
  await audit(req,'CREATE','employee_documents',r.insertId,{employeeId:req.params.id});
  res.status(201).json({id:r.insertId,file_path:filePath});
}catch(e){next(e);} }

export async function deleteEmployeeDocument(req,res,next){ try{
  await pool.query('UPDATE employee_documents SET is_deleted=1 WHERE id=? AND employee_id=? AND company_id=?',[req.params.docId,req.params.id,req.user.company_id]);
  res.json({message:'Deleted'});
}catch(e){next(e);} }
