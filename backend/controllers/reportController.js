import { pool } from '../config/db.js';
import { getProjectFinance } from '../services/projectFinance.js';
export async function profitReport(req,res,next){try{const [projects]=await pool.query(`SELECT id,project_code,project_name,contract_amount,status,progress_percentage FROM projects WHERE company_id=? AND is_deleted=0 ORDER BY id DESC`,[req.user.company_id]);const data=[];for(const p of projects){data.push({...p,finance:await getProjectFinance(req.user.company_id,p.id)})}res.json(data)}catch(e){next(e)}}
