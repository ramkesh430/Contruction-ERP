import { useEffect,useState } from 'react';import { useNavigate } from 'react-router-dom';import api from '../services/api';import Modal from '../components/Modal';import DataTable from '../components/DataTable';import StatCard from '../components/StatCard';import { money,fmtDate,todayStr } from '../utils/format';import BulkActionsBar from '../components/BulkActionsBar';import { useRowSelection } from '../hooks/useRowSelection';import { Eye,Pencil,Trash2,Printer,ReceiptText,CircleDollarSign,CheckCircle2,AlertTriangle } from 'lucide-react';
const blankItem=()=>({description:'',unit:'Job',quantity:1,rate:0});
export default function InvoicesPage(){
  const nav=useNavigate();
  const [rows,setRows]=useState([]),[clients,setClients]=useState([]),[projects,setProjects]=useState([]);
  const [open,setOpen]=useState(false),[mode,setMode]=useState('create'),[editId,setEditId]=useState(null),[f,setF]=useState({vat_rate:13,items:[blankItem()]}),[err,setErr]=useState('');
  const load=()=>Promise.all([api.get('/invoices'),api.get('/clients'),api.get('/projects')]).then(([a,b,c])=>{setRows(a.data);setClients(b.data);setProjects(c.data)});
  useEffect(()=>{load()},[]);
  const updItem=(i,k,v)=>setF({...f,items:f.items.map((x,n)=>n===i?{...x,[k]:v}:x)});
  function openCreate(){setMode('create');setEditId(null);setErr('');setF({vat_rate:13,items:[blankItem()]});setOpen(true)}
  async function openEdit(row){setMode('edit');setEditId(row.id);setErr('');const {data}=await api.get(`/invoices/${row.id}`);setF({client_id:data.client_id,project_id:data.project_id,invoice_date:String(data.invoice_date).slice(0,10),vat_rate:data.vat_rate,discount:data.discount,items:data.items.map(x=>({description:x.description,unit:x.unit,quantity:x.quantity,rate:x.rate}))});setOpen(true)}
  async function save(e){e.preventDefault();setErr('');try{if(mode==='edit'){await api.put(`/invoices/${editId}`,f)}else{await api.post('/invoices',f)}setOpen(false);load()}catch(e){setErr(e.response?.data?.message||'Save failed')}}
  async function remove(row){if(!confirm(`Delete invoice ${row.invoice_no}?`))return;await api.delete(`/invoices/${row.id}`);load()}
  function exportCSV(list=rows){
    const cols=['invoice_no','client_name','project_name','invoice_date','due_date','grand_total','paid_amount','due_amount','status'];
    const header=['Invoice No.','Client','Project','Invoice Date','Due Date','Total','Paid','Due','Status'];
    const lines=[header, ...list.map(r=>cols.map(k=>r[k]??''))];
    const csv=lines.map(l=>l.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=`invoices-${todayStr()}.csv`; a.click(); URL.revokeObjectURL(url);
  }
  const sel=useRowSelection(rows);
  async function bulkDelete(){
    if(!confirm(`Delete ${sel.count} selected invoice(s)?`))return;
    await Promise.all([...sel.selectedIds].map(id=>api.delete(`/invoices/${id}`)));
    sel.clear(); load();
  }
  function handleInvoicePrint(invoiceId){window.open(`/invoices/${invoiceId}/print`,'_blank')}

  const totalAmount=rows.reduce((s,r)=>s+Number(r.grand_total||0),0);
  const paidAmount=rows.reduce((s,r)=>s+Number(r.paid_amount||0),0);
  const dueAmount=rows.reduce((s,r)=>s+Number(r.due_amount||0),0);
  const overdueRows=rows.filter(r=>r.effective_status==='Overdue');
  const overdueAmount=overdueRows.reduce((s,r)=>s+Number(r.due_amount||0),0);
  return <>
    <div className="page-head"><div><h1>Invoice / Billing</h1><p>Create VAT-ready project invoices and track outstanding amounts.</p></div><button className="btn primary" onClick={openCreate}>+ Create Invoice</button></div>
    <div className="stats-grid cols-4">
      <StatCard label="Total Invoices" value={rows.length} sub="All Invoices" icon={<ReceiptText size={20}/>}/>
      <StatCard label="Total Amount" value={money(totalAmount)} sub="Billed" icon={<CircleDollarSign size={20}/>}/>
      <StatCard label="Paid Amount" value={money(paidAmount)} sub="Collected" icon={<CheckCircle2 size={20}/>}/>
      <StatCard label="Overdue" value={overdueRows.length} sub={overdueRows.length?money(overdueAmount)+' outstanding':'None'} icon={<AlertTriangle size={20}/>} tone={overdueRows.length?'danger':undefined}/>
    </div>
    <BulkActionsBar count={sel.count} onExport={()=>exportCSV(sel.selectedRows)} onDelete={bulkDelete} onClear={sel.clear}/>

    <div className="panel"><DataTable rows={rows} selection={sel} columns={[
      {key:'invoice_no',label:'Invoice No.'},{key:'client_name',label:'Client'},{key:'project_name',label:'Project'},
      {key:'invoice_date',label:'Invoice Date',render:r=>fmtDate(r.invoice_date)},
      {key:'due_date',label:'Due Date',render:r=>fmtDate(r.due_date)},
      {key:'grand_total',label:'Total',render:r=>money(r.grand_total)},{key:'paid_amount',label:'Paid',render:r=>money(r.paid_amount)},
      {key:'due_amount',label:'Due',render:r=>money(r.due_amount)},
      {key:'status',label:'Status',render:r=><span className={`badge ${r.effective_status?.toLowerCase().replaceAll(' ','-')}`}>{r.effective_status||r.status}</span>},
      {key:'_actions',label:'Action',render:r=><div className="row-actions">
        <button type="button" className="icon-btn" title="View" onClick={()=>nav(`/invoices/${r.id}`)}><Eye size={15}/></button>
        <button type="button" className="icon-btn" title="Edit" onClick={()=>openEdit(r)}><Pencil size={15}/></button>
        <button type="button" className="icon-btn" title="Print" onClick={()=>handleInvoicePrint(r.id)}><Printer size={15}/></button>
        <button type="button" className="icon-btn danger" title="Delete" onClick={()=>remove(r)}><Trash2 size={15}/></button>
      </div>}
    ]}/></div>
    <Modal open={open} title={mode==='edit'?'Edit Invoice':'Create Invoice'} onClose={()=>setOpen(false)} wide>
      <form onSubmit={save}>
        {err&&<div className="alert danger full">{err}</div>}
        <div className="form-grid">
          <label>Client<select value={f.client_id||''} onChange={e=>setF({...f,client_id:e.target.value})}><option value="">Select</option>{clients.map(x=><option value={x.id} key={x.id}>{x.name}</option>)}</select></label>
          <label>Project<select value={f.project_id||''} onChange={e=>setF({...f,project_id:e.target.value})}><option value="">Select</option>{projects.map(x=><option value={x.id} key={x.id}>{x.project_name}</option>)}</select></label>
          <label>Invoice Date<input type="date" value={f.invoice_date||''} onChange={e=>setF({...f,invoice_date:e.target.value})}/></label>
          <label>VAT %<input type="number" value={f.vat_rate} onChange={e=>setF({...f,vat_rate:e.target.value})}/></label>
          <label>Discount<input type="number" value={f.discount||''} onChange={e=>setF({...f,discount:e.target.value})}/></label>
        </div>
        <div className="line-items">
          <div className="line-head"><b>Invoice Items</b><button type="button" className="btn small" onClick={()=>setF({...f,items:[...f.items,blankItem()]})}>+ Item</button></div>
          {f.items.map((x,i)=><div className="line-row" key={i}>
            <input className="desc" placeholder="Description" required value={x.description} onChange={e=>updItem(i,'description',e.target.value)}/>
            <input placeholder="Unit" value={x.unit} onChange={e=>updItem(i,'unit',e.target.value)}/>
            <input type="number" placeholder="Qty" value={x.quantity} onChange={e=>updItem(i,'quantity',e.target.value)}/>
            <input type="number" placeholder="Rate" value={x.rate} onChange={e=>updItem(i,'rate',e.target.value)}/>
            <b>Rs. {(Number(x.quantity)*Number(x.rate)).toLocaleString('en-IN')}</b>
            {f.items.length>1&&<button type="button" className="icon-btn danger" title="Remove" onClick={()=>setF({...f,items:f.items.filter((_,n)=>n!==i)})}><Trash2 size={15}/></button>}
          </div>)}
        </div>
        <div className="form-actions"><button type="button" className="btn" onClick={()=>setOpen(false)}>Cancel</button><button className="btn primary">{mode==='edit'?'Save Changes':'Create Invoice'}</button></div>
      </form>
    </Modal>
  </>
}
