import { useEffect,useState } from 'react';import api from '../services/api';import Modal from '../components/Modal';import DataTable from '../components/DataTable';import BulkActionsBar from '../components/BulkActionsBar';import { useRowSelection } from '../hooks/useRowSelection';import StatCard from '../components/StatCard';import { money,fmtDate,todayStr } from '../utils/format';import { Paperclip,Pencil,Trash2,Receipt,CircleDollarSign,Clock,CalendarDays,Printer } from 'lucide-react';
const types=['Material','Labour','Transport','Fuel','Equipment','Food','Office','Miscellaneous','Other'];
const API_ROOT=(api.defaults.baseURL||'').replace(/\/api\/?$/,'');
const fileUrl=p=>p?`${API_ROOT}${p}`:'';
function startOfWeek(d){const x=new Date(d);const day=(x.getDay()+6)%7;x.setDate(x.getDate()-day);x.setHours(0,0,0,0);return x;}
export default function ExpensesPage(){
  const [rows,setRows]=useState([]),[projects,setProjects]=useState([]),[categories,setCategories]=useState([]),[open,setOpen]=useState(false),[mode,setMode]=useState('create'),[editId,setEditId]=useState(null),[form,setForm]=useState({}),[err,setErr]=useState('');
  const [catOpen,setCatOpen]=useState(false),[newCat,setNewCat]=useState(''),[newCatType,setNewCatType]=useState(''),[editCat,setEditCat]=useState(null),[catErr,setCatErr]=useState('');
  const [billFor,setBillFor]=useState(null),[billFile,setBillFile]=useState(null);
  const [filters,setFilters]=useState({search:'',expense_type:'',project_id:'',status:'',from:'',to:''});
  function resetFilters(){ setFilters({search:'',expense_type:'',project_id:'',status:'',from:'',to:''}); }

  const load=()=>Promise.all([api.get('/expenses'),api.get('/projects'),api.get('/expense-categories')]).then(([e,p,c])=>{setRows(e.data);setProjects(p.data);setCategories(c.data)});
  useEffect(()=>{load()},[]);
  function openCreate(){setMode('create');setEditId(null);setForm({expense_type:'Material'});setErr('');setOpen(true);}
  function openEdit(row){setMode('edit');setEditId(row.id);setForm(row);setErr('');setOpen(true);}
  async function save(e){e.preventDefault();setErr('');try{if(mode==='edit'){await api.put(`/expenses/${editId}`,form);}else{await api.post('/expenses',form);}setOpen(false);load()}catch(e){setErr(e.response?.data?.message||'Save failed')}}
  async function remove(row){if(!confirm('Delete this expense?'))return;await api.delete(`/expenses/${row.id}`);load()}
  async function approve(row){await api.post(`/expenses/${row.id}/approve`);load()}
  async function reject(row){if(!confirm('Reject this expense?'))return;await api.post(`/expenses/${row.id}/reject`);load()}

  async function addCategory(e){e.preventDefault();if(!newCat.trim())return;setCatErr('');try{await api.post('/expense-categories',{name:newCat.trim(),expense_type:newCatType||null});setNewCat('');setNewCatType('');load()}catch(e){setCatErr(e.response?.data?.message||'Could not add category')}}
  async function saveCategory(){if(!editCat.name.trim())return;setCatErr('');try{await api.put(`/expense-categories/${editCat.id}`,{name:editCat.name,expense_type:editCat.expense_type});setEditCat(null);load()}catch(e){setCatErr(e.response?.data?.message||'Could not save category')}}
  async function removeCategory(cat){if(!confirm(`Delete category "${cat.name}"?`))return;await api.delete(`/expense-categories/${cat.id}`);load()}

  async function uploadBill(e){e.preventDefault();if(!billFile)return;const fd=new FormData();fd.append('file',billFile);await api.post(`/expenses/${billFor.id}/bill`,fd);setBillFor(null);setBillFile(null);load()}

  const filteredRows=rows.filter(r=>{
    if(filters.search&&!(r.description||'').toLowerCase().includes(filters.search.toLowerCase()))return false;
    if(filters.expense_type&&r.expense_type!==filters.expense_type)return false;
    if(filters.project_id&&String(r.project_id)!==String(filters.project_id))return false;
    if(filters.status&&r.status!==filters.status)return false;
    if(filters.from&&new Date(r.expense_date)<new Date(filters.from))return false;
    if(filters.to&&new Date(r.expense_date)>new Date(filters.to))return false;
    return true;
  });
  const now=new Date(); const monthStart=new Date(now.getFullYear(),now.getMonth(),1); const weekStart=startOfWeek(now); const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const sum=list=>list.reduce((s,r)=>s+Number(r.amount||0),0);
  const totalAll=sum(rows);
  const totalMonth=sum(rows.filter(r=>new Date(r.expense_date)>=monthStart));
  const pending=rows.filter(r=>r.status==='Pending');
  function exportCSV(list=filteredRows){
    const cols=['expense_date','expense_type','category_name','project_name','description','amount','paid_by','status'];
    const header=['Date','Category','Sub-Category','Project','Description','Amount','Paid By','Status'];
    const lines=[header, ...list.map(r=>cols.map(k=>r[k]??''))];
    const csv=lines.map(l=>l.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=`expenses-${todayStr()}.csv`; a.click(); URL.revokeObjectURL(url);
  }
  const sel=useRowSelection(filteredRows);
  async function bulkDelete(){
    if(!confirm(`Delete ${sel.count} selected expense(s)?`))return;
    await Promise.all([...sel.selectedIds].map(id=>api.delete(`/expenses/${id}`)));
    sel.clear(); load();
  }
  return <>
    <div className="page-head"><div><h1>Expenses</h1><p>Track project and office expenses by category, date and payer.</p></div>
      <div className="row-actions">
        <button className="btn" onClick={()=>window.open('/reports/expense/print','_blank')}><Printer size={15}/>Print Report</button>
        <button className="btn" onClick={()=>setCatOpen(true)}>Manage Categories</button>
        <button className="btn primary" onClick={openCreate}>+ Add Expense</button>
      </div>
    </div>
    <div className="stats-grid cols-4">
      <StatCard label="Total Expenses" value={money(totalAll)} sub="All Time" icon={<Receipt size={20}/>}/>
      <StatCard label="This Month" value={money(totalMonth)} sub="Current Month" icon={<CircleDollarSign size={20}/>}/>
      <StatCard label="Pending Approval" value={pending.length} sub={pending.length?money(sum(pending)):'None'} icon={<Clock size={20}/>} tone={pending.length?'warn':undefined}/>
      <StatCard label="Today" value={money(sum(rows.filter(r=>new Date(r.expense_date)>=today)))} sub={fmtDate(today.toISOString())} icon={<CalendarDays size={20}/>}/>
    </div>
    <div className="filter-row">
      <label>Search<input placeholder="Description" value={filters.search} onChange={e=>setFilters({...filters,search:e.target.value})}/></label>
      <label>Category<select value={filters.expense_type} onChange={e=>setFilters({...filters,expense_type:e.target.value})}><option value="">All</option>{types.map(t=><option key={t}>{t}</option>)}</select></label>
      <label>Project<select value={filters.project_id} onChange={e=>setFilters({...filters,project_id:e.target.value})}><option value="">All</option>{projects.map(p=><option key={p.id} value={p.id}>{p.project_name}</option>)}</select></label>
      <label>Status<select value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value})}><option value="">All</option><option>Pending</option><option>Approved</option><option>Rejected</option></select></label>
      <label>From<input type="date" value={filters.from} onChange={e=>setFilters({...filters,from:e.target.value})}/></label>
      <label>To<input type="date" value={filters.to} onChange={e=>setFilters({...filters,to:e.target.value})}/></label>
      <button type="button" className="btn" onClick={resetFilters}>Reset</button>
    </div>
    <BulkActionsBar count={sel.count} onExport={()=>exportCSV(sel.selectedRows)} onDelete={bulkDelete} onClear={sel.clear}/>
    <div className="panel">
      <DataTable rows={filteredRows} selection={sel} empty="No expenses match the current filter" columns={[
        {key:'expense_date',label:'Date',render:r=>fmtDate(r.expense_date)},
        {key:'expense_type',label:'Category'},
        {key:'category_name',label:'Sub-Category',render:r=>r.category_name||'—'},
        {key:'project_name',label:'Project',render:r=>r.project_name||'General'},
        {key:'description',label:'Description'},
        {key:'amount',label:'Amount',render:r=>money(r.amount)},
        {key:'paid_by',label:'Paid By'},
        {key:'status',label:'Status',render:r=><span className={`badge ${r.status?.toLowerCase()}`}>{r.status}</span>},
        {key:'bill_file',label:'Receipt',render:r=>r.bill_file?<a href={fileUrl(r.bill_file)} target="_blank" rel="noreferrer">View</a>:<button type="button" className="icon-btn" title="Attach Receipt" onClick={()=>setBillFor(r)}><Paperclip size={15}/></button>},
        {key:'_actions',label:'Action',render:r=><div className="row-actions">
          {r.status==='Pending'&&<><button className="btn small" onClick={()=>approve(r)}>Approve</button><button className="btn small" onClick={()=>reject(r)}>Reject</button></>}
          <button type="button" className="icon-btn" title="Edit" onClick={()=>openEdit(r)}><Pencil size={15}/></button>
          <button type="button" className="icon-btn danger" title="Delete" onClick={()=>remove(r)}><Trash2 size={15}/></button>
        </div>}
      ]}/>
    </div>
    <Modal open={open} title={mode==='edit'?'Edit Expense':'Add Expense'} onClose={()=>setOpen(false)}>
      <form className="form-grid" onSubmit={save}>
        {err&&<div className="alert danger full">{err}</div>}
        <label>Expense Date<input type="date" required value={form.expense_date?String(form.expense_date).slice(0,10):''} onChange={e=>setForm({...form,expense_date:e.target.value})}/></label>
        <label>Category<select value={form.expense_type||'Material'} onChange={e=>setForm({...form,expense_type:e.target.value})}>{types.map(t=><option key={t}>{t}</option>)}</select></label>
        <label>Sub-Category<select value={form.category_id||''} onChange={e=>setForm({...form,category_id:e.target.value})}><option value="">None</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label>Project<select value={form.project_id||''} onChange={e=>setForm({...form,project_id:e.target.value})}><option value="">General / Office</option>{projects.map(p=><option key={p.id} value={p.id}>{p.project_name}</option>)}</select></label>
        <label>Amount<input type="number" step="0.01" required value={form.amount||''} onChange={e=>setForm({...form,amount:e.target.value})}/></label>
        <label className="full">Description<input value={form.description||''} onChange={e=>setForm({...form,description:e.target.value})}/></label>
        <label>Payment Method<input value={form.payment_method||''} onChange={e=>setForm({...form,payment_method:e.target.value})}/></label>
        <label>Paid By<input placeholder="Name of payer" value={form.paid_by||''} onChange={e=>setForm({...form,paid_by:e.target.value})}/></label>
        <label>Reference No.<input value={form.reference_no||''} onChange={e=>setForm({...form,reference_no:e.target.value})}/></label>
        <div className="form-actions full"><button type="button" className="btn" onClick={()=>setOpen(false)}>Cancel</button><button className="btn primary">Save</button></div>
      </form>
    </Modal>

    <Modal open={catOpen} title="Manage Expense Categories" onClose={()=>{setCatOpen(false);setCatErr('');setEditCat(null)}}>
      {catErr&&<div className="alert danger">{catErr}</div>}
      <form className="form-grid" onSubmit={addCategory} style={{marginBottom:16}}>
        <label>New Category Name<input value={newCat} onChange={e=>setNewCat(e.target.value)} placeholder="e.g. Site Vehicle Fuel"/></label>
        <label>Linked Type (optional)<select value={newCatType} onChange={e=>setNewCatType(e.target.value)}><option value="">None</option>{types.map(t=><option key={t}>{t}</option>)}</select></label>
        <div className="form-actions full" style={{justifyContent:'flex-start'}}><button className="btn primary">+ Add Category</button></div>
      </form>
      <div className="table-wrap"><table><thead><tr><th>Name</th><th>Linked Type</th><th>Action</th></tr></thead>
        <tbody>{categories.map(c=><tr key={c.id}>
          <td>{editCat?.id===c.id?<input value={editCat.name} onChange={e=>setEditCat({...editCat,name:e.target.value})}/>:c.name}</td>
          <td>{editCat?.id===c.id?<select value={editCat.expense_type||''} onChange={e=>setEditCat({...editCat,expense_type:e.target.value})}><option value="">None</option>{types.map(t=><option key={t}>{t}</option>)}</select>:(c.expense_type||'—')}</td>
          <td><div className="row-actions">
            {editCat?.id===c.id?<>
              <button type="button" className="btn small" onClick={saveCategory}>Save</button>
              <button type="button" className="btn small" onClick={()=>setEditCat(null)}>Cancel</button>
            </>:<>
              <button type="button" className="icon-btn" title="Edit" onClick={()=>setEditCat({id:c.id,name:c.name,expense_type:c.expense_type})}><Pencil size={15}/></button>
              <button type="button" className="icon-btn danger" title="Delete" onClick={()=>removeCategory(c)}><Trash2 size={15}/></button>
            </>}
          </div></td>
        </tr>)}
        {!categories.length&&<tr><td colSpan={3} className="empty">No categories yet</td></tr>}
        </tbody>
      </table></div>
    </Modal>

    <Modal open={!!billFor} title="Attach Receipt" onClose={()=>setBillFor(null)}>
      {billFor&&<form className="form-grid" onSubmit={uploadBill}>
        <label className="full">Receipt / Bill (PDF or image)<input type="file" required accept=".pdf,image/*" onChange={e=>setBillFile(e.target.files[0])}/></label>
        <div className="form-actions full"><button type="button" className="btn" onClick={()=>setBillFor(null)}>Cancel</button><button className="btn primary">Upload</button></div>
      </form>}
    </Modal>
  </>
}
