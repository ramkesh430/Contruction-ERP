import { pool } from '../config/db.js';
import { buildCode } from '../utils/codes.js';
import { audit } from '../services/audit.js';
import { notify } from '../services/notify.js';

async function fy(companyId){const [[r]]=await pool.query('SELECT code FROM fiscal_years WHERE company_id=? AND is_current=1 LIMIT 1',[companyId]);return (r?.code||'2083-84').split('-')[0];}
async function nextCode(table,codeCol,prefix,companyId,width=5){const [[r]]=await pool.query(`SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(${codeCol},'-',-1) AS UNSIGNED)),0)+1 n FROM ${table} WHERE company_id=?`,[companyId]);return buildCode(prefix,await fy(companyId),r.n,width);}
function addDays(dateInput,days){const d=dateInput?new Date(dateInput):new Date();d.setDate(d.getDate()+days);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}

const OVERDUE_SQL=`CASE WHEN i.status IN ('Issued','Partially Paid') AND i.due_date<CURDATE() THEN 'Overdue' ELSE i.status END`;

export async function listInvoices(req,res,next){try{const [rows]=await pool.query(`SELECT i.*,c.name client_name,p.project_name,${OVERDUE_SQL} effective_status FROM invoices i LEFT JOIN clients c ON c.id=i.client_id LEFT JOIN projects p ON p.id=i.project_id WHERE i.company_id=? AND i.is_deleted=0 ORDER BY i.id DESC`,[req.user.company_id]);res.json(rows)}catch(e){next(e)}}
export async function getInvoice(req,res,next){try{
  const [[inv]]=await pool.query(`SELECT i.*,c.name client_name,c.phone client_phone,c.address client_address,c.pan_vat_no client_pan_vat,c.payment_terms client_payment_terms,p.project_name,p.location project_location,p.retention_percentage,fy.code fiscal_year_code,${OVERDUE_SQL} effective_status FROM invoices i LEFT JOIN clients c ON c.id=i.client_id LEFT JOIN projects p ON p.id=i.project_id LEFT JOIN fiscal_years fy ON fy.id=i.fiscal_year_id WHERE i.id=? AND i.company_id=? AND i.is_deleted=0`,[req.params.id,req.user.company_id]);
  if(!inv) return res.status(404).json({message:'Invoice not found'});
  const [items]=await pool.query('SELECT * FROM invoice_items WHERE invoice_id=? AND company_id=?',[req.params.id,req.user.company_id]);
  const [payments]=await pool.query(`SELECT * FROM payments WHERE invoice_id=? AND company_id=? AND is_deleted=0 ORDER BY payment_date DESC`,[req.params.id,req.user.company_id]);
  res.json({...inv,items,payments});
}catch(e){next(e)}}
export async function createInvoice(req,res,next){try{
  const b=req.body,c=req.user.company_id; const no=await nextCode('invoices','invoice_no','INV',c); const items=Array.isArray(b.items)?b.items:[];
  const subtotal=items.reduce((s,x)=>s+Number(x.quantity||0)*Number(x.rate||0),0); const discount=Number(b.discount||0); const taxable=Math.max(0,subtotal-discount); const vatRate=Number(b.vat_rate||0); const vat=taxable*vatRate/100; const grand=taxable+vat;
  const invoiceDate=b.invoice_date||new Date(); const dueDate=b.due_date||addDays(invoiceDate,30);
  const conn=await pool.getConnection(); try{await conn.beginTransaction(); const [r]=await conn.query(`INSERT INTO invoices(company_id,invoice_no,invoice_date,due_date,client_id,project_id,pan_vat_no,subtotal,discount,taxable_amount,vat_rate,vat_amount,grand_total,paid_amount,due_amount,status,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,'Issued',?)`,[c,no,invoiceDate,dueDate,b.client_id||null,b.project_id||null,b.pan_vat_no||null,subtotal,discount,taxable,vatRate,vat,grand,grand,req.user.id]); for(const x of items){const amount=Number(x.quantity||0)*Number(x.rate||0);await conn.query(`INSERT INTO invoice_items(company_id,invoice_id,description,unit,quantity,rate,amount) VALUES(?,?,?,?,?,?,?)`,[c,r.insertId,x.description,x.unit||null,x.quantity||0,x.rate||0,amount]);} await conn.commit(); await audit(req,'CREATE','invoices',r.insertId,{invoice_no:no,grand_total:grand}); res.status(201).json({id:r.insertId,invoice_no:no,subtotal,discount,taxable_amount:taxable,vat_amount:vat,grand_total:grand});}catch(e){await conn.rollback();throw e}finally{conn.release()}
}catch(e){next(e)}}

export async function updateInvoice(req,res,next){try{
  const b=req.body,c=req.user.company_id,items=Array.isArray(b.items)?b.items:[];
  if(!items.length) return res.status(422).json({message:'At least one item is required'});
  const [[inv]]=await pool.query('SELECT paid_amount,client_id,project_id,invoice_date,due_date,pan_vat_no FROM invoices WHERE id=? AND company_id=? AND is_deleted=0',[req.params.id,c]);
  if(!inv) return res.status(404).json({message:'Invoice not found'});
  const subtotal=items.reduce((s,x)=>s+Number(x.quantity||0)*Number(x.rate||0),0); const discount=Number(b.discount||0); const taxable=Math.max(0,subtotal-discount); const vatRate=Number(b.vat_rate||0); const vat=taxable*vatRate/100; const grand=taxable+vat;
  const paid=Number(inv.paid_amount||0); const due=Math.max(0,grand-paid); const status=paid<=0?'Issued':(paid>=grand?'Paid':'Partially Paid');
  const clientId=b.client_id!==undefined?(b.client_id||null):inv.client_id;
  const projectId=b.project_id!==undefined?(b.project_id||null):inv.project_id;
  const conn=await pool.getConnection();
  try{
    await conn.beginTransaction();
    await conn.query(`UPDATE invoices SET client_id=?,project_id=?,invoice_date=?,due_date=?,pan_vat_no=?,subtotal=?,discount=?,taxable_amount=?,vat_rate=?,vat_amount=?,grand_total=?,due_amount=?,status=?,updated_at=NOW() WHERE id=? AND company_id=?`,
      [clientId,projectId,b.invoice_date||inv.invoice_date,b.due_date||inv.due_date,b.pan_vat_no??inv.pan_vat_no,subtotal,discount,taxable,vatRate,vat,grand,due,status,req.params.id,c]);
    await conn.query('DELETE FROM invoice_items WHERE invoice_id=? AND company_id=?',[req.params.id,c]);
    for(const x of items){const amount=Number(x.quantity||0)*Number(x.rate||0);await conn.query(`INSERT INTO invoice_items(company_id,invoice_id,description,unit,quantity,rate,amount) VALUES(?,?,?,?,?,?,?)`,[c,req.params.id,x.description,x.unit||null,x.quantity||0,x.rate||0,amount]);}
    await conn.commit();
    await audit(req,'UPDATE','invoices',req.params.id,{grand_total:grand});
    res.json({id:req.params.id,grand_total:grand,due_amount:due,status});
  }catch(e){await conn.rollback();throw e}finally{conn.release()}
}catch(e){next(e)}}

export async function deleteInvoice(req,res,next){try{
  await pool.query(`UPDATE invoices SET is_deleted=1,deleted_at=NOW(),deleted_by=? WHERE id=? AND company_id=?`,[req.user.id,req.params.id,req.user.company_id]);
  await audit(req,'DELETE','invoices',req.params.id);
  res.json({message:'Deleted'});
}catch(e){next(e)}}

export async function listPayments(req,res,next){try{const [rows]=await pool.query(`SELECT py.*,c.name client_name,p.project_name FROM payments py LEFT JOIN clients c ON c.id=py.client_id LEFT JOIN projects p ON p.id=py.project_id WHERE py.company_id=? AND py.is_deleted=0 ORDER BY py.id DESC`,[req.user.company_id]);res.json(rows)}catch(e){next(e)}}
export async function getPayment(req,res,next){try{
  const [[row]]=await pool.query(`SELECT py.*,c.name client_name,c.phone client_phone,c.address client_address,c.pan_vat_no client_pan_vat,p.project_name,i.invoice_no,fy.code fiscal_year_code
    FROM payments py LEFT JOIN clients c ON c.id=py.client_id LEFT JOIN projects p ON p.id=py.project_id LEFT JOIN invoices i ON i.id=py.invoice_id LEFT JOIN fiscal_years fy ON fy.id=py.fiscal_year_id
    WHERE py.id=? AND py.company_id=? AND py.is_deleted=0`,[req.params.id,req.user.company_id]);
  if(!row) return res.status(404).json({message:'Payment not found'});
  res.json(row);
}catch(e){next(e)}}
export async function createPayment(req,res,next){try{const b=req.body,c=req.user.company_id;const receipt=await nextCode('payments','receipt_no','RCPT',c);const [r]=await pool.query(`INSERT INTO payments(company_id,receipt_no,payment_date,client_id,project_id,invoice_id,amount,payment_method,reference_no,status,remarks,created_by) VALUES(?,?,?,?,?,?,?,?,?,'Successful',?,?)`,[c,receipt,b.payment_date||new Date(),b.client_id||null,b.project_id||null,b.invoice_id||null,b.amount,b.payment_method||'Cash',b.reference_no||null,b.remarks||null,req.user.id]);if(b.invoice_id){const [[inv]]=await pool.query('SELECT invoice_no,paid_amount,grand_total FROM invoices WHERE id=? AND company_id=?',[b.invoice_id,c]);if(inv){const newPaid=Math.min(Number(inv.grand_total),Number(inv.paid_amount)+Number(b.amount));const newDue=Math.max(0,Number(inv.grand_total)-newPaid);const status=newPaid>=Number(inv.grand_total)?'Paid':'Partially Paid';await pool.query('UPDATE invoices SET status=?,paid_amount=?,due_amount=? WHERE id=? AND company_id=?',[status,newPaid,newDue,b.invoice_id,c]);if(newPaid>=Number(inv.grand_total)){await notify(c,{type:'invoice_paid',title:'Invoice Fully Paid',message:`Invoice ${inv.invoice_no} has been fully paid`,entityType:'invoices',entityId:b.invoice_id});}}}await audit(req,'CREATE','payments',r.insertId,{receipt_no:receipt,amount:b.amount});res.status(201).json({id:r.insertId,receipt_no:receipt})}catch(e){next(e)}}

async function adjustInvoiceByDelta(invoiceId,companyId,delta){
  if(!invoiceId||!delta) return;
  const [[inv]]=await pool.query('SELECT paid_amount,grand_total FROM invoices WHERE id=? AND company_id=?',[invoiceId,companyId]);
  if(!inv) return;
  const paid=Math.max(0,Math.min(Number(inv.grand_total),Number(inv.paid_amount)+delta));
  const due=Math.max(0,Number(inv.grand_total)-paid);
  const status=paid<=0?'Issued':(paid>=Number(inv.grand_total)?'Paid':'Partially Paid');
  await pool.query('UPDATE invoices SET paid_amount=?,due_amount=?,status=? WHERE id=? AND company_id=?',[paid,due,status,invoiceId,companyId]);
}

export async function updatePayment(req,res,next){try{
  const b=req.body,c=req.user.company_id;
  const [[old]]=await pool.query('SELECT * FROM payments WHERE id=? AND company_id=? AND is_deleted=0',[req.params.id,c]);
  if(!old) return res.status(404).json({message:'Payment not found'});
  const newAmount=b.amount!==undefined?Number(b.amount):Number(old.amount);
  await pool.query(`UPDATE payments SET payment_date=?,client_id=?,project_id=?,amount=?,payment_method=?,reference_no=?,remarks=? WHERE id=? AND company_id=?`,
    [b.payment_date||old.payment_date,b.client_id??old.client_id,b.project_id??old.project_id,newAmount,b.payment_method||old.payment_method,b.reference_no??old.reference_no,b.remarks??old.remarks,req.params.id,c]);
  if(old.invoice_id){ await adjustInvoiceByDelta(old.invoice_id,c,newAmount-Number(old.amount)); }
  await audit(req,'UPDATE','payments',req.params.id,{amount:newAmount});
  res.json({message:'Updated'});
}catch(e){next(e)}}

export async function deletePayment(req,res,next){try{
  const c=req.user.company_id;
  const [[old]]=await pool.query('SELECT * FROM payments WHERE id=? AND company_id=? AND is_deleted=0',[req.params.id,c]);
  if(!old) return res.status(404).json({message:'Payment not found'});
  await pool.query(`UPDATE payments SET is_deleted=1,deleted_at=NOW(),deleted_by=? WHERE id=? AND company_id=?`,[req.user.id,req.params.id,c]);
  if(old.invoice_id){ await adjustInvoiceByDelta(old.invoice_id,c,-Number(old.amount)); }
  await audit(req,'DELETE','payments',req.params.id);
  res.json({message:'Deleted'});
}catch(e){next(e)}}
