import { useEffect,useState } from 'react';import { useParams,useNavigate,Link } from 'react-router-dom';import api from '../services/api';import DataTable from '../components/DataTable';import { money,fmtDate } from '../utils/format';import { ArrowLeft } from 'lucide-react';

const ACTION_LABELS={CREATE:'Created',UPDATE:'Updated',DELETE:'Deleted',RETURN:'Returned'};
const TABS=[['overview','Overview'],['assignments','Assignments'],['maintenance','Maintenance'],['rentals','Rentals'],['activity','Activity']];

export default function EquipmentDetailPage(){
  const {id}=useParams(); const nav=useNavigate();
  const [tab,setTab]=useState('overview');
  const [data,setData]=useState(null);

  const load=()=>api.get(`/equipment/${id}`).then(r=>setData(r.data));
  useEffect(()=>{load()},[id]);

  if(!data)return <div className="loading">Loading equipment...</div>;
  const {equipment:eq,assignments,maintenance,rentals,timeline,utilizationStats:u}=data;

  return <>
    <div className="page-head"><div><h1>{eq.name}</h1><p>Equipment / {eq.equipment_code||eq.type||'—'}</p></div><button className="btn" onClick={()=>nav('/equipment')}><ArrowLeft size={15}/>Back to Equipment</button></div>
    <div className="tabs" style={{overflowX:'auto',flexWrap:'nowrap'}}>
      {TABS.map(([key,label])=><button key={key} className={`tab ${tab===key?'active':''}`} style={{whiteSpace:'nowrap'}} onClick={()=>setTab(key)}>{label}</button>)}
    </div>

    {tab==='overview'&&<div className="progress-layout">
      <div className="panel">
        <h3>Equipment Info</h3>
        <div className="info-list">
          <div className="row"><span>Code</span><b>{eq.equipment_code||'—'}</b></div>
          <div className="row"><span>Type</span><b>{eq.type||'—'}</b></div>
          <div className="row"><span>Status</span><b><span className={`badge ${eq.status.toLowerCase().replaceAll(' ','-')}`}>{eq.status}</span></b></div>
          <div className="row"><span>Purchase Cost</span><b>{money(eq.purchase_cost)}</b></div>
          <div className="row"><span>Current Value</span><b>{money(eq.current_value)}</b></div>
        </div>
        <h3 style={{marginTop:18}}>Notes</h3>
        <p style={{fontSize:13,color:'#475569',whiteSpace:'pre-wrap'}}>{eq.notes||'—'}</p>
      </div>
      <div className="panel">
        <h3>Utilization Summary</h3>
        <div className="info-list">
          <div className="row"><span>Total Assignments</span><b>{u.assignmentCount}</b></div>
          <div className="row"><span>Total Days Assigned</span><b>{u.totalAssignedDays}</b></div>
          <div className="row"><span>Maintenance Records</span><b>{u.maintenanceCount}</b></div>
          <div className="row"><span>Total Maintenance Cost</span><b>{money(u.totalMaintenanceCost)}</b></div>
          <div className="row"><span>Rental Contracts</span><b>{u.rentalCount}</b></div>
          <div className="row"><span>Rental Income</span><b>{money(u.totalRentalIncome)}</b></div>
          <div className="row"><span>Rental Expense</span><b>{money(u.totalRentalExpense)}</b></div>
        </div>
        <div className={`profit-banner ${u.netRentalProfit<0?'negative':''}`} style={{marginTop:14}}><span>Net Rental Profit</span><b>{money(u.netRentalProfit)}</b></div>
      </div>
    </div>}

    {tab==='assignments'&&<div className="panel">
      <div className="panel-title"><h3>Assignment History</h3><Link to="/equipment">Manage Equipment</Link></div>
      <DataTable rows={assignments} empty="No project assignments yet" columns={[
        {key:'project_name',label:'Project',render:r=>r.project_name||'—'},
        {key:'assigned_date',label:'Assigned',render:r=>fmtDate(r.assigned_date)},{key:'returned_date',label:'Returned',render:r=>r.returned_date?fmtDate(r.returned_date):<span className="badge running">Active</span>},
        {key:'fuel_cost',label:'Fuel Cost',render:r=>money(r.fuel_cost)},{key:'remarks',label:'Remarks',render:r=>r.remarks||'—'}
      ]}/>
    </div>}

    {tab==='maintenance'&&<div className="panel">
      <div className="panel-title"><h3>Maintenance History</h3><Link to="/equipment">Manage Equipment</Link></div>
      <DataTable rows={maintenance} empty="No maintenance recorded yet" columns={[
        {key:'maintenance_date',label:'Date',render:r=>fmtDate(r.maintenance_date)},{key:'description',label:'Description',render:r=>r.description||'—'},
        {key:'cost',label:'Cost',render:r=>money(r.cost)},{key:'next_service_date',label:'Next Service',render:r=>fmtDate(r.next_service_date)}
      ]}/>
    </div>}

    {tab==='rentals'&&<div className="panel">
      <div className="panel-title"><h3>Rental History</h3><Link to="/equipment">Manage Equipment</Link></div>
      <DataTable rows={rentals} empty="No rental contracts yet" columns={[
        {key:'customer_name',label:'Customer',render:r=>r.customer_name||'—'},{key:'start_date',label:'Start',render:r=>fmtDate(r.start_date)},{key:'end_date',label:'End',render:r=>fmtDate(r.end_date)},
        {key:'rental_income',label:'Income',render:r=>money(r.rental_income)},{key:'rental_expense',label:'Expense',render:r=>money(r.rental_expense)},
        {key:'status',label:'Status',render:r=><span className="badge">{r.status}</span>}
      ]}/>
    </div>}

    {tab==='activity'&&<div className="panel">
      <h3>Activity Timeline</h3>
      {timeline?.length?<ul className="mini-list">
        {timeline.map((t,i)=><li key={i}>
          <div><span className="ml-main">{ACTION_LABELS[t.action]||t.action}</span><div className="ml-sub">{t.user_name||'System'} · {new Date(t.created_at).toLocaleString('en-IN')}</div></div>
        </li>)}
      </ul>:<p style={{color:'#94a3b8'}}>No activity recorded yet.</p>}
    </div>}
  </>
}
