import { useEffect,useState } from 'react';import { useNavigate } from 'react-router-dom';import api from '../services/api';import Modal from '../components/Modal';import DataTable from '../components/DataTable';import BulkActionsBar from '../components/BulkActionsBar';import { useRowSelection } from '../hooks/useRowSelection';import { money,todayStr } from '../utils/format';import { Eye,Pencil,Receipt,RotateCcw,Archive,Trash2,Download,Printer } from 'lucide-react';

const CLIENT_TYPES=['Individual','Company','Government','NGO/INGO','Contractor','Other'];

export default function ClientsPage(){
  const nav=useNavigate();
  const [rows,setRows]=useState([]);
  const [open,setOpen]=useState(false),[mode,setMode]=useState('create'),[editId,setEditId]=useState(null),[f,setF]=useState({});
  const [filters,setFilters]=useState({search:'',client_type:'',status:'',archived:'0'});

  function load(fl=filters){
    const params={}; Object.entries(fl).forEach(([k,v])=>{ if(v) params[k]=v; });
    return api.get('/clients',{params}).then(r=>setRows(r.data));
  }
  useEffect(()=>{load()},[]);
  function applyFilters(e){ e?.preventDefault(); load(filters); }
  function resetFilters(){ const fl={search:'',client_type:'',status:'',archived:'0'}; setFilters(fl); load(fl); }

  function openCreate(){ setMode('create'); setEditId(null); setF({}); setOpen(true); }
  function openEdit(row){ setMode('edit'); setEditId(row.id); setF(row); setOpen(true); }
  async function save(e){ e.preventDefault(); if(mode==='edit'){ await api.put(`/clients/${editId}`,f); } else { await api.post('/clients',f); } setOpen(false); setF({}); load(); }
  async function remove(row){ if(!confirm(`Delete client "${row.name}"?`))return; await api.delete(`/clients/${row.id}`); load(); }
  async function archive(row){ if(!confirm(`Archive "${row.name}"?`))return; await api.post(`/clients/${row.id}/archive`); load(); }
  async function unarchive(row){ await api.post(`/clients/${row.id}/unarchive`); load(); }

  function exportCSV(list=rows){
    const cols=['name','client_type','contact_person','phone','email','total_projects','active_projects','contract_value','total_invoice','total_received','total_due'];
    const header=['Name','Type','Contact','Phone','Email','Total Projects','Active Projects','Contract Value','Total Invoice','Total Received','Total Due'];
    const lines=[header, ...list.map(r=>cols.map(k=>r[k]??''))];
    const csv=lines.map(l=>l.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=`clients-${todayStr()}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  const sel=useRowSelection(rows);
  async function bulkDelete(){
    if(!confirm(`Delete ${sel.count} selected client(s)?`))return;
    await Promise.all([...sel.selectedIds].map(id=>api.delete(`/clients/${id}`)));
    sel.clear(); load();
  }

  const archived=filters.archived==='1';

  return <>
    <div className="page-head"><div><h1>Clients</h1><p>Manage clients, contracts and outstanding balances.</p></div>
      <div className="row-actions">
        <button className="btn" onClick={exportCSV}><Download size={15}/>Export</button>
        <button className="btn" onClick={()=>window.print()}><Printer size={15}/>Print</button>
        <button className="btn primary" onClick={openCreate}>+ Add Client</button>
      </div>
    </div>

    <form className="filter-row" onSubmit={applyFilters}>
      <label>Search<input placeholder="Name or phone" value={filters.search} onChange={e=>setFilters({...filters,search:e.target.value})}/></label>
      <label>Client Type<select value={filters.client_type} onChange={e=>setFilters({...filters,client_type:e.target.value})}><option value="">All</option>{CLIENT_TYPES.map(t=><option key={t}>{t}</option>)}</select></label>
      <label>Status<select value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value})}><option value="">All</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
      <label>View<select value={filters.archived} onChange={e=>setFilters({...filters,archived:e.target.value})}><option value="0">Active</option><option value="1">Archived</option></select></label>
      <button className="btn primary">Apply</button>
      <button type="button" className="btn" onClick={resetFilters}>Reset</button>
    </form>

    <BulkActionsBar count={sel.count} onExport={()=>exportCSV(sel.selectedRows)} onDelete={bulkDelete} onClear={sel.clear}/>

    <div className="panel"><DataTable rows={rows} selection={sel} empty="No clients found" columns={[
      {key:'name',label:'Client Name'},{key:'client_type',label:'Type'},{key:'contact_person',label:'Contact Person'},{key:'phone',label:'Phone'},{key:'email',label:'Email'},
      {key:'total_projects',label:'Total Projects'},{key:'active_projects',label:'Active'},
      {key:'contract_value',label:'Contract Value',render:r=>money(r.contract_value)},
      {key:'total_invoice',label:'Total Invoice',render:r=>money(r.total_invoice)},
      {key:'total_received',label:'Total Received',render:r=>money(r.total_received)},
      {key:'total_due',label:'Total Due',render:r=><b style={{color:Number(r.total_due)>0?'#b45309':'#16a34a'}}>{money(r.total_due)}</b>},
      {key:'is_active',label:'Status',render:r=><span className={`badge ${r.is_active?'approved':'rejected'}`}>{r.is_active?'Active':'Inactive'}</span>},
      {key:'_actions',label:'Action',render:r=><div className="row-actions">
        <button type="button" className="icon-btn" title="View" onClick={()=>nav(`/clients/${r.id}`)}><Eye size={15}/></button>
        <button type="button" className="icon-btn" title="Edit" onClick={()=>openEdit(r)}><Pencil size={15}/></button>
        <button type="button" className="icon-btn" title="Statement" onClick={()=>nav(`/clients/${r.id}?tab=statement`)}><Receipt size={15}/></button>
        {archived?<button type="button" className="icon-btn" title="Restore" onClick={()=>unarchive(r)}><RotateCcw size={15}/></button>:<button type="button" className="icon-btn" title="Archive" onClick={()=>archive(r)}><Archive size={15}/></button>}
        <button type="button" className="icon-btn danger" title="Delete" onClick={()=>remove(r)}><Trash2 size={15}/></button>
      </div>}
    ]}/></div>

    <Modal open={open} title={mode==='edit'?'Edit Client':'Add Client'} onClose={()=>setOpen(false)} wide>
      <form className="form-grid" onSubmit={save}>
        <label>Client Type<input list="client-types" value={f.client_type||''} onChange={e=>setF({...f,client_type:e.target.value})}/><datalist id="client-types">{CLIENT_TYPES.map(t=><option key={t} value={t}/>)}</datalist></label>
        <label>Client Name<input required value={f.name||''} onChange={e=>setF({...f,name:e.target.value})}/></label>
        <label>Contact Person<input value={f.contact_person||''} onChange={e=>setF({...f,contact_person:e.target.value})}/></label>
        <label>Phone<input value={f.phone||''} onChange={e=>setF({...f,phone:e.target.value})}/></label>
        <label>Alternate Phone<input value={f.alternate_phone||''} onChange={e=>setF({...f,alternate_phone:e.target.value})}/></label>
        <label>Email<input type="email" value={f.email||''} onChange={e=>setF({...f,email:e.target.value})}/></label>
        <label>Address<input value={f.address||''} onChange={e=>setF({...f,address:e.target.value})}/></label>
        <label>Billing Address<input value={f.billing_address||''} onChange={e=>setF({...f,billing_address:e.target.value})}/></label>
        <label>PAN / VAT<input value={f.pan_vat_no||''} onChange={e=>setF({...f,pan_vat_no:e.target.value})}/></label>
        <label>Company Registration No.<input value={f.registration_no||''} onChange={e=>setF({...f,registration_no:e.target.value})}/></label>
        <label>Opening Balance<input type="number" step="0.01" value={f.opening_balance??''} onChange={e=>setF({...f,opening_balance:e.target.value})}/></label>
        <label>Credit Limit<input type="number" step="0.01" value={f.credit_limit??''} onChange={e=>setF({...f,credit_limit:e.target.value})}/></label>
        <label>Payment Terms<input placeholder="e.g. Net 30 days" value={f.payment_terms||''} onChange={e=>setF({...f,payment_terms:e.target.value})}/></label>
        <label>Status<select value={f.is_active===0||f.is_active===false?'0':'1'} onChange={e=>setF({...f,is_active:e.target.value==='1'})}><option value="1">Active</option><option value="0">Inactive</option></select></label>
        <label>Bank Name<input value={f.bank_name||''} onChange={e=>setF({...f,bank_name:e.target.value})}/></label>
        <label>Account Name<input value={f.account_name||''} onChange={e=>setF({...f,account_name:e.target.value})}/></label>
        <label>Account Number<input value={f.account_number||''} onChange={e=>setF({...f,account_number:e.target.value})}/></label>
        <label className="full">Notes<textarea value={f.notes||''} onChange={e=>setF({...f,notes:e.target.value})}/></label>
        {mode==='edit'&&<p className="full" style={{fontSize:12,color:'#94a3b8',margin:0}}>Document uploads are managed from the client's Documents tab after saving.</p>}
        <div className="form-actions full"><button type="button" className="btn" onClick={()=>setOpen(false)}>Cancel</button><button className="btn primary">{mode==='edit'?'Save Changes':'Create Client'}</button></div>
      </form>
    </Modal>
  </>
}
