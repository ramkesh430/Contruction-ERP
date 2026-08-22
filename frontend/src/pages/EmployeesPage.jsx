import { useEffect,useState } from 'react';import { useNavigate } from 'react-router-dom';import api from '../services/api';import Modal from '../components/Modal';import DataTable from '../components/DataTable';import BulkActionsBar from '../components/BulkActionsBar';import { useRowSelection } from '../hooks/useRowSelection';import { money,todayStr } from '../utils/format';import { Eye,Pencil,Trash2,Download } from 'lucide-react';

export default function EmployeesPage(){
  const nav=useNavigate();
  const [rows,setRows]=useState([]);
  const [open,setOpen]=useState(false),[mode,setMode]=useState('create'),[editId,setEditId]=useState(null),[f,setF]=useState({}),[err,setErr]=useState('');
  const [filters,setFilters]=useState({search:'',employee_type:'',status:''});

  function load(fl=filters){
    const params={}; Object.entries(fl).forEach(([k,v])=>{ if(v) params[k]=v; });
    return api.get('/employees',{params}).then(r=>setRows(r.data));
  }
  useEffect(()=>{load()},[]);
  function applyFilters(e){ e?.preventDefault(); load(filters); }
  function resetFilters(){ const fl={search:'',employee_type:'',status:''}; setFilters(fl); load(fl); }

  function openCreate(){ setMode('create'); setEditId(null); setF({}); setErr(''); setOpen(true); }
  function openEdit(row){ setMode('edit'); setEditId(row.id); setF(row); setErr(''); setOpen(true); }
  async function save(e){ e.preventDefault(); setErr(''); try{ if(mode==='edit'){ await api.put(`/employees/${editId}`,f); } else { await api.post('/employees',f); } setOpen(false); setF({}); load(); }catch(e){ setErr(e.response?.data?.message||'Save failed'); } }
  async function remove(row){ if(!confirm(`Delete employee "${row.name}"?`))return; await api.delete(`/employees/${row.id}`); load(); }

  function exportCSV(list=rows){
    const cols=['employee_code','name','employee_type','designation','phone','salary_type','daily_wage','basic_salary','advance_outstanding'];
    const header=['Code','Name','Type','Designation','Phone','Salary Type','Daily Wage','Basic Salary','Advance Outstanding'];
    const lines=[header, ...list.map(r=>cols.map(k=>r[k]??''))];
    const csv=lines.map(l=>l.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=`employees-${todayStr()}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  const sel=useRowSelection(rows);
  async function bulkDelete(){
    if(!confirm(`Delete ${sel.count} selected employee(s)?`))return;
    await Promise.all([...sel.selectedIds].map(id=>api.delete(`/employees/${id}`)));
    sel.clear(); load();
  }

  return <>
    <div className="page-head"><div><h1>Employees & Labour</h1><p>Manage staff profiles, wages and advance ledgers.</p></div>
      <div className="row-actions">
        <button className="btn" onClick={exportCSV}><Download size={15}/>Export</button>
        <button className="btn primary" onClick={openCreate}>+ Add Employee</button>
      </div>
    </div>

    <form className="filter-row" onSubmit={applyFilters}>
      <label>Search<input placeholder="Name, code or phone" value={filters.search} onChange={e=>setFilters({...filters,search:e.target.value})}/></label>
      <label>Type<select value={filters.employee_type} onChange={e=>setFilters({...filters,employee_type:e.target.value})}><option value="">All</option><option>Employee</option><option>Labour</option></select></label>
      <label>Status<select value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value})}><option value="">All</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
      <button className="btn primary">Apply</button>
      <button type="button" className="btn" onClick={resetFilters}>Reset</button>
    </form>

    <BulkActionsBar count={sel.count} onExport={()=>exportCSV(sel.selectedRows)} onDelete={bulkDelete} onClear={sel.clear}/>

    <div className="panel"><DataTable rows={rows} selection={sel} empty="No employees found" columns={[
      {key:'employee_code',label:'Code'},{key:'name',label:'Name'},{key:'employee_type',label:'Type'},{key:'designation',label:'Designation'},{key:'phone',label:'Phone'},
      {key:'salary_type',label:'Salary Type'},
      {key:'wage',label:'Wage',render:r=>r.salary_type==='Daily'?money(r.daily_wage)+'/day':money(r.basic_salary)+'/mo'},
      {key:'advance_outstanding',label:'Advance Outstanding',render:r=>Number(r.advance_outstanding)>0?<b style={{color:'#b45309'}}>{money(r.advance_outstanding)}</b>:money(0)},
      {key:'is_active',label:'Status',render:r=><span className={`badge ${r.is_active?'approved':'rejected'}`}>{r.is_active?'Active':'Inactive'}</span>},
      {key:'_actions',label:'Action',render:r=><div className="row-actions">
        <button type="button" className="icon-btn" title="View" onClick={()=>nav(`/employees/${r.id}`)}><Eye size={15}/></button>
        <button type="button" className="icon-btn" title="Edit" onClick={()=>openEdit(r)}><Pencil size={15}/></button>
        <button type="button" className="icon-btn danger" title="Delete" onClick={()=>remove(r)}><Trash2 size={15}/></button>
      </div>}
    ]}/></div>

    <Modal open={open} title={mode==='edit'?'Edit Employee':'Add Employee'} onClose={()=>setOpen(false)}>
      <form className="form-grid" onSubmit={save}>
        {err&&<div className="alert danger full">{err}</div>}
        <label>Employee Code<input value={f.employee_code||''} onChange={e=>setF({...f,employee_code:e.target.value})}/></label>
        <label>Name<input required value={f.name||''} onChange={e=>setF({...f,name:e.target.value})}/></label>
        <label>Type<select value={f.employee_type||'Employee'} onChange={e=>setF({...f,employee_type:e.target.value})}><option>Employee</option><option>Labour</option></select></label>
        <label>Designation<input value={f.designation||''} onChange={e=>setF({...f,designation:e.target.value})}/></label>
        <label>Phone<input value={f.phone||''} onChange={e=>setF({...f,phone:e.target.value})}/></label>
        <label>Email<input type="email" value={f.email||''} onChange={e=>setF({...f,email:e.target.value})}/></label>
        <label>Address<input value={f.address||''} onChange={e=>setF({...f,address:e.target.value})}/></label>
        <label>Join Date<input type="date" value={f.join_date?String(f.join_date).slice(0,10):''} onChange={e=>setF({...f,join_date:e.target.value})}/></label>
        <label>Salary Type<select value={f.salary_type||'Monthly'} onChange={e=>setF({...f,salary_type:e.target.value})}><option>Monthly</option><option>Daily</option></select></label>
        <label>Basic Salary<input type="number" step="0.01" value={f.basic_salary??''} onChange={e=>setF({...f,basic_salary:e.target.value})}/></label>
        <label>Daily Wage<input type="number" step="0.01" value={f.daily_wage??''} onChange={e=>setF({...f,daily_wage:e.target.value})}/></label>
        <label>Status<select value={f.is_active===0||f.is_active===false?'0':'1'} onChange={e=>setF({...f,is_active:e.target.value==='1'})}><option value="1">Active</option><option value="0">Inactive</option></select></label>
        <div className="form-actions full"><button type="button" className="btn" onClick={()=>setOpen(false)}>Cancel</button><button className="btn primary">{mode==='edit'?'Save Changes':'Create Employee'}</button></div>
      </form>
    </Modal>
  </>
}
