import { useEffect,useState } from 'react';import api from '../services/api';import DataTable from '../components/DataTable';import BulkActionsBar from '../components/BulkActionsBar';import { useRowSelection } from '../hooks/useRowSelection';import StatCard from '../components/StatCard';import { PrintHeader,PrintFooter } from '../components/PrintHeader';import { money,todayStr } from '../utils/format';import { Download,Printer,CircleDollarSign,Receipt,TrendingUp,TrendingDown,Percent,Package,AlertTriangle,Users,CheckCircle2,Clock,Wallet,User,FileSignature,AlertCircle,Truck,CalendarRange } from 'lucide-react';
function monthStart(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`}

const shortDate=d=>new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short'});
const fmtFull=d=>d?new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'';

const REPORT_TITLES={pnl:'Profit & Loss Report',stock:'Stock Valuation Report',attendance:'Attendance Report',clients:'Client Ledger Report',suppliers:'Supplier Ledger Report',tax:'Tax Summary (VAT) Report'};

function exportCSV(filename,header,rows,cols){
  const lines=[header, ...rows.map(r=>cols.map(k=>typeof k==='function'?k(r):(r[k]??'')))];
  const csv=lines.map(l=>l.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
  const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url);
}

const TABS=[['pnl','Profit & Loss'],['stock','Stock Report'],['attendance','Attendance Report'],['clients','Client Ledger'],['suppliers','Supplier Ledger'],['tax','Tax Summary (VAT)']];

export default function ReportsPage(){
  const [tab,setTab]=useState('pnl');
  const [from,setFrom]=useState(monthStart()),[to,setTo]=useState(todayStr());

  const [pl,setPl]=useState(null); const [projects,setProjects]=useState([]);
  const [stock,setStock]=useState([]);
  const [att,setAtt]=useState(null);
  const [clients,setClients]=useState([]);
  const [suppliers,setSuppliers]=useState([]);
  const [tax,setTax]=useState(null);
  const [settings,setSettings]=useState(null);
  const [fiscalYear,setFiscalYear]=useState('');

  const loadPl=(f=from,t=to)=>api.get('/reports/profit-loss',{params:{from:f,to:t}}).then(r=>setPl(r.data));
  const loadAtt=(f=from,t=to)=>api.get('/reports/attendance',{params:{from:f,to:t}}).then(r=>setAtt(r.data));
  const loadTax=(f=from,t=to)=>api.get('/reports/tax-summary',{params:{from:f,to:t}}).then(r=>setTax(r.data));
  const loadStock=()=>api.get('/materials/stock/summary').then(r=>setStock(r.data));
  const loadClients=()=>api.get('/clients').then(r=>setClients(r.data));
  const loadSuppliers=()=>api.get('/suppliers').then(r=>setSuppliers(r.data));

  useEffect(()=>{
    loadPl();loadAtt();loadTax();
    api.get('/reports/project-profit').then(r=>setProjects(r.data));
    loadStock();loadClients();loadSuppliers();
    api.get('/settings').then(r=>setSettings(r.data)).catch(()=>{});
    api.get('/fiscal-years').then(r=>{const cur=r.data.find(y=>y.is_current);setFiscalYear(cur?(cur.name||cur.code):'')}).catch(()=>{});
  },[]);

  function generate(e){e.preventDefault();loadPl(from,to);loadAtt(from,to);loadTax(from,to)}

  const stockTotalValue=stock.reduce((s,r)=>s+Number(r.total_value||0),0);
  const stockLow=stock.filter(r=>r.status!=='In Stock').length;
  const clientsTotalDue=clients.reduce((s,r)=>s+Number(r.total_due||0),0);
  const suppliersTotalDue=suppliers.reduce((s,r)=>s+Number(r.total_due||0),0);
  const printPeriod=tab==='pnl'||tab==='attendance'?`${fmtFull(from)} – ${fmtFull(to)}`:(tab==='tax'&&tax)?`${fmtFull(tax.from)} – ${fmtFull(tax.to)}`:'';

  const projectsSel=useRowSelection(projects);
  const stockSel=useRowSelection(stock);
  const attSel=useRowSelection(att?.rows||[]);
  const clientsSel=useRowSelection(clients);
  const suppliersSel=useRowSelection(suppliers);

  return <>
    <div className="page-head no-print"><div><h1>Reports</h1><p>Company-wide reporting hub: profitability, stock, attendance, ledgers and tax.</p></div><button className="btn" onClick={()=>window.open(`/reports/${tab}/print`,'_blank')}><Printer size={15}/>Print Report</button></div>
    <p className="no-print print-hint">For clean PDF output, turn off "Headers and footers" in your browser's print settings.</p>

    <div className="tabs no-print" style={{overflowX:'auto',flexWrap:'nowrap'}}>
      {TABS.map(([key,label])=><button key={key} className={`tab ${tab===key?'active':''}`} style={{whiteSpace:'nowrap'}} onClick={()=>setTab(key)}>{label}</button>)}
    </div>

    {['pnl','attendance','tax'].includes(tab)&&<form className="filter-row no-print" onSubmit={generate}>
      <label>From<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label>
      <label>To<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label>
      <button className="btn primary">Generate</button>
    </form>}

    <div className="print-area">
    <PrintHeader settings={settings} fiscalYear={fiscalYear} title={REPORT_TITLES[tab]} period={printPeriod}/>

    {tab==='pnl'&&<>
      {pl&&<>
        <div className="stats-grid cols-4">
          <StatCard label="Total Income" value={money(pl.totalIncome)} sub="Collections Received" icon={<CircleDollarSign size={20}/>}/>
          <StatCard label="Total Expense" value={money(pl.totalExpense)} sub="Material + Labour + Other" icon={<Receipt size={20}/>}/>
          <StatCard label="Net Profit" value={money(pl.netProfit)} sub="Income - Expense" icon={<TrendingUp size={20}/>}/>
          <StatCard label="Profit Margin" value={Number(pl.profitMargin||0).toFixed(2)+'%'} sub="Net Profit / Income" icon={<Percent size={20}/>}/>
        </div>
        <div className="panel">
          <h3>Particulars</h3>
          <div className="pl-grid">
            <table><tbody>
              <tr><td>Total Contract Value</td><td>{money(pl.contractValue)}</td></tr>
              <tr><td>Total Invoice</td><td>{money(pl.totalInvoice)}</td></tr>
              <tr><td>Total Received</td><td>{money(pl.totalReceived)}</td></tr>
              <tr><td>Outstanding</td><td>{money(pl.outstanding)}</td></tr>
            </tbody></table>
            <table><tbody>
              <tr><td>Material Cost</td><td>{money(pl.materialCost)}</td></tr>
              <tr><td>Labour Cost</td><td>{money(pl.labourCost)}</td></tr>
              <tr><td>Other Expense</td><td>{money(pl.otherCost)}</td></tr>
              <tr className="pl-total-row"><td>Total Expense</td><td>{money(pl.totalExpense)}</td></tr>
            </tbody></table>
          </div>
          <div className={`profit-banner ${pl.netProfit<0?'negative':''}`}><span>Net Profit ({from} to {to})</span><b>{money(pl.netProfit)} ({Number(pl.profitMargin||0).toFixed(2)}%)</b></div>
        </div>
      </>}
      <div className="panel" style={{marginTop:16}}>
        <div className="panel-title"><h3>Project-wise Profitability</h3><button className="btn small no-print" onClick={()=>exportCSV(`project-profit-${todayStr()}.csv`,['Code','Project','Contract','Received','Expense','Cash Profit','Projected Profit','Margin %'],projects,[r=>r.project_code,r=>r.project_name,r=>r.finance?.contractValue,r=>r.finance?.totalReceived,r=>r.finance?.totalExpense,r=>r.finance?.currentCashProfit,r=>r.finance?.projectedProfit,r=>(r.finance?.profitMargin||0).toFixed(1)])}><Download size={15}/>Export</button></div>
        <BulkActionsBar count={projectsSel.count} onExport={()=>exportCSV(`project-profit-selected-${todayStr()}.csv`,['Code','Project','Contract','Received','Expense','Cash Profit','Projected Profit','Margin %'],projectsSel.selectedRows,[r=>r.project_code,r=>r.project_name,r=>r.finance?.contractValue,r=>r.finance?.totalReceived,r=>r.finance?.totalExpense,r=>r.finance?.currentCashProfit,r=>r.finance?.projectedProfit,r=>(r.finance?.profitMargin||0).toFixed(1)])} onClear={projectsSel.clear}/>
        <DataTable rows={projects} selection={projectsSel} columns={[{key:'project_code',label:'Code'},{key:'project_name',label:'Project'},{key:'contract_amount',label:'Contract',render:r=>money(r.finance?.contractValue)},{key:'received',label:'Received',render:r=>money(r.finance?.totalReceived)},{key:'expense',label:'Expense',render:r=>money(r.finance?.totalExpense)},{key:'cash',label:'Cash Profit',render:r=>money(r.finance?.currentCashProfit)},{key:'projected',label:'Projected Profit',render:r=>money(r.finance?.projectedProfit)},{key:'margin',label:'Margin',render:r=>(r.finance?.profitMargin||0).toFixed(1)+'%'}]}/>
      </div>
    </>}

    {tab==='stock'&&<>
      <div className="stats-grid cols-3">
        <StatCard label="Material Types" value={stock.length} sub="Tracked Items" icon={<Package size={20}/>}/>
        <StatCard label="Items Needing Attention" value={stockLow} sub="Low / Out of Stock" icon={<AlertTriangle size={20}/>}/>
        <StatCard label="Total Stock Value" value={money(stockTotalValue)} sub="At Current Rate" icon={<CircleDollarSign size={20}/>}/>
      </div>
      <div className="panel">
        <div className="panel-title"><h3>Stock Valuation Report</h3><button className="btn small no-print" onClick={()=>exportCSV(`stock-report-${todayStr()}.csv`,['Material','Category','Unit','Opening','Available','Rate','Value','Status'],stock,['name','category_name','unit','opening_stock','available','rate','total_value','status'])}><Download size={15}/>Export</button></div>
        <BulkActionsBar count={stockSel.count} onExport={()=>exportCSV(`stock-report-selected-${todayStr()}.csv`,['Material','Category','Unit','Opening','Available','Rate','Value','Status'],stockSel.selectedRows,['name','category_name','unit','opening_stock','available','rate','total_value','status'])} onClear={stockSel.clear}/>
        <DataTable rows={stock} selection={stockSel} empty="No materials tracked yet" columns={[
          {key:'name',label:'Material'},{key:'category_name',label:'Category',render:r=>r.category_name||'—'},{key:'unit',label:'Unit'},
          {key:'opening_stock',label:'Opening'},{key:'available',label:'Available'},{key:'rate',label:'Rate',render:r=>money(r.rate)},
          {key:'total_value',label:'Value',render:r=>money(r.total_value)},
          {key:'status',label:'Status',render:r=><span className={`badge ${r.status.toLowerCase().replaceAll(' ','-')}`}>{r.status}</span>}
        ]}/>
      </div>
    </>}

    {tab==='attendance'&&att&&<>
      <div className="stats-grid cols-4">
        <StatCard label="Employees" value={att.rows.length} sub="In Report Period" icon={<Users size={20}/>}/>
        <StatCard label="Total Present Days" value={att.rows.reduce((s,r)=>s+Number(r.present_days),0)} sub={`${from} to ${to}`} icon={<CheckCircle2 size={20}/>}/>
        <StatCard label="Total Hours" value={att.rows.reduce((s,r)=>s+Number(r.total_hours),0)} sub="Regular Hours" icon={<Clock size={20}/>}/>
        <StatCard label="Total Wage" value={money(att.rows.reduce((s,r)=>s+Number(r.total_wage),0))} sub="Calculated Amount" icon={<Wallet size={20}/>}/>
      </div>
      <div className="panel">
        <div className="panel-title"><h3>Attendance Summary</h3><button className="btn small no-print" onClick={()=>exportCSV(`attendance-report-${todayStr()}.csv`,['Code','Name','Designation','Present','Absent','Half Day','Leave','Holiday','Hours','Overtime','Wage'],att.rows,['employee_code','name','designation','present_days','absent_days','half_days','leave_days','holiday_days','total_hours','total_overtime','total_wage'])}><Download size={15}/>Export</button></div>
        <BulkActionsBar count={attSel.count} onExport={()=>exportCSV(`attendance-report-selected-${todayStr()}.csv`,['Code','Name','Designation','Present','Absent','Half Day','Leave','Holiday','Hours','Overtime','Wage'],attSel.selectedRows,['employee_code','name','designation','present_days','absent_days','half_days','leave_days','holiday_days','total_hours','total_overtime','total_wage'])} onClear={attSel.clear}/>
        <DataTable rows={att.rows} selection={attSel} empty="No employees found" columns={[
          {key:'employee_code',label:'Code'},{key:'name',label:'Name'},{key:'designation',label:'Designation'},
          {key:'present_days',label:'Present'},{key:'absent_days',label:'Absent'},{key:'half_days',label:'Half Day'},{key:'leave_days',label:'Leave'},{key:'holiday_days',label:'Holiday'},
          {key:'total_hours',label:'Hours'},{key:'total_overtime',label:'Overtime'},
          {key:'total_wage',label:'Wage',render:r=>money(r.total_wage)}
        ]}/>
      </div>
    </>}

    {tab==='clients'&&<>
      <div className="stats-grid cols-3">
        <StatCard label="Total Clients" value={clients.length} sub="Active" icon={<User size={20}/>}/>
        <StatCard label="Total Contract Value" value={money(clients.reduce((s,r)=>s+Number(r.contract_value||0),0))} sub="All Clients" icon={<FileSignature size={20}/>}/>
        <StatCard label="Total Receivable" value={money(clientsTotalDue)} sub="Outstanding Due" icon={<AlertCircle size={20}/>}/>
      </div>
      <div className="panel">
        <div className="panel-title"><h3>Client Ledger Summary</h3><button className="btn small no-print" onClick={()=>exportCSV(`client-ledger-${todayStr()}.csv`,['Client','Total Invoice','Total Received','Total Due'],clients,['name','total_invoice','total_received','total_due'])}><Download size={15}/>Export</button></div>
        <BulkActionsBar count={clientsSel.count} onExport={()=>exportCSV(`client-ledger-selected-${todayStr()}.csv`,['Client','Total Invoice','Total Received','Total Due'],clientsSel.selectedRows,['name','total_invoice','total_received','total_due'])} onClear={clientsSel.clear}/>
        <DataTable rows={clients} selection={clientsSel} empty="No clients found" columns={[
          {key:'name',label:'Client'},{key:'total_projects',label:'Projects'},
          {key:'total_invoice',label:'Total Invoice',render:r=>money(r.total_invoice)},
          {key:'total_received',label:'Total Received',render:r=>money(r.total_received)},
          {key:'total_due',label:'Total Due',render:r=><b style={{color:Number(r.total_due)>0?'#b45309':'#16a34a'}}>{money(r.total_due)}</b>}
        ]}/>
      </div>
    </>}

    {tab==='suppliers'&&<>
      <div className="stats-grid cols-3">
        <StatCard label="Total Suppliers" value={suppliers.length} sub="Active" icon={<Truck size={20}/>}/>
        <StatCard label="Total Purchase Amount" value={money(suppliers.reduce((s,r)=>s+Number(r.total_purchase_amount||0),0))} sub="All Suppliers" icon={<CircleDollarSign size={20}/>}/>
        <StatCard label="Total Payable" value={money(suppliersTotalDue)} sub="Outstanding Due" icon={<AlertCircle size={20}/>}/>
      </div>
      <div className="panel">
        <div className="panel-title"><h3>Supplier Ledger Summary</h3><button className="btn small no-print" onClick={()=>exportCSV(`supplier-ledger-${todayStr()}.csv`,['Supplier','Purchase Amount','Paid','Due'],suppliers,['name','total_purchase_amount','total_paid','total_due'])}><Download size={15}/>Export</button></div>
        <BulkActionsBar count={suppliersSel.count} onExport={()=>exportCSV(`supplier-ledger-selected-${todayStr()}.csv`,['Supplier','Purchase Amount','Paid','Due'],suppliersSel.selectedRows,['name','total_purchase_amount','total_paid','total_due'])} onClear={suppliersSel.clear}/>
        <DataTable rows={suppliers} selection={suppliersSel} empty="No suppliers found" columns={[
          {key:'name',label:'Supplier'},{key:'total_purchases',label:'Purchases'},
          {key:'total_purchase_amount',label:'Purchase Amount',render:r=>money(r.total_purchase_amount)},
          {key:'total_paid',label:'Paid',render:r=>money(r.total_paid)},
          {key:'total_due',label:'Due',render:r=><b style={{color:Number(r.total_due)>0?'#b45309':'#16a34a'}}>{money(r.total_due)}</b>}
        ]}/>
      </div>
    </>}

    {tab==='tax'&&tax&&<>
      <div className="stats-grid cols-4">
        <StatCard label="Output VAT (Sales)" value={money(tax.outputVat)} sub="Collected from Clients" icon={<TrendingUp size={20}/>}/>
        <StatCard label="Input VAT (Purchases)" value={money(tax.inputVat)} sub="Paid to Suppliers" icon={<TrendingDown size={20}/>}/>
        <StatCard label="Net VAT Payable" value={money(tax.netVatPayable)} sub="Output − Input" icon={<CircleDollarSign size={20}/>}/>
        <StatCard label="Period" value={`${shortDate(tax.from)} – ${shortDate(tax.to)}`} sub="Selected Range" icon={<CalendarRange size={20}/>}/>
      </div>
      <div className="panel">
        <h3>Tax Summary</h3>
        <div className="pl-grid">
          <table><tbody>
            <tr><td>Taxable Sales</td><td>{money(tax.taxableSales)}</td></tr>
            <tr><td>Output VAT</td><td>{money(tax.outputVat)}</td></tr>
            <tr><td>Total Sales (incl. VAT)</td><td>{money(tax.totalSales)}</td></tr>
          </tbody></table>
          <table><tbody>
            <tr><td>Taxable Purchases</td><td>{money(tax.taxablePurchases)}</td></tr>
            <tr><td>Input VAT</td><td>{money(tax.inputVat)}</td></tr>
            <tr><td>Total Purchases (incl. VAT)</td><td>{money(tax.totalPurchases)}</td></tr>
          </tbody></table>
        </div>
        <div className={`profit-banner ${tax.netVatPayable<0?'negative':''}`}><span>Net VAT Payable ({tax.from} to {tax.to})</span><b>{money(tax.netVatPayable)}</b></div>
      </div>
    </>}

    <PrintFooter/>
    </div>
  </>
}
