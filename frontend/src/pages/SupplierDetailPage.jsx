import { useEffect,useState } from 'react';import { useParams,useNavigate,useSearchParams,Link } from 'react-router-dom';import api from '../services/api';import Modal from '../components/Modal';import DataTable from '../components/DataTable';import { money,fmtDate } from '../utils/format';import { Trash2,ArrowLeft,Printer } from 'lucide-react';

const API_ROOT=(api.defaults.baseURL||'').replace(/\/api\/?$/,'');
const fileUrl=p=>p?`${API_ROOT}${p}`:'';
const ACTION_LABELS={CREATE:'Created',UPDATE:'Updated',DELETE:'Deleted',ARCHIVE:'Archived',UNARCHIVE:'Restored',PAY:'Payment Recorded'};
const TABS=[['overview','Overview'],['purchases','Purchases'],['payments','Payments'],['documents','Documents'],['statement','Statement'],['activity','Activity']];

export default function SupplierDetailPage(){
  const {id}=useParams(); const nav=useNavigate(); const [params]=useSearchParams();
  const [tab,setTab]=useState(params.get('tab')||'overview');
  const [data,setData]=useState(null);
  const [docOpen,setDocOpen]=useState(false),[docTitle,setDocTitle]=useState(''),[docType,setDocType]=useState('Other'),[docFile,setDocFile]=useState(null);
  const [payFor,setPayFor]=useState(null),[payAmount,setPayAmount]=useState('');

  const load=()=>api.get(`/suppliers/${id}`).then(r=>setData(r.data));
  useEffect(()=>{load()},[id]);

  if(!data)return <div className="loading">Loading supplier...</div>;
  const {supplier:s,purchases,payments,documents,timeline,statement}=data;

  async function uploadDocument(e){
    e.preventDefault(); if(!docFile)return;
    const fd=new FormData(); fd.append('file',docFile); fd.append('title',docTitle); fd.append('document_type',docType);
    await api.post(`/suppliers/${id}/documents`,fd);
    setDocOpen(false);setDocTitle('');setDocFile(null);load();
  }
  async function removeDocument(docId){ if(!confirm('Delete this document?'))return; await api.delete(`/suppliers/${id}/documents/${docId}`); load(); }
  async function recordPayment(){ if(!payAmount||Number(payAmount)<=0)return; await api.post(`/material-purchases/${payFor.id}/pay`,{amount:Number(payAmount)}); setPayFor(null); setPayAmount(''); load(); }

  return <>
    <div className="page-head"><div><h1>{s.name}</h1><p>Suppliers / {s.contact_person||'Supplier'}</p></div><button className="btn" onClick={()=>nav('/suppliers')}><ArrowLeft size={15}/>Back to Suppliers</button></div>
    <div className="tabs" style={{overflowX:'auto',flexWrap:'nowrap'}}>
      {TABS.map(([key,label])=><button key={key} className={`tab ${tab===key?'active':''}`} style={{whiteSpace:'nowrap'}} onClick={()=>setTab(key)}>{label}</button>)}
    </div>

    {tab==='overview'&&<div className="progress-layout">
      <div className="panel">
        <h3>Supplier Info</h3>
        <div className="info-list">
          <div className="row"><span>Contact Person</span><b>{s.contact_person||'—'}</b></div>
          <div className="row"><span>Phone</span><b>{s.phone||'—'}</b></div>
          <div className="row"><span>Email</span><b>{s.email||'—'}</b></div>
          <div className="row"><span>Address</span><b>{s.address||'—'}</b></div>
          <div className="row"><span>PAN / VAT</span><b>{s.pan_vat_no||'—'}</b></div>
        </div>
        <h3 style={{marginTop:18}}>Notes</h3>
        <p style={{fontSize:13,color:'#475569',whiteSpace:'pre-wrap'}}>{s.notes||'—'}</p>
      </div>
      <div className="panel">
        <h3>Summary</h3>
        <div className="info-list">
          <div className="row"><span>Total Purchases</span><b>{s.total_purchases}</b></div>
          <div className="row"><span>Total Purchase Amount</span><b>{money(s.total_purchase_amount)}</b></div>
          <div className="row"><span>Total Paid</span><b>{money(s.total_paid)}</b></div>
          <div className="row"><span>Opening Due</span><b>{money(s.opening_due)}</b></div>
        </div>
        <div className={`profit-banner ${Number(s.total_due)>0?'negative':''}`} style={{marginTop:14}}><span>Total Due</span><b>{money(s.total_due)}</b></div>
      </div>
    </div>}

    {tab==='purchases'&&<div className="panel">
      <div className="panel-title"><h3>Material Purchases</h3><Link to="/materials">Manage Materials</Link></div>
      <DataTable rows={purchases} empty="No purchases from this supplier yet" columns={[
        {key:'purchase_no',label:'Purchase No.'},{key:'project_name',label:'Project',render:r=>r.project_name||'General'},
        {key:'purchase_date',label:'Date',render:r=>fmtDate(r.purchase_date)},
        {key:'grand_total',label:'Amount',render:r=>money(r.grand_total)},{key:'paid_amount',label:'Paid',render:r=>money(r.paid_amount)},
        {key:'due_amount',label:'Due',render:r=>money(r.due_amount)},
        {key:'_actions',label:'Action',render:r=>Number(r.due_amount)>0?<button className="btn small" onClick={()=>{setPayFor(r);setPayAmount(String(r.due_amount))}}>Pay</button>:<span className="badge approved">Settled</span>}
      ]}/>
    </div>}

    {tab==='payments'&&<div className="panel">
      <h3>Payment History</h3>
      <DataTable rows={payments} empty="No payments recorded for this supplier yet" columns={[
        {key:'payment_date',label:'Date',render:r=>fmtDate(r.payment_date)},{key:'purchase_no',label:'Against Purchase',render:r=>r.purchase_no||'—'},
        {key:'amount',label:'Amount',render:r=>money(r.amount)},{key:'payment_method',label:'Method'},{key:'reference_no',label:'Reference',render:r=>r.reference_no||'—'},
        {key:'_actions',label:'Action',render:r=><button type="button" className="icon-btn" title="Print Receipt" onClick={()=>window.open(`/supplier-receipts/${r.id}/print`,'_blank')}><Printer size={15}/></button>}
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
      <div className="panel-title"><h3>Account Statement</h3><button className="btn small" onClick={()=>window.open(`/suppliers/${id}/statement/print`,'_blank')}><Printer size={15}/>Print Statement</button></div>
      <div className="table-wrap"><table><thead><tr><th>Date</th><th>Type</th><th>Reference</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead>
        <tbody>{statement.map((st,i)=><tr key={i}>
          <td>{st.txn_date?fmtDate(st.txn_date):'—'}</td><td>{st.type}</td><td>{st.ref}</td>
          <td>{st.debit?money(st.debit):'—'}</td><td>{st.credit?money(st.credit):'—'}</td><td><b>{money(st.balance)}</b></td>
        </tr>)}</tbody>
      </table></div>
      <div className={`profit-banner ${Number(s.total_due)>0?'negative':''}`} style={{marginTop:14}}><span>Closing Balance</span><b>{money(statement.at(-1)?.balance||0)}</b></div>
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
        <label>Type<select value={docType} onChange={e=>setDocType(e.target.value)}>{['Agreement','PAN/VAT','Quotation','Correspondence','Other'].map(t=><option key={t}>{t}</option>)}</select></label>
        <label className="full">File (PDF or image)<input type="file" required accept=".pdf,image/*" onChange={e=>setDocFile(e.target.files[0])}/></label>
        <div className="form-actions full"><button type="button" className="btn" onClick={()=>setDocOpen(false)}>Cancel</button><button className="btn primary">Upload</button></div>
      </form>
    </Modal>

    <Modal open={!!payFor} title={`Record Payment — ${payFor?.purchase_no||''}`} onClose={()=>setPayFor(null)}>
      {payFor&&<div>
        <div className="info-list"><div className="row"><span>Due Amount</span><b>{money(payFor.due_amount)}</b></div></div>
        <div className="form-grid" style={{marginTop:14}}>
          <label className="full">Amount to Pay<input type="number" step="0.01" value={payAmount} onChange={e=>setPayAmount(e.target.value)}/></label>
          <div className="form-actions full"><button type="button" className="btn" onClick={()=>setPayFor(null)}>Cancel</button><button type="button" className="btn primary" onClick={recordPayment}>Save Payment</button></div>
        </div>
      </div>}
    </Modal>
  </>
}
