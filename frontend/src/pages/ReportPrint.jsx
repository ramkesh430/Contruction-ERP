import { useEffect,useState } from 'react';import { useParams,Navigate } from 'react-router-dom';import { useAuth } from '../context/AuthContext';import api from '../services/api';import { money,fmtDate,todayStr } from '../utils/format';
import { PrintPreviewLayout,PrintCompanyHeader,PrintInfoCard,PrintTable,PrintFinancialSummary,PrintSection } from '../components/print';

const TITLES={
  pnl:'Profit & Loss Report', stock:'Stock Report', attendance:'Attendance Report',
  clients:'Client Ledger Report', suppliers:'Supplier Ledger Report', tax:'Tax Summary (VAT) Report',
  salary:'Salary Report', expense:'Expense Report', equipment:'Equipment Report'
};

function monthStart(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`}
const fmtFull=d=>d?new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'';

export default function ReportPrint(){
  const {type}=useParams();
  const {user}=useAuth();
  const [settings,setSettings]=useState(null);
  const [fiscalYear,setFiscalYear]=useState('');
  const [rows,setRows]=useState(null);
  const [summary,setSummary]=useState(null);
  const [err,setErr]=useState('');
  const from=monthStart(), to=todayStr();

  useEffect(()=>{
    setRows(null); setSummary(null); setErr('');
    api.get('/settings').then(r=>setSettings(r.data)).catch(()=>{});
    api.get('/fiscal-years').then(r=>{const cur=r.data.find(y=>y.is_current);setFiscalYear(cur?(cur.name||cur.code):'')}).catch(()=>{});

    const load=async()=>{
      if(type==='pnl'){
        const r=await api.get('/reports/profit-loss',{params:{from,to}});
        const p=await api.get('/reports/project-profit');
        setSummary(r.data); setRows(p.data);
      } else if(type==='attendance'){
        const r=await api.get('/reports/attendance',{params:{from,to}});
        setSummary(r.data); setRows(r.data.rows);
      } else if(type==='tax'){
        const r=await api.get('/reports/tax-summary',{params:{from,to}});
        setSummary(r.data); setRows([]);
      } else if(type==='stock'){
        const r=await api.get('/materials/stock/summary');
        setRows(r.data);
      } else if(type==='clients'){
        const r=await api.get('/clients');
        setRows(r.data);
      } else if(type==='suppliers'){
        const r=await api.get('/suppliers');
        setRows(r.data);
      } else if(type==='salary'){
        const r=await api.get('/salaries');
        setRows(r.data);
      } else if(type==='expense'){
        const r=await api.get('/expenses');
        setRows(r.data);
      } else if(type==='equipment'){
        const r=await api.get('/equipment');
        setRows(r.data);
      } else {
        setErr('Unknown report type');
      }
    };
    load().catch(()=>setErr('Could not load report'));
  },[type]);

  if(!user) return <Navigate to="/login" replace/>;
  if(err) return <div className="loading">{err}</div>;
  if(rows===null) return <div className="loading">Loading report...</div>;

  const title=TITLES[type]||'Report';
  const period=['pnl','attendance','tax'].includes(type)?`${fmtFull(from)} – ${fmtFull(to)}`:'';

  return <PrintPreviewLayout orientation="landscape">
    <PrintCompanyHeader settings={settings} docLabel={title} docNumber={fiscalYear} extra={period&&<p>{period}</p>}/>

    {type==='pnl'&&summary&&<>
      <PrintFinancialSummary rows={[
        {label:'Total Income',value:money(summary.totalIncome)},
        {label:'Total Expense',value:money(summary.totalExpense)},
        {label:'Net Profit',value:money(summary.netProfit),grand:true},
        {label:'Profit Margin',value:Number(summary.profitMargin||0).toFixed(2)+'%'}
      ]}/>
      <PrintSection title="Project-wise Profitability">
        <PrintTable
          emptyText="No projects found"
          columns={[
            {key:'code',label:'Code',render:r=>r.project_code},
            {key:'project',label:'Project',render:r=>r.project_name},
            {key:'contract',label:'Contract',align:'right',render:r=>money(r.finance?.contractValue)},
            {key:'received',label:'Received',align:'right',render:r=>money(r.finance?.totalReceived)},
            {key:'expense',label:'Expense',align:'right',render:r=>money(r.finance?.totalExpense)},
            {key:'cash',label:'Cash Profit',align:'right',render:r=>money(r.finance?.currentCashProfit)},
            {key:'projected',label:'Projected Profit',align:'right',render:r=>money(r.finance?.projectedProfit)},
            {key:'margin',label:'Margin',align:'right',render:r=>(r.finance?.profitMargin||0).toFixed(1)+'%'}
          ]}
          rows={rows}
        />
      </PrintSection>
    </>}

    {type==='attendance'&&summary&&<>
      <PrintFinancialSummary rows={[
        {label:'Employees',value:rows.length},
        {label:'Total Present Days',value:rows.reduce((s,r)=>s+Number(r.present_days),0)},
        {label:'Total Hours',value:rows.reduce((s,r)=>s+Number(r.total_hours),0)},
        {label:'Total Wage',value:money(rows.reduce((s,r)=>s+Number(r.total_wage),0)),grand:true}
      ]}/>
      <PrintTable
        emptyText="No employees found"
        columns={[
          {key:'employee_code',label:'Code'},{key:'name',label:'Name'},{key:'designation',label:'Designation'},
          {key:'present_days',label:'Present',align:'right'},{key:'absent_days',label:'Absent',align:'right'},
          {key:'half_days',label:'Half Day',align:'right'},{key:'leave_days',label:'Leave',align:'right'},
          {key:'total_hours',label:'Hours',align:'right'},{key:'total_wage',label:'Wage',align:'right',render:r=>money(r.total_wage)}
        ]}
        rows={rows}
      />
    </>}

    {type==='tax'&&summary&&<>
      <PrintFinancialSummary rows={[
        {label:'Output VAT (Sales)',value:money(summary.outputVat)},
        {label:'Input VAT (Purchases)',value:money(summary.inputVat)},
        {label:'Net VAT Payable',value:money(summary.netVatPayable),grand:true}
      ]}/>
      <PrintSection title="Tax Summary">
        <table><tbody>
          <tr><td>Taxable Sales</td><td style={{textAlign:'right'}}>{money(summary.taxableSales)}</td></tr>
          <tr><td>Total Sales (incl. VAT)</td><td style={{textAlign:'right'}}>{money(summary.totalSales)}</td></tr>
          <tr><td>Taxable Purchases</td><td style={{textAlign:'right'}}>{money(summary.taxablePurchases)}</td></tr>
          <tr><td>Total Purchases (incl. VAT)</td><td style={{textAlign:'right'}}>{money(summary.totalPurchases)}</td></tr>
        </tbody></table>
      </PrintSection>
    </>}

    {type==='stock'&&<>
      <PrintFinancialSummary rows={[
        {label:'Material Types',value:rows.length},
        {label:'Items Needing Attention',value:rows.filter(r=>r.status!=='In Stock').length},
        {label:'Total Stock Value',value:money(rows.reduce((s,r)=>s+Number(r.total_value||0),0)),grand:true}
      ]}/>
      <PrintTable
        emptyText="No materials tracked yet"
        columns={[
          {key:'name',label:'Material'},{key:'category_name',label:'Category',render:r=>r.category_name||'—'},{key:'unit',label:'Unit'},
          {key:'opening_stock',label:'Opening',align:'right'},{key:'available',label:'Available',align:'right'},
          {key:'rate',label:'Rate',align:'right',render:r=>money(r.rate)},{key:'total_value',label:'Value',align:'right',render:r=>money(r.total_value)},
          {key:'status',label:'Status'}
        ]}
        rows={rows}
      />
    </>}

    {type==='clients'&&<>
      <PrintFinancialSummary rows={[
        {label:'Total Clients',value:rows.length},
        {label:'Total Contract Value',value:money(rows.reduce((s,r)=>s+Number(r.contract_value||0),0))},
        {label:'Total Receivable',value:money(rows.reduce((s,r)=>s+Number(r.total_due||0),0)),grand:true}
      ]}/>
      <PrintTable
        emptyText="No clients found"
        columns={[
          {key:'name',label:'Client'},{key:'total_projects',label:'Projects',align:'right'},
          {key:'total_invoice',label:'Total Invoice',align:'right',render:r=>money(r.total_invoice)},
          {key:'total_received',label:'Total Received',align:'right',render:r=>money(r.total_received)},
          {key:'total_due',label:'Total Due',align:'right',render:r=>money(r.total_due)}
        ]}
        rows={rows}
      />
    </>}

    {type==='suppliers'&&<>
      <PrintFinancialSummary rows={[
        {label:'Total Suppliers',value:rows.length},
        {label:'Total Purchase Amount',value:money(rows.reduce((s,r)=>s+Number(r.total_purchase_amount||0),0))},
        {label:'Total Payable',value:money(rows.reduce((s,r)=>s+Number(r.total_due||0),0)),grand:true}
      ]}/>
      <PrintTable
        emptyText="No suppliers found"
        columns={[
          {key:'name',label:'Supplier'},{key:'total_purchases',label:'Purchases',align:'right'},
          {key:'total_purchase_amount',label:'Purchase Amount',align:'right',render:r=>money(r.total_purchase_amount)},
          {key:'total_paid',label:'Paid',align:'right',render:r=>money(r.total_paid)},
          {key:'total_due',label:'Due',align:'right',render:r=>money(r.total_due)}
        ]}
        rows={rows}
      />
    </>}

    {type==='salary'&&<>
      <PrintFinancialSummary rows={[
        {label:'Salary Records',value:rows.length},
        {label:'Total Net Salary',value:money(rows.reduce((s,r)=>s+Number(r.net_salary||0),0)),grand:true}
      ]}/>
      <PrintTable
        emptyText="No salary records found"
        columns={[
          {key:'salary_month',label:'Month'},{key:'employee_name',label:'Employee'},{key:'salary_type',label:'Type'},
          {key:'basic_salary',label:'Basic',align:'right',render:r=>money(r.basic_salary)},
          {key:'allowance',label:'Allowance',align:'right',render:r=>money(r.allowance)},
          {key:'advance_deduction',label:'Deduction',align:'right',render:r=>money(Number(r.advance_deduction||0)+Number(r.other_deduction||0))},
          {key:'net_salary',label:'Net Salary',align:'right',render:r=>money(r.net_salary)},
          {key:'status',label:'Status'}
        ]}
        rows={rows}
      />
    </>}

    {type==='expense'&&<>
      <PrintFinancialSummary rows={[
        {label:'Total Expenses',value:rows.length},
        {label:'Total Amount',value:money(rows.reduce((s,r)=>s+Number(r.amount||0),0)),grand:true}
      ]}/>
      <PrintTable
        emptyText="No expenses found"
        columns={[
          {key:'expense_date',label:'Date',render:r=>fmtDate(r.expense_date)},{key:'expense_type',label:'Category'},
          {key:'project_name',label:'Project',render:r=>r.project_name||'General'},{key:'description',label:'Description'},
          {key:'amount',label:'Amount',align:'right',render:r=>money(r.amount)},{key:'status',label:'Status'}
        ]}
        rows={rows}
      />
    </>}

    {type==='equipment'&&<>
      <PrintFinancialSummary rows={[
        {label:'Total Equipment',value:rows.length},
        {label:'Total Current Value',value:money(rows.reduce((s,r)=>s+Number(r.current_value||0),0)),grand:true}
      ]}/>
      <PrintTable
        emptyText="No equipment found"
        columns={[
          {key:'name',label:'Equipment'},{key:'equipment_code',label:'Code'},{key:'type',label:'Type'},
          {key:'purchase_cost',label:'Purchase Cost',align:'right',render:r=>money(r.purchase_cost)},
          {key:'current_value',label:'Current Value',align:'right',render:r=>money(r.current_value)},
          {key:'status',label:'Status'}
        ]}
        rows={rows}
      />
    </>}
  </PrintPreviewLayout>;
}
