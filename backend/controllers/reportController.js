import { pool } from '../config/db.js';
import { getProjectFinance } from '../services/projectFinance.js';
export async function profitReport(req,res,next){try{const [projects]=await pool.query(`SELECT id,project_code,project_name,contract_amount,status,progress_percentage FROM projects WHERE company_id=? AND is_deleted=0 ORDER BY id DESC`,[req.user.company_id]);const data=[];for(const p of projects){data.push({...p,finance:await getProjectFinance(req.user.company_id,p.id)})}res.json(data)}catch(e){next(e)}}

export async function profitLossReport(req,res,next){try{
  const c=req.user.company_id; const now=new Date();
  const pad=n=>String(n).padStart(2,'0');
  const monthStart=`${now.getFullYear()}-${pad(now.getMonth()+1)}-01`;
  const lastDay=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
  const monthEnd=`${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(lastDay)}`;
  const from=req.query.from||monthStart, to=req.query.to||monthEnd;
  const [[proj]]=await pool.query(`SELECT COALESCE(SUM(contract_amount),0) contractValue FROM projects WHERE company_id=? AND is_deleted=0`,[c]);
  const [[inv]]=await pool.query(`SELECT COALESCE(SUM(grand_total),0) totalInvoice FROM invoices WHERE company_id=? AND is_deleted=0 AND status NOT IN ('Draft','Cancelled') AND invoice_date BETWEEN ? AND ?`,[c,from,to]);
  const [[pay]]=await pool.query(`SELECT COALESCE(SUM(amount),0) totalReceived FROM payments WHERE company_id=? AND is_deleted=0 AND status='Successful' AND payment_date BETWEEN ? AND ?`,[c,from,to]);
  const [[mat]]=await pool.query(`SELECT COALESCE(SUM(mii.quantity*mii.unit_cost),0) materialCost FROM material_issue_items mii JOIN material_issues mi ON mi.id=mii.material_issue_id WHERE mi.company_id=? AND mi.is_deleted=0 AND mi.issue_date BETWEEN ? AND ?`,[c,from,to]);
  const [[lab]]=await pool.query(`SELECT COALESCE(SUM(calculated_amount),0) labourCost FROM attendance WHERE company_id=? AND is_deleted=0 AND attendance_date BETWEEN ? AND ?`,[c,from,to]);
  const [[oth]]=await pool.query(`SELECT COALESCE(SUM(amount),0) otherCost FROM expenses WHERE company_id=? AND is_deleted=0 AND expense_type NOT IN ('Material','Labour') AND expense_date BETWEEN ? AND ?`,[c,from,to]);
  const contractValue=Number(proj.contractValue),totalInvoice=Number(inv.totalInvoice),totalReceived=Number(pay.totalReceived);
  const materialCost=Number(mat.materialCost),labourCost=Number(lab.labourCost),otherCost=Number(oth.otherCost);
  const totalExpense=materialCost+labourCost+otherCost, outstanding=totalInvoice-totalReceived, totalIncome=totalReceived;
  const netProfit=totalIncome-totalExpense, profitMargin=totalIncome>0?(netProfit/totalIncome)*100:0;
  res.json({from,to,contractValue,totalInvoice,totalReceived,outstanding,materialCost,labourCost,otherCost,totalExpense,totalIncome,netProfit,profitMargin});
}catch(e){next(e)}}

export async function attendanceReport(req,res,next){try{
  const c=req.user.company_id, now=new Date();
  const pad=n=>String(n).padStart(2,'0');
  const monthStart=`${now.getFullYear()}-${pad(now.getMonth()+1)}-01`;
  const lastDay=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
  const monthEnd=`${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(lastDay)}`;
  const from=req.query.from||monthStart, to=req.query.to||monthEnd;
  const [rows]=await pool.query(
    `SELECT e.id employee_id,e.employee_code,e.name,e.designation,
       SUM(CASE WHEN a.status='Present' THEN 1 ELSE 0 END) present_days,
       SUM(CASE WHEN a.status='Absent' THEN 1 ELSE 0 END) absent_days,
       SUM(CASE WHEN a.status='Half Day' THEN 1 ELSE 0 END) half_days,
       SUM(CASE WHEN a.status='Leave' THEN 1 ELSE 0 END) leave_days,
       SUM(CASE WHEN a.status='Holiday' THEN 1 ELSE 0 END) holiday_days,
       SUM(CASE WHEN a.status='Site Visit' THEN 1 ELSE 0 END) site_visit_days,
       COALESCE(SUM(a.regular_hours),0) total_hours,
       COALESCE(SUM(a.overtime_hours),0) total_overtime,
       COALESCE(SUM(a.calculated_amount),0) total_wage
     FROM employees e LEFT JOIN attendance a ON a.employee_id=e.id AND a.company_id=? AND a.is_deleted=0 AND a.attendance_date BETWEEN ? AND ?
     WHERE e.company_id=? AND e.is_deleted=0 GROUP BY e.id ORDER BY e.name`,
    [c,from,to,c]
  );
  res.json({from,to,rows});
}catch(e){next(e)}}

export async function taxSummaryReport(req,res,next){try{
  const c=req.user.company_id, now=new Date();
  const pad=n=>String(n).padStart(2,'0');
  const monthStart=`${now.getFullYear()}-${pad(now.getMonth()+1)}-01`;
  const lastDay=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
  const monthEnd=`${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(lastDay)}`;
  const from=req.query.from||monthStart, to=req.query.to||monthEnd;
  const [[out]]=await pool.query(
    `SELECT COALESCE(SUM(taxable_amount),0) taxableSales,COALESCE(SUM(vat_amount),0) outputVat,COALESCE(SUM(grand_total),0) totalSales
     FROM invoices WHERE company_id=? AND is_deleted=0 AND status NOT IN ('Draft','Cancelled') AND invoice_date BETWEEN ? AND ?`,[c,from,to]);
  const [[inp]]=await pool.query(
    `SELECT COALESCE(SUM(subtotal),0) taxablePurchases,COALESCE(SUM(vat_amount),0) inputVat,COALESCE(SUM(grand_total),0) totalPurchases
     FROM material_purchases WHERE company_id=? AND is_deleted=0 AND status<>'Cancelled' AND purchase_date BETWEEN ? AND ?`,[c,from,to]);
  const outputVat=Number(out.outputVat),inputVat=Number(inp.inputVat);
  res.json({from,to,
    taxableSales:Number(out.taxableSales),outputVat,totalSales:Number(out.totalSales),
    taxablePurchases:Number(inp.taxablePurchases),inputVat,totalPurchases:Number(inp.totalPurchases),
    netVatPayable:outputVat-inputVat});
}catch(e){next(e)}}
