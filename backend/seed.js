import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool } from './config/db.js';

const permissions=['projects.view','projects.create','projects.edit','projects.delete','clients.view','clients.create','clients.edit','quotation.view','quotation.create','quotation.approve','expenses.view','expenses.create','expenses.approve','invoice.view','invoice.create','invoice.approve','payments.view','payments.create','attendance.manage','salary.view','salary.process','reports.view','users.manage','settings.manage',
  // Modules that previously had no permission codes at all, so their routes
  // could not be gated by role — added so every module in the sidebar has
  // real, assignable RBAC coverage, same view/manage granularity as the
  // areas above that only ever needed one or two codes.
  'suppliers.view','suppliers.manage','employees.view','employees.manage','equipment.view','equipment.manage','materials.view','materials.manage','purchases.view','purchases.manage','advances.view','advances.manage'];
async function run(){
  await pool.query(`INSERT IGNORE INTO companies(id,name,email,phone,address,pan_vat_no) VALUES(1,'Next Level Construction Pvt. Ltd.','admin@construction.local','9800000000','Bhairahawa, Nepal','')`);
  await pool.query(`INSERT IGNORE INTO company_settings(company_id,vat_enabled,vat_rate,currency,invoice_prefix,quotation_prefix,project_prefix) VALUES(1,1,13,'NPR','INV','QT','PRJ')`);
  await pool.query(`INSERT IGNORE INTO fiscal_years(id,company_id,code,name,start_date,end_date,is_current) VALUES(1,1,'2083-84','FY 2083/84','2026-07-17','2027-07-16',1)`);
  const roles=['Super Admin','Admin','Accountant','Project Manager','Engineer','Site Supervisor','Store Keeper','HR','Staff'];
  for(const name of roles) await pool.query('INSERT IGNORE INTO roles(company_id,name,description) VALUES(1,?,?)',[name,`${name} role`]);
  for(const code of permissions) await pool.query('INSERT IGNORE INTO permissions(code,name) VALUES(?,?)',[code,code]);
  const [[role]]=await pool.query(`SELECT id FROM roles WHERE company_id=1 AND name='Super Admin' LIMIT 1`);
  const [perms]=await pool.query('SELECT id FROM permissions');
  for(const p of perms) await pool.query('INSERT IGNORE INTO role_permissions(role_id,permission_id) VALUES(?,?)',[role.id,p.id]);
  const hash=await bcrypt.hash('Admin@123',12);
  await pool.query(`INSERT INTO users(company_id,role_id,name,email,password_hash,is_active) VALUES(1,?,'Admin','admin@construction.local',?,1) ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash),role_id=VALUES(role_id),is_active=1`,[role.id,hash]);
  console.log('Seed complete. Login: admin@construction.local / Admin@123'); await pool.end();
}
run().catch(async e=>{console.error(e);await pool.end();process.exit(1)});
