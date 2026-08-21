import { pool } from '../config/db.js';

export async function dashboard(req, res, next) {
  try {
    const c = req.user.company_id;
    const [[p]] = await pool.query(`SELECT COUNT(*) totalProjects,SUM(status='Running') runningProjects,SUM(status='Completed') completedProjects,COALESCE(SUM(contract_amount),0) contractValue FROM projects WHERE company_id=? AND is_deleted=0`, [c]);
    const [[inv]] = await pool.query(`SELECT COALESCE(SUM(grand_total),0) totalInvoice FROM invoices WHERE company_id=? AND status NOT IN ('Draft','Cancelled') AND is_deleted=0`, [c]);
    const [[pay]] = await pool.query(`SELECT COALESCE(SUM(amount),0) totalCollection FROM payments WHERE company_id=? AND status='Successful' AND is_deleted=0`, [c]);
    const [[exp]] = await pool.query(`SELECT COALESCE(SUM(amount),0) totalExpense FROM expenses WHERE company_id=? AND expense_type NOT IN ('Material','Labour') AND is_deleted=0`, [c]);
    const [[mat]] = await pool.query(`SELECT COALESCE(SUM(mii.quantity*mii.unit_cost),0) materialCost FROM material_issue_items mii JOIN material_issues mi ON mi.id=mii.material_issue_id WHERE mi.company_id=? AND mi.is_deleted=0`, [c]);
    const [[lab]] = await pool.query(`SELECT COALESCE(SUM(calculated_amount),0) labourCost FROM attendance WHERE company_id=? AND is_deleted=0`, [c]);
    const [[workers]] = await pool.query(`SELECT COUNT(*) presentToday FROM attendance WHERE company_id=? AND attendance_date=CURDATE() AND status IN ('Present','Site Visit') AND is_deleted=0`, [c]);
    const [[employees]] = await pool.query(`SELECT COUNT(*) totalWorkers FROM employees WHERE company_id=? AND is_active=1 AND is_deleted=0`, [c]);
    const outstanding = Number(inv.totalInvoice)-Number(pay.totalCollection);
    const totalExpense = Number(exp.totalExpense) + Number(mat.materialCost) + Number(lab.labourCost);
    const currentCashProfit = Number(pay.totalCollection)-totalExpense;
    const projectedProfit = Number(p.contractValue)-totalExpense;

    const [recentProjects] = await pool.query(`SELECT id,project_code,project_name,location,status,progress_percentage,contract_amount FROM projects WHERE company_id=? AND is_deleted=0 ORDER BY id DESC LIMIT 5`, [c]);
    const [recentInvoices] = await pool.query(`SELECT invoice_no,grand_total,status,invoice_date FROM invoices WHERE company_id=? AND is_deleted=0 ORDER BY id DESC LIMIT 5`, [c]);
    const [monthly] = await pool.query(`SELECT DATE_FORMAT(expense_date,'%Y-%m') month,SUM(amount) expense FROM expenses WHERE company_id=? AND expense_date>=DATE_SUB(CURDATE(),INTERVAL 5 MONTH) AND is_deleted=0 GROUP BY month ORDER BY month`, [c]);
    res.json({ cards:{...p,totalInvoice:inv.totalInvoice,totalCollection:pay.totalCollection,outstanding,totalExpense,materialCost:mat.materialCost,labourCost:lab.labourCost,currentCashProfit,projectedProfit,presentToday:workers.presentToday,totalWorkers:employees.totalWorkers}, recentProjects,recentInvoices,monthly });
  } catch(e){ next(e); }
}
