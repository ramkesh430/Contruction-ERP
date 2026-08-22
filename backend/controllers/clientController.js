import { pool } from '../config/db.js';
import { audit } from '../services/audit.js';

const FIELDS=['name','client_type','contact_person','phone','alternate_phone','email','address','billing_address','pan_vat_no','registration_no','opening_balance','credit_limit','payment_terms','bank_name','account_name','account_number','notes','is_active'];

function withAggregates(where,params){
  return pool.query(
    `SELECT c.*,
       (SELECT COUNT(*) FROM projects p WHERE p.client_id=c.id AND p.is_deleted=0) total_projects,
       (SELECT COUNT(*) FROM projects p WHERE p.client_id=c.id AND p.is_deleted=0 AND p.status='Running') active_projects,
       (SELECT COALESCE(SUM(p.contract_amount),0) FROM projects p WHERE p.client_id=c.id AND p.is_deleted=0) contract_value,
       (SELECT COALESCE(SUM(i.grand_total),0) FROM invoices i WHERE i.client_id=c.id AND i.is_deleted=0 AND i.status NOT IN ('Draft','Cancelled')) total_invoice,
       (SELECT COALESCE(SUM(py.amount),0) FROM payments py WHERE py.client_id=c.id AND py.is_deleted=0 AND py.status='Successful') total_received,
       (SELECT COALESCE(SUM(i.due_amount),0) FROM invoices i WHERE i.client_id=c.id AND i.is_deleted=0 AND i.status NOT IN ('Cancelled')) total_due
     FROM clients c WHERE ${where} ORDER BY c.id DESC`, params);
}

export async function listClients(req,res,next){ try{
  const c=req.user.company_id, q=req.query;
  const where=['c.company_id=?','c.is_deleted=0']; const params=[c];
  where.push(q.archived==='1'?'c.is_archived=1':'c.is_archived=0');
  if(q.search){ where.push('(c.name LIKE ? OR c.registration_no LIKE ? OR c.phone LIKE ?)'); params.push(`%${q.search}%`,`%${q.search}%`,`%${q.search}%`); }
  if(q.client_type){ where.push('c.client_type=?'); params.push(q.client_type); }
  if(q.status){ where.push('c.is_active=?'); params.push(q.status==='active'?1:0); }
  const [rows]=await withAggregates(where.join(' AND '),params);
  res.json(rows);
}catch(e){next(e);} }

export async function createClient(req,res,next){ try{
  const b=req.body,c=req.user.company_id; const data={};
  for(const f of FIELDS) if(b[f]!==undefined) data[f]=b[f];
  data.company_id=c; data.created_by=req.user.id;
  const keys=Object.keys(data); const values=Object.values(data);
  const [r]=await pool.query(`INSERT INTO clients(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`,values);
  await audit(req,'CREATE','clients',r.insertId,{name:b.name});
  const [[row]]=await pool.query('SELECT * FROM clients WHERE id=? AND company_id=?',[r.insertId,c]);
  res.status(201).json(row);
}catch(e){next(e);} }

export async function updateClient(req,res,next){ try{
  const b=req.body,c=req.user.company_id; const sets=[],values=[];
  for(const f of FIELDS) if(b[f]!==undefined){ sets.push(`${f}=?`); values.push(b[f]===''?null:b[f]); }
  if(!sets.length) return res.status(400).json({message:'No fields to update'});
  values.push(req.user.id,req.params.id,c);
  await pool.query(`UPDATE clients SET ${sets.join(',')},updated_by=?,updated_at=NOW() WHERE id=? AND company_id=? AND is_deleted=0`,values);
  await audit(req,'UPDATE','clients',req.params.id,b);
  const [[row]]=await pool.query('SELECT * FROM clients WHERE id=? AND company_id=?',[req.params.id,c]);
  if(!row) return res.status(404).json({message:'Client not found'});
  res.json(row);
}catch(e){next(e);} }

export async function deleteClient(req,res,next){ try{
  await pool.query(`UPDATE clients SET is_deleted=1,deleted_at=NOW(),deleted_by=? WHERE id=? AND company_id=?`,[req.user.id,req.params.id,req.user.company_id]);
  await audit(req,'DELETE','clients',req.params.id);
  res.json({message:'Deleted'});
}catch(e){next(e);} }

export async function archiveClient(req,res,next){ try{
  await pool.query(`UPDATE clients SET is_archived=1 WHERE id=? AND company_id=?`,[req.params.id,req.user.company_id]);
  await audit(req,'ARCHIVE','clients',req.params.id);
  res.json({message:'Archived'});
}catch(e){next(e);} }

export async function unarchiveClient(req,res,next){ try{
  await pool.query(`UPDATE clients SET is_archived=0 WHERE id=? AND company_id=?`,[req.params.id,req.user.company_id]);
  await audit(req,'UNARCHIVE','clients',req.params.id);
  res.json({message:'Restored'});
}catch(e){next(e);} }

export async function getClientDetail(req,res,next){ try{
  const c=req.user.company_id, cid=req.params.id;
  const [[client]]=await withAggregates('c.id=? AND c.company_id=? AND c.is_deleted=0',[cid,c]);
  if(!client) return res.status(404).json({message:'Client not found'});

  const [projects]=await pool.query(`SELECT id,project_code,project_name,status,progress_percentage,contract_amount FROM projects WHERE client_id=? AND company_id=? AND is_deleted=0 ORDER BY id DESC`,[cid,c]);
  const [quotations]=await pool.query(`SELECT id,quotation_no,quotation_date,title,grand_total,status FROM quotations WHERE client_id=? AND company_id=? AND is_deleted=0 ORDER BY id DESC`,[cid,c]);
  const [invoices]=await pool.query(`SELECT id,invoice_no,invoice_date,grand_total,paid_amount,due_amount,status FROM invoices WHERE client_id=? AND company_id=? AND is_deleted=0 ORDER BY id DESC`,[cid,c]);
  const [payments]=await pool.query(`SELECT id,receipt_no,payment_date,amount,payment_method,status FROM payments WHERE client_id=? AND company_id=? AND is_deleted=0 ORDER BY id DESC`,[cid,c]);
  const [documents]=await pool.query(`SELECT * FROM client_documents WHERE client_id=? AND company_id=? AND is_deleted=0 ORDER BY id DESC`,[cid,c]);
  const [timeline]=await pool.query(`SELECT al.action,al.metadata,al.created_at,u.name user_name FROM audit_logs al LEFT JOIN users u ON u.id=al.user_id WHERE al.entity_type='clients' AND al.entity_id=? AND al.company_id=? ORDER BY al.created_at DESC LIMIT 30`,[cid,c]);

  const invoiceTxns=invoices.filter(i=>!['Draft','Cancelled'].includes(i.status)).map(i=>({txn_date:i.invoice_date,type:'Invoice',ref:i.invoice_no,debit:Number(i.grand_total),credit:0}));
  const paymentTxns=payments.filter(p=>p.status==='Successful').map(p=>({txn_date:p.payment_date,type:'Payment',ref:p.receipt_no,debit:0,credit:Number(p.amount)}));
  let balance=Number(client.opening_balance||0);
  const statement=[{txn_date:null,type:'Opening Balance',ref:'—',debit:balance,credit:0,balance},
    ...[...invoiceTxns,...paymentTxns].sort((a,b)=>new Date(a.txn_date)-new Date(b.txn_date)).map(t=>{ balance+=t.debit-t.credit; return {...t,balance}; })];

  res.json({client,projects,quotations,invoices,payments,documents,timeline,statement});
}catch(e){next(e);} }

export async function listClientDocuments(req,res,next){ try{
  const [rows]=await pool.query('SELECT * FROM client_documents WHERE client_id=? AND company_id=? AND is_deleted=0 ORDER BY id DESC',[req.params.id,req.user.company_id]);
  res.json(rows);
}catch(e){next(e);} }

export async function addClientDocument(req,res,next){ try{
  if(!req.file) return res.status(422).json({message:'File is required'});
  const filePath=`/uploads/${req.file.filename}`;
  const [r]=await pool.query('INSERT INTO client_documents(company_id,client_id,document_type,title,file_path,created_by) VALUES(?,?,?,?,?,?)',[req.user.company_id,req.params.id,req.body.document_type||'Other',req.body.title||req.file.originalname,filePath,req.user.id]);
  await audit(req,'CREATE','client_documents',r.insertId,{clientId:req.params.id});
  res.status(201).json({id:r.insertId,file_path:filePath});
}catch(e){next(e);} }

export async function deleteClientDocument(req,res,next){ try{
  await pool.query('UPDATE client_documents SET is_deleted=1 WHERE id=? AND client_id=? AND company_id=?',[req.params.docId,req.params.id,req.user.company_id]);
  res.json({message:'Deleted'});
}catch(e){next(e);} }
