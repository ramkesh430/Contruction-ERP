import { useEffect,useState } from 'react';import { useParams,useNavigate } from 'react-router-dom';import api from '../services/api';import Modal from '../components/Modal';import DataTable from '../components/DataTable';import { money,fmtDate,todayStr } from '../utils/format';import { Trash2,ArrowLeft } from 'lucide-react';

const API_ROOT=(api.defaults.baseURL||'').replace(/\/api\/?$/,'');
const fileUrl=p=>p?`${API_ROOT}${p}`:'';
const ACTION_LABELS={CREATE:'Created',UPDATE:'Updated',DELETE:'Deleted'};
const TABS=[['overview','Overview'],['attendance','Attendance'],['advances','Advances'],['salary','Salary History'],['documents','Documents'],['activity','Activity']];

export default function EmployeeDetailPage(){
  const {id}=useParams(); const nav=useNavigate();
  const [tab,setTab]=useState('overview');
  const [data,setData]=useState(null);
  const [docOpen,setDocOpen]=useState(false),[docTitle,setDocTitle]=useState(''),[docType,setDocType]=useState('Other'),[docFile,setDocFile]=useState(null);
  const [advOpen,setAdvOpen]=useState(false),[advForm,setAdvForm]=useState({advance_date:todayStr(),amount:''});

  const load=()=>api.get(`/employees/${id}`).then(r=>setData(r.data));
  useEffect(()=>{load()},[id]);

  if(!data)return <div className="loading">Loading employee...</div>;
  const {employee:e,attendance,advances,salaryRecords,documents,timeline,advanceOutstanding,attendanceSummary}=data;

  async function uploadDocument(ev){
    ev.preventDefault(); if(!docFile)return;
    const fd=new FormData(); fd.append('file',docFile); fd.append('title',docTitle); fd.append('document_type',docType);
    await api.post(`/employees/${id}/documents`,fd);
    setDocOpen(false);setDocTitle('');setDocFile(null);load();
  }
  async function removeDocument(docId){ if(!confirm('Delete this document?'))return; await api.delete(`/employees/${id}/documents/${docId}`); load(); }
  async function saveAdvance(ev){ ev.preventDefault(); await api.post('/advances',{...advForm,employee_id:id}); setAdvOpen(false); setAdvForm({advance_date:todayStr(),amount:''}); load(); }

  return <>
    <div className="page-head"><div><h1>{e.name}</h1><p>Employees / {e.designation||e.employee_type}</p></div><button className="btn" onClick={()=>nav('/employees')}><ArrowLeft size={15}/>Back to Employees</button></div>
    <div className="tabs" style={{overflowX:'auto',flexWrap:'nowrap'}}>
      {TABS.map(([key,label])=><button key={key} className={`tab ${tab===key?'active':''}`} style={{whiteSpace:'nowrap'}} onClick={()=>setTab(key)}>{label}</button>)}
    </div>

    {tab==='overview'&&<div className="progress-layout">
      <div className="panel">
        <h3>Employee Info</h3>
        <div className="info-list">
          <div className="row"><span>Employee Code</span><b>{e.employee_code||'—'}</b></div>
          <div className="row"><span>Type</span><b>{e.employee_type}</b></div>
          <div className="row"><span>Designation</span><b>{e.designation||'—'}</b></div>
          <div className="row"><span>Phone</span><b>{e.phone||'—'}</b></div>
          <div className="row"><span>Email</span><b>{e.email||'—'}</b></div>
          <div className="row"><span>Address</span><b>{e.address||'—'}</b></div>
          <div className="row"><span>Join Date</span><b>{fmtDate(e.join_date)}</b></div>
          <div className="row"><span>Status</span><b><span className={`badge ${e.is_active?'approved':'rejected'}`}>{e.is_active?'Active':'Inactive'}</span></b></div>
        </div>
      </div>
      <div className="panel">
        <h3>Payroll & Attendance Summary</h3>
        <div className="info-list">
          <div className="row"><span>Salary Type</span><b>{e.salary_type}</b></div>
          <div className="row"><span>Rate</span><b>{e.salary_type==='Daily'?money(e.daily_wage)+' / day':money(e.basic_salary)+' / month'}</b></div>
          <div className="row"><span>Present (last 60 records)</span><b>{attendanceSummary.present}</b></div>
          <div className="row"><span>Absent</span><b>{attendanceSummary.absent}</b></div>
          <div className="row"><span>Half Day</span><b>{attendanceSummary.halfDay}</b></div>
          <div className="row"><span>Leave</span><b>{attendanceSummary.leave}</b></div>
          <div className="row"><span>Wage Earned (recent)</span><b>{money(attendanceSummary.totalWage)}</b></div>
        </div>
        <div className={`profit-banner ${advanceOutstanding>0?'negative':''}`} style={{marginTop:14}}><span>Advance Outstanding</span><b>{money(advanceOutstanding)}</b></div>
      </div>
    </div>}

    {tab==='attendance'&&<div className="panel">
      <div className="panel-title"><h3>Attendance History (Last 60)</h3><a href="/attendance">Manage Attendance</a></div>
      <DataTable rows={attendance} empty="No attendance recorded yet" columns={[
        {key:'attendance_date',label:'Date',render:r=>fmtDate(r.attendance_date)},{key:'project_name',label:'Project / Site',render:r=>r.project_name||'—'},
        {key:'status',label:'Status',render:r=><span className={`badge ${r.status?.toLowerCase().replaceAll(' ','-')}`}>{r.status}</span>},
        {key:'regular_hours',label:'Hours'},{key:'overtime_hours',label:'Overtime'},
        {key:'calculated_amount',label:'Amount',render:r=>money(r.calculated_amount)}
      ]}/>
    </div>}

    {tab==='advances'&&<>
      <div className="page-head" style={{marginBottom:12}}><div><h3 style={{margin:0}}>Advance Ledger</h3><p style={{margin:'4px 0 0',fontSize:12,color:'#64748b'}}>Outstanding: {money(advanceOutstanding)}</p></div><button className="btn primary" onClick={()=>setAdvOpen(true)}>+ Give Advance</button></div>
      <div className="panel"><DataTable rows={advances} empty="No advances given yet" columns={[
        {key:'advance_date',label:'Date',render:r=>fmtDate(r.advance_date)},{key:'amount',label:'Amount',render:r=>money(r.amount)},
        {key:'recovered_amount',label:'Recovered',render:r=>money(r.recovered_amount)},{key:'outstanding',label:'Outstanding',render:r=>money(r.outstanding)},
        {key:'remarks',label:'Remarks',render:r=>r.remarks||'—'}
      ]}/></div>
    </>}

    {tab==='salary'&&<div className="panel">
      <div className="panel-title"><h3>Salary History</h3><a href="/salary">Manage Salary</a></div>
      <DataTable rows={salaryRecords} empty="No salary processed yet" columns={[
        {key:'salary_month',label:'Month'},{key:'basic_salary',label:'Basic',render:r=>money(r.basic_salary)},
        {key:'overtime_amount',label:'Overtime',render:r=>money(r.overtime_amount)},{key:'bonus',label:'Bonus',render:r=>money(r.bonus)},
        {key:'advance_deduction',label:'Advance Ded.',render:r=>money(r.advance_deduction)},{key:'net_salary',label:'Net Salary',render:r=>money(r.net_salary)},
        {key:'status',label:'Status',render:r=><span className={`badge ${r.status?.toLowerCase()}`}>{r.status}</span>}
      ]}/>
    </div>}

    {tab==='documents'&&<>
      <div className="page-head" style={{marginBottom:12}}><div><h3 style={{margin:0}}>Documents</h3></div><button className="btn primary" onClick={()=>setDocOpen(true)}>+ Upload Document</button></div>
      <div className="panel"><DataTable rows={documents} empty="No documents uploaded yet" columns={[
        {key:'title',label:'Title'},{key:'document_type',label:'Type'},
        {key:'file_path',label:'File',render:r=><a href={fileUrl(r.file_path)} target="_blank" rel="noreferrer">Open</a>},
        {key:'created_at',label:'Uploaded',render:r=>fmtDate(r.created_at)},
        {key:'_actions',label:'Action',render:r=><button className="icon-btn danger" title="Delete" onClick={()=>removeDocument(r.id)}><Trash2 size={15}/></button>}
      ]}/></div>
    </>}

    {tab==='activity'&&<div className="panel">
      <h3>Activity Timeline</h3>
      {timeline?.length?<ul className="mini-list">
        {timeline.map((t,i)=><li key={i}>
          <div><span className="ml-main">{ACTION_LABELS[t.action]||t.action}</span><div className="ml-sub">{t.user_name||'System'} · {new Date(t.created_at).toLocaleString('en-IN')}</div></div>
        </li>)}
      </ul>:<p style={{color:'#94a3b8'}}>No activity recorded yet.</p>}
    </div>}

    <Modal open={docOpen} title="Upload Document" onClose={()=>setDocOpen(false)}>
      <form className="form-grid" onSubmit={uploadDocument}>
        <label>Title<input required value={docTitle} onChange={e=>setDocTitle(e.target.value)}/></label>
        <label>Type<select value={docType} onChange={e=>setDocType(e.target.value)}>{['Citizenship','Contract','Certificate','ID Card','Other'].map(t=><option key={t}>{t}</option>)}</select></label>
        <label className="full">File (PDF or image)<input type="file" required accept=".pdf,image/*" onChange={e=>setDocFile(e.target.files[0])}/></label>
        <div className="form-actions full"><button type="button" className="btn" onClick={()=>setDocOpen(false)}>Cancel</button><button className="btn primary">Upload</button></div>
      </form>
    </Modal>

    <Modal open={advOpen} title="Give Advance" onClose={()=>setAdvOpen(false)}>
      <form className="form-grid" onSubmit={saveAdvance}>
        <label>Date<input type="date" value={advForm.advance_date} onChange={ev=>setAdvForm({...advForm,advance_date:ev.target.value})}/></label>
        <label>Amount<input type="number" required value={advForm.amount} onChange={ev=>setAdvForm({...advForm,amount:ev.target.value})}/></label>
        <label className="full">Remarks<input value={advForm.remarks||''} onChange={ev=>setAdvForm({...advForm,remarks:ev.target.value})}/></label>
        <div className="form-actions full"><button type="button" className="btn" onClick={()=>setAdvOpen(false)}>Cancel</button><button className="btn primary">Save</button></div>
      </form>
    </Modal>
  </>
}
