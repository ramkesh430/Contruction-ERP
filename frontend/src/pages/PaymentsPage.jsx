import { useEffect,useState } from 'react';import api from '../services/api';import Modal from '../components/Modal';import DataTable from '../components/DataTable';import BulkActionsBar from '../components/BulkActionsBar';import { useRowSelection } from '../hooks/useRowSelection';import StatCard from '../components/StatCard';import { money,fmtDate,todayStr } from '../utils/format';import { Printer,Pencil,Trash2,CircleDollarSign,CalendarDays,ReceiptText,Clock } from 'lucide-react';
function printReceipt(r){ window.open(`/receipts/${r.id}/print`,'_blank'); }
export default function PaymentsPage(){
  const [rows,setRows]=useState([]),[clients,setClients]=useState([]),[projects,setProjects]=useState([]),[invoices,setInvoices]=useState([]),[open,setOpen]=useState(false),[mode,setMode]=useState('create'),[editId,setEditId]=useState(null),[tab,setTab]=useState('payments'),[f,setF]=useState({payment_method:'Cash'});
  const load=()=>Promise.all([api.get('/payments'),api.get('/clients'),api.get('/projects'),api.get('/invoices')]).then(([a,b,c,d])=>{setRows(a.data);setClients(b.data);setProjects(c.data);setInvoices(d.data)});
  useEffect(()=>{load()},[]);
  function openCreate(){setMode('create');setEditId(null);setF({payment_method:'Cash'});setOpen(true)}
  function openEdit(row){setMode('edit');setEditId(row.id);setF({...row,payment_date:row.payment_date?String(row.payment_date).slice(0,10):''});setOpen(true)}
  async function save(e){e.preventDefault();if(mode==='edit'){await api.put(`/payments/${editId}`,f)}else{await api.post('/payments',f)}setOpen(false);load()}
  function onInvoiceChange(invoiceId){
    const inv=invoices.find(i=>String(i.id)===String(invoiceId));
    setF(prev=>({...prev,invoice_id:invoiceId,client_id:inv?.client_id||prev.client_id,project_id:inv?.project_id||prev.project_id,amount:inv?inv.due_amount:prev.amount}));
  }
  const payableInvoices=invoices.filter(i=>Number(i.due_amount)>0);
  async function remove(row){if(!confirm(`Delete payment ${row.receipt_no}? This will reduce the linked invoice's paid amount.`))return;await api.delete(`/payments/${row.id}`);load()}
  const now=new Date(); const monthStart=new Date(now.getFullYear(),now.getMonth(),1);
  const totalCollected=rows.filter(r=>r.status==='Successful').reduce((s,r)=>s+Number(r.amount||0),0);
  const monthCollected=rows.filter(r=>r.status==='Successful'&&new Date(r.payment_date)>=monthStart).reduce((s,r)=>s+Number(r.amount||0),0);
  const pendingCount=rows.filter(r=>r.status==='Pending').length;
  const actionCol={key:'_actions',label:'Action',render:r=><div className="row-actions"><button type="button" className="icon-btn" title="Print Receipt" onClick={()=>printReceipt(r)}><Printer size={15}/></button><button type="button" className="icon-btn" title="Edit" onClick={()=>openEdit(r)}><Pencil size={15}/></button><button type="button" className="icon-btn danger" title="Delete" onClick={()=>remove(r)}><Trash2 size={15}/></button></div>};
  const baseColumns=[
    {key:'receipt_no',label:'Receipt No.'},
    {key:'payment_date',label:'Date',render:r=>fmtDate(r.payment_date)},
    {key:'client_name',label:'Client'},
    {key:'project_name',label:'Project'},
    {key:'invoice_id',label:'Against Invoice',render:r=>r.invoice_id?invoices.find(i=>i.id===r.invoice_id)?.invoice_no||`#${r.invoice_id}`:'—'},
    {key:'amount',label:'Amount',render:r=>money(r.amount)},
    {key:'payment_method',label:'Payment Mode'},
    {key:'reference_no',label:'Reference'},
    {key:'status',label:'Status',render:r=><span className={`badge ${r.status?.toLowerCase()}`}>{r.status}</span>},
    actionCol
  ];
  const tabRows=tab==='receipts'?rows.filter(r=>r.status==='Successful'):rows;
  const [filters,setFilters]=useState({search:'',client_id:'',payment_method:'',status:'',from:'',to:''});
  function resetFilters(){ setFilters({search:'',client_id:'',payment_method:'',status:'',from:'',to:''}); }
  const displayRows=tabRows.filter(r=>{
    if(filters.search&&!(r.receipt_no||'').toLowerCase().includes(filters.search.toLowerCase()))return false;
    if(filters.client_id&&String(r.client_id)!==String(filters.client_id))return false;
    if(filters.payment_method&&r.payment_method!==filters.payment_method)return false;
    if(filters.status&&r.status!==filters.status)return false;
    if(filters.from&&new Date(r.payment_date)<new Date(filters.from))return false;
    if(filters.to&&new Date(r.payment_date)>new Date(filters.to))return false;
    return true;
  });
  function exportCSV(list=displayRows){
    const cols=['receipt_no','payment_date','client_name','project_name','amount','payment_method','reference_no','status'];
    const header=['Receipt No.','Date','Client','Project','Amount','Payment Mode','Reference','Status'];
    const lines=[header, ...list.map(r=>cols.map(k=>r[k]??''))];
    const csv=lines.map(l=>l.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=`payments-${todayStr()}.csv`; a.click(); URL.revokeObjectURL(url);
  }
  const sel=useRowSelection(displayRows);
  async function bulkDelete(){
    if(!confirm(`Delete ${sel.count} selected payment(s)? This will reduce the linked invoices' paid amounts.`))return;
    await Promise.all([...sel.selectedIds].map(id=>api.delete(`/payments/${id}`)));
    sel.clear(); load();
  }
  return <>
    <div className="page-head"><div><h1>Payments / Receipts</h1><p>Record client collections and generate receipt numbers automatically.</p></div><button className="btn primary" onClick={openCreate}>+ Add Payment</button></div>
    <div className="stats-grid cols-4">
      <StatCard label="Total Collected" value={money(totalCollected)} sub="All Time" icon={<CircleDollarSign size={20}/>}/>
      <StatCard label="This Month" value={money(monthCollected)} sub={now.toLocaleString('en-IN',{month:'long',year:'numeric'})} icon={<CalendarDays size={20}/>}/>
      <StatCard label="Total Receipts" value={rows.length} sub="Count" icon={<ReceiptText size={20}/>}/>
      <StatCard label="Pending" value={pendingCount} sub="Awaiting Clearance" icon={<Clock size={20}/>}/>
    </div>
    <div className="tabs">
      <button className={`tab ${tab==='payments'?'active':''}`} onClick={()=>setTab('payments')}>Payments</button>
      <button className={`tab ${tab==='receipts'?'active':''}`} onClick={()=>setTab('receipts')}>Receipts</button>
    </div>
    <div className="filter-row">
      <label>Search<input placeholder="Receipt No." value={filters.search} onChange={e=>setFilters({...filters,search:e.target.value})}/></label>
      <label>Client<select value={filters.client_id} onChange={e=>setFilters({...filters,client_id:e.target.value})}><option value="">All</option>{clients.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      <label>Payment Mode<select value={filters.payment_method} onChange={e=>setFilters({...filters,payment_method:e.target.value})}><option value="">All</option>{['Cash','Bank Transfer','Cheque','Card','Digital Wallet'].map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Status<select value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value})}><option value="">All</option>{['Pending','Successful','Failed','Refunded'].map(x=><option key={x}>{x}</option>)}</select></label>
      <label>From<input type="date" value={filters.from} onChange={e=>setFilters({...filters,from:e.target.value})}/></label>
      <label>To<input type="date" value={filters.to} onChange={e=>setFilters({...filters,to:e.target.value})}/></label>
      <button type="button" className="btn" onClick={resetFilters}>Reset</button>
    </div>
    <BulkActionsBar count={sel.count} onExport={()=>exportCSV(sel.selectedRows)} onDelete={bulkDelete} onClear={sel.clear}/>
    <div className="panel"><DataTable rows={displayRows} selection={sel} columns={baseColumns} empty={tab==='receipts'?'No successful receipts match the current filters':'No records match the current filters'}/></div>
    <Modal open={open} title={mode==='edit'?'Edit Payment':'Record Payment'} onClose={()=>setOpen(false)}>
      <form className="form-grid" onSubmit={save}>
        <label>Against Invoice (optional)<select value={f.invoice_id||''} onChange={e=>onInvoiceChange(e.target.value)}><option value="">Not linked to an invoice</option>{payableInvoices.map(x=><option value={x.id} key={x.id}>{x.invoice_no} · Due {money(x.due_amount)}</option>)}</select></label>
        <label>Client<select value={f.client_id||''} onChange={e=>setF({...f,client_id:e.target.value})}><option value="">Select</option>{clients.map(x=><option value={x.id} key={x.id}>{x.name}</option>)}</select></label>
        <label>Project<select value={f.project_id||''} onChange={e=>setF({...f,project_id:e.target.value})}><option value="">Select</option>{projects.map(x=><option value={x.id} key={x.id}>{x.project_name}</option>)}</select></label>
        <label>Amount<input type="number" required value={f.amount||''} onChange={e=>setF({...f,amount:e.target.value})}/></label>
        <label>Payment Method<select value={f.payment_method} onChange={e=>setF({...f,payment_method:e.target.value})}>{['Cash','Bank Transfer','Cheque','Card','Digital Wallet'].map(x=><option key={x}>{x}</option>)}</select></label>
        <label>Reference No.<input value={f.reference_no||''} onChange={e=>setF({...f,reference_no:e.target.value})}/></label>
        <label>Payment Date<input type="date" value={f.payment_date||''} onChange={e=>setF({...f,payment_date:e.target.value})}/></label>
        <div className="form-actions full"><button type="button" className="btn" onClick={()=>setOpen(false)}>Cancel</button><button className="btn primary">{mode==='edit'?'Save Changes':'Save Payment'}</button></div>
      </form>
    </Modal>
  </>
}
