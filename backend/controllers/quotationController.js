import { pool } from '../config/db.js';
import { buildCode } from '../utils/codes.js';
import { audit } from '../services/audit.js';
import { notify } from '../services/notify.js';

async function fiscalYear(companyId){
  const [[fy]]=await pool.query('SELECT id,code FROM fiscal_years WHERE company_id=? AND is_current=1 LIMIT 1',[companyId]);
  return fy||{id:null,code:'2083-84'};
}
async function nextCode(companyId,fyCode){
  const [[n]]=await pool.query(`SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(quotation_no,'-',-1) AS UNSIGNED)),0)+1 n FROM quotations WHERE company_id=?`,[companyId]);
  return buildCode('QT',fyCode.split('-')[0],n.n,5);
}

function computeTotals(items,b){
  const subtotal=items.reduce((s,x)=>s+Number(x.quantity||0)*Number(x.rate||0),0);
  const discountType=b.discount_type==='Percentage'?'Percentage':'Fixed';
  const discountValue=Number(b.discount_value||0);
  const discount=discountType==='Percentage'?subtotal*discountValue/100:discountValue;
  const taxable=Math.max(0,subtotal-discount);
  const vatEnabled=b.vat_enabled===false||b.vat_enabled===0||b.vat_enabled==='0'?0:1;
  const vatRate=vatEnabled?Number(b.vat_rate||0):0;
  const vat=taxable*vatRate/100;
  const grand=taxable+vat;
  return {subtotal,discountType,discountValue,discount,taxable,vatEnabled,vatRate,vat,grand};
}

async function savePaymentTerms(conn,companyId,quotationId,terms){
  await conn.query('DELETE FROM quotation_payment_terms WHERE quotation_id=? AND company_id=?',[quotationId,companyId]);
  let i=0;
  for(const t of terms){
    if(!t.milestone_name) continue;
    i++;
    await conn.query('INSERT INTO quotation_payment_terms(company_id,quotation_id,milestone_name,percentage,sort_order) VALUES(?,?,?,?,?)',[companyId,quotationId,t.milestone_name,t.percentage||0,i]);
  }
}

export async function listQuotations(req,res,next){try{
  const [r]=await pool.query(`SELECT q.*,c.name client_name,p.project_name FROM quotations q LEFT JOIN clients c ON c.id=q.client_id LEFT JOIN projects p ON p.id=q.project_id WHERE q.company_id=? AND q.is_deleted=0 ORDER BY q.id DESC`,[req.user.company_id]);
  res.json(r);
}catch(e){next(e)}}

export async function createQuotation(req,res,next){try{
  const b=req.body,items=Array.isArray(b.items)?b.items:[],terms=Array.isArray(b.payment_terms)?b.payment_terms:[],c=req.user.company_id;
  const fy=await fiscalYear(c); const no=await nextCode(c,fy.code);
  const t=computeTotals(items,b);
  const status=['Draft','Sent'].includes(b.status)?b.status:'Draft';
  const conn=await pool.getConnection();
  try{
    await conn.beginTransaction();
    const [r]=await conn.query(
      `INSERT INTO quotations(company_id,fiscal_year_id,quotation_no,quotation_date,client_id,project_id,title,reference_no,scope_of_work,site_location,contact_person,contact_phone,subtotal,discount,discount_type,discount_value,taxable_amount,vat_rate,vat_enabled,vat_amount,grand_total,status,valid_until,notes,terms_conditions,created_by)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [c,fy.id,no,b.quotation_date||new Date(),b.client_id||null,b.project_id||null,b.title||'Construction Quotation',b.reference_no||null,b.scope_of_work||null,b.site_location||null,b.contact_person||null,b.contact_phone||null,
       t.subtotal,t.discount,t.discountType,t.discountValue,t.taxable,t.vatRate,t.vatEnabled,t.vat,t.grand,status,b.valid_until||null,b.notes||null,b.terms_conditions||null,req.user.id]
    );
    for(const x of items) await conn.query(`INSERT INTO quotation_items(company_id,quotation_id,category,description,unit,quantity,rate,amount) VALUES(?,?,?,?,?,?,?,?)`,[c,r.insertId,x.category||null,x.description,x.unit||null,x.quantity||0,x.rate||0,Number(x.quantity||0)*Number(x.rate||0)]);
    await savePaymentTerms(conn,c,r.insertId,terms);
    await conn.commit();
    await audit(req,'CREATE','quotations',r.insertId,{quotation_no:no});
    res.status(201).json({id:r.insertId,quotation_no:no,grand_total:t.grand});
  }catch(e){await conn.rollback();throw e}finally{conn.release()}
}catch(e){next(e)}}

export async function updateQuotation(req,res,next){try{
  const b=req.body,items=Array.isArray(b.items)?b.items:[],terms=Array.isArray(b.payment_terms)?b.payment_terms:[],c=req.user.company_id;
  if(!items.length) return res.status(422).json({message:'At least one item is required'});
  const [[existing]]=await pool.query('SELECT client_id,title,quotation_date,valid_until,notes FROM quotations WHERE id=? AND company_id=? AND is_deleted=0',[req.params.id,c]);
  if(!existing) return res.status(404).json({message:'Quotation not found'});
  const t=computeTotals(items,b);
  const clientId=b.client_id!==undefined?(b.client_id||null):existing.client_id;
  const conn=await pool.getConnection();
  try{
    await conn.beginTransaction();
    await conn.query(
      `UPDATE quotations SET client_id=?,project_id=?,title=?,reference_no=?,scope_of_work=?,site_location=?,contact_person=?,contact_phone=?,quotation_date=?,
       subtotal=?,discount=?,discount_type=?,discount_value=?,taxable_amount=?,vat_rate=?,vat_enabled=?,vat_amount=?,grand_total=?,valid_until=?,notes=?,terms_conditions=?,
       status=COALESCE(?,status),updated_at=NOW() WHERE id=? AND company_id=?`,
      [clientId,b.project_id||null,b.title||existing.title||'Construction Quotation',b.reference_no||null,b.scope_of_work||null,b.site_location||null,b.contact_person||null,b.contact_phone||null,b.quotation_date||existing.quotation_date,
       t.subtotal,t.discount,t.discountType,t.discountValue,t.taxable,t.vatRate,t.vatEnabled,t.vat,t.grand,b.valid_until??existing.valid_until,b.notes??existing.notes,b.terms_conditions??null,
       b.status||null,req.params.id,c]
    );
    await conn.query('DELETE FROM quotation_items WHERE quotation_id=? AND company_id=?',[req.params.id,c]);
    for(const x of items) await conn.query(`INSERT INTO quotation_items(company_id,quotation_id,category,description,unit,quantity,rate,amount) VALUES(?,?,?,?,?,?,?,?)`,[c,req.params.id,x.category||null,x.description,x.unit||null,x.quantity||0,x.rate||0,Number(x.quantity||0)*Number(x.rate||0)]);
    await savePaymentTerms(conn,c,req.params.id,terms);
    await conn.commit();
    await audit(req,'UPDATE','quotations',req.params.id,{grand_total:t.grand});
    res.json({id:req.params.id,grand_total:t.grand});
  }catch(e){await conn.rollback();throw e}finally{conn.release()}
}catch(e){next(e)}}

export async function deleteQuotation(req,res,next){try{
  await pool.query(`UPDATE quotations SET is_deleted=1,deleted_at=NOW(),deleted_by=? WHERE id=? AND company_id=?`,[req.user.id,req.params.id,req.user.company_id]);
  await audit(req,'DELETE','quotations',req.params.id);
  res.json({message:'Deleted'});
}catch(e){next(e)}}

export async function approveQuotation(req,res,next){try{await pool.query(`UPDATE quotations SET status='Approved',approved_by=?,approved_at=NOW() WHERE id=? AND company_id=? AND is_deleted=0`,[req.user.id,req.params.id,req.user.company_id]);await audit(req,'APPROVE','quotations',req.params.id);const [[q]]=await pool.query('SELECT quotation_no FROM quotations WHERE id=?',[req.params.id]);await notify(req.user.company_id,{type:'quotation_approved',title:'Quotation Approved',message:`Quotation ${q?.quotation_no||''} was approved`,entityType:'quotations',entityId:req.params.id});res.json({message:'Quotation approved'})}catch(e){next(e)}}
export async function rejectQuotation(req,res,next){try{await pool.query(`UPDATE quotations SET status='Rejected' WHERE id=? AND company_id=? AND is_deleted=0`,[req.params.id,req.user.company_id]);await audit(req,'REJECT','quotations',req.params.id);const [[q]]=await pool.query('SELECT quotation_no FROM quotations WHERE id=?',[req.params.id]);await notify(req.user.company_id,{type:'quotation_rejected',title:'Quotation Rejected',message:`Quotation ${q?.quotation_no||''} was rejected`,entityType:'quotations',entityId:req.params.id});res.json({message:'Quotation rejected'})}catch(e){next(e)}}
export async function markSent(req,res,next){try{await pool.query(`UPDATE quotations SET status='Sent' WHERE id=? AND company_id=? AND is_deleted=0 AND status='Draft'`,[req.params.id,req.user.company_id]);await audit(req,'SEND','quotations',req.params.id);res.json({message:'Marked as sent'})}catch(e){next(e)}}

export async function getQuotation(req,res,next){try{
  const [[q]]=await pool.query(
    `SELECT q.*,c.name client_name,c.phone client_phone,c.address client_address,c.pan_vat_no client_pan_vat,p.project_name,p.location project_location,fy.code fiscal_year_code
     FROM quotations q LEFT JOIN clients c ON c.id=q.client_id LEFT JOIN projects p ON p.id=q.project_id LEFT JOIN fiscal_years fy ON fy.id=q.fiscal_year_id
     WHERE q.id=? AND q.company_id=? AND q.is_deleted=0`,[req.params.id,req.user.company_id]);
  if(!q) return res.status(404).json({message:'Quotation not found'});
  const [items]=await pool.query(`SELECT * FROM quotation_items WHERE quotation_id=? AND company_id=? ORDER BY sort_order,id`,[req.params.id,req.user.company_id]);
  const [paymentTerms]=await pool.query(`SELECT * FROM quotation_payment_terms WHERE quotation_id=? AND company_id=? ORDER BY sort_order,id`,[req.params.id,req.user.company_id]);
  const [attachments]=await pool.query(`SELECT * FROM quotation_attachments WHERE quotation_id=? AND company_id=? AND is_deleted=0 ORDER BY id DESC`,[req.params.id,req.user.company_id]);
  res.json({...q,items,payment_terms:paymentTerms,attachments});
}catch(e){next(e)}}

export async function duplicateQuotation(req,res,next){try{
  const c=req.user.company_id;
  const [[src]]=await pool.query('SELECT * FROM quotations WHERE id=? AND company_id=? AND is_deleted=0',[req.params.id,c]);
  if(!src) return res.status(404).json({message:'Quotation not found'});
  const [items]=await pool.query('SELECT * FROM quotation_items WHERE quotation_id=? AND company_id=?',[req.params.id,c]);
  const [terms]=await pool.query('SELECT * FROM quotation_payment_terms WHERE quotation_id=? AND company_id=?',[req.params.id,c]);
  const fy=await fiscalYear(c); const no=await nextCode(c,fy.code);
  const baseTitle=(src.title||'Quotation').replace(/(\s*\(Copy\))+\s*$/gi,'').trim();
  const conn=await pool.getConnection();
  try{
    await conn.beginTransaction();
    const [r]=await conn.query(
      `INSERT INTO quotations(company_id,fiscal_year_id,quotation_no,quotation_date,client_id,project_id,title,reference_no,scope_of_work,site_location,contact_person,contact_phone,subtotal,discount,discount_type,discount_value,taxable_amount,vat_rate,vat_enabled,vat_amount,grand_total,status,valid_until,notes,terms_conditions,created_by)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'Draft',?,?,?,?)`,
      [c,fy.id,no,new Date(),src.client_id,src.project_id,`${baseTitle} (Copy)`,src.reference_no,src.scope_of_work,src.site_location,src.contact_person,src.contact_phone,
       src.subtotal,src.discount,src.discount_type,src.discount_value,src.taxable_amount,src.vat_rate,src.vat_enabled,src.vat_amount,src.grand_total,src.valid_until,src.notes,src.terms_conditions,req.user.id]
    );
    for(const x of items) await conn.query(`INSERT INTO quotation_items(company_id,quotation_id,category,description,unit,quantity,rate,amount,sort_order) VALUES(?,?,?,?,?,?,?,?,?)`,[c,r.insertId,x.category,x.description,x.unit,x.quantity,x.rate,x.amount,x.sort_order]);
    for(const t of terms) await conn.query(`INSERT INTO quotation_payment_terms(company_id,quotation_id,milestone_name,percentage,sort_order) VALUES(?,?,?,?,?)`,[c,r.insertId,t.milestone_name,t.percentage,t.sort_order]);
    await conn.commit();
    await audit(req,'DUPLICATE','quotations',r.insertId,{from:req.params.id,quotation_no:no});
    res.status(201).json({id:r.insertId,quotation_no:no});
  }catch(e){await conn.rollback();throw e}finally{conn.release()}
}catch(e){next(e)}}

export async function convertToProject(req,res,next){try{
  const c=req.user.company_id;
  const [[q]]=await pool.query('SELECT * FROM quotations WHERE id=? AND company_id=? AND is_deleted=0',[req.params.id,c]);
  if(!q) return res.status(404).json({message:'Quotation not found'});
  if(q.status==='Converted') return res.status(422).json({message:'This quotation has already been converted'});
  const fy=await fiscalYear(c);
  const [[seq]]=await pool.query(`SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(project_code,'-',-1) AS UNSIGNED)),0)+1 n FROM projects WHERE company_id=?`,[c]);
  const project_code=buildCode('PRJ',fy.code.split('-')[0],seq.n,4);
  const [r]=await pool.query(
    `INSERT INTO projects(company_id,fiscal_year_id,project_code,project_name,client_id,location,description,contract_amount,status,created_by) VALUES(?,?,?,?,?,?,?,?,'Planning',?)`,
    [c,fy.id,project_code,q.title||`Project from ${q.quotation_no}`,q.client_id,q.site_location,q.scope_of_work,q.grand_total,req.user.id]
  );
  const stages=['Site Preparation','Foundation','Structure','Brick Work','Plumbing','Electrical','Plaster','Flooring','Painting','Finishing','Handover','Completed'];
  const weights=[4,10,25,10,8,8,10,10,6,5,3,1];
  for(let i=0;i<stages.length;i++) await pool.query(`INSERT INTO project_stages(company_id,project_id,stage_name,weight_percentage,sort_order,status,created_by) VALUES(?,?,?,?,?,'Not Started',?)`,[c,r.insertId,stages[i],weights[i],i+1,req.user.id]);
  await pool.query(`UPDATE quotations SET status='Converted',project_id=? WHERE id=? AND company_id=?`,[r.insertId,req.params.id,c]);
  await audit(req,'CONVERT_TO_PROJECT','quotations',req.params.id,{projectId:r.insertId});
  res.status(201).json({project_id:r.insertId,project_code});
}catch(e){next(e)}}

export async function listQuotationAttachments(req,res,next){try{
  const [rows]=await pool.query('SELECT * FROM quotation_attachments WHERE quotation_id=? AND company_id=? AND is_deleted=0 ORDER BY id DESC',[req.params.id,req.user.company_id]);
  res.json(rows);
}catch(e){next(e)}}

export async function addQuotationAttachment(req,res,next){try{
  if(!req.file) return res.status(422).json({message:'File is required'});
  const filePath=`/uploads/${req.file.filename}`;
  const [r]=await pool.query('INSERT INTO quotation_attachments(company_id,quotation_id,file_name,file_path,created_by) VALUES(?,?,?,?,?)',[req.user.company_id,req.params.id,req.file.originalname,filePath,req.user.id]);
  await audit(req,'CREATE','quotation_attachments',r.insertId,{quotationId:req.params.id});
  res.status(201).json({id:r.insertId,file_path:filePath,file_name:req.file.originalname});
}catch(e){next(e)}}

export async function deleteQuotationAttachment(req,res,next){try{
  await pool.query('UPDATE quotation_attachments SET is_deleted=1 WHERE id=? AND quotation_id=? AND company_id=?',[req.params.attId,req.params.id,req.user.company_id]);
  res.json({message:'Deleted'});
}catch(e){next(e)}}
