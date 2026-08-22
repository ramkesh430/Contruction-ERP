import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';
import { audit } from '../services/audit.js';
export async function listUsers(req,res,next){try{const [r]=await pool.query(`SELECT u.id,u.name,u.email,u.phone,u.is_active,u.created_at,r.name role_name,r.id role_id FROM users u JOIN roles r ON r.id=u.role_id WHERE u.company_id=? AND u.is_deleted=0 ORDER BY u.id DESC`,[req.user.company_id]);res.json(r)}catch(e){next(e)}}
export async function createUser(req,res,next){try{const b=req.body;if(!b.name||!b.email||!b.password||!b.role_id)return res.status(422).json({message:'Name, email, password and role required'});const hash=await bcrypt.hash(b.password,12);const [r]=await pool.query(`INSERT INTO users(company_id,role_id,name,email,phone,password_hash,is_active) VALUES(?,?,?,?,?,?,1)`,[req.user.company_id,b.role_id,b.name,b.email,b.phone||null,hash]);await audit(req,'CREATE','users',r.insertId,{email:b.email});res.status(201).json({id:r.insertId})}catch(e){next(e)}}
export async function updateUser(req,res,next){try{
  const b=req.body,c=req.user.company_id;
  const sets=[],values=[];
  if(b.name!==undefined){sets.push('name=?');values.push(b.name);}
  if(b.phone!==undefined){sets.push('phone=?');values.push(b.phone);}
  if(b.role_id!==undefined){sets.push('role_id=?');values.push(b.role_id);}
  if(b.is_active!==undefined){sets.push('is_active=?');values.push(b.is_active?1:0);}
  if(b.password){sets.push('password_hash=?');values.push(await bcrypt.hash(b.password,12));}
  if(!sets.length)return res.status(400).json({message:'No fields to update'});
  values.push(req.params.id,c);
  await pool.query(`UPDATE users SET ${sets.join(',')},updated_at=NOW() WHERE id=? AND company_id=? AND is_deleted=0`,values);
  await audit(req,'UPDATE','users',req.params.id);
  res.json({message:'Updated'});
}catch(e){next(e)}}
export async function deleteUser(req,res,next){try{
  if(Number(req.params.id)===req.user.id) return res.status(400).json({message:'You cannot delete your own account'});
  await pool.query(`UPDATE users SET is_deleted=1,deleted_at=NOW(),deleted_by=? WHERE id=? AND company_id=?`,[req.user.id,req.params.id,req.user.company_id]);
  await audit(req,'DELETE','users',req.params.id);
  res.json({message:'Deleted'});
}catch(e){next(e)}}
export async function listRoles(req,res,next){try{const [r]=await pool.query(`SELECT * FROM roles WHERE company_id=? AND is_deleted=0 ORDER BY name`,[req.user.company_id]);res.json(r)}catch(e){next(e)}}
export async function createRole(req,res,next){try{
  const b=req.body;if(!b.name)return res.status(422).json({message:'Role name required'});
  const [r]=await pool.query(`INSERT INTO roles(company_id,name,description) VALUES(?,?,?)`,[req.user.company_id,b.name,b.description||null]);
  await audit(req,'CREATE','roles',r.insertId,{name:b.name});
  res.status(201).json({id:r.insertId});
}catch(e){next(e)}}
export async function updateRole(req,res,next){try{
  const b=req.body;
  await pool.query(`UPDATE roles SET name=COALESCE(?,name),description=? WHERE id=? AND company_id=? AND is_deleted=0`,[b.name||null,b.description??null,req.params.id,req.user.company_id]);
  await audit(req,'UPDATE','roles',req.params.id);
  res.json({message:'Updated'});
}catch(e){next(e)}}
export async function deleteRole(req,res,next){try{
  const [[inUse]]=await pool.query('SELECT COUNT(*) n FROM users WHERE role_id=? AND is_deleted=0',[req.params.id]);
  if(inUse.n>0) return res.status(422).json({message:'Cannot delete a role that is still assigned to users'});
  await pool.query(`UPDATE roles SET is_deleted=1 WHERE id=? AND company_id=?`,[req.params.id,req.user.company_id]);
  await audit(req,'DELETE','roles',req.params.id);
  res.json({message:'Deleted'});
}catch(e){next(e)}}
export async function listPermissions(req,res,next){try{const [r]=await pool.query(`SELECT p.*,EXISTS(SELECT 1 FROM role_permissions rp WHERE rp.permission_id=p.id AND rp.role_id=?) assigned FROM permissions p ORDER BY p.code`,[req.query.role_id||0]);res.json(r)}catch(e){next(e)}}
export async function setRolePermissions(req,res,next){try{const roleId=req.params.id,ids=Array.isArray(req.body.permission_ids)?req.body.permission_ids:[];const [[role]]=await pool.query('SELECT id FROM roles WHERE id=? AND company_id=?',[roleId,req.user.company_id]);if(!role)return res.status(404).json({message:'Role not found'});const conn=await pool.getConnection();try{await conn.beginTransaction();await conn.query('DELETE FROM role_permissions WHERE role_id=?',[roleId]);for(const id of ids)await conn.query('INSERT INTO role_permissions(role_id,permission_id) VALUES(?,?)',[roleId,id]);await conn.commit();await audit(req,'UPDATE_PERMISSIONS','roles',roleId,{count:ids.length});res.json({message:'Permissions updated'})}catch(e){await conn.rollback();throw e}finally{conn.release()}}catch(e){next(e)}}

export async function listAuditLogs(req,res,next){try{
  const c=req.user.company_id, q=req.query;
  const where=['al.company_id=?']; const params=[c];
  if(q.user_id){ where.push('al.user_id=?'); params.push(q.user_id); }
  if(q.entity_type){ where.push('al.entity_type=?'); params.push(q.entity_type); }
  if(q.from){ where.push('al.created_at>=?'); params.push(q.from+' 00:00:00'); }
  if(q.to){ where.push('al.created_at<=?'); params.push(q.to+' 23:59:59'); }
  const [rows]=await pool.query(
    `SELECT al.id,al.action,al.entity_type,al.entity_id,al.metadata,al.created_at,u.name user_name,u.email user_email
     FROM audit_logs al LEFT JOIN users u ON u.id=al.user_id
     WHERE ${where.join(' AND ')} ORDER BY al.created_at DESC LIMIT 100`,params);
  const [entityTypes]=await pool.query('SELECT DISTINCT entity_type FROM audit_logs WHERE company_id=? AND entity_type IS NOT NULL ORDER BY entity_type',[c]);
  res.json({rows,entityTypes:entityTypes.map(e=>e.entity_type)});
}catch(e){next(e)}}
