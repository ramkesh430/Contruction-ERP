import { pool } from '../config/db.js';
import { audit } from '../services/audit.js';

const allowedTables = new Set(['clients','suppliers','materials','employees','expenses','equipment']);
const idField = 'id';

function safeTable(name){ if(!allowedTables.has(name)) throw Object.assign(new Error('Invalid resource'),{status:400}); return name; }

export const list = (table) => async (req,res,next) => { try {
  table=safeTable(table);
  const [rows]=await pool.query(`SELECT * FROM ${table} WHERE company_id=? AND is_deleted=0 ORDER BY id DESC LIMIT 500`,[req.user.company_id]);
  res.json(rows);
} catch(e){next(e);} };

export const create = (table, fields) => async (req,res,next) => { try {
  table=safeTable(table);
  const body=req.body || {}; const data={};
  for(const f of fields) if(body[f]!==undefined) data[f]=body[f];
  data.company_id=req.user.company_id; data.created_by=req.user.id;
  const keys=Object.keys(data); const values=Object.values(data);
  const [result]=await pool.query(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`,values);
  await audit(req,'CREATE',table,result.insertId,data);
  const [[row]]=await pool.query(`SELECT * FROM ${table} WHERE id=? AND company_id=?`,[result.insertId,req.user.company_id]);
  res.status(201).json(row);
} catch(e){next(e);} };

export const update = (table, fields) => async (req,res,next) => { try {
  table=safeTable(table); const body=req.body||{}; const sets=[]; const values=[];
  for(const f of fields) if(body[f]!==undefined){sets.push(`${f}=?`);values.push(body[f]);}
  if(!sets.length) return res.status(400).json({message:'No fields to update'});
  values.push(req.user.id,req.params.id,req.user.company_id);
  await pool.query(`UPDATE ${table} SET ${sets.join(',')},updated_by=?,updated_at=NOW() WHERE id=? AND company_id=? AND is_deleted=0`,values);
  await audit(req,'UPDATE',table,req.params.id,body);
  const [[row]]=await pool.query(`SELECT * FROM ${table} WHERE id=? AND company_id=?`,[req.params.id,req.user.company_id]);
  res.json(row);
} catch(e){next(e);} };

export const softDelete = (table) => async (req,res,next) => { try {
  table=safeTable(table);
  await pool.query(`UPDATE ${table} SET is_deleted=1,deleted_at=NOW(),deleted_by=? WHERE id=? AND company_id=? AND is_deleted=0`,[req.user.id,req.params.id,req.user.company_id]);
  await audit(req,'DELETE',table,req.params.id);
  res.json({message:'Deleted'});
} catch(e){next(e);} };
