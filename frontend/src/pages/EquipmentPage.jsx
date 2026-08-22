import { useEffect,useState } from 'react';import { useNavigate } from 'react-router-dom';import api from '../services/api';import Modal from '../components/Modal';import DataTable from '../components/DataTable';import BulkActionsBar from '../components/BulkActionsBar';import { useRowSelection } from '../hooks/useRowSelection';import { money,fmtDate,todayStr } from '../utils/format';import { Eye,Pencil,Trash2,Printer } from 'lucide-react';

const eqFields=[['name','Equipment Name','text'],['equipment_code','Code','text'],['type','Type','text'],['purchase_cost','Purchase Cost','number'],['current_value','Current Value','number'],['status','Status','select',['Available','Assigned','On Site','Rented Out','Maintenance','Damaged','Inactive']]];

export default function EquipmentPage(){
  const nav=useNavigate();
  const [tab,setTab]=useState('equipment');
  const [equipment,setEquipment]=useState([]),[projects,setProjects]=useState([]);
  const [assignments,setAssignments]=useState([]),[maintenance,setMaintenance]=useState([]),[rentals,setRentals]=useState([]);

  const [eqOpen,setEqOpen]=useState(false),[eqMode,setEqMode]=useState('create'),[eqId,setEqId]=useState(null),[eqForm,setEqForm]=useState({}),[eqErr,setEqErr]=useState('');
  const [asgOpen,setAsgOpen]=useState(false),[asgMode,setAsgMode]=useState('create'),[asgId,setAsgId]=useState(null),[asgForm,setAsgForm]=useState({});
  const [mntOpen,setMntOpen]=useState(false),[mntMode,setMntMode]=useState('create'),[mntId,setMntId]=useState(null),[mntForm,setMntForm]=useState({});
  const [rntOpen,setRntOpen]=useState(false),[rntMode,setRntMode]=useState('create'),[rntId,setRntId]=useState(null),[rntForm,setRntForm]=useState({status:'Active'});

  const loadAll=()=>Promise.all([
    api.get('/equipment'),api.get('/projects'),
    api.get('/equipment-assignments'),api.get('/equipment-maintenance'),api.get('/equipment-rentals')
  ]).then(([e,p,a,m,r])=>{setEquipment(e.data);setProjects(p.data);setAssignments(a.data);setMaintenance(m.data);setRentals(r.data)});
  useEffect(()=>{loadAll()},[]);

  function openCreateEq(){setEqMode('create');setEqId(null);setEqForm({});setEqErr('');setEqOpen(true)}
  function openEditEq(row){setEqMode('edit');setEqId(row.id);setEqForm(row);setEqErr('');setEqOpen(true)}
  async function saveEq(e){e.preventDefault();setEqErr('');try{if(eqMode==='edit'){await api.put(`/equipment/${eqId}`,eqForm)}else{await api.post('/equipment',eqForm)}setEqOpen(false);loadAll()}catch(e){setEqErr(e.response?.data?.message||'Save failed')}}
  async function removeEq(row){if(!confirm('Delete this equipment?'))return;await api.delete(`/equipment/${row.id}`);loadAll()}

  function openCreateAsg(){setAsgMode('create');setAsgId(null);setAsgForm({});setAsgOpen(true)}
  function openEditAsg(row){setAsgMode('edit');setAsgId(row.id);setAsgForm({...row,assigned_date:row.assigned_date?String(row.assigned_date).slice(0,10):'',returned_date:row.returned_date?String(row.returned_date).slice(0,10):''});setAsgOpen(true)}
  async function saveAssignment(e){e.preventDefault();if(asgMode==='edit'){await api.put(`/equipment-assignments/${asgId}`,asgForm)}else{await api.post('/equipment-assignments',asgForm)}setAsgOpen(false);setAsgForm({});loadAll()}
  async function returnEq(row){await api.post(`/equipment-assignments/${row.id}/return`,{});loadAll()}
  async function removeAssignment(row){if(!confirm('Delete this assignment record?'))return;await api.delete(`/equipment-assignments/${row.id}`);loadAll()}

  function openCreateMnt(){setMntMode('create');setMntId(null);setMntForm({});setMntOpen(true)}
  function openEditMnt(row){setMntMode('edit');setMntId(row.id);setMntForm({...row,maintenance_date:row.maintenance_date?String(row.maintenance_date).slice(0,10):'',next_service_date:row.next_service_date?String(row.next_service_date).slice(0,10):''});setMntOpen(true)}
  async function saveMaintenance(e){e.preventDefault();if(mntMode==='edit'){await api.put(`/equipment-maintenance/${mntId}`,mntForm)}else{await api.post('/equipment-maintenance',mntForm)}setMntOpen(false);setMntForm({});loadAll()}
  async function removeMaintenance(row){if(!confirm('Delete this maintenance record?'))return;await api.delete(`/equipment-maintenance/${row.id}`);loadAll()}

  function openCreateRnt(){setRntMode('create');setRntId(null);setRntForm({status:'Active'});setRntOpen(true)}
  function openEditRnt(row){setRntMode('edit');setRntId(row.id);setRntForm({...row,start_date:row.start_date?String(row.start_date).slice(0,10):'',end_date:row.end_date?String(row.end_date).slice(0,10):''});setRntOpen(true)}
  async function saveRental(e){e.preventDefault();if(rntMode==='edit'){await api.put(`/equipment-rentals/${rntId}`,rntForm)}else{await api.post('/equipment-rentals',rntForm)}setRntOpen(false);setRntForm({status:'Active'});loadAll()}
  async function removeRental(row){if(!confirm('Delete this rental record?'))return;await api.delete(`/equipment-rentals/${row.id}`);loadAll()}

  const [eqFilters,setEqFilters]=useState({search:'',type:'',status:''});
  const equipmentTypes=[...new Set(equipment.map(e=>e.type).filter(Boolean))];
  const filteredEquipment=equipment.filter(r=>{
    if(eqFilters.search&&!(r.name||'').toLowerCase().includes(eqFilters.search.toLowerCase())&&!(r.equipment_code||'').toLowerCase().includes(eqFilters.search.toLowerCase()))return false;
    if(eqFilters.type&&r.type!==eqFilters.type)return false;
    if(eqFilters.status&&r.status!==eqFilters.status)return false;
    return true;
  });
  const [asgFilters,setAsgFilters]=useState({equipment_id:'',project_id:'',active:''});
  const filteredAssignments=assignments.filter(r=>{
    if(asgFilters.equipment_id&&String(r.equipment_id)!==String(asgFilters.equipment_id))return false;
    if(asgFilters.project_id&&String(r.project_id)!==String(asgFilters.project_id))return false;
    if(asgFilters.active==='active'&&r.returned_date)return false;
    if(asgFilters.active==='returned'&&!r.returned_date)return false;
    return true;
  });
  const [mntFilters,setMntFilters]=useState({equipment_id:''});
  const filteredMaintenance=maintenance.filter(r=>{
    if(mntFilters.equipment_id&&String(r.equipment_id)!==String(mntFilters.equipment_id))return false;
    return true;
  });
  const [rntFilters,setRntFilters]=useState({equipment_id:'',status:''});
  const filteredRentals=rentals.filter(r=>{
    if(rntFilters.equipment_id&&String(r.equipment_id)!==String(rntFilters.equipment_id))return false;
    if(rntFilters.status&&r.status!==rntFilters.status)return false;
    return true;
  });

  function exportCSV(list,cols,header,filename){
    const lines=[header, ...list.map(r=>cols.map(k=>r[k]??''))];
    const csv=lines.map(l=>l.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=`${filename}-${todayStr()}.csv`; a.click(); URL.revokeObjectURL(url);
  }
  const eqSel=useRowSelection(filteredEquipment);
  async function bulkDeleteEq(){
    if(!confirm(`Delete ${eqSel.count} selected equipment record(s)?`))return;
    await Promise.all([...eqSel.selectedIds].map(id=>api.delete(`/equipment/${id}`)));
    eqSel.clear(); loadAll();
  }
  const asgSel=useRowSelection(filteredAssignments);
  async function bulkDeleteAsg(){
    if(!confirm(`Delete ${asgSel.count} selected assignment record(s)?`))return;
    await Promise.all([...asgSel.selectedIds].map(id=>api.delete(`/equipment-assignments/${id}`)));
    asgSel.clear(); loadAll();
  }
  const mntSel=useRowSelection(filteredMaintenance);
  async function bulkDeleteMnt(){
    if(!confirm(`Delete ${mntSel.count} selected maintenance record(s)?`))return;
    await Promise.all([...mntSel.selectedIds].map(id=>api.delete(`/equipment-maintenance/${id}`)));
    mntSel.clear(); loadAll();
  }
  const rntSel=useRowSelection(filteredRentals);
  async function bulkDeleteRnt(){
    if(!confirm(`Delete ${rntSel.count} selected rental record(s)?`))return;
    await Promise.all([...rntSel.selectedIds].map(id=>api.delete(`/equipment-rentals/${id}`)));
    rntSel.clear(); loadAll();
  }

  const eqColumns=[...eqFields.map(([key,label])=>({key,label,render:key.includes('cost')||key==='current_value'?r=>money(r[key]):(key==='status'?r=><span className={`badge ${r.status.toLowerCase().replaceAll(' ','-')}`}>{r.status}</span>:undefined)})),
    {key:'_actions',label:'Action',render:r=><div className="row-actions">
      <button type="button" className="icon-btn" title="View" onClick={()=>nav(`/equipment/${r.id}`)}><Eye size={15}/></button>
      <button type="button" className="icon-btn" title="Edit" onClick={()=>openEditEq(r)}><Pencil size={15}/></button>
      <button type="button" className="icon-btn danger" title="Delete" onClick={()=>removeEq(r)}><Trash2 size={15}/></button>
    </div>}];

  return <>
    <div className="page-head"><div><h1>Equipment</h1><p>Manage equipment, site assignments, maintenance and rentals.</p></div>
      <div className="row-actions">
        <button className="btn" onClick={()=>window.open('/reports/equipment/print','_blank')}><Printer size={15}/>Print Report</button>
        {tab==='equipment'&&<button className="btn primary" onClick={openCreateEq}>+ Add Equipment</button>}
        {tab==='assignments'&&<button className="btn primary" onClick={openCreateAsg}>+ Assign to Project</button>}
        {tab==='maintenance'&&<button className="btn primary" onClick={openCreateMnt}>+ Log Maintenance</button>}
        {tab==='rentals'&&<button className="btn primary" onClick={openCreateRnt}>+ Add Rental</button>}
      </div>
    </div>
    <div className="tabs">
      <button className={`tab ${tab==='equipment'?'active':''}`} onClick={()=>setTab('equipment')}>Equipment</button>
      <button className={`tab ${tab==='assignments'?'active':''}`} onClick={()=>setTab('assignments')}>Assignments</button>
      <button className={`tab ${tab==='maintenance'?'active':''}`} onClick={()=>setTab('maintenance')}>Maintenance</button>
      <button className={`tab ${tab==='rentals'?'active':''}`} onClick={()=>setTab('rentals')}>Rentals</button>
    </div>

    {tab==='equipment'&&<>
      <div className="filter-row">
        <label>Search<input placeholder="Name or code" value={eqFilters.search} onChange={e=>setEqFilters({...eqFilters,search:e.target.value})}/></label>
        <label>Type<select value={eqFilters.type} onChange={e=>setEqFilters({...eqFilters,type:e.target.value})}><option value="">All</option>{equipmentTypes.map(t=><option key={t}>{t}</option>)}</select></label>
        <label>Status<select value={eqFilters.status} onChange={e=>setEqFilters({...eqFilters,status:e.target.value})}><option value="">All</option>{['Available','Assigned','On Site','Rented Out','Maintenance','Damaged','Inactive'].map(s=><option key={s}>{s}</option>)}</select></label>
        <button type="button" className="btn" onClick={()=>setEqFilters({search:'',type:'',status:''})}>Reset</button>
      </div>
      <BulkActionsBar count={eqSel.count} onExport={()=>exportCSV(eqSel.selectedRows,['name','equipment_code','type','purchase_cost','current_value','status'],['Name','Code','Type','Purchase Cost','Current Value','Status'],'equipment')} onDelete={bulkDeleteEq} onClear={eqSel.clear}/>
      <div className="panel"><DataTable rows={filteredEquipment} selection={eqSel} empty="No equipment match the current filters" columns={eqColumns}/></div>
    </>}

    {tab==='assignments'&&<>
      <div className="filter-row">
        <label>Equipment<select value={asgFilters.equipment_id} onChange={e=>setAsgFilters({...asgFilters,equipment_id:e.target.value})}><option value="">All</option>{equipment.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label>Project<select value={asgFilters.project_id} onChange={e=>setAsgFilters({...asgFilters,project_id:e.target.value})}><option value="">All</option>{projects.map(x=><option key={x.id} value={x.id}>{x.project_name}</option>)}</select></label>
        <label>Status<select value={asgFilters.active} onChange={e=>setAsgFilters({...asgFilters,active:e.target.value})}><option value="">All</option><option value="active">Active</option><option value="returned">Returned</option></select></label>
        <button type="button" className="btn" onClick={()=>setAsgFilters({equipment_id:'',project_id:'',active:''})}>Reset</button>
      </div>
      <BulkActionsBar count={asgSel.count} onExport={()=>exportCSV(asgSel.selectedRows,['equipment_name','project_name','assigned_date','returned_date','fuel_cost'],['Equipment','Project','Assigned Date','Returned Date','Fuel Cost'],'equipment-assignments')} onDelete={bulkDeleteAsg} onClear={asgSel.clear}/>
      <div className="panel"><DataTable rows={filteredAssignments} selection={asgSel} empty="No assignments match the current filters" columns={[
      {key:'equipment_name',label:'Equipment'},{key:'project_name',label:'Project'},
      {key:'assigned_date',label:'Assigned Date',render:r=>fmtDate(r.assigned_date)},
      {key:'returned_date',label:'Returned Date',render:r=>fmtDate(r.returned_date)},
      {key:'fuel_cost',label:'Fuel Cost',render:r=>money(r.fuel_cost)},
      {key:'_actions',label:'Action',render:r=><div className="row-actions">
        {!r.returned_date&&<button className="btn small" onClick={()=>returnEq(r)}>Mark Returned</button>}
        <button type="button" className="icon-btn" title="Edit" onClick={()=>openEditAsg(r)}><Pencil size={15}/></button>
        <button type="button" className="icon-btn danger" title="Delete" onClick={()=>removeAssignment(r)}><Trash2 size={15}/></button>
      </div>}
    ]}/></div>
    </>}

    {tab==='maintenance'&&<>
      <div className="filter-row">
        <label>Equipment<select value={mntFilters.equipment_id} onChange={e=>setMntFilters({...mntFilters,equipment_id:e.target.value})}><option value="">All</option>{equipment.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <button type="button" className="btn" onClick={()=>setMntFilters({equipment_id:''})}>Reset</button>
      </div>
      <BulkActionsBar count={mntSel.count} onExport={()=>exportCSV(mntSel.selectedRows,['equipment_name','maintenance_date','description','cost','next_service_date'],['Equipment','Date','Description','Cost','Next Service'],'equipment-maintenance')} onDelete={bulkDeleteMnt} onClear={mntSel.clear}/>
      <div className="panel"><DataTable rows={filteredMaintenance} selection={mntSel} empty="No maintenance records match the current filters" columns={[
      {key:'equipment_name',label:'Equipment'},{key:'maintenance_date',label:'Date',render:r=>fmtDate(r.maintenance_date)},
      {key:'description',label:'Description'},{key:'cost',label:'Cost',render:r=>money(r.cost)},
      {key:'next_service_date',label:'Next Service',render:r=>fmtDate(r.next_service_date)},
      {key:'_actions',label:'Action',render:r=><div className="row-actions"><button type="button" className="icon-btn" title="Edit" onClick={()=>openEditMnt(r)}><Pencil size={15}/></button><button type="button" className="icon-btn danger" title="Delete" onClick={()=>removeMaintenance(r)}><Trash2 size={15}/></button></div>}
    ]}/></div>
    </>}

    {tab==='rentals'&&<>
      <div className="filter-row">
        <label>Equipment<select value={rntFilters.equipment_id} onChange={e=>setRntFilters({...rntFilters,equipment_id:e.target.value})}><option value="">All</option>{equipment.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label>Status<select value={rntFilters.status} onChange={e=>setRntFilters({...rntFilters,status:e.target.value})}><option value="">All</option>{['Active','Completed','Cancelled'].map(s=><option key={s}>{s}</option>)}</select></label>
        <button type="button" className="btn" onClick={()=>setRntFilters({equipment_id:'',status:''})}>Reset</button>
      </div>
      <BulkActionsBar count={rntSel.count} onExport={()=>exportCSV(rntSel.selectedRows,['equipment_name','customer_name','start_date','end_date','rental_income','rental_expense','status'],['Equipment','Customer','Start','End','Income','Expense','Status'],'equipment-rentals')} onDelete={bulkDeleteRnt} onClear={rntSel.clear}/>
      <div className="panel"><DataTable rows={filteredRentals} selection={rntSel} empty="No rentals match the current filters" columns={[
      {key:'equipment_name',label:'Equipment'},{key:'customer_name',label:'Customer'},
      {key:'start_date',label:'Start',render:r=>fmtDate(r.start_date)},{key:'end_date',label:'End',render:r=>fmtDate(r.end_date)},
      {key:'rental_income',label:'Income',render:r=>money(r.rental_income)},{key:'rental_expense',label:'Expense',render:r=>money(r.rental_expense)},
      {key:'status',label:'Status',render:r=><span className="badge">{r.status}</span>},
      {key:'_actions',label:'Action',render:r=><div className="row-actions"><button type="button" className="icon-btn" title="Edit" onClick={()=>openEditRnt(r)}><Pencil size={15}/></button><button type="button" className="icon-btn danger" title="Delete" onClick={()=>removeRental(r)}><Trash2 size={15}/></button></div>}
    ]}/></div>
    </>}

    <Modal open={eqOpen} title={eqMode==='edit'?'Edit Equipment':'Add Equipment'} onClose={()=>setEqOpen(false)}>
      <form className="form-grid" onSubmit={saveEq}>
        {eqErr&&<div className="alert danger full">{eqErr}</div>}
        {eqFields.map(([key,label,type,opts])=><label key={key}>{label}{type==='select'?<select value={eqForm[key]||''} onChange={e=>setEqForm({...eqForm,[key]:e.target.value})}><option value="">Select</option>{opts.map(o=><option key={o}>{o}</option>)}</select>:<input type={type} step={type==='number'?'0.01':undefined} value={eqForm[key]??''} onChange={e=>setEqForm({...eqForm,[key]:e.target.value})}/>}</label>)}
        <div className="form-actions full"><button type="button" className="btn" onClick={()=>setEqOpen(false)}>Cancel</button><button className="btn primary">Save</button></div>
      </form>
    </Modal>

    <Modal open={asgOpen} title={asgMode==='edit'?'Edit Assignment':'Assign Equipment to Project'} onClose={()=>setAsgOpen(false)}>
      <form className="form-grid" onSubmit={saveAssignment}>
        <label>Equipment<select required disabled={asgMode==='edit'} value={asgForm.equipment_id||''} onChange={e=>setAsgForm({...asgForm,equipment_id:e.target.value})}><option value="">Select</option>{equipment.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label>Project<select required value={asgForm.project_id||''} onChange={e=>setAsgForm({...asgForm,project_id:e.target.value})}><option value="">Select</option>{projects.map(x=><option key={x.id} value={x.id}>{x.project_name}</option>)}</select></label>
        <label>Assigned Date<input type="date" value={asgForm.assigned_date||''} onChange={e=>setAsgForm({...asgForm,assigned_date:e.target.value})}/></label>
        {asgMode==='edit'&&<label>Returned Date<input type="date" value={asgForm.returned_date||''} onChange={e=>setAsgForm({...asgForm,returned_date:e.target.value})}/></label>}
        <label>Fuel Cost<input type="number" value={asgForm.fuel_cost??''} onChange={e=>setAsgForm({...asgForm,fuel_cost:e.target.value})}/></label>
        <label className="full">Remarks<input value={asgForm.remarks||''} onChange={e=>setAsgForm({...asgForm,remarks:e.target.value})}/></label>
        <div className="form-actions full"><button type="button" className="btn" onClick={()=>setAsgOpen(false)}>Cancel</button><button className="btn primary">Save</button></div>
      </form>
    </Modal>

    <Modal open={mntOpen} title={mntMode==='edit'?'Edit Maintenance':'Log Maintenance'} onClose={()=>setMntOpen(false)}>
      <form className="form-grid" onSubmit={saveMaintenance}>
        <label>Equipment<select required disabled={mntMode==='edit'} value={mntForm.equipment_id||''} onChange={e=>setMntForm({...mntForm,equipment_id:e.target.value})}><option value="">Select</option>{equipment.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label>Maintenance Date<input type="date" value={mntForm.maintenance_date||''} onChange={e=>setMntForm({...mntForm,maintenance_date:e.target.value})}/></label>
        <label>Cost<input type="number" value={mntForm.cost??''} onChange={e=>setMntForm({...mntForm,cost:e.target.value})}/></label>
        <label>Next Service Date<input type="date" value={mntForm.next_service_date||''} onChange={e=>setMntForm({...mntForm,next_service_date:e.target.value})}/></label>
        <label className="full">Description<input value={mntForm.description||''} onChange={e=>setMntForm({...mntForm,description:e.target.value})}/></label>
        <div className="form-actions full"><button type="button" className="btn" onClick={()=>setMntOpen(false)}>Cancel</button><button className="btn primary">Save</button></div>
      </form>
    </Modal>

    <Modal open={rntOpen} title={rntMode==='edit'?'Edit Rental':'Add Rental'} onClose={()=>setRntOpen(false)}>
      <form className="form-grid" onSubmit={saveRental}>
        <label>Equipment<select required disabled={rntMode==='edit'} value={rntForm.equipment_id||''} onChange={e=>setRntForm({...rntForm,equipment_id:e.target.value})}><option value="">Select</option>{equipment.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label>Customer Name<input value={rntForm.customer_name||''} onChange={e=>setRntForm({...rntForm,customer_name:e.target.value})}/></label>
        <label>Start Date<input type="date" value={rntForm.start_date||''} onChange={e=>setRntForm({...rntForm,start_date:e.target.value})}/></label>
        <label>End Date<input type="date" value={rntForm.end_date||''} onChange={e=>setRntForm({...rntForm,end_date:e.target.value})}/></label>
        <label>Rental Income<input type="number" value={rntForm.rental_income??''} onChange={e=>setRntForm({...rntForm,rental_income:e.target.value})}/></label>
        <label>Rental Expense<input type="number" value={rntForm.rental_expense??''} onChange={e=>setRntForm({...rntForm,rental_expense:e.target.value})}/></label>
        <label>Status<select value={rntForm.status} onChange={e=>setRntForm({...rntForm,status:e.target.value})}>{['Active','Completed','Cancelled'].map(s=><option key={s}>{s}</option>)}</select></label>
        <div className="form-actions full"><button type="button" className="btn" onClick={()=>setRntOpen(false)}>Cancel</button><button className="btn primary">Save</button></div>
      </form>
    </Modal>
  </>
}
