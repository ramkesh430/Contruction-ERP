import { pool } from '../config/db.js';
import { audit } from '../services/audit.js';
import { notify } from '../services/notify.js';
import { getProjectFinance } from '../services/projectFinance.js';
import { buildCode } from '../utils/codes.js';

async function fiscalYear(companyId){
  const [[fy]]=await pool.query(`SELECT id,code FROM fiscal_years WHERE company_id=? AND is_current=1 LIMIT 1`,[companyId]);
  return fy||{id:null,code:'2083-84'};
}

async function savePaymentTerms(conn,companyId,projectId,terms){
  await conn.query('DELETE FROM project_payment_terms WHERE project_id=? AND company_id=?',[projectId,companyId]);
  let i=0;
  for(const t of terms||[]){ if(!t.milestone_name) continue; i++;
    await conn.query('INSERT INTO project_payment_terms(company_id,project_id,milestone_name,percentage,sort_order) VALUES(?,?,?,?,?)',[companyId,projectId,t.milestone_name,t.percentage||0,i]);
  }
}

export async function listProjects(req,res,next){ try{
  const c=req.user.company_id, q=req.query;
  const where=['p.company_id=?','p.is_deleted=0']; const params=[c];
  where.push(q.archived==='1'?'p.is_archived=1':'p.is_archived=0');
  if(q.search){ where.push('(p.project_name LIKE ? OR p.project_code LIKE ?)'); params.push(`%${q.search}%`,`%${q.search}%`); }
  if(q.client_id){ where.push('p.client_id=?'); params.push(q.client_id); }
  if(q.status){ where.push('p.status=?'); params.push(q.status); }
  if(q.location){ where.push('p.location LIKE ?'); params.push(`%${q.location}%`); }
  if(q.project_manager_id){ where.push('p.project_manager_id=?'); params.push(q.project_manager_id); }
  if(q.from){ where.push('p.start_date_ad>=?'); params.push(q.from); }
  if(q.to){ where.push('p.start_date_ad<=?'); params.push(q.to); }
  const [rows]=await pool.query(
    `SELECT p.*,c.name client_name,pm.name project_manager_name,eng.name engineer_name,sup.name site_supervisor_name
     FROM projects p LEFT JOIN clients c ON c.id=p.client_id LEFT JOIN users pm ON pm.id=p.project_manager_id
     LEFT JOIN users eng ON eng.id=p.engineer_id LEFT JOIN users sup ON sup.id=p.site_supervisor_id
     WHERE ${where.join(' AND ')} ORDER BY p.id DESC`, params);
  const withFinance=[];
  for(const row of rows){ const fin=await getProjectFinance(c,row.id); withFinance.push({...row,actualCost:fin?.totalExpense||0,profit:fin?.projectedProfit||0}); }
  res.json(withFinance);
}catch(e){next(e);} }

export async function createProject(req,res,next){ try{
  const c=req.user.company_id; const fy=await fiscalYear(c); const b=req.body;
  const [[seq]]=await pool.query(`SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(project_code,'-',-1) AS UNSIGNED)),0)+1 n FROM projects WHERE company_id=?`,[c]);
  const project_code=buildCode('PRJ',fy.code.split('-')[0],seq.n,4);
  const {project_name,project_type,client_id,location,site_address,description,start_date_ad,start_date_bs,end_date_ad,end_date_bs,contract_amount=0,estimated_cost=0,retention_percentage=0,warranty_period,client_contact_person,client_contact_phone,project_manager_id,engineer_id,site_supervisor_id,status='Planning'}=b;
  if(!project_name) return res.status(422).json({message:'Project name required'});
  const conn=await pool.getConnection();
  try{
    await conn.beginTransaction();
    const [r]=await conn.query(`INSERT INTO projects(company_id,fiscal_year_id,project_code,project_name,project_type,client_id,location,site_address,description,start_date_ad,start_date_bs,end_date_ad,end_date_bs,contract_amount,estimated_cost,retention_percentage,warranty_period,client_contact_person,client_contact_phone,project_manager_id,engineer_id,site_supervisor_id,status,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [c,fy.id,project_code,project_name,project_type||null,client_id||null,location||null,site_address||null,description||null,start_date_ad||null,start_date_bs||null,end_date_ad||null,end_date_bs||null,contract_amount,estimated_cost,retention_percentage,warranty_period||null,client_contact_person||null,client_contact_phone||null,project_manager_id||null,engineer_id||null,site_supervisor_id||null,status,req.user.id]);
    const stages=['Site Preparation','Foundation','Structure','Brick Work','Plumbing','Electrical','Plaster','Flooring','Painting','Finishing','Handover','Completed'];
    const weights=[4,10,25,10,8,8,10,10,6,5,3,1];
    for(let i=0;i<stages.length;i++) await conn.query(`INSERT INTO project_stages(company_id,project_id,stage_name,weight_percentage,sort_order,status,created_by) VALUES(?,?,?,?,?,'Not Started',?)`,[c,r.insertId,stages[i],weights[i],i+1,req.user.id]);
    await savePaymentTerms(conn,c,r.insertId,b.payment_terms);
    await conn.commit();
    await audit(req,'CREATE','projects',r.insertId,{project_code,project_name});
    const [[row]]=await pool.query('SELECT * FROM projects WHERE id=?',[r.insertId]); res.status(201).json(row);
  }catch(e){await conn.rollback();throw e}finally{conn.release()}
}catch(e){next(e);} }

export async function updateProject(req,res,next){ try{
  const b=req.body;
  const fields={project_name:b.project_name,project_type:b.project_type,client_id:b.client_id,location:b.location,site_address:b.site_address,description:b.description,
    start_date_ad:b.start_date_ad,start_date_bs:b.start_date_bs,end_date_ad:b.end_date_ad,end_date_bs:b.end_date_bs,actual_end_date_ad:b.actual_end_date_ad,
    contract_amount:b.contract_amount,estimated_cost:b.estimated_cost,retention_percentage:b.retention_percentage,warranty_period:b.warranty_period,
    client_contact_person:b.client_contact_person,client_contact_phone:b.client_contact_phone,
    project_manager_id:b.project_manager_id,engineer_id:b.engineer_id,site_supervisor_id:b.site_supervisor_id,status:b.status};
  const sets=[],values=[];
  for(const [k,v] of Object.entries(fields)) if(v!==undefined){sets.push(`${k}=?`);values.push(v===''?null:v);}
  const conn=await pool.getConnection();
  try{
    await conn.beginTransaction();
    if(sets.length){ values.push(req.user.id,req.params.id,req.user.company_id); await conn.query(`UPDATE projects SET ${sets.join(',')},updated_by=?,updated_at=NOW() WHERE id=? AND company_id=? AND is_deleted=0`,values); }
    if(b.payment_terms!==undefined) await savePaymentTerms(conn,req.user.company_id,req.params.id,b.payment_terms);
    await conn.commit();
  }catch(e){await conn.rollback();throw e}finally{conn.release()}
  await audit(req,'UPDATE','projects',req.params.id,fields);
  const [[row]]=await pool.query('SELECT * FROM projects WHERE id=? AND company_id=?',[req.params.id,req.user.company_id]);
  if(!row) return res.status(404).json({message:'Project not found'});
  res.json(row);
}catch(e){next(e);} }

export async function deleteProject(req,res,next){ try{
  await pool.query(`UPDATE projects SET is_deleted=1,deleted_at=NOW(),deleted_by=? WHERE id=? AND company_id=?`,[req.user.id,req.params.id,req.user.company_id]);
  await audit(req,'DELETE','projects',req.params.id);
  res.json({message:'Deleted'});
}catch(e){next(e);} }

export async function archiveProject(req,res,next){ try{
  await pool.query(`UPDATE projects SET is_archived=1 WHERE id=? AND company_id=?`,[req.params.id,req.user.company_id]);
  await audit(req,'ARCHIVE','projects',req.params.id);
  res.json({message:'Archived'});
}catch(e){next(e);} }

export async function unarchiveProject(req,res,next){ try{
  await pool.query(`UPDATE projects SET is_archived=0 WHERE id=? AND company_id=?`,[req.params.id,req.user.company_id]);
  await audit(req,'UNARCHIVE','projects',req.params.id);
  res.json({message:'Restored'});
}catch(e){next(e);} }

export async function getProject(req,res,next){ try{
  const c=req.user.company_id, pid=req.params.id;
  const [[project]]=await pool.query(
    `SELECT p.*,c.name client_name,c.phone client_phone,c.pan_vat_no client_pan_vat,pm.name project_manager_name,eng.name engineer_name,sup.name site_supervisor_name
     FROM projects p LEFT JOIN clients c ON c.id=p.client_id LEFT JOIN users pm ON pm.id=p.project_manager_id
     LEFT JOIN users eng ON eng.id=p.engineer_id LEFT JOIN users sup ON sup.id=p.site_supervisor_id
     WHERE p.id=? AND p.company_id=? AND p.is_deleted=0`,[pid,c]);
  if(!project) return res.status(404).json({message:'Project not found'});
  const [stages]=await pool.query(`SELECT * FROM project_stages WHERE project_id=? AND company_id=? AND is_deleted=0 ORDER BY sort_order`,[pid,c]);
  const finance=await getProjectFinance(c,pid);

  const [materialsUsed]=await pool.query(`SELECT m.name,m.unit,SUM(mii.quantity) qty,SUM(mii.quantity*mii.unit_cost) amount FROM material_issue_items mii JOIN material_issues mi ON mi.id=mii.material_issue_id JOIN materials m ON m.id=mii.material_id WHERE mi.project_id=? AND mi.company_id=? AND mi.is_deleted=0 GROUP BY m.id ORDER BY amount DESC`,[pid,c]);
  const [attendance]=await pool.query(`SELECT a.attendance_date,e.name employee_name,a.status,a.calculated_amount FROM attendance a JOIN employees e ON e.id=a.employee_id WHERE a.project_id=? AND a.company_id=? AND a.is_deleted=0 ORDER BY a.attendance_date DESC LIMIT 20`,[pid,c]);
  const [expenses]=await pool.query(`SELECT id,expense_date,expense_type,description,amount FROM expenses WHERE project_id=? AND company_id=? AND is_deleted=0 ORDER BY expense_date DESC`,[pid,c]);
  const [invoices]=await pool.query(`SELECT id,invoice_no,invoice_date,grand_total,paid_amount,due_amount,status FROM invoices WHERE project_id=? AND company_id=? AND is_deleted=0 ORDER BY id DESC`,[pid,c]);
  const [payments]=await pool.query(`SELECT id,receipt_no,payment_date,amount,payment_method FROM payments WHERE project_id=? AND company_id=? AND is_deleted=0 ORDER BY id DESC`,[pid,c]);
  const [equipment]=await pool.query(`SELECT ea.*,e.name equipment_name FROM equipment_assignments ea JOIN equipment e ON e.id=ea.equipment_id WHERE ea.project_id=? AND ea.company_id=? AND ea.is_deleted=0 ORDER BY ea.id DESC`,[pid,c]);
  const [variations]=await pool.query(`SELECT * FROM project_variations WHERE project_id=? AND company_id=? AND is_deleted=0 ORDER BY id DESC`,[pid,c]);
  const [paymentTerms]=await pool.query(`SELECT * FROM project_payment_terms WHERE project_id=? AND company_id=? ORDER BY sort_order`,[pid,c]);
  const [[quotationRef]]=await pool.query(`SELECT id,quotation_no,grand_total,quotation_date FROM quotations WHERE project_id=? AND company_id=? AND is_deleted=0 LIMIT 1`,[pid,c]);
  let quotationItems=[];
  if(quotationRef) [quotationItems]=await pool.query(`SELECT * FROM quotation_items WHERE quotation_id=? AND company_id=? ORDER BY sort_order,id`,[quotationRef.id,c]);
  const [timeline]=await pool.query(`SELECT al.action,al.metadata,al.created_at,u.name user_name FROM audit_logs al LEFT JOIN users u ON u.id=al.user_id WHERE al.entity_type='projects' AND al.entity_id=? AND al.company_id=? ORDER BY al.created_at DESC LIMIT 30`,[pid,c]);
  const variationTotal=variations.filter(v=>v.status==='Approved').reduce((s,v)=>s+(v.variation_type==='Deduction'?-Number(v.amount):Number(v.amount)),0);

  res.json({project,stages,finance,materialsUsed,attendance,expenses,invoices,payments,equipment,variations,variationTotal,paymentTerms,quotationRef:quotationRef?{...quotationRef,items:quotationItems}:null,timeline});
}catch(e){next(e);} }

export async function updateStage(req,res,next){ try{
  const {progress_percentage,status,engineer_remarks,actual_end_date}=req.body;
  await pool.query(`UPDATE project_stages SET progress_percentage=COALESCE(?,progress_percentage),status=COALESCE(?,status),engineer_remarks=COALESCE(?,engineer_remarks),actual_end_date=COALESCE(?,actual_end_date),updated_at=NOW() WHERE id=? AND project_id=? AND company_id=?`,[progress_percentage,status,engineer_remarks,actual_end_date,req.params.stageId,req.params.id,req.user.company_id]);
  const [[calc]]=await pool.query(`SELECT COALESCE(SUM(weight_percentage*progress_percentage/100),0) pct FROM project_stages WHERE project_id=? AND company_id=? AND is_deleted=0`,[req.params.id,req.user.company_id]);
  await pool.query(`UPDATE projects SET progress_percentage=?,updated_at=NOW() WHERE id=? AND company_id=?`,[calc.pct,req.params.id,req.user.company_id]);
  await audit(req,'UPDATE_STAGE','projects',req.params.id,{stageId:req.params.stageId,progress_percentage,status});
  if(status==='Completed'){
    const [[proj]]=await pool.query('SELECT project_name FROM projects WHERE id=?',[req.params.id]);
    const [[stage]]=await pool.query('SELECT stage_name FROM project_stages WHERE id=?',[req.params.stageId]);
    await notify(req.user.company_id,{type:'stage_completed',title:'Project Stage Completed',message:`${stage?.stage_name||'Stage'} completed on ${proj?.project_name||'project'}`,entityType:'projects',entityId:req.params.id});
  }
  res.json({progress_percentage:calc.pct});
}catch(e){next(e);} }

export async function addDailyLog(req,res,next){ try{
  const b=req.body;
  const [r]=await pool.query(`INSERT INTO project_daily_logs(company_id,project_id,log_date,weather,today_work,worker_count,materials_used,equipment_used,work_progress,problems_delays,tomorrow_plan,engineer_remarks,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`,[req.user.company_id,req.params.id,b.log_date||new Date(),b.weather||null,b.today_work||null,b.worker_count||0,b.materials_used||null,b.equipment_used||null,b.work_progress||0,b.problems_delays||null,b.tomorrow_plan||null,b.engineer_remarks||null,req.user.id]);
  await audit(req,'CREATE','project_daily_logs',r.insertId,{projectId:req.params.id}); res.status(201).json({id:r.insertId});
}catch(e){next(e);} }

export async function listDailyLogs(req,res,next){ try{
  const [rows]=await pool.query(`SELECT dl.*,u.name created_by_name FROM project_daily_logs dl LEFT JOIN users u ON u.id=dl.created_by WHERE dl.project_id=? AND dl.company_id=? AND dl.is_deleted=0 ORDER BY dl.log_date DESC,dl.id DESC`,[req.params.id,req.user.company_id]);
  res.json(rows);
}catch(e){next(e);} }

export async function updateDailyLog(req,res,next){ try{
  const b=req.body;
  await pool.query(`UPDATE project_daily_logs SET log_date=COALESCE(?,log_date),weather=?,today_work=?,worker_count=?,materials_used=?,equipment_used=?,work_progress=?,problems_delays=?,tomorrow_plan=?,engineer_remarks=?,updated_at=NOW() WHERE id=? AND project_id=? AND company_id=?`,
    [b.log_date||null,b.weather||null,b.today_work||null,b.worker_count||0,b.materials_used||null,b.equipment_used||null,b.work_progress||0,b.problems_delays||null,b.tomorrow_plan||null,b.engineer_remarks||null,req.params.logId,req.params.id,req.user.company_id]);
  await audit(req,'UPDATE','project_daily_logs',req.params.logId);
  res.json({message:'Updated'});
}catch(e){next(e);} }

export async function deleteDailyLog(req,res,next){ try{
  await pool.query(`UPDATE project_daily_logs SET is_deleted=1 WHERE id=? AND project_id=? AND company_id=?`,[req.params.logId,req.params.id,req.user.company_id]);
  await audit(req,'DELETE','project_daily_logs',req.params.logId);
  res.json({message:'Deleted'});
}catch(e){next(e);} }

export async function listDocuments(req,res,next){ try{
  const [rows]=await pool.query(`SELECT * FROM project_documents WHERE project_id=? AND company_id=? AND is_deleted=0 ORDER BY id DESC`,[req.params.id,req.user.company_id]);
  res.json(rows);
}catch(e){next(e);} }

export async function addDocument(req,res,next){ try{
  if(!req.file) return res.status(422).json({message:'File is required'});
  const filePath=`/uploads/${req.file.filename}`;
  const [r]=await pool.query(`INSERT INTO project_documents(company_id,project_id,document_type,title,file_path,created_by) VALUES(?,?,?,?,?,?)`,[req.user.company_id,req.params.id,req.body.document_type||'Other',req.body.title||req.file.originalname,filePath,req.user.id]);
  await audit(req,'CREATE','project_documents',r.insertId,{projectId:req.params.id});
  res.status(201).json({id:r.insertId,file_path:filePath});
}catch(e){next(e);} }

export async function deleteDocument(req,res,next){ try{
  await pool.query(`UPDATE project_documents SET is_deleted=1 WHERE id=? AND project_id=? AND company_id=?`,[req.params.docId,req.params.id,req.user.company_id]);
  res.json({message:'Deleted'});
}catch(e){next(e);} }

export async function listPhotos(req,res,next){ try{
  const [rows]=await pool.query(`SELECT * FROM project_photos WHERE project_id=? AND company_id=? AND is_deleted=0 ORDER BY id DESC`,[req.params.id,req.user.company_id]);
  res.json(rows);
}catch(e){next(e);} }

export async function addPhoto(req,res,next){ try{
  if(!req.file) return res.status(422).json({message:'File is required'});
  const filePath=`/uploads/${req.file.filename}`;
  const [r]=await pool.query(`INSERT INTO project_photos(company_id,project_id,photo_type,file_path,caption,photo_date,created_by) VALUES(?,?,?,?,?,?,?)`,[req.user.company_id,req.params.id,req.body.photo_type||'Progress',filePath,req.body.caption||null,req.body.photo_date||new Date(),req.user.id]);
  await audit(req,'CREATE','project_photos',r.insertId,{projectId:req.params.id});
  res.status(201).json({id:r.insertId,file_path:filePath});
}catch(e){next(e);} }

export async function deletePhoto(req,res,next){ try{
  await pool.query(`UPDATE project_photos SET is_deleted=1 WHERE id=? AND project_id=? AND company_id=?`,[req.params.photoId,req.params.id,req.user.company_id]);
  res.json({message:'Deleted'});
}catch(e){next(e);} }

export async function listVariations(req,res,next){ try{
  const [rows]=await pool.query(`SELECT * FROM project_variations WHERE project_id=? AND company_id=? AND is_deleted=0 ORDER BY id DESC`,[req.params.id,req.user.company_id]);
  res.json(rows);
}catch(e){next(e);} }

export async function createVariation(req,res,next){ try{
  const b=req.body,c=req.user.company_id;
  const [[seq]]=await pool.query(`SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(variation_no,'-',-1) AS UNSIGNED)),0)+1 n FROM project_variations WHERE company_id=? AND project_id=?`,[c,req.params.id]);
  const variation_no=`VAR-${String(seq.n).padStart(3,'0')}`;
  const [r]=await pool.query(`INSERT INTO project_variations(company_id,project_id,variation_no,variation_date,description,variation_type,amount,status,remarks,created_by) VALUES(?,?,?,?,?,?,?,'Pending',?,?)`,
    [c,req.params.id,variation_no,b.variation_date||new Date(),b.description||null,b.variation_type||'Addition',b.amount||0,b.remarks||null,req.user.id]);
  await audit(req,'CREATE','project_variations',r.insertId,{projectId:req.params.id});
  res.status(201).json({id:r.insertId,variation_no});
}catch(e){next(e);} }

export async function updateVariation(req,res,next){ try{
  const b=req.body;
  await pool.query(`UPDATE project_variations SET variation_date=COALESCE(?,variation_date),description=?,variation_type=?,amount=?,status=COALESCE(?,status),remarks=? WHERE id=? AND project_id=? AND company_id=?`,
    [b.variation_date||null,b.description||null,b.variation_type||'Addition',b.amount||0,b.status||null,b.remarks||null,req.params.varId,req.params.id,req.user.company_id]);
  await audit(req,'UPDATE','project_variations',req.params.varId);
  res.json({message:'Updated'});
}catch(e){next(e);} }

export async function deleteVariation(req,res,next){ try{
  await pool.query(`UPDATE project_variations SET is_deleted=1 WHERE id=? AND project_id=? AND company_id=?`,[req.params.varId,req.params.id,req.user.company_id]);
  await audit(req,'DELETE','project_variations',req.params.varId);
  res.json({message:'Deleted'});
}catch(e){next(e);} }
