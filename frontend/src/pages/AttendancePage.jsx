import { useEffect,useState } from 'react';import api from '../services/api';import Modal from '../components/Modal';import DataTable from '../components/DataTable';import BulkActionsBar from '../components/BulkActionsBar';import { useRowSelection } from '../hooks/useRowSelection';import StatCard from '../components/StatCard';import { money,todayStr } from '../utils/format';import { Pencil,Trash2,CheckCircle2,XCircle,Clock,Flag,CalendarOff } from 'lucide-react';
export default function AttendancePage(){
  const [rows,setRows]=useState([]),[employees,setEmployees]=useState([]),[projects,setProjects]=useState([]),[open,setOpen]=useState(false),[mode,setMode]=useState('create'),[editId,setEditId]=useState(null),[date,setDate]=useState(todayStr()),[f,setF]=useState({status:'Present',attendance_date:todayStr()});
  const [filters,setFilters]=useState({employee_id:'',project_id:'',status:''});
  const filteredRows=rows.filter(r=>{
    if(filters.employee_id&&String(r.employee_id)!==String(filters.employee_id))return false;
    if(filters.project_id&&String(r.project_id)!==String(filters.project_id))return false;
    if(filters.status&&r.status!==filters.status)return false;
    return true;
  });
  const load=(d=date)=>Promise.all([api.get('/attendance',{params:{date:d}}),api.get('/employees'),api.get('/projects')]).then(([a,b,c])=>{setRows(a.data);setEmployees(b.data);setProjects(c.data)});
  useEffect(()=>{load(date)},[date]);
  function openCreate(){setMode('create');setEditId(null);setF({status:'Present',attendance_date:date});setOpen(true)}
  function openEdit(row){setMode('edit');setEditId(row.id);setF({...row,check_in:row.check_in?String(row.check_in).slice(0,5):'',check_out:row.check_out?String(row.check_out).slice(0,5):''});setOpen(true)}
  async function save(e){e.preventDefault();if(mode==='edit'){await api.put(`/attendance/${editId}`,f)}else{await api.post('/attendance',f)}setOpen(false);load(date)}
  async function remove(row){if(!confirm(`Delete attendance record for ${row.employee_name}?`))return;await api.delete(`/attendance/${row.id}`);load(date)}
  const counts=st=>rows.filter(r=>r.status===st).length;
  function exportCSV(list=rows){
    const cols=['employee_name','designation','project_name','check_in','check_out','status','regular_hours'];
    const header=['Name','Role','Project / Site','Check In','Check Out','Status','Hours'];
    const lines=[header, ...list.map(r=>cols.map(k=>r[k]??''))];
    const csv=lines.map(l=>l.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=`attendance-${date}.csv`; a.click(); URL.revokeObjectURL(url);
  }
  const sel=useRowSelection(filteredRows);
  async function bulkDelete(){
    if(!confirm(`Delete ${sel.count} selected attendance record(s)?`))return;
    await Promise.all([...sel.selectedIds].map(id=>api.delete(`/attendance/${id}`)));
    sel.clear(); load(date);
  }
  return <>
    <div className="page-head"><div><h1>Attendance</h1><p>Project/site-wise worker attendance, overtime and daily wage calculation.</p></div><button className="btn primary" onClick={openCreate}>+ Mark Attendance</button></div>
    <div className="stats-grid cols-5">
      <StatCard label="Present" value={counts('Present')} sub={date} icon={<CheckCircle2 size={20}/>}/>
      <StatCard label="Absent" value={counts('Absent')} sub={date} icon={<XCircle size={20}/>}/>
      <StatCard label="Half Day" value={counts('Half Day')} sub={date} icon={<Clock size={20}/>}/>
      <StatCard label="Leave" value={counts('Leave')} sub={date} icon={<Flag size={20}/>}/>
      <StatCard label="Holiday" value={counts('Holiday')} sub={date} icon={<CalendarOff size={20}/>}/>
    </div>
    <div className="filter-row">
      <label>Date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
      <label>Employee<select value={filters.employee_id} onChange={e=>setFilters({...filters,employee_id:e.target.value})}><option value="">All</option>{employees.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      <label>Project<select value={filters.project_id} onChange={e=>setFilters({...filters,project_id:e.target.value})}><option value="">All</option>{projects.map(x=><option key={x.id} value={x.id}>{x.project_name}</option>)}</select></label>
      <label>Status<select value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value})}><option value="">All</option>{['Present','Absent','Half Day','Leave','Holiday','Site Visit'].map(x=><option key={x}>{x}</option>)}</select></label>
      <button type="button" className="btn" onClick={()=>setFilters({employee_id:'',project_id:'',status:''})}>Reset</button>
    </div>
    <BulkActionsBar count={sel.count} onExport={()=>exportCSV(sel.selectedRows)} onDelete={bulkDelete} onClear={sel.clear}/>

    <div className="panel">
      <DataTable rows={filteredRows} selection={sel} empty="No attendance records match the current filters" columns={[
        {key:'employee_name',label:'Name'},
        {key:'designation',label:'Role'},
        {key:'project_name',label:'Project / Site'},
        {key:'check_in',label:'Check In'},
        {key:'check_out',label:'Check Out'},
        {key:'status',label:'Status',render:r=><span className={`badge ${r.status?.toLowerCase().replaceAll(' ','-')}`}>{r.status}</span>},
        {key:'regular_hours',label:'Hours'},
        {key:'_actions',label:'Action',render:r=><div className="row-actions"><button type="button" className="icon-btn" title="Edit" onClick={()=>openEdit(r)}><Pencil size={15}/></button><button type="button" className="icon-btn danger" title="Delete" onClick={()=>remove(r)}><Trash2 size={15}/></button></div>}
      ]}/>
    </div>
    <Modal open={open} title={mode==='edit'?'Edit Attendance':'Mark Attendance'} onClose={()=>setOpen(false)}>
      <form className="form-grid" onSubmit={save}>
        <label>Employee<select required disabled={mode==='edit'} value={f.employee_id||''} onChange={e=>setF({...f,employee_id:e.target.value})}><option value="">Select</option>{employees.map(x=><option value={x.id} key={x.id}>{x.name}</option>)}</select></label>
        <label>Project<select value={f.project_id||''} onChange={e=>setF({...f,project_id:e.target.value})}><option value="">Select</option>{projects.map(x=><option value={x.id} key={x.id}>{x.project_name}</option>)}</select></label>
        <label>Date<input type="date" disabled={mode==='edit'} value={f.attendance_date?String(f.attendance_date).slice(0,10):''} onChange={e=>setF({...f,attendance_date:e.target.value})}/></label>
        <label>Status<select value={f.status} onChange={e=>setF({...f,status:e.target.value})}>{['Present','Absent','Half Day','Leave','Holiday','Site Visit'].map(x=><option key={x}>{x}</option>)}</select></label>
        <label>Check In<input type="time" value={f.check_in||''} onChange={e=>setF({...f,check_in:e.target.value})}/></label>
        <label>Check Out<input type="time" value={f.check_out||''} onChange={e=>setF({...f,check_out:e.target.value})}/></label>
        <label>Regular Hours<input type="number" step="0.5" value={f.regular_hours??''} onChange={e=>setF({...f,regular_hours:e.target.value})}/></label>
        <label>Daily Wage<input type="number" value={f.daily_wage??''} onChange={e=>setF({...f,daily_wage:e.target.value})}/></label>
        <label>Overtime Hours<input type="number" step="0.5" value={f.overtime_hours??''} onChange={e=>setF({...f,overtime_hours:e.target.value})}/></label>
        <div className="form-actions full"><button type="button" className="btn" onClick={()=>setOpen(false)}>Cancel</button><button className="btn primary">Save Attendance</button></div>
      </form>
    </Modal>
  </>
}
