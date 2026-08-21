import { pool } from '../config/db.js';
import { audit } from '../services/audit.js';
import { getProjectFinance } from '../services/projectFinance.js';
import { buildCode } from '../utils/codes.js';

async function fiscalYear(companyId){
  const [[fy]]=await pool.query(`SELECT code FROM fiscal_years WHERE company_id=? AND is_current=1 LIMIT 1`,[companyId]);
  return fy?.code || '2083-84';
}

export async function listProjects(req,res,next){ try{
  const [rows]=await pool.query(`SELECT p.*,c.name client_name,u.name project_manager_name FROM projects p LEFT JOIN clients c ON c.id=p.client_id LEFT JOIN users u ON u.id=p.project_manager_id WHERE p.company_id=? AND p.is_deleted=0 ORDER BY p.id DESC`,[req.user.company_id]);
  res.json(rows);
}catch(e){next(e);} }

export async function createProject(req,res,next){ try{
  const c=req.user.company_id; const fy=await fiscalYear(c);
  const [[seq]]=await pool.query(`SELECT COUNT(*)+1 n FROM projects WHERE company_id=?`,[c]);
  const project_code=buildCode('PRJ',fy.split('-')[0],seq.n,4);
  const {project_name,client_id,location,description,start_date_ad,start_date_bs,end_date_ad,end_date_bs,contract_amount=0,estimated_cost=0,project_manager_id,status='Planning'}=req.body;
  if(!project_name) return res.status(422).json({message:'Project name required'});
  const [r]=await pool.query(`INSERT INTO projects(company_id,project_code,project_name,client_id,location,description,start_date_ad,start_date_bs,end_date_ad,end_date_bs,contract_amount,estimated_cost,project_manager_id,status,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,[c,project_code,project_name,client_id||null,location||null,description||null,start_date_ad||null,start_date_bs||null,end_date_ad||null,end_date_bs||null,contract_amount,estimated_cost,project_manager_id||null,status,req.user.id]);
  const stages=['Site Preparation','Foundation','Structure','Brick Work','Plumbing','Electrical','Plaster','Flooring','Painting','Finishing','Handover','Completed'];
  const weights=[4,10,25,10,8,8,10,10,6,5,3,1];
  for(let i=0;i<stages.length;i++) await pool.query(`INSERT INTO project_stages(company_id,project_id,stage_name,weight_percentage,sort_order,status,created_by) VALUES(?,?,?,?,?,'Not Started',?)`,[c,r.insertId,stages[i],weights[i],i+1,req.user.id]);
  await audit(req,'CREATE','projects',r.insertId,{project_code,project_name});
  const [[row]]=await pool.query('SELECT * FROM projects WHERE id=?',[r.insertId]); res.status(201).json(row);
}catch(e){next(e);} }

export async function getProject(req,res,next){ try{
  const [[project]]=await pool.query(`SELECT p.*,c.name client_name FROM projects p LEFT JOIN clients c ON c.id=p.client_id WHERE p.id=? AND p.company_id=? AND p.is_deleted=0`,[req.params.id,req.user.company_id]);
  if(!project) return res.status(404).json({message:'Project not found'});
  const [stages]=await pool.query(`SELECT * FROM project_stages WHERE project_id=? AND company_id=? AND is_deleted=0 ORDER BY sort_order`,[req.params.id,req.user.company_id]);
  const finance=await getProjectFinance(req.user.company_id,req.params.id);
  res.json({project,stages,finance});
}catch(e){next(e);} }

export async function updateStage(req,res,next){ try{
  const {progress_percentage,status,engineer_remarks,actual_end_date}=req.body;
  await pool.query(`UPDATE project_stages SET progress_percentage=COALESCE(?,progress_percentage),status=COALESCE(?,status),engineer_remarks=COALESCE(?,engineer_remarks),actual_end_date=COALESCE(?,actual_end_date),updated_at=NOW() WHERE id=? AND project_id=? AND company_id=?`,[progress_percentage,status,engineer_remarks,actual_end_date,req.params.stageId,req.params.id,req.user.company_id]);
  const [[calc]]=await pool.query(`SELECT COALESCE(SUM(weight_percentage*progress_percentage/100),0) pct FROM project_stages WHERE project_id=? AND company_id=? AND is_deleted=0`,[req.params.id,req.user.company_id]);
  await pool.query(`UPDATE projects SET progress_percentage=?,updated_at=NOW() WHERE id=? AND company_id=?`,[calc.pct,req.params.id,req.user.company_id]);
  await audit(req,'UPDATE_STAGE','projects',req.params.id,{stageId:req.params.stageId,progress_percentage,status});
  res.json({progress_percentage:calc.pct});
}catch(e){next(e);} }

export async function addDailyLog(req,res,next){ try{
  const b=req.body;
  const [r]=await pool.query(`INSERT INTO project_daily_logs(company_id,project_id,log_date,weather,today_work,worker_count,materials_used,equipment_used,work_progress,problems_delays,tomorrow_plan,engineer_remarks,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`,[req.user.company_id,req.params.id,b.log_date||new Date(),b.weather||null,b.today_work||null,b.worker_count||0,b.materials_used||null,b.equipment_used||null,b.work_progress||0,b.problems_delays||null,b.tomorrow_plan||null,b.engineer_remarks||null,req.user.id]);
  await audit(req,'CREATE','project_daily_logs',r.insertId,{projectId:req.params.id}); res.status(201).json({id:r.insertId});
}catch(e){next(e);} }
