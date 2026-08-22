import { pool } from '../config/db.js';
import { getProjectFinance } from '../services/projectFinance.js';

function pad(n){return String(n).padStart(2,'0');}
function toISO(d){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;}

async function resolveRange(companyId, query){
  if(query.from || query.to) return { from: query.from||'1900-01-01', to: query.to||'2999-12-31' };
  if(query.fiscal_year_id){
    const [[fy]] = await pool.query('SELECT start_date,end_date FROM fiscal_years WHERE id=? AND company_id=?',[query.fiscal_year_id,companyId]);
    if(fy) return { from: toISO(new Date(fy.start_date)), to: toISO(new Date(fy.end_date)) };
  }
  return { from:'1900-01-01', to:'2999-12-31' };
}

export async function listFiscalYears(req,res,next){try{
  const [rows]=await pool.query('SELECT id,code,name,start_date,end_date,is_current FROM fiscal_years WHERE company_id=? ORDER BY start_date DESC',[req.user.company_id]);
  res.json(rows);
}catch(e){next(e)}}

export async function dashboard(req, res, next) {
  try {
    const c = req.user.company_id;
    const { from, to } = await resolveRange(c, req.query);
    const projectId = req.query.project_id || null;
    const pf = projectId ? ' AND project_id=?' : '';
    const pfParam = projectId ? [projectId] : [];

    const [[p]] = await pool.query(
      `SELECT COUNT(*) totalProjects,
        SUM(status='Running') runningProjects,
        SUM(status='Completed') completedProjects,
        SUM(status='Planning') planningProjects,
        SUM(status='On Hold') onHoldProjects,
        SUM(status NOT IN ('Completed','Cancelled') AND end_date_ad IS NOT NULL AND end_date_ad<CURDATE()) delayedProjects,
        SUM(status NOT IN ('Completed','Cancelled') AND end_date_ad IS NOT NULL AND end_date_ad BETWEEN CURDATE() AND DATE_ADD(CURDATE(),INTERVAL 30 DAY)) upcomingDeadlines,
        COALESCE(SUM(contract_amount),0) contractValue,
        COALESCE(SUM(estimated_cost),0) estimatedCost,
        COALESCE(SUM(contract_amount*progress_percentage/100),0) earnedRevenue
       FROM projects WHERE company_id=? AND is_deleted=0${projectId?' AND id=?':''}`,
      projectId?[c,projectId]:[c]
    );

    const [[inv]] = await pool.query(`SELECT COALESCE(SUM(grand_total),0) totalInvoice FROM invoices WHERE company_id=? AND status NOT IN ('Draft','Cancelled') AND is_deleted=0 AND invoice_date BETWEEN ? AND ?${pf}`, [c,from,to,...pfParam]);
    const [[clientDue]] = await pool.query(`SELECT COALESCE(SUM(due_amount),0) outstanding FROM invoices WHERE company_id=? AND status NOT IN ('Cancelled') AND is_deleted=0${pf}`, [c,...pfParam]);
    const [[overdue]] = await pool.query(`SELECT COUNT(*) overdueCount FROM invoices WHERE company_id=? AND is_deleted=0 AND status NOT IN ('Paid','Cancelled') AND due_date IS NOT NULL AND due_date<CURDATE()${pf}`, [c,...pfParam]);
    const [[pay]] = await pool.query(`SELECT COALESCE(SUM(amount),0) totalCollection FROM payments WHERE company_id=? AND status='Successful' AND is_deleted=0 AND payment_date BETWEEN ? AND ?${pf}`, [c,from,to,...pfParam]);
    const [[exp]] = await pool.query(`SELECT COALESCE(SUM(amount),0) totalExpense FROM expenses WHERE company_id=? AND expense_type NOT IN ('Material','Labour') AND is_deleted=0 AND expense_date BETWEEN ? AND ?${pf}`, [c,from,to,...pfParam]);
    const [[mat]] = await pool.query(`SELECT COALESCE(SUM(mii.quantity*mii.unit_cost),0) materialCost FROM material_issue_items mii JOIN material_issues mi ON mi.id=mii.material_issue_id WHERE mi.company_id=? AND mi.is_deleted=0 AND mi.issue_date BETWEEN ? AND ?${projectId?' AND mi.project_id=?':''}`, [c,from,to,...pfParam]);
    const [[lab]] = await pool.query(`SELECT COALESCE(SUM(calculated_amount),0) labourCost FROM attendance WHERE company_id=? AND is_deleted=0 AND attendance_date BETWEEN ? AND ?${pf}`, [c,from,to,...pfParam]);
    const [[workers]] = await pool.query(`SELECT COUNT(*) presentToday FROM attendance WHERE company_id=? AND attendance_date=CURDATE() AND status IN ('Present','Site Visit') AND is_deleted=0`, [c]);
    const [[employees]] = await pool.query(`SELECT COUNT(*) totalWorkers FROM employees WHERE company_id=? AND is_active=1 AND is_deleted=0`, [c]);
    const [[supplierDue]] = await pool.query(`SELECT COALESCE((SELECT SUM(opening_due) FROM suppliers WHERE company_id=? AND is_deleted=0),0) + COALESCE((SELECT SUM(due_amount) FROM material_purchases WHERE company_id=? AND is_deleted=0),0) due`, [c,c]);
    const currentMonth=`${new Date().getFullYear()}-${pad(new Date().getMonth()+1)}`;
    const [[pendingSalary]] = await pool.query(`SELECT COALESCE(SUM(net_salary),0) pending FROM salary_records WHERE company_id=? AND is_deleted=0 AND status!='Paid' AND salary_month=?`, [c,currentMonth]);
    const [[lowStock]] = await pool.query(
      `SELECT COUNT(*) n FROM (SELECT m.id,m.opening_stock+COALESCE(SUM(CASE WHEN st.transaction_type IN ('Purchase','Transfer In','Adjustment In') THEN st.quantity ELSE -st.quantity END),0) available,m.minimum_stock
        FROM materials m LEFT JOIN stock_transactions st ON st.material_id=m.id AND st.is_deleted=0 WHERE m.company_id=? AND m.is_deleted=0 GROUP BY m.id HAVING available<=minimum_stock) x`, [c]);
    const [[pendingApprovalCount]] = await pool.query(`SELECT COUNT(*) n FROM quotations WHERE company_id=? AND status='Sent' AND is_deleted=0`, [c]);
    const [[pendingExpenseCount]] = await pool.query(`SELECT COUNT(*) n,COALESCE(SUM(amount),0) amt FROM expenses WHERE company_id=? AND status='Pending' AND is_deleted=0`, [c]);

    const outstanding = Number(clientDue.outstanding);
    const otherCost = Number(exp.totalExpense);
    const totalExpense = otherCost + Number(mat.materialCost) + Number(lab.labourCost);
    const currentCashProfit = Number(pay.totalCollection)-totalExpense;
    const currentEarnedProfit = Number(p.earnedRevenue)-totalExpense;
    const projectedProfit = Number(p.contractValue)-totalExpense;
    const profitMargin = Number(p.contractValue)>0 ? (Number(projectedProfit)/Number(p.contractValue))*100 : 0;

    const [recentProjects] = await pool.query(`SELECT id,project_code,project_name,location,status,progress_percentage,contract_amount FROM projects WHERE company_id=? AND is_deleted=0 ORDER BY id DESC LIMIT 5`, [c]);
    const [recentInvoices] = await pool.query(`SELECT invoice_no,grand_total,status,invoice_date FROM invoices WHERE company_id=? AND is_deleted=0 ORDER BY id DESC LIMIT 5`, [c]);
    const [recentPayments] = await pool.query(`SELECT py.receipt_no,py.amount,py.payment_date,py.payment_method,c.name client_name FROM payments py LEFT JOIN clients c ON c.id=py.client_id WHERE py.company_id=? AND py.is_deleted=0 ORDER BY py.id DESC LIMIT 5`, [c]);
    const [recentExpenses] = await pool.query(`SELECT e.expense_date,e.expense_type,e.description,e.amount,p.project_name FROM expenses e LEFT JOIN projects p ON p.id=e.project_id WHERE e.company_id=? AND e.is_deleted=0 ORDER BY e.id DESC LIMIT 5`, [c]);
    const [lowStockAlert] = await pool.query(
      `SELECT m.id,m.name,m.unit,m.minimum_stock,m.opening_stock+COALESCE(SUM(CASE WHEN st.transaction_type IN ('Purchase','Transfer In','Adjustment In') THEN st.quantity ELSE -st.quantity END),0) available
        FROM materials m LEFT JOIN stock_transactions st ON st.material_id=m.id AND st.is_deleted=0 WHERE m.company_id=? AND m.is_deleted=0 GROUP BY m.id HAVING available<=minimum_stock ORDER BY available ASC LIMIT 6`, [c]);
    const [pendingApprovals] = await pool.query(`SELECT q.id,q.quotation_no,q.title,q.grand_total,q.quotation_date,c.name client_name FROM quotations q LEFT JOIN clients c ON c.id=q.client_id WHERE q.company_id=? AND q.status='Sent' AND q.is_deleted=0 ORDER BY q.id DESC LIMIT 6`, [c]);
    const [pendingExpenseApprovals] = await pool.query(`SELECT e.id,e.expense_date,e.expense_type,e.description,e.amount,p.project_name FROM expenses e LEFT JOIN projects p ON p.id=e.project_id WHERE e.company_id=? AND e.status='Pending' AND e.is_deleted=0 ORDER BY e.id DESC LIMIT 6`, [c]);

    const [monthlyCollectionRows] = await pool.query(`SELECT DATE_FORMAT(payment_date,'%Y-%m') month,SUM(amount) amt FROM payments WHERE company_id=? AND status='Successful' AND payment_date>=DATE_SUB(CURDATE(),INTERVAL 5 MONTH) AND is_deleted=0${pf} GROUP BY month`, [c,...pfParam]);
    const [monthlyExpenseRows] = await pool.query(`SELECT month,SUM(amt) amt FROM (
        SELECT DATE_FORMAT(expense_date,'%Y-%m') month,amount amt FROM expenses WHERE company_id=? AND expense_date>=DATE_SUB(CURDATE(),INTERVAL 5 MONTH) AND is_deleted=0${pf}
        UNION ALL
        SELECT DATE_FORMAT(mi.issue_date,'%Y-%m') month,mii.quantity*mii.unit_cost amt FROM material_issue_items mii JOIN material_issues mi ON mi.id=mii.material_issue_id WHERE mi.company_id=? AND mi.issue_date>=DATE_SUB(CURDATE(),INTERVAL 5 MONTH) AND mi.is_deleted=0${projectId?' AND mi.project_id=?':''}
        UNION ALL
        SELECT DATE_FORMAT(attendance_date,'%Y-%m') month,calculated_amount amt FROM attendance WHERE company_id=? AND attendance_date>=DATE_SUB(CURDATE(),INTERVAL 5 MONTH) AND is_deleted=0${pf}
      ) x GROUP BY month`, [c,...pfParam,c,...pfParam,c,...pfParam]);
    const months=[]; const now=new Date();
    for(let i=5;i>=0;i--){ const d=new Date(now.getFullYear(),now.getMonth()-i,1); months.push(`${d.getFullYear()}-${pad(d.getMonth()+1)}`); }
    const collMap=Object.fromEntries(monthlyCollectionRows.map(r=>[r.month,Number(r.amt)]));
    const expMap=Object.fromEntries(monthlyExpenseRows.map(r=>[r.month,Number(r.amt)]));
    const monthlyCollection=months.map(m=>({month:m,amount:collMap[m]||0}));
    const monthlyExpense=months.map(m=>({month:m,amount:expMap[m]||0}));
    const cashFlow=months.map(m=>({month:m,collection:collMap[m]||0,expense:expMap[m]||0,net:(collMap[m]||0)-(expMap[m]||0)}));

    const [incomeWeeks] = await pool.query(`SELECT LEAST(5,FLOOR((DAYOFMONTH(payment_date)-1)/7)+1) wk,SUM(amount) amt FROM payments WHERE company_id=? AND status='Successful' AND is_deleted=0 AND YEAR(payment_date)=YEAR(CURDATE()) AND MONTH(payment_date)=MONTH(CURDATE())${pf} GROUP BY wk`, [c,...pfParam]);
    const [expenseWeeks] = await pool.query(`SELECT wk,SUM(amt) amt FROM (
        SELECT LEAST(5,FLOOR((DAYOFMONTH(expense_date)-1)/7)+1) wk,amount amt FROM expenses WHERE company_id=? AND is_deleted=0 AND YEAR(expense_date)=YEAR(CURDATE()) AND MONTH(expense_date)=MONTH(CURDATE())${pf}
        UNION ALL
        SELECT LEAST(5,FLOOR((DAYOFMONTH(mi.issue_date)-1)/7)+1) wk,mii.quantity*mii.unit_cost amt FROM material_issue_items mii JOIN material_issues mi ON mi.id=mii.material_issue_id WHERE mi.company_id=? AND mi.is_deleted=0 AND YEAR(mi.issue_date)=YEAR(CURDATE()) AND MONTH(mi.issue_date)=MONTH(CURDATE())${projectId?' AND mi.project_id=?':''}
        UNION ALL
        SELECT LEAST(5,FLOOR((DAYOFMONTH(attendance_date)-1)/7)+1) wk,calculated_amount amt FROM attendance WHERE company_id=? AND is_deleted=0 AND YEAR(attendance_date)=YEAR(CURDATE()) AND MONTH(attendance_date)=MONTH(CURDATE())${pf}
      ) x GROUP BY wk`, [c,...pfParam,c,...pfParam,c,...pfParam]);
    const incomeMap=Object.fromEntries(incomeWeeks.map(w=>[w.wk,Number(w.amt)]));
    const expenseMap=Object.fromEntries(expenseWeeks.map(w=>[w.wk,Number(w.amt)]));
    const weekly=[1,2,3,4,5].map(wk=>({label:`Week ${wk}`,income:incomeMap[wk]||0,expense:expenseMap[wk]||0}));

    const [expenseCategoryRows] = await pool.query(`SELECT expense_type category,SUM(amount) amt FROM expenses WHERE company_id=? AND is_deleted=0 AND expense_type NOT IN ('Material','Labour') AND expense_date BETWEEN ? AND ?${pf} GROUP BY expense_type ORDER BY amt DESC`, [c,from,to,...pfParam]);
    const expenseCategory=[
      ...(Number(mat.materialCost)>0?[{category:'Material',amt:Number(mat.materialCost)}]:[]),
      ...(Number(lab.labourCost)>0?[{category:'Labour',amt:Number(lab.labourCost)}]:[]),
      ...expenseCategoryRows.map(r=>({category:r.category,amt:Number(r.amt)}))
    ];

    const [profitProjects] = await pool.query(`SELECT id,project_code,project_name,contract_amount FROM projects WHERE company_id=? AND is_deleted=0 ORDER BY contract_amount DESC LIMIT 8`, [c]);
    const projectProfit=[];
    for(const proj of profitProjects){ const fin=await getProjectFinance(c,proj.id); projectProfit.push({project_name:proj.project_name,projectedProfit:fin?.projectedProfit||0}); }

    res.json({
      cards:{
        totalProjects:p.totalProjects,runningProjects:p.runningProjects,completedProjects:p.completedProjects,planningProjects:p.planningProjects,onHoldProjects:p.onHoldProjects,delayedProjects:p.delayedProjects,upcomingDeadlines:p.upcomingDeadlines,
        contractValue:p.contractValue,estimatedCost:p.estimatedCost,
        totalInvoice:inv.totalInvoice,totalCollection:pay.totalCollection,outstanding,clientDue:outstanding,overdueInvoices:overdue.overdueCount,
        totalExpense,materialCost:mat.materialCost,labourCost:lab.labourCost,otherCost,
        currentCashProfit,currentEarnedProfit,projectedProfit,profitMargin,
        supplierDue:supplierDue.due,pendingSalary:pendingSalary.pending,
        presentToday:workers.presentToday,totalWorkers:employees.totalWorkers,
        lowStockItems:lowStock.n,pendingApprovals:pendingApprovalCount.n,
        pendingExpenseApprovals:pendingExpenseCount.n,pendingExpenseAmount:pendingExpenseCount.amt
      },
      recentProjects,recentInvoices,recentPayments,recentExpenses,lowStockAlert,pendingApprovals,pendingExpenseApprovals,
      monthly:monthlyExpense,monthlyCollection,monthlyExpense,cashFlow,weekly,expenseCategory,projectProfit,
      range:{from,to}
    });
  } catch(e){ next(e); }
}
