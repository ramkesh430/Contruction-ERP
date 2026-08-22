import { useEffect,useState } from 'react';import { Bar,Doughnut,Line } from 'react-chartjs-2';import { Chart as ChartJS,ArcElement,BarElement,LineElement,PointElement,CategoryScale,LinearScale,Tooltip,Legend } from 'chart.js';import { useNavigate } from 'react-router-dom';import api from '../services/api';import StatCard from '../components/StatCard';import DataTable from '../components/DataTable';import { fmtDate,todayStr } from '../utils/format';import { Download,Printer,Building2,Activity,CheckCircle2,ClipboardList,PauseCircle,AlertTriangle,FileSignature,Calculator,ReceiptText,Wallet,AlertCircle,Receipt,Package,HardHat,CircleDollarSign,TrendingUp,Percent,User,Truck,Users,PackageX,FileClock,CalendarClock } from 'lucide-react';
ChartJS.register(ArcElement,BarElement,LineElement,PointElement,CategoryScale,LinearScale,Tooltip,Legend);
const money=n=>'Rs. '+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0});
const MONTH_NAMES=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const monthLabel=m=>{const [y,mo]=m.split('-');return `${MONTH_NAMES[Number(mo)-1]} ${y}`;};

export default function DashboardPage(){
  const [d,setD]=useState(null);
  const [projects,setProjects]=useState([]);
  const [fiscalYears,setFiscalYears]=useState([]);
  const [filters,setFilters]=useState({from:'',to:'',project_id:'',fiscal_year_id:''});
  const nav=useNavigate();

  function loadDashboard(f){
    const params={};
    if(f.from)params.from=f.from; if(f.to)params.to=f.to;
    if(f.project_id)params.project_id=f.project_id; if(f.fiscal_year_id)params.fiscal_year_id=f.fiscal_year_id;
    return api.get('/dashboard',{params}).then(r=>setD(r.data)).catch(()=>setD({cards:{}}));
  }
  useEffect(()=>{ loadDashboard(filters); api.get('/projects').then(r=>setProjects(r.data)); api.get('/fiscal-years').then(r=>setFiscalYears(r.data)); },[]);

  function applyFilters(e){ e?.preventDefault(); loadDashboard(filters); }
  function resetFilters(){ const f={from:'',to:'',project_id:'',fiscal_year_id:''}; setFilters(f); loadDashboard(f); }

  function exportCSV(){
    const rows=[['Metric','Value']];
    allCards.forEach(x=>rows.push([x[0], typeof x[1]==='string'?x[1].replace('Rs. ',''):x[1]]));
    const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=`dashboard-${todayStr()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  if(!d)return <div className="loading">Loading dashboard...</div>;
  const c=d.cards||{};

  const projectCards=[
    ['Total Projects',c.totalProjects||0,'All Projects',<Building2 size={20}/>,()=>nav('/projects')],
    ['Running Projects',c.runningProjects||0,'Active Sites',<Activity size={20}/>,()=>nav('/projects')],
    ['Completed Projects',c.completedProjects||0,'Finished',<CheckCircle2 size={20}/>,()=>nav('/projects')],
    ['Planning Projects',c.planningProjects||0,'Not Started',<ClipboardList size={20}/>,()=>nav('/projects')],
    ['On-Hold Projects',c.onHoldProjects||0,'Paused',<PauseCircle size={20}/>,()=>nav('/projects'),'warn'],
    ['Delayed Projects',c.delayedProjects||0,'Past Deadline',<AlertTriangle size={20}/>,()=>nav('/projects'),'danger'],
  ];
  const financialCards=[
    ['Total Contract Value',money(c.contractValue),'Contracted',<FileSignature size={20}/>],
    ['Total Estimated Cost',money(c.estimatedCost),'Budgeted',<Calculator size={20}/>],
    ['Total Invoice',money(c.totalInvoice),'Billed',<ReceiptText size={20}/>,()=>nav('/invoices')],
    ['Total Collection',money(c.totalCollection),'Received',<Wallet size={20}/>,()=>nav('/payments')],
    ['Total Outstanding',money(c.outstanding),'Unpaid',<AlertCircle size={20}/>,()=>nav('/invoices'),'warn'],
    ['Total Expense',money(c.totalExpense),'All Costs',<Receipt size={20}/>,()=>nav('/expenses')],
  ];
  const costCards=[
    ['Material Cost',money(c.materialCost),'Consumed',<Package size={20}/>,()=>nav('/materials')],
    ['Labour Cost',money(c.labourCost),'From Attendance',<HardHat size={20}/>,()=>nav('/attendance')],
    ['Other Cost',money(c.otherCost),'Misc. Expenses',<CircleDollarSign size={20}/>,()=>nav('/expenses')],
  ];
  const profitCards=[
    ['Current Cash Profit',money(c.currentCashProfit),'Collection − Expense',<Wallet size={20}/>],
    ['Current Earned Profit',money(c.currentEarnedProfit),'Earned Revenue − Expense',<TrendingUp size={20}/>],
    ['Projected Profit',money(c.projectedProfit),'Contract − Expense',<TrendingUp size={20}/>,undefined,'good'],
    ['Profit Margin',Number(c.profitMargin||0).toFixed(2)+'%','Projected / Contract',<Percent size={20}/>],
  ];
  const opsCards=[
    ['Client Due',money(c.clientDue),'Outstanding',<User size={20}/>,()=>nav('/clients'),'warn'],
    ['Supplier Due',money(c.supplierDue),'Payable',<Truck size={20}/>,()=>nav('/suppliers'),'warn'],
    ['Pending Salary',money(c.pendingSalary),'This Month',<Wallet size={20}/>,()=>nav('/salary'),'warn'],
    ['Workers Present',`${c.presentToday||0} / ${c.totalWorkers||0}`,'Today',<Users size={20}/>,()=>nav('/attendance')],
    ['Low Stock Items',c.lowStockItems||0,'Need Reorder',<PackageX size={20}/>,()=>nav('/materials'),'danger'],
    ['Pending Quotations',c.pendingApprovals||0,'Awaiting Approval',<FileClock size={20}/>,()=>nav('/quotations'),'warn'],
    ['Pending Expenses',c.pendingExpenseApprovals||0,c.pendingExpenseAmount?money(c.pendingExpenseAmount)+' awaiting approval':'Awaiting Approval',<FileClock size={20}/>,()=>nav('/expenses'),'warn'],
    ['Upcoming Deadlines',c.upcomingDeadlines||0,'Next 30 Days',<CalendarClock size={20}/>,()=>nav('/projects'),'warn'],
    ['Overdue Invoices',c.overdueInvoices||0,'Past Due Date',<AlertTriangle size={20}/>,()=>nav('/invoices'),'danger'],
  ];
  const allCards=[...projectCards,...financialCards,...costCards,...profitCards,...opsCards];

  const weekly=d.weekly?.length?d.weekly:[{label:'Week 1',income:0,expense:0}];
  const incomeExpenseBar={labels:weekly.map(w=>w.label),datasets:[
    {label:'Income',data:weekly.map(w=>w.income),backgroundColor:'#22c55e'},
    {label:'Expense',data:weekly.map(w=>w.expense),backgroundColor:'#ef4444'}
  ]};
  const donut={labels:['Running','Completed','Other'],datasets:[{data:[c.runningProjects||0,c.completedProjects||0,Math.max(0,(c.totalProjects||0)-(c.runningProjects||0)-(c.completedProjects||0))],backgroundColor:['#f59e0b','#22c55e','#94a3b8']}]};
  const monthlyCollection=d.monthlyCollection||[];
  const collectionBar={labels:monthlyCollection.map(m=>monthLabel(m.month)),datasets:[{label:'Collection',data:monthlyCollection.map(m=>m.amount),backgroundColor:'#22c55e'}]};
  const monthlyExpense=d.monthlyExpense||[];
  const expenseBar={labels:monthlyExpense.map(m=>monthLabel(m.month)),datasets:[{label:'Expense',data:monthlyExpense.map(m=>m.amount),backgroundColor:'#ef4444'}]};
  const cashFlow=d.cashFlow||[];
  const cashFlowLine={labels:cashFlow.map(m=>monthLabel(m.month)),datasets:[{label:'Net Cash Flow',data:cashFlow.map(m=>m.net),borderColor:'#2563eb',backgroundColor:'rgba(37,99,235,.12)',fill:true,tension:.3}]};
  const projectProfit=d.projectProfit||[];
  const profitBar={labels:projectProfit.map(p=>p.project_name),datasets:[{label:'Projected Profit',data:projectProfit.map(p=>p.projectedProfit),backgroundColor:'#2563eb'}]};
  const expenseCategory=d.expenseCategory||[];
  const catColors=['#2563eb','#22c55e','#f59e0b','#ef4444','#8b5cf6','#0891b2','#db2777','#84cc16'];
  const catDonut={labels:expenseCategory.map(x=>x.category),datasets:[{data:expenseCategory.map(x=>x.amt),backgroundColor:expenseCategory.map((_,i)=>catColors[i%catColors.length])}]};

  return <>
    <div className="page-head">
      <div><h1>Dashboard</h1><p>Welcome back. Here’s what’s happening with your construction business.</p></div>
      <div className="row-actions">
        <button className="btn" onClick={exportCSV}><Download size={15}/>Export</button>
        <button className="btn" onClick={()=>window.print()}><Printer size={15}/>Print</button>
        <button className="btn primary" onClick={()=>nav('/projects')}>+ Add New</button>
      </div>
    </div>

    <form className="filter-row" onSubmit={applyFilters}>
      <label>From<input type="date" value={filters.from} onChange={e=>setFilters({...filters,from:e.target.value})}/></label>
      <label>To<input type="date" value={filters.to} onChange={e=>setFilters({...filters,to:e.target.value})}/></label>
      <label>Project<select value={filters.project_id} onChange={e=>setFilters({...filters,project_id:e.target.value})}><option value="">All Projects</option>{projects.map(p=><option key={p.id} value={p.id}>{p.project_name}</option>)}</select></label>
      <label>Fiscal Year<select value={filters.fiscal_year_id} onChange={e=>setFilters({...filters,fiscal_year_id:e.target.value})}><option value="">All Time</option>{fiscalYears.map(fy=><option key={fy.id} value={fy.id}>{fy.name||fy.code}</option>)}</select></label>
      <button className="btn primary">Apply</button>
      <button type="button" className="btn" onClick={resetFilters}>Reset</button>
    </form>

    <div className="dash-section-title">Projects</div>
    <div className="stats-grid cols-6">{projectCards.map(x=><StatCard key={x[0]} label={x[0]} value={x[1]} sub={x[2]} icon={x[3]} onClick={x[4]} tone={x[5]}/>)}</div>

    <div className="dash-section-title">Financials</div>
    <div className="stats-grid cols-6">{financialCards.map(x=><StatCard key={x[0]} label={x[0]} value={x[1]} sub={x[2]} icon={x[3]} onClick={x[4]} tone={x[5]}/>)}</div>

    <div className="dash-section-title">Cost Breakdown</div>
    <div className="stats-grid cols-3">{costCards.map(x=><StatCard key={x[0]} label={x[0]} value={x[1]} sub={x[2]} icon={x[3]} onClick={x[4]} tone={x[5]}/>)}</div>

    <div className="dash-section-title">Profitability</div>
    <div className="stats-grid cols-4">{profitCards.map(x=><StatCard key={x[0]} label={x[0]} value={x[1]} sub={x[2]} icon={x[3]} onClick={x[4]} tone={x[5]}/>)}</div>

    <div className="dash-section-title">Operations & Alerts</div>
    <div className="stats-grid cols-4">{opsCards.map(x=><StatCard key={x[0]} label={x[0]} value={x[1]} sub={x[2]} icon={x[3]} onClick={x[4]} tone={x[5]}/>)}</div>

    <div className="dash-section-title">Charts</div>
    <div className="charts-wall">
      <div className="panel"><h3>Project Progress Overview</h3><div className="chart-box"><Doughnut data={donut} options={{responsive:true,maintainAspectRatio:false}}/></div></div>
      <div className="panel"><h3>Income vs Expense (This Month)</h3><div className="chart-box"><Bar data={incomeExpenseBar} options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,position:'bottom'}}}}/></div></div>
      <div className="panel"><h3>Monthly Collection</h3><div className="chart-box"><Bar data={collectionBar} options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}}/></div></div>
      <div className="panel"><h3>Monthly Expense</h3><div className="chart-box"><Bar data={expenseBar} options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}}/></div></div>
      <div className="panel"><h3>Cash Flow (Net, Monthly)</h3><div className="chart-box"><Line data={cashFlowLine} options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}}/></div></div>
      <div className="panel"><h3>Project-wise Profit</h3><div className="chart-box"><Bar data={profitBar} options={{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}}/></div></div>
      <div className="panel"><h3>Expense Category Breakdown</h3><div className="chart-box"><Doughnut data={catDonut} options={{responsive:true,maintainAspectRatio:false}}/></div></div>
    </div>

    <div className="dash-section-title">Recent Activity</div>
    <div className="list-wall">
      <div className="panel"><div className="panel-title"><h3>Recent Projects</h3><a href="/projects">View All</a></div><DataTable rows={d.recentProjects||[]} empty="No projects yet" columns={[{key:'project_name',label:'Project'},{key:'progress_percentage',label:'Progress',render:r=><div className="progress-cell"><span>{Number(r.progress_percentage||0).toFixed(0)}%</span><i><b style={{width:`${r.progress_percentage||0}%`}}/></i></div>},{key:'status',label:'Status',render:r=><span className={`badge ${r.status?.toLowerCase().replaceAll(' ','-')}`}>{r.status}</span>}]}/></div>
      <div className="panel"><div className="panel-title"><h3>Recent Invoices</h3><a href="/invoices">View All</a></div><DataTable rows={d.recentInvoices||[]} empty="No invoices yet" columns={[{key:'invoice_no',label:'Invoice No.'},{key:'grand_total',label:'Amount',render:r=>money(r.grand_total)},{key:'status',label:'Status',render:r=><span className={`badge ${r.status?.toLowerCase().replaceAll(' ','-')}`}>{r.status}</span>}]}/></div>
      <div className="panel"><div className="panel-title"><h3>Recent Payments</h3><a href="/payments">View All</a></div><DataTable rows={d.recentPayments||[]} empty="No payments yet" columns={[{key:'receipt_no',label:'Receipt No.'},{key:'client_name',label:'Client'},{key:'amount',label:'Amount',render:r=>money(r.amount)}]}/></div>
      <div className="panel"><div className="panel-title"><h3>Recent Expenses</h3><a href="/expenses">View All</a></div><DataTable rows={d.recentExpenses||[]} empty="No expenses yet" columns={[{key:'expense_date',label:'Date',render:r=>fmtDate(r.expense_date)},{key:'description',label:'Description'},{key:'amount',label:'Amount',render:r=>money(r.amount)}]}/></div>
      <div className="panel"><div className="panel-title"><h3>Low Stock Alert</h3><a href="/materials">View All</a></div><DataTable rows={d.lowStockAlert||[]} empty="Nothing low on stock" columns={[{key:'name',label:'Material'},{key:'available',label:'Available',render:r=><span style={{color:Number(r.available)<=0?'#dc2626':'#b45309',fontWeight:700}}>{Number(r.available).toLocaleString('en-IN')} {r.unit}</span>},{key:'minimum_stock',label:'Min. Stock'}]}/></div>
      <div className="panel"><div className="panel-title"><h3>Pending Quotations</h3><a href="/quotations">View All</a></div><DataTable rows={d.pendingApprovals||[]} empty="Nothing pending approval" columns={[{key:'quotation_no',label:'Quote No.'},{key:'client_name',label:'Client'},{key:'grand_total',label:'Amount',render:r=>money(r.grand_total)}]}/></div>
      <div className="panel"><div className="panel-title"><h3>Pending Expense Approvals</h3><a href="/expenses">View All</a></div><DataTable rows={d.pendingExpenseApprovals||[]} empty="Nothing pending approval" columns={[{key:'expense_date',label:'Date',render:r=>fmtDate(r.expense_date)},{key:'description',label:'Description',render:r=>r.description||r.expense_type},{key:'project_name',label:'Project',render:r=>r.project_name||'General'},{key:'amount',label:'Amount',render:r=>money(r.amount)}]}/></div>
    </div>
  </>
}
