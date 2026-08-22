import { pool } from '../config/db.js';
import { audit } from '../services/audit.js';

const FIELDS=['name','contact_person','phone','email','address','pan_vat_no','opening_due','notes'];

function withAggregates(where,params){
  return pool.query(
    `SELECT s.*,
       (SELECT COUNT(*) FROM material_purchases mp WHERE mp.supplier_id=s.id AND mp.is_deleted=0) total_purchases,
       (SELECT COALESCE(SUM(mp.grand_total),0) FROM material_purchases mp WHERE mp.supplier_id=s.id AND mp.is_deleted=0) total_purchase_amount,
       (SELECT COALESCE(SUM(mp.paid_amount),0) FROM material_purchases mp WHERE mp.supplier_id=s.id AND mp.is_deleted=0) total_paid,
       (SELECT COALESCE(SUM(mp.due_amount),0) FROM material_purchases mp WHERE mp.supplier_id=s.id AND mp.is_deleted=0) purchase_due
     FROM suppliers s WHERE ${where} ORDER BY s.id DESC`, params);
}

export async function listSuppliers(req,res,next){ try{
  const c=req.user.company_id, q=req.query;
  const where=['s.company_id=?','s.is_deleted=0']; const params=[c];
  where.push(q.archived==='1'?'s.is_archived=1':'s.is_archived=0');
  if(q.search){ where.push('(s.name LIKE ? OR s.phone LIKE ? OR s.pan_vat_no LIKE ?)'); params.push(`%${q.search}%`,`%${q.search}%`,`%${q.search}%`); }
  const [rows]=await withAggregates(where.join(' AND '),params);
  const data=rows.map(r=>({...r,total_due:Number(r.opening_due||0)+Number(r.purchase_due||0)}));
  res.json(data);
}catch(e){next(e);} }

export async function createSupplier(req,res,next){ try{
  const b=req.body,c=req.user.company_id; const data={};
  for(const f of FIELDS) if(b[f]!==undefined) data[f]=b[f];
  data.company_id=c; data.created_by=req.user.id;
  const keys=Object.keys(data); const values=Object.values(data);
  const [r]=await pool.query(`INSERT INTO suppliers(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`,values);
  await audit(req,'CREATE','suppliers',r.insertId,{name:b.name});
  const [[row]]=await pool.query('SELECT * FROM suppliers WHERE id=? AND company_id=?',[r.insertId,c]);
  res.status(201).json(row);
}catch(e){next(e);} }

export async function updateSupplier(req,res,next){ try{
  const b=req.body,c=req.user.company_id; const sets=[],values=[];
  for(const f of FIELDS) if(b[f]!==undefined){ sets.push(`${f}=?`); values.push(b[f]===''?null:b[f]); }
  if(!sets.length) return res.status(400).json({message:'No fields to update'});
  values.push(req.user.id,req.params.id,c);
  await pool.query(`UPDATE suppliers SET ${sets.join(',')},updated_by=?,updated_at=NOW() WHERE id=? AND company_id=? AND is_deleted=0`,values);
  await audit(req,'UPDATE','suppliers',req.params.id,b);
  const [[row]]=await pool.query('SELECT * FROM suppliers WHERE id=? AND company_id=?',[req.params.id,c]);
  if(!row) return res.status(404).json({message:'Supplier not found'});
  res.json(row);
}catch(e){next(e);} }

export async function deleteSupplier(req,res,next){ try{
  await pool.query(`UPDATE suppliers SET is_deleted=1,deleted_at=NOW(),deleted_by=? WHERE id=? AND company_id=?`,[req.user.id,req.params.id,req.user.company_id]);
  await audit(req,'DELETE','suppliers',req.params.id);
  res.json({message:'Deleted'});
}catch(e){next(e);} }

export async function archiveSupplier(req,res,next){ try{
  await pool.query(`UPDATE suppliers SET is_archived=1 WHERE id=? AND company_id=?`,[req.params.id,req.user.company_id]);
  await audit(req,'ARCHIVE','suppliers',req.params.id);
  res.json({message:'Archived'});
}catch(e){next(e);} }

export async function unarchiveSupplier(req,res,next){ try{
  await pool.query(`UPDATE suppliers SET is_archived=0 WHERE id=? AND company_id=?`,[req.params.id,req.user.company_id]);
  await audit(req,'UNARCHIVE','suppliers',req.params.id);
  res.json({message:'Restored'});
}catch(e){next(e);} }

export async function getSupplierDetail(req,res,next){ try{
  const c=req.user.company_id, sid=req.params.id;
  const [[supplier]]=await withAggregates('s.id=? AND s.company_id=? AND s.is_deleted=0',[sid,c]);
  if(!supplier) return res.status(404).json({message:'Supplier not found'});
  supplier.total_due=Number(supplier.opening_due||0)+Number(supplier.purchase_due||0);

  const [purchases]=await pool.query(`SELECT mp.*,p.project_name FROM material_purchases mp LEFT JOIN projects p ON p.id=mp.project_id WHERE mp.supplier_id=? AND mp.company_id=? AND mp.is_deleted=0 ORDER BY mp.id DESC`,[sid,c]);
  const [payments]=await pool.query(`SELECT sp.*,mp.purchase_no FROM supplier_payments sp LEFT JOIN material_purchases mp ON mp.id=sp.material_purchase_id WHERE sp.supplier_id=? AND sp.company_id=? AND sp.is_deleted=0 ORDER BY sp.id DESC`,[sid,c]);
  const [documents]=await pool.query(`SELECT * FROM supplier_documents WHERE supplier_id=? AND company_id=? AND is_deleted=0 ORDER BY id DESC`,[sid,c]);
  const [timeline]=await pool.query(`SELECT al.action,al.metadata,al.created_at,u.name user_name FROM audit_logs al LEFT JOIN users u ON u.id=al.user_id WHERE al.entity_type='suppliers' AND al.entity_id=? AND al.company_id=? ORDER BY al.created_at DESC LIMIT 30`,[sid,c]);

  const purchaseTxns=purchases.filter(p=>p.status!=='Cancelled').map(p=>({txn_date:p.purchase_date,type:'Purchase',ref:p.purchase_no,debit:Number(p.grand_total),credit:0}));
  const paymentTxns=payments.map(p=>({txn_date:p.payment_date,type:'Payment',ref:p.reference_no||p.purchase_no||'—',debit:0,credit:Number(p.amount)}));
  let balance=Number(supplier.opening_due||0);
  const statement=[{txn_date:null,type:'Opening Due',ref:'—',debit:balance,credit:0,balance},
    ...[...purchaseTxns,...paymentTxns].sort((a,b)=>new Date(a.txn_date)-new Date(b.txn_date)).map(t=>{ balance+=t.debit-t.credit; return {...t,balance}; })];

  res.json({supplier,purchases,payments,documents,timeline,statement});
}catch(e){next(e);} }

export async function listSupplierDocuments(req,res,next){ try{
  const [rows]=await pool.query('SELECT * FROM supplier_documents WHERE supplier_id=? AND company_id=? AND is_deleted=0 ORDER BY id DESC',[req.params.id,req.user.company_id]);
  res.json(rows);
}catch(e){next(e);} }

export async function addSupplierDocument(req,res,next){ try{
  if(!req.file) return res.status(422).json({message:'File is required'});
  const filePath=`/uploads/${req.file.filename}`;
  const [r]=await pool.query('INSERT INTO supplier_documents(company_id,supplier_id,document_type,title,file_path,created_by) VALUES(?,?,?,?,?,?)',[req.user.company_id,req.params.id,req.body.document_type||'Other',req.body.title||req.file.originalname,filePath,req.user.id]);
  await audit(req,'CREATE','supplier_documents',r.insertId,{supplierId:req.params.id});
  res.status(201).json({id:r.insertId,file_path:filePath});
}catch(e){next(e);} }

export async function deleteSupplierDocument(req,res,next){ try{
  await pool.query('UPDATE supplier_documents SET is_deleted=1 WHERE id=? AND supplier_id=? AND company_id=?',[req.params.docId,req.params.id,req.user.company_id]);
  res.json({message:'Deleted'});
}catch(e){next(e);} }
