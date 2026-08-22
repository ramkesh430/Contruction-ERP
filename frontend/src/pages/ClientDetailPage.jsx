import { useEffect,useState } from 'react';import { useParams,useNavigate,useSearchParams,Link } from 'react-router-dom';import api from '../services/api';import Modal from '../components/Modal';import DataTable from '../components/DataTable';import { money,fmtDate,todayStr } from '../utils/format';import { Eye,Trash2,ArrowLeft,Printer } from 'lucide-react';

const API_ROOT=(api.defaults.baseURL||'').replace(/\/api\/?$/,'');
const fileUrl=p=>p?`${API_ROOT}${p}`:'';
const ACTION_LABELS={CREATE:'Created',UPDATE:'Updated',DELETE:'Deleted',ARCHIVE:'Archived',UNARCHIVE:'Restored'};
const TABS=[['overview','Overview'],['projects','Projects'],['quotations','Quotations'],['invoices','Invoices'],['payments','Payments'],['documents','Documents'],['statement','Statement'],['activity','Activity']];

export default function ClientDetailPage(){
  const {id}=useParams(); const nav=useNavigate(); const [params]=useSearchParams();
  const [tab,setTab]=useState(params.get('tab')||'overview');
  const [data,setData]=useState(null);
  const [docOpen,setDocOpen]=useState(false),[docTitle,setDocTitle]=useState(''),[docType,setDocType]=useState('Other'),[docFile,setDocFile]=useState(null);

  const load=()=>api.get(`/clients/${id}`).then(r=>setData(r.data));
  useEffect(()=>{load()},[id]);

  if(!data)return <div className="loading">Loading client...</div>;
  const {client:c,projects,quotations,invoices,payments,documents,timeline,statement}=data;

  async function uploadDocument(e){
    e.preventDefault(); if(!docFile)return;
    const fd=new FormData(); fd.append('file',docFile); fd.append('title',docTitle); fd.append('document_type',docType);
    await api.post(`/clients/${id}/documents`,fd);
    setDocOpen(false);setDocTitle('');setDocFile(null);load();
  }
  async function removeDocument(docId){ if(!confirm('Delete this document?'))return; await api.delete(`/clients/${id}/documents/${docId}`); load(); }

  return <>
    <div className="page-head"><div><h1>{c.name}</h1><p>Clients / {c.client_type||'Client'}</p></div><button className="btn" onClick={()=>nav('/clients')}><ArrowLeft size={15}/>Back to Clients</button></div>
    <div className="tabs" style={{overflowX:'auto',flexWrap:'nowrap'}}>
      {TABS.map(([key,label])=><button key={key} className={`tab ${tab===key?'active':''}`} style={{whiteSpace:'nowrap'}} onClick={()=>setTab(key)}>{label}</button>)}
    </div>

    {tab==='overview'&&<div className="progress-layout">
      <div className="panel">
        <h3>Client Info</h3>
        <div className="info-list">
          <div className="row"><span>Client Type</span><b>{c.client_type||'—'}</b></div>
          <div className="row"><span>Contact Person</span><b>{c.contact_person||'—'}</b></div>
          <div className="row"><span>Phone</span><b>{c.phone||'—'}</b></div>
          <div className="row"><span>Alternate Phone</span><b>{c.alternate_phone||'—'}</b></div>
          <div className="row"><span>Email</span><b>{c.email||'—'}</b></div>
          <div className="row"><span>Address</span><b>{c.address||'—'}</b></div>
          <div className="row"><span>Billing Address</span><b>{c.billing_address||'—'}</b></div>
          <div className="row"><span>PAN / VAT</span><b>{c.pan_vat_no||'—'}</b></div>
          <div className="row"><span>Registration No.</span><b>{c.registration_no||'—'}</b></div>
          <div className="row"><span>Payment Terms</span><b>{c.payment_terms||'—'}</b></div>
          <div className="row"><span>Status</span><b><span className={`badge ${c.is_active?'approved':'rejected'}`}>{c.is_active?'Active':'Inactive'}</span></b></div>
          <div className="row"><span>Bank</span><b>{c.bank_name?`${c.bank_name} · ${c.account_name||''} · ${c.account_number||''}`:'—'}</b></div>
        </div>
        <h3 style={{marginTop:18}}>Notes</h3>
        <p style={{fontSize:13,color:'#475569',whiteSpace:'pre-wrap'}}>{c.notes||'—'}</p>
      </div>
      <div className="panel">
        <h3>Summary</h3>
        <div className="info-list">
          <div className="row"><span>Total Projects</span><b>{c.total_projects}</b></div>
          <div className="row"><span>Active Projects</span><b>{c.active_projects}</b></div>
          <div className="row"><span>Total Contract Value</span><b>{money(c.contract_value)}</b></div>
          <div className="row"><span>Total Invoice</span><b>{money(c.total_invoice)}</b></div>
          <div className="row"><span>Total Received</span><b>{money(c.total_received)}</b></div>
          <div className="row"><span>Opening Balance</span><b>{money(c.opening_balance)}</b></div>
          <div className="row"><span>Credit Limit</span><b>{money(c.credit_limit)}</b></div>
        </div>
        <div className={`profit-banner ${Number(c.total_due)>0?'negative':''}`} style={{marginTop:14}}><span>Total Due</span><b>{money(c.total_due)}</b></div>
      </div>
    </div>}

    {tab==='projects'&&<div className="panel">
      <div className="panel-title"><h3>Projects</h3><Link to="/projects">Manage Projects</Link></div>
      <DataTable rows={projects} empty="No projects for this client yet" columns={[
        {key:'project_code',label:'Code'},{key:'project_name',label:'Project'},
        {key:'status',label:'Status',render:r=><span className={`badge ${r.status?.toLowerCase().replaceAll(' ','-')}`}>{r.status}</span>},
        {key:'progress_percentage',label:'Progress',render:r=>Number(r.progress_percentage||0)+'%'},
        {key:'contract_amount',label:'Contract Amount',render:r=>money(r.contract_amount)},
        {key:'_actions',label:'Action',render:r=><button type="button" className="icon-btn" title="Open" onClick={()=>nav(`/projects/${r.id}`)}><Eye size={15}/></button>}
      ]}/>
    </div>}

    {tab==='quotations'&&<div className="panel">
      <div className="panel-title"><h3>Quotations &amp; BOQs</h3><Link to="/quotations">Manage Quotations</Link></div>
      <DataTable rows={quotations} empty="No quotations for this client yet" columns={[
        {key:'quotation_no',label:'Quotation No.'},{key:'title',label:'Title'},{key:'quotation_date',label:'Date',render:r=>fmtDate(r.quotation_date)},
        {key:'grand_total',label:'Amount',render:r=>money(r.grand_total)},
        {key:'status',label:'Status',render:r=><span className={`badge ${r.status?.toLowerCase()}`}>{r.status}</span>},
        {key:'_actions',label:'Action',render:r=><button type="button" className="icon-btn" title="Open" onClick={()=>nav(`/quotations/${r.id}/edit`)}><Eye size={15}/></button>}
      ]}/>
    </div>}

    {tab==='invoices'&&<div className="panel">
      <div className="panel-title"><h3>Invoices</h3><Link to="/invoices">Manage Invoices</Link></div>
      <DataTable rows={invoices} empty="No invoices for this client yet" columns={[
        {key:'invoice_no',label:'Invoice No.'},{key:'invoice_date',label:'Date',render:r=>fmtDate(r.invoice_date)},
        {key:'grand_total',label:'Total',render:r=>money(r.grand_total)},{key:'paid_amount',label:'Paid',render:r=>money(r.paid_amount)},
        {key:'due_amount',label:'Due',render:r=>money(r.due_amount)},
        {key:'status',label:'Status',render:r=><span className={`badge ${r.status?.toLowerCase().replaceAll(' ','-')}`}>{r.status}</span>}
      ]}/>
    </div>}

    {tab==='payments'&&<div className="panel">
      <div className="panel-title"><h3>Payments</h3><Link to="/payments">Manage Payments</Link></div>
      <DataTable rows={payments} empty="No payments recorded for this client yet" columns={[
        {key:'receipt_no',label:'Receipt No.'},{key:'payment_date',label:'Date',render:r=>fmtDate(r.payment_date)},
        {key:'amount',label:'Amount',render:r=>money(r.amount)},{key:'payment_method',label:'Method'},
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

    {tab==='statement'&&<div className="panel">
      <div className="panel-title"><h3>Account Statement</h3><button className="btn small" onClick={()=>window.open(`/clients/${id}/statement/print`,'_blank')}><Printer size={15}/>Print Statement</button></div>
      <div className="table-wrap"><table><thead><tr><th>Date</th><th>Type</th><th>Reference</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead>
        <tbody>{statement.map((s,i)=><tr key={i}>
          <td>{s.txn_date?fmtDate(s.txn_date):'—'}</td><td>{s.type}</td><td>{s.ref}</td>
          <td>{s.debit?money(s.debit):'—'}</td><td>{s.credit?money(s.credit):'—'}</td><td><b>{money(s.balance)}</b></td>
        </tr>)}</tbody>
      </table></div>
      <div className={`profit-banner ${Number(c.total_due)>0?'negative':''}`} style={{marginTop:14}}><span>Closing Balance</span><b>{money(statement.at(-1)?.balance||0)}</b></div>
    </div>}

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
        <label>Type<select value={docType} onChange={e=>setDocType(e.target.value)}>{['Agreement','PAN/VAT','Registration','Correspondence','Other'].map(t=><option key={t}>{t}</option>)}</select></label>
        <label className="full">File (PDF or image)<input type="file" required accept=".pdf,image/*" onChange={e=>setDocFile(e.target.files[0])}/></label>
        <div className="form-actions full"><button type="button" className="btn" onClick={()=>setDocOpen(false)}>Cancel</button><button className="btn primary">Upload</button></div>
      </form>
    </Modal>
  </>
}
