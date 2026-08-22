import { useEffect,useState } from 'react';import { useParams,useNavigate } from 'react-router-dom';import api from '../services/api';import Modal from '../components/Modal';import DataTable from '../components/DataTable';import { fmtDate,todayStr } from '../utils/format';import { Pencil,Trash2,ArrowLeft,Printer } from 'lucide-react';
const money=n=>'Rs. '+Number(n||0).toLocaleString('en-IN');
const API_ROOT=(api.defaults.baseURL||'').replace(/\/api\/?$/,'');
const fileUrl=p=>p?`${API_ROOT}${p}`:'';
const ACTION_LABELS={CREATE:'Created',UPDATE:'Updated',UPDATE_STAGE:'Stage Updated',DELETE:'Deleted',ARCHIVE:'Archived',UNARCHIVE:'Restored'};
const TABS=[['overview','Overview'],['boq','BOQ'],['progress','Progress'],['logs','Daily Logs'],['materials','Materials'],['labour','Labour'],['expenses','Expenses'],['invoices','Invoices'],['payments','Payments'],['equipment','Equipment'],['files','Documents & Photos'],['variations','Variations'],['pnl','Profit & Loss'],['timeline','Activity Timeline']];

export default function ProjectProgressPage(){
  const {id}=useParams(); const nav=useNavigate();
  const [tab,setTab]=useState('overview');
  const [data,setData]=useState(null); const [saving,setSaving]=useState(null);
  const [logs,setLogs]=useState([]),[logOpen,setLogOpen]=useState(false),[logMode,setLogMode]=useState('create'),[logId,setLogId]=useState(null),[logForm,setLogForm]=useState({log_date:todayStr()});
  const [documents,setDocuments]=useState([]),[photos,setPhotos]=useState([]);
  const [docOpen,setDocOpen]=useState(false),[docTitle,setDocTitle]=useState(''),[docType,setDocType]=useState('Contract'),[docFile,setDocFile]=useState(null);
  const [photoOpen,setPhotoOpen]=useState(false),[photoType,setPhotoType]=useState('Progress'),[photoCaption,setPhotoCaption]=useState(''),[photoDate,setPhotoDate]=useState(todayStr()),[photoFile,setPhotoFile]=useState(null);
  const [varOpen,setVarOpen]=useState(false),[varForm,setVarForm]=useState({variation_type:'Addition',variation_date:todayStr()});

  const load=()=>api.get(`/projects/${id}`).then(r=>setData(r.data));
  const loadLogs=()=>api.get(`/projects/${id}/logs`).then(r=>setLogs(r.data));
  const loadFiles=()=>Promise.all([api.get(`/projects/${id}/documents`),api.get(`/projects/${id}/photos`)]).then(([d,p])=>{setDocuments(d.data);setPhotos(p.data)});
  useEffect(()=>{load();loadLogs();loadFiles()},[id]);

  if(!data)return <div className="loading">Loading project...</div>;
  const {project:p,stages,finance:fi,materialsUsed,attendance,expenses,invoices,payments,equipment,variations,variationTotal,paymentTerms,quotationRef,timeline}=data;

  async function updateStage(stage,patch){
    setSaving(stage.id);
    try{await api.put(`/projects/${id}/stages/${stage.id}`,patch);await load();}finally{setSaving(null);}
  }
  function openCreateLog(){setLogMode('create');setLogId(null);setLogForm({log_date:todayStr()});setLogOpen(true)}
  function openEditLog(row){setLogMode('edit');setLogId(row.id);setLogForm({...row,log_date:row.log_date?String(row.log_date).slice(0,10):todayStr()});setLogOpen(true)}
  async function saveLog(e){e.preventDefault();if(logMode==='edit'){await api.put(`/projects/${id}/logs/${logId}`,logForm)}else{await api.post(`/projects/${id}/logs`,logForm)}setLogOpen(false);setLogForm({log_date:todayStr()});loadLogs()}
  async function removeLog(row){if(!confirm('Delete this site log entry?'))return;await api.delete(`/projects/${id}/logs/${row.id}`);loadLogs()}
  async function uploadDocument(e){
    e.preventDefault(); if(!docFile)return;
    const fd=new FormData(); fd.append('file',docFile); fd.append('title',docTitle); fd.append('document_type',docType);
    await api.post(`/projects/${id}/documents`,fd);
    setDocOpen(false);setDocTitle('');setDocFile(null);loadFiles();
  }
  async function removeDocument(docId){if(!confirm('Delete this document?'))return;await api.delete(`/projects/${id}/documents/${docId}`);loadFiles()}
  async function uploadPhoto(e){
    e.preventDefault(); if(!photoFile)return;
    const fd=new FormData(); fd.append('file',photoFile); fd.append('caption',photoCaption); fd.append('photo_type',photoType); fd.append('photo_date',photoDate);
    await api.post(`/projects/${id}/photos`,fd);
    setPhotoOpen(false);setPhotoCaption('');setPhotoFile(null);loadFiles();
  }
  async function removePhoto(photoId){if(!confirm('Delete this photo?'))return;await api.delete(`/projects/${id}/photos/${photoId}`);loadFiles()}

  function openCreateVar(){setVarForm({variation_type:'Addition',variation_date:todayStr()});setVarOpen(true)}
  async function saveVariation(e){e.preventDefault();await api.post(`/projects/${id}/variations`,varForm);setVarOpen(false);load()}
  async function decideVariation(v,status){await api.put(`/projects/${id}/variations/${v.id}`,{status});load()}
  async function removeVariation(v){if(!confirm('Delete this variation?'))return;await api.delete(`/projects/${id}/variations/${v.id}`);load()}

  return <>
    <div className="page-head"><div><h1>Project Progress - {p.project_name}</h1><p>Projects / {p.project_code}</p></div>
      <div className="row-actions">
        <button className="btn" onClick={()=>window.open(`/projects/${id}/report/print`,'_blank')}><Printer size={15}/>Print Report</button>
        <button className="btn" onClick={()=>nav('/projects')}><ArrowLeft size={15}/>Back to Projects</button>
      </div>
    </div>
    <div className="tabs" style={{overflowX:'auto',flexWrap:'nowrap'}}>
      {TABS.map(([key,label])=><button key={key} className={`tab ${tab===key?'active':''}`} style={{whiteSpace:'nowrap'}} onClick={()=>setTab(key)}>{label}</button>)}
    </div>

    {tab==='overview'&&<div className="progress-layout">
      <div className="panel">
        <h3>Project Info</h3>
        <div className="info-list">
          <div className="row"><span>Project Code</span><b>{p.project_code}</b></div>
          <div className="row"><span>Type</span><b>{p.project_type||'—'}</b></div>
          <div className="row"><span>Client</span><b>{p.client_name||'—'}</b></div>
          <div className="row"><span>Location</span><b>{p.location||'—'}</b></div>
          <div className="row"><span>Site Address</span><b>{p.site_address||'—'}</b></div>
          <div className="row"><span>Contract Amount</span><b>{money(p.contract_amount)}</b></div>
          <div className="row"><span>Estimated Cost</span><b>{money(p.estimated_cost)}</b></div>
          <div className="row"><span>Retention %</span><b>{Number(p.retention_percentage||0)}%</b></div>
          <div className="row"><span>Warranty Period</span><b>{p.warranty_period||'—'}</b></div>
          <div className="row"><span>Start Date</span><b>{fmtDate(p.start_date_ad)}</b></div>
          <div className="row"><span>Expected End</span><b>{fmtDate(p.end_date_ad)}</b></div>
          <div className="row"><span>Actual End</span><b>{fmtDate(p.actual_end_date_ad)}</b></div>
          <div className="row"><span>Status</span><b><span className={`badge ${p.status?.toLowerCase().replaceAll(' ','-')}`}>{p.status}</span></b></div>
          <div className="row"><span>Project Manager</span><b>{p.project_manager_name||'—'}</b></div>
          <div className="row"><span>Engineer</span><b>{p.engineer_name||'—'}</b></div>
          <div className="row"><span>Site Supervisor</span><b>{p.site_supervisor_name||'—'}</b></div>
          <div className="row"><span>Client Contact</span><b>{p.client_contact_person||'—'}{p.client_contact_phone?` (${p.client_contact_phone})`:''}</b></div>
          <div className="row"><span>Source Quotation</span><b>{quotationRef?quotationRef.quotation_no:'—'}</b></div>
        </div>
        <div className="overall-progress">
          <div className="row" style={{border:'none',padding:0}}><span>Overall Progress</span><b>{Number(p.progress_percentage||0).toFixed(0)}%</b></div>
          <div className="bar"><div className="fill" style={{width:`${p.progress_percentage||0}%`}}/></div>
        </div>
      </div>
      <div className="panel">
        <h3>Payment Terms</h3>
        {paymentTerms?.length?<div className="table-wrap"><table><thead><tr><th>Milestone</th><th>%</th></tr></thead><tbody>{paymentTerms.map(t=><tr key={t.id}><td>{t.milestone_name}</td><td>{Number(t.percentage)}%</td></tr>)}</tbody></table></div>:<p style={{color:'#94a3b8',fontSize:13}}>No payment schedule set. Edit the project to add one.</p>}
        <h3 style={{marginTop:18}}>Description</h3>
        <p style={{fontSize:13,color:'#475569',whiteSpace:'pre-wrap'}}>{p.description||'—'}</p>
      </div>
    </div>}

    {tab==='boq'&&<div className="panel">
      <h3>Bill of Quantities</h3>
      {quotationRef?<>
        <div className="view-grid">
          <div className="vrow"><span>Source Quotation</span>{quotationRef.quotation_no}</div>
          <div className="vrow"><span>Date</span>{fmtDate(quotationRef.quotation_date)}</div>
        </div>
        <div className="table-wrap"><table><thead><tr><th>Category</th><th>Description</th><th>Unit</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
          <tbody>{quotationRef.items.map(it=><tr key={it.id}><td>{it.category||'—'}</td><td>{it.description}</td><td>{it.unit}</td><td>{Number(it.quantity)}</td><td>{money(it.rate)}</td><td>{money(it.amount)}</td></tr>)}</tbody>
        </table></div>
        <div className="profit-banner"><span>Total BOQ Value</span><b>{money(quotationRef.grand_total)}</b></div>
      </>:<p style={{color:'#94a3b8'}}>This project wasn't converted from a quotation, so no BOQ is linked. Convert an approved quotation from the Quotation &amp; BOQ page to link one.</p>}
    </div>}

    {tab==='progress'&&<div className="progress-layout">
      <div className="panel">
        <h3>Overall Progress</h3>
        <div className="overall-progress">
          <div className="row" style={{border:'none',padding:0}}><span>Progress</span><b>{Number(p.progress_percentage||0).toFixed(0)}%</b></div>
          <div className="bar"><div className="fill" style={{width:`${p.progress_percentage||0}%`}}/></div>
        </div>
        {fi&&<div className="overall-progress">
          <div className="row"><span>Received</span><b>{money(fi.totalReceived)}</b></div>
          <div className="row"><span>Total Expense</span><b>{money(fi.totalExpense)}</b></div>
          <div className="row"><span>Current Cash Profit</span><b>{money(fi.currentCashProfit)}</b></div>
          <div className="row"><span>Projected Profit</span><b>{money(fi.projectedProfit)}</b></div>
        </div>}
      </div>
      <div className="panel">
        <h3>Project Stages</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Stage</th><th>Weight%</th><th>Start Date</th><th>End Date</th><th>Progress</th><th>Status</th></tr></thead>
            <tbody>
              {stages.map(s=><tr key={s.id}>
                <td>{s.sort_order}. {s.stage_name}</td>
                <td>{Number(s.weight_percentage).toFixed(0)}%</td>
                <td>{fmtDate(s.start_date)}</td>
                <td>{fmtDate(s.actual_end_date||s.expected_end_date)}</td>
                <td>
                  <div className="stage-controls">
                    <input type="number" min="0" max="100" defaultValue={s.progress_percentage} disabled={saving===s.id}
                      onBlur={e=>{const v=Number(e.target.value);if(v!==Number(s.progress_percentage))updateStage(s,{progress_percentage:v});}} style={{width:60}}/>%
                  </div>
                </td>
                <td>
                  <div className="stage-controls">
                    <select defaultValue={s.status} disabled={saving===s.id}
                      onChange={e=>updateStage(s,{status:e.target.value,...(e.target.value==='Completed'?{progress_percentage:100}:{})})}>
                      {['Not Started','Running','Completed','On Hold'].map(x=><option key={x}>{x}</option>)}
                    </select>
                  </div>
                </td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>}

    {tab==='logs'&&<>
      <div className="page-head" style={{marginBottom:12}}><div><h3 style={{margin:0}}>Daily Site Logs</h3></div><button className="btn primary" onClick={openCreateLog}>+ Add Log Entry</button></div>
      <div className="panel"><DataTable rows={logs} empty="No site logs recorded yet" columns={[
        {key:'log_date',label:'Date',render:r=>fmtDate(r.log_date)},
        {key:'weather',label:'Weather'},
        {key:'worker_count',label:'Workers'},
        {key:'today_work',label:"Today's Work"},
        {key:'work_progress',label:'Progress',render:r=>Number(r.work_progress||0)+'%'},
        {key:'problems_delays',label:'Problems/Delays'},
        {key:'created_by_name',label:'Logged By'},
        {key:'_actions',label:'Action',render:r=><div className="row-actions"><button type="button" className="icon-btn" title="Edit" onClick={()=>openEditLog(r)}><Pencil size={15}/></button><button type="button" className="icon-btn danger" title="Delete" onClick={()=>removeLog(r)}><Trash2 size={15}/></button></div>}
      ]}/></div>
    </>}

    {tab==='materials'&&<div className="panel">
      <div className="panel-title"><h3>Materials Consumed</h3><a href="/materials">Manage Materials</a></div>
      <DataTable rows={materialsUsed} empty="No materials issued to this project yet" columns={[{key:'name',label:'Material'},{key:'unit',label:'Unit'},{key:'qty',label:'Quantity'},{key:'amount',label:'Value',render:r=>money(r.amount)}]}/>
    </div>}

    {tab==='labour'&&<div className="panel">
      <div className="panel-title"><h3>Labour / Attendance (Last 20)</h3><a href="/attendance">Manage Attendance</a></div>
      <DataTable rows={attendance} empty="No attendance recorded for this project" columns={[{key:'attendance_date',label:'Date',render:r=>fmtDate(r.attendance_date)},{key:'employee_name',label:'Employee'},{key:'status',label:'Status',render:r=><span className={`badge ${r.status?.toLowerCase().replaceAll(' ','-')}`}>{r.status}</span>},{key:'calculated_amount',label:'Amount',render:r=>money(r.calculated_amount)}]}/>
    </div>}

    {tab==='expenses'&&<div className="panel">
      <div className="panel-title"><h3>Project Expenses</h3><a href="/expenses">Manage Expenses</a></div>
      <DataTable rows={expenses} empty="No expenses recorded for this project" columns={[{key:'expense_date',label:'Date',render:r=>fmtDate(r.expense_date)},{key:'expense_type',label:'Category'},{key:'description',label:'Description'},{key:'amount',label:'Amount',render:r=>money(r.amount)}]}/>
    </div>}

    {tab==='invoices'&&<div className="panel">
      <div className="panel-title"><h3>Project Invoices</h3><a href="/invoices">Manage Invoices</a></div>
      <DataTable rows={invoices} empty="No invoices raised for this project" columns={[{key:'invoice_no',label:'Invoice No.'},{key:'invoice_date',label:'Date',render:r=>fmtDate(r.invoice_date)},{key:'grand_total',label:'Total',render:r=>money(r.grand_total)},{key:'paid_amount',label:'Paid',render:r=>money(r.paid_amount)},{key:'due_amount',label:'Due',render:r=>money(r.due_amount)},{key:'status',label:'Status',render:r=><span className={`badge ${r.status?.toLowerCase().replaceAll(' ','-')}`}>{r.status}</span>}]}/>
    </div>}

    {tab==='payments'&&<div className="panel">
      <div className="panel-title"><h3>Project Payments</h3><a href="/payments">Manage Payments</a></div>
      <DataTable rows={payments} empty="No payments received for this project" columns={[{key:'receipt_no',label:'Receipt No.'},{key:'payment_date',label:'Date',render:r=>fmtDate(r.payment_date)},{key:'amount',label:'Amount',render:r=>money(r.amount)},{key:'payment_method',label:'Method'}]}/>
    </div>}

    {tab==='equipment'&&<div className="panel">
      <div className="panel-title"><h3>Equipment Assigned</h3><a href="/equipment">Manage Equipment</a></div>
      <DataTable rows={equipment} empty="No equipment assigned to this project" columns={[{key:'equipment_name',label:'Equipment'},{key:'assigned_date',label:'Assigned',render:r=>fmtDate(r.assigned_date)},{key:'returned_date',label:'Returned',render:r=>fmtDate(r.returned_date)},{key:'fuel_cost',label:'Fuel Cost',render:r=>money(r.fuel_cost)}]}/>
    </div>}

    {tab==='files'&&<>
      <div className="page-head" style={{marginBottom:12}}><div><h3 style={{margin:0}}>Documents</h3></div><button className="btn primary" onClick={()=>setDocOpen(true)}>+ Upload Document</button></div>
      <div className="panel"><DataTable rows={documents} empty="No documents uploaded yet" columns={[
        {key:'title',label:'Title'},{key:'document_type',label:'Type'},
        {key:'file_path',label:'File',render:r=><a href={fileUrl(r.file_path)} target="_blank" rel="noreferrer">Open</a>},
        {key:'created_at',label:'Uploaded',render:r=>fmtDate(r.created_at)},
        {key:'_actions',label:'Action',render:r=><button className="icon-btn danger" title="Delete" onClick={()=>removeDocument(r.id)}><Trash2 size={15}/></button>}
      ]}/></div>
      <div className="page-head" style={{marginTop:20,marginBottom:12}}><div><h3 style={{margin:0}}>Site Photos</h3></div><button className="btn primary" onClick={()=>setPhotoOpen(true)}>+ Upload Photo</button></div>
      <div className="photo-grid">
        {photos.length?photos.map(ph=><div className="photo-card" key={ph.id}>
          <img src={fileUrl(ph.file_path)} alt={ph.caption||ph.photo_type}/>
          <div className="photo-meta"><span className="badge">{ph.photo_type}</span><button className="icon-btn danger" title="Delete" onClick={()=>removePhoto(ph.id)}><Trash2 size={15}/></button></div>
          {ph.caption&&<p>{ph.caption}</p>}
        </div>):<div className="panel"><p style={{color:'#94a3b8',textAlign:'center',padding:20}}>No photos uploaded yet</p></div>}
      </div>
    </>}

    {tab==='variations'&&<>
      <div className="page-head" style={{marginBottom:12}}><div><h3 style={{margin:0}}>Variations / Change Orders</h3><p style={{margin:'4px 0 0',fontSize:12,color:'#64748b'}}>Approved net variation: {money(variationTotal)}</p></div><button className="btn primary" onClick={openCreateVar}>+ Add Variation</button></div>
      <div className="panel"><DataTable rows={variations} empty="No variations recorded" columns={[
        {key:'variation_no',label:'No.'},{key:'variation_date',label:'Date',render:r=>fmtDate(r.variation_date)},{key:'description',label:'Description'},
        {key:'variation_type',label:'Type'},{key:'amount',label:'Amount',render:r=>money(r.amount)},
        {key:'status',label:'Status',render:r=><span className={`badge ${r.status?.toLowerCase()}`}>{r.status}</span>},
        {key:'_actions',label:'Action',render:r=><div className="row-actions">
          {r.status==='Pending'&&<><button className="btn small" onClick={()=>decideVariation(r,'Approved')}>Approve</button><button className="btn small" onClick={()=>decideVariation(r,'Rejected')}>Reject</button></>}
          <button type="button" className="icon-btn danger" title="Delete" onClick={()=>removeVariation(r)}><Trash2 size={15}/></button>
        </div>}
      ]}/></div>
    </>}

    {tab==='pnl'&&fi&&<div className="panel">
      <h3>Profit &amp; Loss</h3>
      <div className="pl-grid">
        <table><tbody>
          <tr><td>Contract Value</td><td>{money(fi.contractValue)}</td></tr>
          <tr><td>Approved Variations</td><td>{money(variationTotal)}</td></tr>
          <tr><td>Total Invoice</td><td>{money(fi.totalInvoice)}</td></tr>
          <tr><td>Total Received</td><td>{money(fi.totalReceived)}</td></tr>
          <tr><td>Outstanding</td><td>{money(fi.outstanding)}</td></tr>
        </tbody></table>
        <table><tbody>
          <tr><td>Material Cost</td><td>{money(fi.materialCost)}</td></tr>
          <tr><td>Labour Cost</td><td>{money(fi.labourCost)}</td></tr>
          <tr><td>Other Cost</td><td>{money(fi.otherCost)}</td></tr>
          <tr className="pl-total-row"><td>Total Expense</td><td>{money(fi.totalExpense)}</td></tr>
        </tbody></table>
      </div>
      <div className={`profit-banner ${fi.currentCashProfit<0?'negative':''}`}><span>Current Cash Profit</span><b>{money(fi.currentCashProfit)}</b></div>
      <div className={`profit-banner ${(fi.projectedProfit+Number(variationTotal||0))<0?'negative':''}`} style={{marginTop:10}}><span>Projected Profit ({Number(fi.profitMargin||0).toFixed(1)}% margin)</span><b>{money(fi.projectedProfit+Number(variationTotal||0))}</b></div>
    </div>}

    {tab==='timeline'&&<div className="panel">
      <h3>Activity Timeline</h3>
      {timeline?.length?<ul className="mini-list">
        {timeline.map((t,i)=><li key={i}>
          <div><span className="ml-main">{ACTION_LABELS[t.action]||t.action}</span><div className="ml-sub">{t.user_name||'System'} · {new Date(t.created_at).toLocaleString('en-IN')}</div></div>
        </li>)}
      </ul>:<p style={{color:'#94a3b8'}}>No activity recorded yet.</p>}
    </div>}

    <Modal open={logOpen} title={logMode==='edit'?'Edit Site Log':'Add Site Log'} onClose={()=>setLogOpen(false)}>
      <form className="form-grid" onSubmit={saveLog}>
        <label>Date<input type="date" value={logForm.log_date} onChange={e=>setLogForm({...logForm,log_date:e.target.value})}/></label>
        <label>Weather<input value={logForm.weather||''} onChange={e=>setLogForm({...logForm,weather:e.target.value})}/></label>
        <label>Worker Count<input type="number" value={logForm.worker_count||''} onChange={e=>setLogForm({...logForm,worker_count:e.target.value})}/></label>
        <label>Work Progress Today %<input type="number" value={logForm.work_progress||''} onChange={e=>setLogForm({...logForm,work_progress:e.target.value})}/></label>
        <label className="full">Today's Work<input value={logForm.today_work||''} onChange={e=>setLogForm({...logForm,today_work:e.target.value})}/></label>
        <label className="full">Materials Used<input value={logForm.materials_used||''} onChange={e=>setLogForm({...logForm,materials_used:e.target.value})}/></label>
        <label className="full">Equipment Used<input value={logForm.equipment_used||''} onChange={e=>setLogForm({...logForm,equipment_used:e.target.value})}/></label>
        <label className="full">Problems / Delays<input value={logForm.problems_delays||''} onChange={e=>setLogForm({...logForm,problems_delays:e.target.value})}/></label>
        <label className="full">Tomorrow's Plan<input value={logForm.tomorrow_plan||''} onChange={e=>setLogForm({...logForm,tomorrow_plan:e.target.value})}/></label>
        <div className="form-actions full"><button type="button" className="btn" onClick={()=>setLogOpen(false)}>Cancel</button><button className="btn primary">Save Log</button></div>
      </form>
    </Modal>

    <Modal open={docOpen} title="Upload Document" onClose={()=>setDocOpen(false)}>
      <form className="form-grid" onSubmit={uploadDocument}>
        <label>Title<input required value={docTitle} onChange={e=>setDocTitle(e.target.value)}/></label>
        <label>Type<select value={docType} onChange={e=>setDocType(e.target.value)}>{['Contract','Drawing','Permit','Invoice','Other'].map(t=><option key={t}>{t}</option>)}</select></label>
        <label className="full">File (PDF or image)<input type="file" required accept=".pdf,image/*" onChange={e=>setDocFile(e.target.files[0])}/></label>
        <div className="form-actions full"><button type="button" className="btn" onClick={()=>setDocOpen(false)}>Cancel</button><button className="btn primary">Upload</button></div>
      </form>
    </Modal>

    <Modal open={photoOpen} title="Upload Site Photo" onClose={()=>setPhotoOpen(false)}>
      <form className="form-grid" onSubmit={uploadPhoto}>
        <label>Type<select value={photoType} onChange={e=>setPhotoType(e.target.value)}>{['Before','Progress','After','Other'].map(t=><option key={t}>{t}</option>)}</select></label>
        <label>Date<input type="date" value={photoDate} onChange={e=>setPhotoDate(e.target.value)}/></label>
        <label className="full">Caption<input value={photoCaption} onChange={e=>setPhotoCaption(e.target.value)}/></label>
        <label className="full">Photo<input type="file" required accept="image/*" onChange={e=>setPhotoFile(e.target.files[0])}/></label>
        <div className="form-actions full"><button type="button" className="btn" onClick={()=>setPhotoOpen(false)}>Cancel</button><button className="btn primary">Upload</button></div>
      </form>
    </Modal>

    <Modal open={varOpen} title="Add Variation" onClose={()=>setVarOpen(false)}>
      <form className="form-grid" onSubmit={saveVariation}>
        <label>Date<input type="date" value={varForm.variation_date} onChange={e=>setVarForm({...varForm,variation_date:e.target.value})}/></label>
        <label>Type<select value={varForm.variation_type} onChange={e=>setVarForm({...varForm,variation_type:e.target.value})}>{['Addition','Deduction'].map(t=><option key={t}>{t}</option>)}</select></label>
        <label>Amount<input type="number" step="0.01" required value={varForm.amount||''} onChange={e=>setVarForm({...varForm,amount:e.target.value})}/></label>
        <label className="full">Description<input required value={varForm.description||''} onChange={e=>setVarForm({...varForm,description:e.target.value})}/></label>
        <label className="full">Remarks<input value={varForm.remarks||''} onChange={e=>setVarForm({...varForm,remarks:e.target.value})}/></label>
        <div className="form-actions full"><button type="button" className="btn" onClick={()=>setVarOpen(false)}>Cancel</button><button className="btn primary">Save</button></div>
      </form>
    </Modal>
  </>
}
