import { pool } from '../config/db.js';
import { audit } from '../services/audit.js';

async function adjustAdvanceRecovery(companyId,employeeId,delta){
  if(!delta) return;
  if(delta>0){
    let remaining=delta;
    const [advs]=await pool.query(`SELECT id,amount,recovered_amount FROM employee_advances WHERE company_id=? AND employee_id=? AND is_deleted=0 AND amount>recovered_amount ORDER BY advance_date ASC,id ASC`,[companyId,employeeId]);
    for(const adv of advs){
      if(remaining<=0)break;
      const bal=Number(adv.amount)-Number(adv.recovered_amount);
      const take=Math.min(bal,remaining);
      if(take<=0)continue;
      await pool.query(`UPDATE employee_advances SET recovered_amount=recovered_amount+? WHERE id=?`,[take,adv.id]);
      remaining-=take;
    }
  } else {
    let remaining=-delta;
    const [advs]=await pool.query(`SELECT id,recovered_amount FROM employee_advances WHERE company_id=? AND employee_id=? AND is_deleted=0 AND recovered_amount>0 ORDER BY advance_date DESC,id DESC`,[companyId,employeeId]);
    for(const adv of advs){
      if(remaining<=0)break;
      const give=Math.min(Number(adv.recovered_amount),remaining);
      if(give<=0)continue;
      await pool.query(`UPDATE employee_advances SET recovered_amount=recovered_amount-? WHERE id=?`,[give,adv.id]);
      remaining-=give;
    }
  }
}

export async function listSalaries(req,res,next){try{const [r]=await pool.query(`SELECT s.*,e.name employee_name,e.salary_type FROM salary_records s JOIN employees e ON e.id=s.employee_id WHERE s.company_id=? AND s.is_deleted=0 ORDER BY s.salary_month DESC,s.id DESC`,[req.user.company_id]);res.json(r)}catch(e){next(e)}}
export async function getSalary(req,res,next){try{
  const [[row]]=await pool.query(`SELECT s.*,e.name employee_name,e.employee_code,e.designation,e.salary_type,e.daily_wage
    FROM salary_records s JOIN employees e ON e.id=s.employee_id WHERE s.id=? AND s.company_id=? AND s.is_deleted=0`,[req.params.id,req.user.company_id]);
  if(!row) return res.status(404).json({message:'Salary record not found'});
  res.json(row);
}catch(e){next(e)}}
export async function processSalary(req,res,next){try{const b=req.body,c=req.user.company_id;const [[e]]=await pool.query(`SELECT * FROM employees WHERE id=? AND company_id=? AND is_deleted=0`,[b.employee_id,c]);if(!e)return res.status(404).json({message:'Employee not found'});const month=b.salary_month;if(!month)return res.status(422).json({message:'salary_month required, e.g. 2026-08'});const [[existing]]=await pool.query(`SELECT advance_deduction FROM salary_records WHERE company_id=? AND employee_id=? AND salary_month=? AND is_deleted=0`,[c,e.id,month]);const [att]=await pool.query(`SELECT status,calculated_amount,overtime_hours,daily_wage FROM attendance WHERE employee_id=? AND company_id=? AND DATE_FORMAT(attendance_date,'%Y-%m')=? AND is_deleted=0`,[e.id,c,month]);const attendanceDays=att.reduce((s,a)=>s+(a.status==='Half Day'?.5:(['Present','Site Visit'].includes(a.status)?1:0)),0);const dailyGross=att.reduce((s,a)=>s+Number(a.calculated_amount||0),0);const basic=e.salary_type==='Daily'?dailyGross:Number(e.basic_salary||0);const bonus=Number(b.bonus||0),allowance=Number(b.allowance||0),advance=Number(b.advance_deduction||0),deduction=Number(b.other_deduction||0),overtime=e.salary_type==='Daily'?0:Number(b.overtime_amount||0);const net=basic+overtime+bonus+allowance-advance-deduction;await pool.query(`INSERT INTO salary_records(company_id,employee_id,salary_month,basic_salary,attendance_days,overtime_amount,bonus,allowance,advance_deduction,other_deduction,net_salary,status,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,'Processed',?) ON DUPLICATE KEY UPDATE basic_salary=VALUES(basic_salary),attendance_days=VALUES(attendance_days),overtime_amount=VALUES(overtime_amount),bonus=VALUES(bonus),allowance=VALUES(allowance),advance_deduction=VALUES(advance_deduction),other_deduction=VALUES(other_deduction),net_salary=VALUES(net_salary),status='Processed'`,[c,e.id,month,basic,attendanceDays,overtime,bonus,allowance,advance,deduction,net,req.user.id]);
await adjustAdvanceRecovery(c,e.id,advance-Number(existing?.advance_deduction||0));
res.status(201).json({attendance_days:attendanceDays,net_salary:net})}catch(e){next(e)}}

export async function updateSalaryRecord(req,res,next){try{
  const b=req.body,c=req.user.company_id;
  const [[s]]=await pool.query(`SELECT sr.*,e.salary_type FROM salary_records sr JOIN employees e ON e.id=sr.employee_id WHERE sr.id=? AND sr.company_id=? AND sr.is_deleted=0`,[req.params.id,c]);
  if(!s) return res.status(404).json({message:'Salary record not found'});
  const bonus=b.bonus!==undefined?Number(b.bonus):Number(s.bonus);
  const allowance=b.allowance!==undefined?Number(b.allowance):Number(s.allowance);
  const advance=b.advance_deduction!==undefined?Number(b.advance_deduction):Number(s.advance_deduction);
  const deduction=b.other_deduction!==undefined?Number(b.other_deduction):Number(s.other_deduction);
  const overtime=s.salary_type==='Daily'?0:(b.overtime_amount!==undefined?Number(b.overtime_amount):Number(s.overtime_amount));
  const status=b.status||s.status;
  const net=Number(s.basic_salary)+overtime+bonus+allowance-advance-deduction;
  await pool.query(`UPDATE salary_records SET overtime_amount=?,bonus=?,allowance=?,advance_deduction=?,other_deduction=?,net_salary=?,status=? WHERE id=? AND company_id=?`,
    [overtime,bonus,allowance,advance,deduction,net,status,req.params.id,c]);
  await adjustAdvanceRecovery(c,s.employee_id,advance-Number(s.advance_deduction));
  await audit(req,'UPDATE','salary_records',req.params.id,{net_salary:net});
  res.json({net_salary:net,status});
}catch(e){next(e)}}

export async function deleteSalaryRecord(req,res,next){try{
  const c=req.user.company_id;
  const [[s]]=await pool.query('SELECT employee_id,advance_deduction FROM salary_records WHERE id=? AND company_id=? AND is_deleted=0',[req.params.id,c]);
  await pool.query(`UPDATE salary_records SET is_deleted=1 WHERE id=? AND company_id=?`,[req.params.id,c]);
  if(s) await adjustAdvanceRecovery(c,s.employee_id,-Number(s.advance_deduction||0));
  await audit(req,'DELETE','salary_records',req.params.id);
  res.json({message:'Deleted'});
}catch(e){next(e)}}
