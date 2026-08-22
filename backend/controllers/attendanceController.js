import { pool } from '../config/db.js';
import { audit } from '../services/audit.js';
export async function listAttendance(req,res,next){try{
  const params=[req.user.company_id]; let where='a.company_id=? AND a.is_deleted=0';
  if(req.query.date){where+=' AND a.attendance_date=?';params.push(req.query.date);}
  const [r]=await pool.query(`SELECT a.*,e.name employee_name,e.designation,p.project_name FROM attendance a JOIN employees e ON e.id=a.employee_id LEFT JOIN projects p ON p.id=a.project_id WHERE ${where} ORDER BY a.attendance_date DESC,a.id DESC LIMIT 500`,params);
  res.json(r)
}catch(e){next(e)}}
export async function markAttendance(req,res,next){try{const b=req.body,c=req.user.company_id;const hours=Math.max(0,Number(b.regular_hours||0)),ot=Math.max(0,Number(b.overtime_hours||0)),wage=Number(b.daily_wage||0),half=b.status==='Half Day'?0.5:(['Present','Site Visit'].includes(b.status)?1:0),amount=wage*half + (wage/8)*ot;await pool.query(`INSERT INTO attendance(company_id,employee_id,project_id,attendance_date,status,check_in,check_out,regular_hours,overtime_hours,daily_wage,calculated_amount,remarks,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE project_id=VALUES(project_id),status=VALUES(status),check_in=VALUES(check_in),check_out=VALUES(check_out),regular_hours=VALUES(regular_hours),overtime_hours=VALUES(overtime_hours),daily_wage=VALUES(daily_wage),calculated_amount=VALUES(calculated_amount),remarks=VALUES(remarks),updated_at=NOW()`,[c,b.employee_id,b.project_id||null,b.attendance_date,b.status,b.check_in||null,b.check_out||null,hours,ot,wage,amount,b.remarks||null,req.user.id]);res.status(201).json({calculated_amount:amount})}catch(e){next(e)}}

export async function updateAttendance(req,res,next){try{
  const b=req.body,c=req.user.company_id;
  const hours=Math.max(0,Number(b.regular_hours||0)),ot=Math.max(0,Number(b.overtime_hours||0)),wage=Number(b.daily_wage||0);
  const half=b.status==='Half Day'?0.5:(['Present','Site Visit'].includes(b.status)?1:0);
  const amount=wage*half+(wage/8)*ot;
  await pool.query(`UPDATE attendance SET project_id=?,status=?,check_in=?,check_out=?,regular_hours=?,overtime_hours=?,daily_wage=?,calculated_amount=?,remarks=?,updated_at=NOW() WHERE id=? AND company_id=?`,
    [b.project_id||null,b.status,b.check_in||null,b.check_out||null,hours,ot,wage,amount,b.remarks||null,req.params.id,c]);
  await audit(req,'UPDATE','attendance',req.params.id);
  res.json({calculated_amount:amount});
}catch(e){next(e)}}

export async function deleteAttendance(req,res,next){try{
  await pool.query(`UPDATE attendance SET is_deleted=1 WHERE id=? AND company_id=?`,[req.params.id,req.user.company_id]);
  await audit(req,'DELETE','attendance',req.params.id);
  res.json({message:'Deleted'});
}catch(e){next(e)}}
