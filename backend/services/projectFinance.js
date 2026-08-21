import { pool } from '../config/db.js';

export async function getProjectFinance(companyId, projectId) {
  const [[project]] = await pool.query(
    'SELECT contract_amount FROM projects WHERE id=? AND company_id=? AND is_deleted=0',
    [projectId, companyId]
  );
  if (!project) return null;

  const [[invoice]] = await pool.query(
    `SELECT COALESCE(SUM(grand_total),0) total_invoice
     FROM invoices WHERE company_id=? AND project_id=? AND status NOT IN ('Draft','Cancelled') AND is_deleted=0`,
    [companyId, projectId]
  );
  const [[payment]] = await pool.query(
    `SELECT COALESCE(SUM(amount),0) total_received
     FROM payments WHERE company_id=? AND project_id=? AND status='Successful' AND is_deleted=0`,
    [companyId, projectId]
  );
  const [[material]] = await pool.query(
    `SELECT COALESCE(SUM(mii.quantity*mii.unit_cost),0) material_cost
     FROM material_issue_items mii
     JOIN material_issues mi ON mi.id=mii.material_issue_id
     WHERE mi.company_id=? AND mi.project_id=? AND mi.is_deleted=0`,
    [companyId, projectId]
  );
  const [[labour]] = await pool.query(
    `SELECT COALESCE(SUM(calculated_amount),0) labour_cost
     FROM attendance WHERE company_id=? AND project_id=? AND is_deleted=0`,
    [companyId, projectId]
  );
  const [[other]] = await pool.query(
    `SELECT COALESCE(SUM(amount),0) other_cost
     FROM expenses WHERE company_id=? AND project_id=? AND is_deleted=0
       AND expense_type <> 'Material' AND expense_type <> 'Labour'`,
    [companyId, projectId]
  );

  const contractValue = Number(project.contract_amount || 0);
  const totalInvoice = Number(invoice.total_invoice || 0);
  const totalReceived = Number(payment.total_received || 0);
  const materialCost = Number(material.material_cost || 0);
  const labourCost = Number(labour.labour_cost || 0);
  const otherCost = Number(other.other_cost || 0);
  const totalExpense = materialCost + labourCost + otherCost;
  const outstanding = totalInvoice - totalReceived;
  const currentCashProfit = totalReceived - totalExpense;
  const projectedProfit = contractValue - totalExpense;
  const profitMargin = contractValue > 0 ? (projectedProfit / contractValue) * 100 : 0;

  return { contractValue,totalInvoice,totalReceived,outstanding,materialCost,labourCost,otherCost,totalExpense,currentCashProfit,projectedProfit,profitMargin };
}
