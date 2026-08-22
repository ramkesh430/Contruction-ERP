import { useEffect,useState } from 'react';import { useNavigate } from 'react-router-dom';import api from '../services/api';import Modal from '../components/Modal';import DataTable from '../components/DataTable';import BulkActionsBar from '../components/BulkActionsBar';import { useRowSelection } from '../hooks/useRowSelection';import { money,todayStr } from '../utils/format';import { Eye,Pencil,Receipt,RotateCcw,Archive,Trash2,Download,Printer } from 'lucide-react';

export default function SuppliersPage(){
  const nav=useNavigate();
  const [rows,setRows]=useState([]);
  const [open,setOpen]=useState(false),[mode,setMode]=useState('create'),[editId,setEditId]=useState(null),[f,setF]=useState({}),[err,setErr]=useState('');
  const [filters,setFilters]=useState({search:'',archived:'0'});

  function load(fl=filters){
    const params={}; Object.entries(fl).forEach(([k,v])=>{ if(v) params[k]=v; });
    return api.get('/suppliers',{params}).then(r=>setRows(r.data));
  }
  useEffect(()=>{load()},[]);
  function applyFilters(e){ e?.preventDefault(); load(filters); }
  function resetFilters(){ const fl={search:'',archived:'0'}; setFilters(fl); load(fl); }

  function openCreate(){ setMode('create'); setEditId(null); setF({}); setErr(''); setOpen(true); }
  function openEdit(row){ setMode('edit'); setEditId(row.id); setF(row); setErr(''); setOpen(true); }
  async function save(e){ e.preventDefault(); setErr(''); try{ if(mode==='edit'){ await api.put(`/suppliers/${editId}`,f); } else { await api.post('/suppliers',f); } setOpen(false); setF({}); load(); }catch(e){ setErr(e.response?.data?.message||'Save failed'); } }
  async function remove(row){ if(!confirm(`Delete supplier "${row.name}"?`))return; await api.delete(`/suppliers/${row.id}`); load(); }
  async function archive(row){ if(!confirm(`Archive "${row.name}"?`))return; await api.post(`/suppliers/${row.id}/archive`); load(); }
  async function unarchive(row){ await api.post(`/suppliers/${row.id}/unarchive`); load(); }

  function exportCSV(list=rows){
    const cols=['name','contact_person','phone','total_purchases','total_purchase_amount','total_paid','total_due'];
    const header=['Name','Contact','Phone','Total Purchases','Purchase Amount','Total Paid','Total Due'];
    const lines=[header, ...list.map(r=>cols.map(k=>r[k]??''))];
    const csv=lines.map(l=>l.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=`suppliers-${todayStr()}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  const sel=useRowSelection(rows);
  async function bulkDelete(){
    if(!confirm(`Delete ${sel.count} selected supplier(s)?`))return;
    await Promise.all([...sel.selectedIds].map(id=>api.delete(`/suppliers/${id}`)));
    sel.clear(); load();
  }

  const archived=filters.archived==='1';

  return <>
    <div className="page-head"><div><h1>Suppliers</h1><p>Manage suppliers, purchase history and outstanding dues.</p></div>
      <div className="row-actions">
        <button className="btn" onClick={exportCSV}><Download size={15}/>Export</button>
        <button className="btn" onClick={()=>window.print()}><Printer size={15}/>Print</button>
        <button className="btn primary" onClick={openCreate}>+ Add Supplier</button>
      </div>
    </div>

    <form className="filter-row" onSubmit={applyFilters}>
      <label>Search<input placeholder="Name or phone" value={filters.search} onChange={e=>setFilters({...filters,search:e.target.value})}/></label>
      <label>View<select value={filters.archived} onChange={e=>setFilters({...filters,archived:e.target.value})}><option value="0">Active</option><option value="1">Archived</option></select></label>
      <button className="btn primary">Apply</button>
      <button type="button" className="btn" onClick={resetFilters}>Reset</button>
    </form>

    <BulkActionsBar count={sel.count} onExport={()=>exportCSV(sel.selectedRows)} onDelete={bulkDelete} onClear={sel.clear}/>

    <div className="panel"><DataTable rows={rows} selection={sel} empty="No suppliers found" columns={[
      {key:'name',label:'Supplier Name'},{key:'contact_person',label:'Contact Person'},{key:'phone',label:'Phone'},{key:'address',label:'Address'},
      {key:'total_purchases',label:'Purchases'},
      {key:'total_purchase_amount',label:'Purchase Amount',render:r=>money(r.total_purchase_amount)},
      {key:'total_paid',label:'Total Paid',render:r=>money(r.total_paid)},
      {key:'total_due',label:'Total Due',render:r=><b style={{color:Number(r.total_due)>0?'#b45309':'#16a34a'}}>{money(r.total_due)}</b>},
      {key:'_actions',label:'Action',render:r=><div className="row-actions">
        <button type="button" className="icon-btn" title="View" onClick={()=>nav(`/suppliers/${r.id}`)}><Eye size={15}/></button>
        <button type="button" className="icon-btn" title="Edit" onClick={()=>openEdit(r)}><Pencil size={15}/></button>
        <button type="button" className="icon-btn" title="Statement" onClick={()=>nav(`/suppliers/${r.id}?tab=statement`)}><Receipt size={15}/></button>
        {archived?<button type="button" className="icon-btn" title="Restore" onClick={()=>unarchive(r)}><RotateCcw size={15}/></button>:<button type="button" className="icon-btn" title="Archive" onClick={()=>archive(r)}><Archive size={15}/></button>}
        <button type="button" className="icon-btn danger" title="Delete" onClick={()=>remove(r)}><Trash2 size={15}/></button>
      </div>}
    ]}/></div>

    <Modal open={open} title={mode==='edit'?'Edit Supplier':'Add Supplier'} onClose={()=>setOpen(false)}>
      <form className="form-grid" onSubmit={save}>
        {err&&<div className="alert danger full">{err}</div>}
        <label>Supplier Name<input required value={f.name||''} onChange={e=>setF({...f,name:e.target.value})}/></label>
        <label>Contact Person<input value={f.contact_person||''} onChange={e=>setF({...f,contact_person:e.target.value})}/></label>
        <label>Phone<input value={f.phone||''} onChange={e=>setF({...f,phone:e.target.value})}/></label>
        <label>Email<input type="email" value={f.email||''} onChange={e=>setF({...f,email:e.target.value})}/></label>
        <label>Address<input value={f.address||''} onChange={e=>setF({...f,address:e.target.value})}/></label>
        <label>PAN / VAT<input value={f.pan_vat_no||''} onChange={e=>setF({...f,pan_vat_no:e.target.value})}/></label>
        <label>Opening Due<input type="number" step="0.01" value={f.opening_due??''} onChange={e=>setF({...f,opening_due:e.target.value})}/></label>
        <label className="full">Notes<textarea value={f.notes||''} onChange={e=>setF({...f,notes:e.target.value})}/></label>
        <div className="form-actions full"><button type="button" className="btn" onClick={()=>setOpen(false)}>Cancel</button><button className="btn primary">{mode==='edit'?'Save Changes':'Create Supplier'}</button></div>
      </form>
    </Modal>
  </>
}
