import { pool } from '../config/db.js';
import { audit } from '../services/audit.js';

export async function getSettings(req,res,next){try{const [[r]]=await pool.query(`SELECT c.name,c.pan_vat_no,c.phone,c.email,c.address,c.logo,s.* FROM companies c LEFT JOIN company_settings s ON s.company_id=c.id WHERE c.id=?`,[req.user.company_id]);res.json(r)}catch(e){next(e)}}
export async function updateSettings(req,res,next){try{const b=req.body,c=req.user.company_id;await pool.query(`UPDATE companies SET name=COALESCE(?,name),pan_vat_no=COALESCE(?,pan_vat_no),phone=COALESCE(?,phone),email=COALESCE(?,email),address=COALESCE(?,address) WHERE id=?`,[b.name,b.pan_vat_no,b.phone,b.email,b.address,c]);await pool.query(`UPDATE company_settings SET vat_enabled=COALESCE(?,vat_enabled),vat_rate=COALESCE(?,vat_rate),currency=COALESCE(?,currency),invoice_prefix=COALESCE(?,invoice_prefix),quotation_prefix=COALESCE(?,quotation_prefix),project_prefix=COALESCE(?,project_prefix),receipt_prefix=COALESCE(?,receipt_prefix),bank_name=COALESCE(?,bank_name),bank_account_name=COALESCE(?,bank_account_name),bank_account_no=COALESCE(?,bank_account_no),bank_branch=COALESCE(?,bank_branch),invoice_terms=COALESCE(?,invoice_terms),updated_at=NOW() WHERE company_id=?`,[b.vat_enabled,b.vat_rate,b.currency,b.invoice_prefix,b.quotation_prefix,b.project_prefix,b.receipt_prefix,b.bank_name,b.bank_account_name,b.bank_account_no,b.bank_branch,b.invoice_terms,c]);await audit(req,'UPDATE','settings',c,{});res.json({message:'Settings updated'})}catch(e){next(e)}}

export async function uploadLogo(req,res,next){try{
  if(!req.file) return res.status(422).json({message:'File is required'});
  const filePath=`/uploads/${req.file.filename}`;
  await pool.query('UPDATE companies SET logo=? WHERE id=?',[filePath,req.user.company_id]);
  await audit(req,'UPDATE','settings',req.user.company_id,{logo:filePath});
  res.json({logo:filePath});
}catch(e){next(e)}}

export async function uploadStamp(req,res,next){try{
  if(!req.file) return res.status(422).json({message:'File is required'});
  const filePath=`/uploads/${req.file.filename}`;
  await pool.query('UPDATE company_settings SET stamp_file=? WHERE company_id=?',[filePath,req.user.company_id]);
  await audit(req,'UPDATE','settings',req.user.company_id,{stamp_file:filePath});
  res.json({stamp_file:filePath});
}catch(e){next(e)}}

export async function uploadSignature(req,res,next){try{
  if(!req.file) return res.status(422).json({message:'File is required'});
  const filePath=`/uploads/${req.file.filename}`;
  await pool.query('UPDATE company_settings SET signature_file=? WHERE company_id=?',[filePath,req.user.company_id]);
  await audit(req,'UPDATE','settings',req.user.company_id,{signature_file:filePath});
  res.json({signature_file:filePath});
}catch(e){next(e)}}

export async function uploadQr(req,res,next){try{
  if(!req.file) return res.status(422).json({message:'File is required'});
  const filePath=`/uploads/${req.file.filename}`;
  await pool.query('UPDATE company_settings SET qr_code=? WHERE company_id=?',[filePath,req.user.company_id]);
  await audit(req,'UPDATE','settings',req.user.company_id,{qr_code:filePath});
  res.json({qr_code:filePath});
}catch(e){next(e)}}

export async function createFiscalYear(req,res,next){try{
  const b=req.body,c=req.user.company_id;
  if(!b.code) return res.status(422).json({message:'Fiscal year code is required'});
  const [r]=await pool.query('INSERT INTO fiscal_years(company_id,code,name,start_date,end_date) VALUES(?,?,?,?,?)',[c,b.code,b.name||null,b.start_date||null,b.end_date||null]);
  await audit(req,'CREATE','fiscal_years',r.insertId,{code:b.code});
  res.status(201).json({id:r.insertId});
}catch(e){ if(e.code==='ER_DUP_ENTRY') return res.status(409).json({message:'A fiscal year with this code already exists'}); next(e); }}

export async function setCurrentFiscalYear(req,res,next){try{
  const c=req.user.company_id;
  const conn=await pool.getConnection();
  try{
    await conn.beginTransaction();
    await conn.query('UPDATE fiscal_years SET is_current=0 WHERE company_id=?',[c]);
    await conn.query('UPDATE fiscal_years SET is_current=1 WHERE id=? AND company_id=?',[req.params.id,c]);
    await conn.commit();
  }catch(e){ await conn.rollback(); throw e; }finally{ conn.release(); }
  await audit(req,'SET_CURRENT','fiscal_years',req.params.id,{});
  res.json({message:'Current fiscal year updated'});
}catch(e){next(e)}}
