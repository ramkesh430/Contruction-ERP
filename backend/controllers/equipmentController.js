import { pool } from '../config/db.js';
import { audit } from '../services/audit.js';

const FIELDS=['name','equipment_code','type','purchase_cost','current_value','status','notes'];

export async function listEquipment(req,res,next){ try{
  const c=req.user.company_id, q=req.query;
  const where=['eq.company_id=?','eq.is_deleted=0']; const params=[c];
  if(q.search){ where.push('(eq.name LIKE ? OR eq.equipment_code LIKE ?)'); params.push(`%${q.search}%`,`%${q.search}%`); }
  if(q.status){ where.push('eq.status=?'); params.push(q.status); }
  const [rows]=await pool.query(
    `SELECT eq.*,
       (SELECT COUNT(*) FROM equipment_assignments ea WHERE ea.equipment_id=eq.id AND ea.is_deleted=0) total_assignments,
       (SELECT COALESCE(SUM(em.cost),0) FROM equipment_maintenance em WHERE em.equipment_id=eq.id AND em.is_deleted=0) total_maintenance_cost,
       (SELECT COALESCE(SUM(er.rental_income),0) FROM equipment_rentals er WHERE er.equipment_id=eq.id AND er.is_deleted=0) total_rental_income
     FROM equipment eq WHERE ${where.join(' AND ')} ORDER BY eq.id DESC`,params);
  res.json(rows);
}catch(e){next(e);} }

export async function createEquipment(req,res,next){ try{
  const b=req.body,c=req.user.company_id; const data={};
  for(const f of FIELDS) if(b[f]!==undefined) data[f]=b[f];
  data.company_id=c; data.created_by=req.user.id;
  const keys=Object.keys(data); const values=Object.values(data);
  const [r]=await pool.query(`INSERT INTO equipment(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`,values);
  await audit(req,'CREATE','equipment',r.insertId,{name:b.name});
  const [[row]]=await pool.query('SELECT * FROM equipment WHERE id=? AND company_id=?',[r.insertId,c]);
  res.status(201).json(row);
}catch(e){next(e);} }

export async function updateEquipment(req,res,next){ try{
  const b=req.body,c=req.user.company_id; const sets=[],values=[];
  for(const f of FIELDS) if(b[f]!==undefined){ sets.push(`${f}=?`); values.push(b[f]===''?null:b[f]); }
  if(!sets.length) return res.status(400).json({message:'No fields to update'});
  values.push(req.user.id,req.params.id,c);
  await pool.query(`UPDATE equipment SET ${sets.join(',')},updated_by=?,updated_at=NOW() WHERE id=? AND company_id=? AND is_deleted=0`,values);
  await audit(req,'UPDATE','equipment',req.params.id,b);
  const [[row]]=await pool.query('SELECT * FROM equipment WHERE id=? AND company_id=?',[req.params.id,c]);
  if(!row) return res.status(404).json({message:'Equipment not found'});
  res.json(row);
}catch(e){next(e);} }

export async function deleteEquipment(req,res,next){ try{
  await pool.query(`UPDATE equipment SET is_deleted=1,deleted_at=NOW(),deleted_by=? WHERE id=? AND company_id=?`,[req.user.id,req.params.id,req.user.company_id]);
  await audit(req,'DELETE','equipment',req.params.id);
  res.json({message:'Deleted'});
}catch(e){next(e);} }

export async function getEquipmentDetail(req,res,next){ try{
  const c=req.user.company_id, eqid=req.params.id;
  const [[equipment]]=await pool.query('SELECT * FROM equipment WHERE id=? AND company_id=? AND is_deleted=0',[eqid,c]);
  if(!equipment) return res.status(404).json({message:'Equipment not found'});

  const [assignments]=await pool.query(`SELECT ea.*,p.project_name FROM equipment_assignments ea LEFT JOIN projects p ON p.id=ea.project_id WHERE ea.equipment_id=? AND ea.company_id=? AND ea.is_deleted=0 ORDER BY ea.assigned_date DESC`,[eqid,c]);
  const [maintenance]=await pool.query(`SELECT * FROM equipment_maintenance WHERE equipment_id=? AND company_id=? AND is_deleted=0 ORDER BY maintenance_date DESC`,[eqid,c]);
  const [rentals]=await pool.query(`SELECT * FROM equipment_rentals WHERE equipment_id=? AND company_id=? AND is_deleted=0 ORDER BY start_date DESC`,[eqid,c]);
  const [timeline]=await pool.query(`SELECT al.action,al.metadata,al.created_at,u.name user_name FROM audit_logs al LEFT JOIN users u ON u.id=al.user_id WHERE al.entity_type='equipment' AND al.entity_id=? AND al.company_id=? ORDER BY al.created_at DESC LIMIT 30`,[eqid,c]);

  const dayMs=86400000;
  const totalAssignedDays=assignments.reduce((s,a)=>{
    const start=new Date(a.assigned_date), end=a.returned_date?new Date(a.returned_date):new Date();
    return s+Math.max(0,Math.round((end-start)/dayMs));
  },0);
  const totalMaintenanceCost=maintenance.reduce((s,m)=>s+Number(m.cost||0),0);
  const totalRentalIncome=rentals.reduce((s,r)=>s+Number(r.rental_income||0),0);
  const totalRentalExpense=rentals.reduce((s,r)=>s+Number(r.rental_expense||0),0);
  const utilizationStats={
    totalAssignedDays,assignmentCount:assignments.length,
    totalMaintenanceCost,maintenanceCount:maintenance.length,
    totalRentalIncome,totalRentalExpense,netRentalProfit:totalRentalIncome-totalRentalExpense,rentalCount:rentals.length
  };

  res.json({equipment,assignments,maintenance,rentals,timeline,utilizationStats});
}catch(e){next(e);} }
