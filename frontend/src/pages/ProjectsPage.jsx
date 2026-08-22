import { useEffect,useState } from 'react';import { useNavigate } from 'react-router-dom';import api from '../services/api';import Modal from '../components/Modal';import DataTable from '../components/DataTable';import BulkActionsBar from '../components/BulkActionsBar';import { useRowSelection } from '../hooks/useRowSelection';import { fmtDate,money,todayStr } from '../utils/format';import { Eye,Pencil,RotateCcw,Archive,Trash2,Download,Printer } from 'lucide-react';

const PROJECT_TYPES=['Residential','Commercial','Industrial','Infrastructure','Renovation','Other'];
const blankTerm=()=>({milestone_name:'',percentage:0});

export default function ProjectsPage(){
  const [rows,setRows]=useState([]),[clients,setClients]=useState([]),[users,setUsers]=useState([]);
  const [open,setOpen]=useState(false),[mode,setMode]=useState('create'),[editId,setEditId]=useState(null),[f,setF]=useState({status:'Planning',payment_terms:[]});
  const [filters,setFilters]=useState({search:'',client_id:'',status:'',location:'',project_manager_id:'',from:'',to:'',archived:'0'});
  const nav=useNavigate();

  function load(fl=filters){
    const params={}; Object.entries(fl).forEach(([k,v])=>{ if(v) params[k]=v; });
    return api.get('/projects',{params}).then(r=>setRows(r.data));
  }
  useEffect(()=>{ load(); api.get('/clients').then(r=>setClients(r.data)); api.get('/users').then(r=>setUsers(r.data)); },[]);

  function applyFilters(e){ e?.preventDefault(); load(filters); }
  function resetFilters(){ const fl={search:'',client_id:'',status:'',location:'',project_manager_id:'',from:'',to:'',archived:'0'}; setFilters(fl); load(fl); }

  function openCreate(){ setMode('create'); setEditId(null); setF({status:'Planning',payment_terms:[]}); setOpen(true); }
  function openEdit(row){
    setMode('edit'); setEditId(row.id);
    setF({...row,
      start_date_ad:row.start_date_ad?String(row.start_date_ad).slice(0,10):'',
      end_date_ad:row.end_date_ad?String(row.end_date_ad).slice(0,10):'',
      actual_end_date_ad:row.actual_end_date_ad?String(row.actual_end_date_ad).slice(0,10):'',
      payment_terms:[]
    });
    api.get(`/projects/${row.id}`).then(r=>setF(prev=>({...prev,payment_terms:r.data.paymentTerms?.map(t=>({milestone_name:t.milestone_name,percentage:t.percentage}))||[]})));
    setOpen(true);
  }
  async function save(e){ e.preventDefault(); if(mode==='edit'){ await api.put(`/projects/${editId}`,f); } else { await api.post('/projects',f); } setOpen(false); setF({status:'Planning',payment_terms:[]}); load(); }
  async function remove(row){ if(!confirm(`Delete project "${row.project_name}"? This cannot be undone from the UI.`))return; await api.delete(`/projects/${row.id}`); load(); }
  async function archive(row){ if(!confirm(`Archive "${row.project_name}"? It will be hidden from the active list.`))return; await api.post(`/projects/${row.id}/archive`); load(); }
  async function unarchive(row){ await api.post(`/projects/${row.id}/unarchive`); load(); }

  const updTerm=(i,k,v)=>setF({...f,payment_terms:f.payment_terms.map((x,n)=>n===i?{...x,[k]:v}:x)});

  function exportCSV(list=rows){
    const cols=['project_code','project_name','client_name','project_type','location','status','progress_percentage','contract_amount','actualCost','profit'];
    const header=['Code','Name','Client','Type','Location','Status','Progress %','Contract','Actual Cost','Profit'];
    const lines=[header, ...list.map(r=>cols.map(k=>r[k]??''))];
    const csv=lines.map(l=>l.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=`projects-${todayStr()}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  const sel=useRowSelection(rows);
  async function bulkDelete(){
    if(!confirm(`Delete ${sel.count} selected project(s)? This cannot be undone from the UI.`))return;
    await Promise.all([...sel.selectedIds].map(id=>api.delete(`/projects/${id}`)));
    sel.clear(); load();
  }

  const archived=filters.archived==='1';

  return <>
    <div className="page-head"><div><h1>Projects</h1><p>Track construction projects, contract value and progress.</p></div>
      <div className="row-actions">
        <button className="btn" onClick={exportCSV}><Download size={15}/>Export</button>
        <button className="btn" onClick={()=>window.print()}><Printer size={15}/>Print</button>
        <button className="btn primary" onClick={openCreate}>+ Add Project</button>
      </div>
    </div>

    <form className="filter-row" onSubmit={applyFilters}>
      <label>Search<input placeholder="Name or code" value={filters.search} onChange={e=>setFilters({...filters,search:e.target.value})}/></label>
      <label>Client<select value={filters.client_id} onChange={e=>setFilters({...filters,client_id:e.target.value})}><option value="">All</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label>Status<select value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value})}><option value="">All</option>{['Planning','Running','On Hold','Completed','Cancelled'].map(s=><option key={s}>{s}</option>)}</select></label>
      <label>Location<input value={filters.location} onChange={e=>setFilters({...filters,location:e.target.value})}/></label>
      <label>Project Manager<select value={filters.project_manager_id} onChange={e=>setFilters({...filters,project_manager_id:e.target.value})}><option value="">All</option>{users.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
      <label>Start From<input type="date" value={filters.from} onChange={e=>setFilters({...filters,from:e.target.value})}/></label>
      <label>Start To<input type="date" value={filters.to} onChange={e=>setFilters({...filters,to:e.target.value})}/></label>
      <label>View<select value={filters.archived} onChange={e=>setFilters({...filters,archived:e.target.value})}><option value="0">Active</option><option value="1">Archived</option></select></label>
      <button className="btn primary">Apply</button>
      <button type="button" className="btn" onClick={resetFilters}>Reset</button>
    </form>

    <BulkActionsBar count={sel.count} onExport={()=>exportCSV(sel.selectedRows)} onDelete={bulkDelete} onClear={sel.clear}/>

    <div className="panel"><DataTable rows={rows} selection={sel} empty="No projects found" columns={[
      {key:'project_code',label:'Code'},{key:'project_name',label:'Name'},{key:'client_name',label:'Client'},{key:'project_type',label:'Type'},{key:'location',label:'Location'},
      {key:'start_date_ad',label:'Start',render:r=>fmtDate(r.start_date_ad)},{key:'end_date_ad',label:'Expected End',render:r=>fmtDate(r.end_date_ad)},
      {key:'contract_amount',label:'Contract',render:r=>money(r.contract_amount)},
      {key:'actualCost',label:'Actual Cost',render:r=>money(r.actualCost)},
      {key:'project_manager_name',label:'Manager'},
      {key:'progress_percentage',label:'Progress',render:r=><div className="progress-cell"><span>{Number(r.progress_percentage||0).toFixed(0)}%</span><i><b style={{width:`${r.progress_percentage||0}%`}}/></i></div>},
      {key:'status',label:'Status',render:r=><span className={`badge ${r.status?.toLowerCase().replaceAll(' ','-')}`}>{r.status}</span>},
      {key:'profit',label:'Profit',render:r=><b style={{color:Number(r.profit)>=0?'#16a34a':'#dc2626'}}>{money(r.profit)}</b>},
      {key:'_actions',label:'Action',render:r=><div className="row-actions">
        <button type="button" className="icon-btn" title="View Progress" onClick={()=>nav(`/projects/${r.id}`)}><Eye size={15}/></button>
        <button type="button" className="icon-btn" title="Edit" onClick={()=>openEdit(r)}><Pencil size={15}/></button>
        {archived?<button type="button" className="icon-btn" title="Restore" onClick={()=>unarchive(r)}><RotateCcw size={15}/></button>:<button type="button" className="icon-btn" title="Archive" onClick={()=>archive(r)}><Archive size={15}/></button>}
        <button type="button" className="icon-btn danger" title="Delete" onClick={()=>remove(r)}><Trash2 size={15}/></button>
      </div>}
    ]}/></div>

    <Modal open={open} title={mode==='edit'?'Edit Project':'Add Project'} onClose={()=>setOpen(false)} wide>
      <form className="form-grid" onSubmit={save}>
        <label>Project Name<input required value={f.project_name||''} onChange={e=>setF({...f,project_name:e.target.value})}/></label>
        <label>Project Type<input list="project-types" value={f.project_type||''} onChange={e=>setF({...f,project_type:e.target.value})}/><datalist id="project-types">{PROJECT_TYPES.map(t=><option key={t} value={t}/>)}</datalist></label>
        <label>Client<select value={f.client_id||''} onChange={e=>setF({...f,client_id:e.target.value})}><option value="">Select client</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label>Status<select value={f.status} onChange={e=>setF({...f,status:e.target.value})}>{['Planning','Running','On Hold','Completed','Cancelled'].map(s=><option key={s}>{s}</option>)}</select></label>
        <label>Location<input value={f.location||''} onChange={e=>setF({...f,location:e.target.value})}/></label>
        <label>Site Address<input value={f.site_address||''} onChange={e=>setF({...f,site_address:e.target.value})}/></label>
        <label>Contract Amount<input type="number" step="0.01" value={f.contract_amount??''} onChange={e=>setF({...f,contract_amount:e.target.value})}/></label>
        <label>Estimated Cost<input type="number" step="0.01" value={f.estimated_cost??''} onChange={e=>setF({...f,estimated_cost:e.target.value})}/></label>
        <label>Start Date (AD)<input type="date" value={f.start_date_ad||''} onChange={e=>setF({...f,start_date_ad:e.target.value})}/></label>
        <label>Start Date (BS)<input placeholder="2083-01-01" value={f.start_date_bs||''} onChange={e=>setF({...f,start_date_bs:e.target.value})}/></label>
        <label>Expected Completion (AD)<input type="date" value={f.end_date_ad||''} onChange={e=>setF({...f,end_date_ad:e.target.value})}/></label>
        <label>Expected Completion (BS)<input placeholder="2083-06-01" value={f.end_date_bs||''} onChange={e=>setF({...f,end_date_bs:e.target.value})}/></label>
        {mode==='edit'&&<label>Actual Completion (AD)<input type="date" value={f.actual_end_date_ad||''} onChange={e=>setF({...f,actual_end_date_ad:e.target.value})}/></label>}
        <label>Retention %<input type="number" step="0.01" value={f.retention_percentage??''} onChange={e=>setF({...f,retention_percentage:e.target.value})}/></label>
        <label>Warranty Period<input placeholder="e.g. 12 months" value={f.warranty_period||''} onChange={e=>setF({...f,warranty_period:e.target.value})}/></label>
        <label>Project Manager<select value={f.project_manager_id||''} onChange={e=>setF({...f,project_manager_id:e.target.value})}><option value="">Select</option>{users.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
        <label>Engineer<select value={f.engineer_id||''} onChange={e=>setF({...f,engineer_id:e.target.value})}><option value="">Select</option>{users.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
        <label>Site Supervisor<select value={f.site_supervisor_id||''} onChange={e=>setF({...f,site_supervisor_id:e.target.value})}><option value="">Select</option>{users.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
        <label>Client Contact Person<input value={f.client_contact_person||''} onChange={e=>setF({...f,client_contact_person:e.target.value})}/></label>
        <label>Client Contact Phone<input value={f.client_contact_phone||''} onChange={e=>setF({...f,client_contact_phone:e.target.value})}/></label>
        <label className="full">Description<textarea value={f.description||''} onChange={e=>setF({...f,description:e.target.value})}/></label>
        <div className="full">
          <div className="line-head"><b>Payment Terms</b><button type="button" className="btn small" onClick={()=>setF({...f,payment_terms:[...(f.payment_terms||[]),blankTerm()]})}>+ Add Milestone</button></div>
          {(f.payment_terms||[]).map((t,i)=><div className="line-row" key={i} style={{gridTemplateColumns:'2fr .8fr .5fr'}}>
            <input placeholder="Milestone" value={t.milestone_name} onChange={e=>updTerm(i,'milestone_name',e.target.value)}/>
            <input type="number" placeholder="%" value={t.percentage} onChange={e=>updTerm(i,'percentage',e.target.value)}/>
            <button type="button" className="icon-btn danger" title="Remove" onClick={()=>setF({...f,payment_terms:f.payment_terms.filter((_,n)=>n!==i)})}><Trash2 size={15}/></button>
          </div>)}
        </div>
        {mode==='edit'&&<p className="full" style={{fontSize:12,color:'#94a3b8',margin:0}}>Contract, drawing and other document uploads are managed from the project's Documents &amp; Photos tab after saving.</p>}
        <div className="form-actions full"><button type="button" className="btn" onClick={()=>setOpen(false)}>Cancel</button><button className="btn primary">{mode==='edit'?'Save Changes':'Create Project'}</button></div>
      </form>
    </Modal>
  </>
}
