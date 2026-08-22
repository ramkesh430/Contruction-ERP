import { useEffect,useState } from 'react';import { useNavigate } from 'react-router-dom';import api from '../services/api';import Modal from '../components/Modal';import DataTable from '../components/DataTable';import BulkActionsBar from '../components/BulkActionsBar';import { useRowSelection } from '../hooks/useRowSelection';import { money,fmtDate,todayStr } from '../utils/format';import { Eye,Pencil,Printer,Copy,Send,Building2,Trash2 } from 'lucide-react';

export default function QuotationsPage(){
  const nav=useNavigate();
  const [rows,setRows]=useState([]);
  const [viewing,setViewing]=useState(null);
  const load=()=>api.get('/quotations').then(r=>setRows(r.data));
  useEffect(()=>{load()},[]);

  async function remove(row){if(!confirm(`Delete quotation ${row.quotation_no}?`))return;await api.delete(`/quotations/${row.id}`);load()}
  function exportCSV(list=rows){
    const cols=['quotation_no','client_name','project_name','quotation_date','valid_until','grand_total','status'];
    const header=['Quote No.','Client','Project','Date','Valid Upto','Amount','Status'];
    const lines=[header, ...list.map(r=>cols.map(k=>r[k]??''))];
    const csv=lines.map(l=>l.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=`quotations-${todayStr()}.csv`; a.click(); URL.revokeObjectURL(url);
  }
  const sel=useRowSelection(rows);
  async function bulkDelete(){
    if(!confirm(`Delete ${sel.count} selected quotation(s)?`))return;
    await Promise.all([...sel.selectedIds].map(id=>api.delete(`/quotations/${id}`)));
    sel.clear(); load();
  }
  async function view(row){const r=await api.get(`/quotations/${row.id}`);setViewing(r.data)}
  async function approve(qid){await api.post(`/quotations/${qid}/approve`);setViewing(null);load()}
  async function reject(qid){await api.post(`/quotations/${qid}/reject`);setViewing(null);load()}
  async function send(qid){await api.post(`/quotations/${qid}/send`);setViewing(null);load()}
  async function duplicate(row){const r=await api.post(`/quotations/${row.id}/duplicate`);load();nav(`/quotations/${r.data.id}/edit`)}
  async function convertToProject(row){
    if(!confirm(`Create a new project from quotation ${row.quotation_no}?`))return;
    const r=await api.post(`/quotations/${row.id}/convert-to-project`);
    setViewing(null);load();
    if(confirm(`Project ${r.data.project_code} created. Open its Progress page now?`)) nav(`/projects/${r.data.project_id}`);
  }
  function pdf(row){window.open(`/quotations/${row.id}/print`,'_blank')}

  return <><div className="page-head"><div><h1>Quotation & BOQ</h1><p>Create professional item-wise estimates with VAT, payment terms and PDF export.</p></div><button className="btn primary" onClick={()=>nav('/quotations/new')}>+ New Quotation</button></div>
  <BulkActionsBar count={sel.count} onExport={()=>exportCSV(sel.selectedRows)} onDelete={bulkDelete} onClear={sel.clear}/>

  <div className="panel"><DataTable rows={rows} selection={sel} columns={[
    {key:'quotation_no',label:'Quote No.'},
    {key:'client_name',label:'Client'},
    {key:'project_name',label:'Project'},
    {key:'quotation_date',label:'Date',render:r=>fmtDate(r.quotation_date)},
    {key:'valid_until',label:'Valid Upto',render:r=>fmtDate(r.valid_until)},
    {key:'grand_total',label:'Amount',render:r=>money(r.grand_total)},
    {key:'status',label:'Status',render:r=><span className={`badge ${r.status?.toLowerCase()}`}>{r.status}</span>},
    {key:'_actions',label:'Action',render:r=><div className="row-actions">
      <button type="button" className="icon-btn" title="View" onClick={()=>view(r)}><Eye size={15}/></button>
      <button type="button" className="icon-btn" title="Edit" onClick={()=>nav(`/quotations/${r.id}/edit`)}><Pencil size={15}/></button>
      <button type="button" className="icon-btn" title="PDF / Print" onClick={()=>pdf(r)}><Printer size={15}/></button>
      <button type="button" className="icon-btn" title="Duplicate" onClick={()=>duplicate(r)}><Copy size={15}/></button>
      {r.status==='Draft'&&<button type="button" className="icon-btn" title="Mark as Sent" onClick={()=>send(r.id)}><Send size={15}/></button>}
      {r.status==='Approved'&&<button type="button" className="icon-btn" title="Convert to Project" onClick={()=>convertToProject(r)}><Building2 size={15}/></button>}
      <button type="button" className="icon-btn danger" title="Delete" onClick={()=>remove(r)}><Trash2 size={15}/></button>
    </div>}
  ]}/></div>
  <Modal open={!!viewing} title={viewing?`Quotation ${viewing.quotation_no}`:''} onClose={()=>setViewing(null)} wide>
    {viewing&&<div>
      <div className="view-grid">
        <div className="vrow"><span>Client</span>{viewing.client_name||'—'}</div>
        <div className="vrow"><span>Project</span>{viewing.project_name||viewing.site_location||'—'}</div>
        <div className="vrow"><span>Date</span>{fmtDate(viewing.quotation_date)}</div>
        <div className="vrow"><span>Valid Upto</span>{fmtDate(viewing.valid_until)}</div>
        <div className="vrow"><span>Status</span><span className={`badge ${viewing.status?.toLowerCase()}`}>{viewing.status}</span></div>
        <div className="vrow"><span>Reference No.</span>{viewing.reference_no||'—'}</div>
      </div>
      <div className="table-wrap"><table><thead><tr><th>Category</th><th>Description</th><th>Unit</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
        <tbody>{viewing.items.map(it=><tr key={it.id}><td>{it.category||'—'}</td><td>{it.description}</td><td>{it.unit}</td><td>{Number(it.quantity)}</td><td>{money(it.rate)}</td><td>{money(it.amount)}</td></tr>)}</tbody>
      </table></div>
      <div className="profit-banner"><span>Grand Total</span><b>{money(viewing.grand_total)}</b></div>
      <div className="form-actions">
        <button type="button" className="btn" onClick={()=>pdf(viewing)}>PDF / Print</button>
        <button type="button" className="btn" onClick={()=>nav(`/quotations/${viewing.id}/edit`)}>Edit</button>
        {viewing.status==='Draft'&&<button type="button" className="btn" onClick={()=>send(viewing.id)}>Mark as Sent</button>}
        {['Draft','Sent'].includes(viewing.status)&&<><button className="btn" onClick={()=>reject(viewing.id)}>Reject</button><button className="btn primary" onClick={()=>approve(viewing.id)}>Approve</button></>}
        {viewing.status==='Approved'&&<button type="button" className="btn primary" onClick={()=>convertToProject(viewing)}>Convert to Project</button>}
      </div>
    </div>}
  </Modal>
  </>
}
