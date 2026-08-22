import { useEffect,useState } from 'react';import api from '../services/api';import Modal from '../components/Modal';import DataTable from '../components/DataTable';import BulkActionsBar from '../components/BulkActionsBar';import { useRowSelection } from '../hooks/useRowSelection';import StatCard from '../components/StatCard';import { money,fmtDate,todayStr } from '../utils/format';import { Eye,ArrowLeftRight,Pencil,Trash2,Package,Boxes,PackageX,CircleDollarSign,ReceiptText,AlertCircle } from 'lucide-react';
export default function MaterialsPage(){
  const [tab,setTab]=useState('stock');
  const [rows,setRows]=useState([]),[open,setOpen]=useState(false),[mode,setMode]=useState('create'),[editId,setEditId]=useState(null),[form,setForm]=useState({}),[err,setErr]=useState('');
  const [purchases,setPurchases]=useState([]),[suppliers,setSuppliers]=useState([]),[projects,setProjects]=useState([]);
  const [pOpen,setPOpen]=useState(false),[pForm,setPForm]=useState({vat_rate:13,items:[{material_id:'',quantity:1,unit_cost:0}]}),[pErr,setPErr]=useState('');
  const [editPurchase,setEditPurchase]=useState(null),[editPurchaseForm,setEditPurchaseForm]=useState({});
  const [payFor,setPayFor]=useState(null),[payAmount,setPayAmount]=useState('');
  const [categories,setCategories]=useState([]),[catOpen,setCatOpen]=useState(false),[newCat,setNewCat]=useState(''),[editCat,setEditCat]=useState(null),[catErr,setCatErr]=useState('');
  const [stockFilter,setStockFilter]=useState({search:'',category_id:'',status:''});
  const [adjustFor,setAdjustFor]=useState(null),[adjustForm,setAdjustForm]=useState({transaction_type:'Adjustment In',transaction_date:'',quantity:'',remarks:''}),[adjustErr,setAdjustErr]=useState('');
  const [ledgerFor,setLedgerFor]=useState(null),[ledger,setLedger]=useState(null);

  const load=()=>api.get('/materials/stock/summary').then(r=>setRows(r.data));
  const loadPurchases=()=>Promise.all([api.get('/material-purchases'),api.get('/suppliers'),api.get('/projects')]).then(([p,s,pr])=>{setPurchases(p.data);setSuppliers(s.data);setProjects(pr.data)});
  const loadCategories=()=>api.get('/material-categories').then(r=>setCategories(r.data));
  useEffect(()=>{load();loadPurchases();loadCategories()},[]);

  function openCreate(){setMode('create');setEditId(null);setForm({});setErr('');setOpen(true)}
  function openEdit(row){setMode('edit');setEditId(row.id);setForm(row);setErr('');setOpen(true)}
  async function save(e){e.preventDefault();setErr('');try{if(mode==='edit'){await api.put(`/materials/${editId}`,form)}else{await api.post('/materials',form)}setOpen(false);setForm({});load()}catch(e){setErr(e.response?.data?.message||'Save failed')}}
  async function removeMaterial(row){if(!confirm(`Delete material "${row.name}"?`))return;await api.delete(`/materials/${row.id}`);load()}

  async function addCategory(e){e.preventDefault();if(!newCat.trim())return;setCatErr('');try{await api.post('/material-categories',{name:newCat.trim()});setNewCat('');loadCategories()}catch(e){setCatErr(e.response?.data?.message||'Could not add category')}}
  async function saveCategory(){if(!editCat.name.trim())return;setCatErr('');try{await api.put(`/material-categories/${editCat.id}`,{name:editCat.name});setEditCat(null);loadCategories()}catch(e){setCatErr(e.response?.data?.message||'Could not save category')}}
  async function removeCategory(cat){if(!confirm(`Delete category "${cat.name}"? Materials in it will keep their data but show no category.`))return;await api.delete(`/material-categories/${cat.id}`);loadCategories()}

  function openAdjust(row){setAdjustFor(row);setAdjustForm({transaction_type:'Adjustment In',transaction_date:new Date().toISOString().slice(0,10),quantity:'',remarks:''});setAdjustErr('')}
  async function saveAdjust(e){e.preventDefault();setAdjustErr('');try{await api.post(`/materials/${adjustFor.id}/adjust`,adjustForm);setAdjustFor(null);load()}catch(e){setAdjustErr(e.response?.data?.message||'Could not save adjustment')}}

  async function openLedger(row){setLedgerFor(row);setLedger(null);const r=await api.get(`/materials/${row.id}/ledger`);setLedger(r.data)}

  const filteredRows=rows.filter(r=>{
    if(stockFilter.search&&!r.name.toLowerCase().includes(stockFilter.search.toLowerCase())&&!(r.sku||'').toLowerCase().includes(stockFilter.search.toLowerCase()))return false;
    if(stockFilter.category_id&&String(r.category_id||'')!==String(stockFilter.category_id))return false;
    if(stockFilter.status&&r.status!==stockFilter.status)return false;
    return true;
  });
  const alertItems=rows.filter(r=>r.status!=='In Stock');

  function exportStockCSV(list=filteredRows){
    const cols=['name','category_name','unit','opening_stock','in_stock','issued','available','rate','total_value','status'];
    const header=['Material','Category','Unit','Opening Stock','In Stock','Issued','Available','Rate','Total Value','Status'];
    const lines=[header, ...list.map(r=>cols.map(k=>r[k]??''))];
    const csv=lines.map(l=>l.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=`materials-stock-${todayStr()}.csv`; a.click(); URL.revokeObjectURL(url);
  }
  function exportPurchasesCSV(list=purchases){
    const cols=['purchase_no','supplier_name','project_name','purchase_date','grand_total','paid_amount','due_amount'];
    const header=['Purchase No.','Supplier','Project','Date','Amount','Paid','Due'];
    const lines=[header, ...list.map(r=>cols.map(k=>r[k]??''))];
    const csv=lines.map(l=>l.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=`material-purchases-${todayStr()}.csv`; a.click(); URL.revokeObjectURL(url);
  }
  const stockSel=useRowSelection(filteredRows);
  async function bulkDeleteMaterials(){
    if(!confirm(`Delete ${stockSel.count} selected material(s)?`))return;
    await Promise.all([...stockSel.selectedIds].map(id=>api.delete(`/materials/${id}`)));
    stockSel.clear(); load();
  }
  const purchaseSel=useRowSelection(purchases);
  async function bulkDeletePurchases(){
    if(!confirm(`Delete ${purchaseSel.count} selected purchase(s)? This will also reverse the stock they added.`))return;
    await Promise.all([...purchaseSel.selectedIds].map(id=>api.delete(`/material-purchases/${id}`)));
    purchaseSel.clear(); load(); loadPurchases();
  }

  const updItem=(i,k,v)=>setPForm({...pForm,items:pForm.items.map((x,n)=>n===i?{...x,[k]:v}:x)});
  async function savePurchase(e){e.preventDefault();setPErr('');try{await api.post('/material-purchases',pForm);setPOpen(false);setPForm({vat_rate:13,items:[{material_id:'',quantity:1,unit_cost:0}]});load();loadPurchases()}catch(e){setPErr(e.response?.data?.message||'Save failed')}}
  async function recordPayment(){if(!payAmount||Number(payAmount)<=0)return;await api.post(`/material-purchases/${payFor.id}/pay`,{amount:Number(payAmount)});setPayFor(null);setPayAmount('');loadPurchases()}
  function openEditPurchase(row){setEditPurchase(row);setEditPurchaseForm({purchase_date:String(row.purchase_date).slice(0,10),invoice_ref:row.invoice_ref||'',remarks:row.remarks||''})}
  async function savePurchaseEdit(){await api.put(`/material-purchases/${editPurchase.id}`,editPurchaseForm);setEditPurchase(null);loadPurchases()}
  async function removePurchase(row){if(!confirm(`Delete purchase ${row.purchase_no}? This will also reverse the stock it added.`))return;await api.delete(`/material-purchases/${row.id}`);load();loadPurchases()}

  const totalMaterials=rows.length;
  const totalStock=rows.reduce((s,r)=>s+Number(r.available||0),0);
  const lowStock=rows.filter(r=>r.status!=='In Stock').length;
  const totalValue=rows.reduce((s,r)=>s+Number(r.total_value||0),0);
  const totalPurchases=purchases.reduce((s,r)=>s+Number(r.grand_total||0),0);
  const totalDue=purchases.reduce((s,r)=>s+Number(r.due_amount||0),0);

  return <>
    <div className="page-head"><div><h1>Materials & Stock</h1><p>Track material stock, purchases and valuation across all projects.</p></div>
      <div className="row-actions">
        {tab==='stock'&&<button className="btn" onClick={()=>setCatOpen(true)}>Manage Categories</button>}
        {tab==='stock'?<button className="btn primary" onClick={openCreate}>+ Add Material</button>:<button className="btn primary" onClick={()=>setPOpen(true)}>+ Record Purchase</button>}
      </div>
    </div>
    <div className="tabs">
      <button className={`tab ${tab==='stock'?'active':''}`} onClick={()=>setTab('stock')}>Stock</button>
      <button className={`tab ${tab==='purchases'?'active':''}`} onClick={()=>setTab('purchases')}>Purchases</button>
    </div>
    {tab==='stock'?<>
      <div className="stats-grid cols-4">
        <StatCard label="Total Materials" value={totalMaterials} sub="Item Types" icon={<Package size={20}/>}/>
        <StatCard label="Total Stock" value={Number(totalStock).toLocaleString('en-IN')} sub="Available Qty" icon={<Boxes size={20}/>}/>
        <StatCard label="Low Stock Items" value={lowStock} sub="Need Reorder" icon={<PackageX size={20}/>}/>
        <StatCard label="Total Value" value={money(totalValue)} sub="Current Stock" icon={<CircleDollarSign size={20}/>}/>
      </div>
      {alertItems.length>0&&<div className="alert danger" style={{marginBottom:16}}>
        <b>{alertItems.length} item{alertItems.length>1?'s':''} need attention:</b> {alertItems.map(a=>`${a.name} (${a.status})`).join(', ')}
      </div>}
      <form className="filter-row" onSubmit={e=>e.preventDefault()}>
        <label>Search<input placeholder="Name or SKU" value={stockFilter.search} onChange={e=>setStockFilter({...stockFilter,search:e.target.value})}/></label>
        <label>Category<select value={stockFilter.category_id} onChange={e=>setStockFilter({...stockFilter,category_id:e.target.value})}><option value="">All</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label>Status<select value={stockFilter.status} onChange={e=>setStockFilter({...stockFilter,status:e.target.value})}><option value="">All</option><option>In Stock</option><option>Low Stock</option><option>Out of Stock</option></select></label>
        <button type="button" className="btn" onClick={()=>setStockFilter({search:'',category_id:'',status:''})}>Reset</button>
      </form>
      <BulkActionsBar count={stockSel.count} onExport={()=>exportStockCSV(stockSel.selectedRows)} onDelete={bulkDeleteMaterials} onClear={stockSel.clear}/>
      <div className="panel">
        <DataTable rows={filteredRows} selection={stockSel} empty="No materials match the current filters" columns={[
          {key:'name',label:'Material Name'},
          {key:'category_name',label:'Category',render:r=>r.category_name||'—'},
          {key:'unit',label:'Unit'},
          {key:'opening_stock',label:'Opening Stock'},
          {key:'in_stock',label:'In Stock'},
          {key:'issued',label:'Issued'},
          {key:'available',label:'Available'},
          {key:'rate',label:'Rate',render:r=>money(r.rate)},
          {key:'total_value',label:'Total Value',render:r=>money(r.total_value)},
          {key:'status',label:'Status',render:r=><span className={`badge ${r.status.toLowerCase().replaceAll(' ','-')}`}>{r.status}</span>},
          {key:'_actions',label:'Action',render:r=><div className="row-actions">
            <button type="button" className="icon-btn" title="Stock Ledger" onClick={()=>openLedger(r)}><Eye size={15}/></button>
            <button type="button" className="icon-btn" title="Adjust Stock" onClick={()=>openAdjust(r)}><ArrowLeftRight size={15}/></button>
            <button type="button" className="icon-btn" title="Edit" onClick={()=>openEdit(r)}><Pencil size={15}/></button>
            <button type="button" className="icon-btn danger" title="Delete" onClick={()=>removeMaterial(r)}><Trash2 size={15}/></button>
          </div>}
        ]}/>
      </div>
    </>:<>
      <div className="stats-grid cols-3">
        <StatCard label="Total Purchases" value={purchases.length} sub="All Time" icon={<ReceiptText size={20}/>}/>
        <StatCard label="Total Amount" value={money(totalPurchases)} sub="Billed" icon={<CircleDollarSign size={20}/>}/>
        <StatCard label="Outstanding Due" value={money(totalDue)} sub="To Suppliers" icon={<AlertCircle size={20}/>}/>
      </div>
      <BulkActionsBar count={purchaseSel.count} onExport={()=>exportPurchasesCSV(purchaseSel.selectedRows)} onDelete={bulkDeletePurchases} onClear={purchaseSel.clear}/>
      <div className="panel">
        <DataTable rows={purchases} selection={purchaseSel} columns={[
          {key:'purchase_no',label:'Purchase No.'},
          {key:'supplier_name',label:'Supplier'},
          {key:'project_name',label:'Project'},
          {key:'purchase_date',label:'Date',render:r=>fmtDate(r.purchase_date)},
          {key:'grand_total',label:'Amount',render:r=>money(r.grand_total)},
          {key:'paid_amount',label:'Paid',render:r=>money(r.paid_amount)},
          {key:'due_amount',label:'Due',render:r=>money(r.due_amount)},
          {key:'_actions',label:'Action',render:r=><div className="row-actions">
            {Number(r.due_amount)>0?<button className="btn small" onClick={()=>{setPayFor(r);setPayAmount(String(r.due_amount))}}>Pay</button>:<span className="badge approved">Settled</span>}
            <button type="button" className="icon-btn" title="Edit" onClick={()=>openEditPurchase(r)}><Pencil size={15}/></button>
            <button type="button" className="icon-btn danger" title="Delete" onClick={()=>removePurchase(r)}><Trash2 size={15}/></button>
          </div>}
        ]}/>
      </div>
    </>}
    <Modal open={open} title={mode==='edit'?'Edit Material':'Add Material'} onClose={()=>setOpen(false)}>
      <form className="form-grid" onSubmit={save}>
        {err&&<div className="alert danger full">{err}</div>}
        <label>Material Name<input required value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})}/></label>
        <label>Category<select value={form.category_id||''} onChange={e=>setForm({...form,category_id:e.target.value})}><option value="">Uncategorized</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label>SKU<input value={form.sku||''} onChange={e=>setForm({...form,sku:e.target.value})}/></label>
        <label>Unit<input required placeholder="Bag / Cft / Piece / Kg" value={form.unit||''} onChange={e=>setForm({...form,unit:e.target.value})}/></label>
        <label>Opening Stock<input type="number" step="0.01" value={form.opening_stock??''} onChange={e=>setForm({...form,opening_stock:e.target.value})}/></label>
        <label>Minimum Stock (Reorder Level)<input type="number" step="0.01" value={form.minimum_stock??''} onChange={e=>setForm({...form,minimum_stock:e.target.value})}/></label>
        <label>Unit Cost<input type="number" step="0.01" value={form.default_unit_cost??''} onChange={e=>setForm({...form,default_unit_cost:e.target.value})}/></label>
        <label className="full">Notes<input value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})}/></label>
        <div className="form-actions full"><button type="button" className="btn" onClick={()=>setOpen(false)}>Cancel</button><button className="btn primary">Save</button></div>
      </form>
    </Modal>
    <Modal open={pOpen} title="Record Material Purchase" onClose={()=>setPOpen(false)} wide>
      <form onSubmit={savePurchase}>
        {pErr&&<div className="alert danger full">{pErr}</div>}
        <div className="form-grid">
          <label>Supplier<select required value={pForm.supplier_id||''} onChange={e=>setPForm({...pForm,supplier_id:e.target.value})}><option value="">Select supplier</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          <label>Project (optional)<select value={pForm.project_id||''} onChange={e=>setPForm({...pForm,project_id:e.target.value})}><option value="">General stock</option>{projects.map(p=><option key={p.id} value={p.id}>{p.project_name}</option>)}</select></label>
          <label>Purchase Date<input type="date" value={pForm.purchase_date||''} onChange={e=>setPForm({...pForm,purchase_date:e.target.value})}/></label>
          <label>Invoice Ref.<input value={pForm.invoice_ref||''} onChange={e=>setPForm({...pForm,invoice_ref:e.target.value})}/></label>
          <label>VAT %<input type="number" value={pForm.vat_rate} onChange={e=>setPForm({...pForm,vat_rate:e.target.value})}/></label>
        </div>
        <div className="line-items">
          <div className="line-head"><b>Items Purchased</b><button type="button" className="btn small" onClick={()=>setPForm({...pForm,items:[...pForm.items,{material_id:'',quantity:1,unit_cost:0}]})}>+ Item</button></div>
          {pForm.items.map((x,i)=><div className="line-row" key={i} style={{gridTemplateColumns:'2fr .8fr .8fr 1fr'}}>
            <select className="desc" required value={x.material_id} onChange={e=>updItem(i,'material_id',e.target.value)}><option value="">Select material</option>{rows.map(m=><option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}</select>
            <input type="number" placeholder="Qty" value={x.quantity} onChange={e=>updItem(i,'quantity',e.target.value)}/>
            <input type="number" placeholder="Unit Cost" value={x.unit_cost} onChange={e=>updItem(i,'unit_cost',e.target.value)}/>
            <b>Rs. {(Number(x.quantity)*Number(x.unit_cost)).toLocaleString('en-IN')}</b>
          </div>)}
        </div>
        <div className="form-actions"><button type="button" className="btn" onClick={()=>setPOpen(false)}>Cancel</button><button className="btn primary">Save Purchase</button></div>
      </form>
    </Modal>
    <Modal open={!!editPurchase} title={`Edit Purchase — ${editPurchase?.purchase_no||''}`} onClose={()=>setEditPurchase(null)}>
      {editPurchase&&<div className="form-grid">
        <label>Purchase Date<input type="date" value={editPurchaseForm.purchase_date||''} onChange={e=>setEditPurchaseForm({...editPurchaseForm,purchase_date:e.target.value})}/></label>
        <label>Invoice Ref.<input value={editPurchaseForm.invoice_ref||''} onChange={e=>setEditPurchaseForm({...editPurchaseForm,invoice_ref:e.target.value})}/></label>
        <label className="full">Remarks<input value={editPurchaseForm.remarks||''} onChange={e=>setEditPurchaseForm({...editPurchaseForm,remarks:e.target.value})}/></label>
        <p className="full" style={{fontSize:12,color:'#94a3b8',margin:0}}>Items and amounts can't be changed after a purchase is posted — delete and re-record it instead.</p>
        <div className="form-actions full"><button type="button" className="btn" onClick={()=>setEditPurchase(null)}>Cancel</button><button type="button" className="btn primary" onClick={savePurchaseEdit}>Save</button></div>
      </div>}
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

    <Modal open={catOpen} title="Manage Material Categories" onClose={()=>{setCatOpen(false);setCatErr('');setEditCat(null)}}>
      {catErr&&<div className="alert danger">{catErr}</div>}
      <form className="form-grid" onSubmit={addCategory} style={{marginBottom:16}}>
        <label className="full">New Category Name<input value={newCat} onChange={e=>setNewCat(e.target.value)} placeholder="e.g. Steel & Rebar"/></label>
        <div className="form-actions full" style={{justifyContent:'flex-start'}}><button className="btn primary">+ Add Category</button></div>
      </form>
      <div className="table-wrap"><table><thead><tr><th>Name</th><th>Action</th></tr></thead>
        <tbody>{categories.map(c=><tr key={c.id}>
          <td>{editCat?.id===c.id?<input value={editCat.name} onChange={e=>setEditCat({...editCat,name:e.target.value})}/>:c.name}</td>
          <td><div className="row-actions">
            {editCat?.id===c.id?<>
              <button type="button" className="btn small" onClick={saveCategory}>Save</button>
              <button type="button" className="btn small" onClick={()=>setEditCat(null)}>Cancel</button>
            </>:<>
              <button type="button" className="icon-btn" title="Edit" onClick={()=>setEditCat({id:c.id,name:c.name})}><Pencil size={15}/></button>
              <button type="button" className="icon-btn danger" title="Delete" onClick={()=>removeCategory(c)}><Trash2 size={15}/></button>
            </>}
          </div></td>
        </tr>)}
        {!categories.length&&<tr><td colSpan={2} className="empty">No categories yet</td></tr>}
        </tbody>
      </table></div>
    </Modal>

    <Modal open={!!adjustFor} title={`Adjust Stock — ${adjustFor?.name||''}`} onClose={()=>setAdjustFor(null)}>
      {adjustFor&&<form className="form-grid" onSubmit={saveAdjust}>
        {adjustErr&&<div className="alert danger full">{adjustErr}</div>}
        <div className="full" style={{fontSize:12,color:'#64748b'}}>Currently available: <b>{adjustFor.available} {adjustFor.unit}</b></div>
        <label>Adjustment Type<select value={adjustForm.transaction_type} onChange={e=>setAdjustForm({...adjustForm,transaction_type:e.target.value})}>
          {['Adjustment In','Adjustment Out','Transfer In','Transfer Out','Damage','Wastage'].map(t=><option key={t}>{t}</option>)}
        </select></label>
        <label>Date<input type="date" value={adjustForm.transaction_date} onChange={e=>setAdjustForm({...adjustForm,transaction_date:e.target.value})}/></label>
        <label>Quantity ({adjustFor.unit})<input type="number" step="0.01" required min="0.01" value={adjustForm.quantity} onChange={e=>setAdjustForm({...adjustForm,quantity:e.target.value})}/></label>
        <label className="full">Remarks<input value={adjustForm.remarks} onChange={e=>setAdjustForm({...adjustForm,remarks:e.target.value})} placeholder="Reason for this adjustment"/></label>
        <div className="form-actions full"><button type="button" className="btn" onClick={()=>setAdjustFor(null)}>Cancel</button><button className="btn primary">Save Adjustment</button></div>
      </form>}
    </Modal>

    <Modal open={!!ledgerFor} title={`Stock Ledger — ${ledgerFor?.name||''}`} onClose={()=>setLedgerFor(null)} wide>
      {ledgerFor&&(!ledger?<p style={{color:'#94a3b8'}}>Loading...</p>:<div className="table-wrap"><table><thead><tr><th>Date</th><th>Type</th><th>Project</th><th>Qty</th><th>Remarks</th><th>Balance</th></tr></thead>
        <tbody>{ledger.ledger.map((t,i)=><tr key={i}>
          <td>{t.transaction_date?fmtDate(t.transaction_date):'—'}</td>
          <td>{t.transaction_type}</td>
          <td>{t.project_name||'—'}</td>
          <td>{Number(t.quantity).toLocaleString('en-IN')}</td>
          <td>{t.remarks||'—'}</td>
          <td><b>{Number(t.balance).toLocaleString('en-IN')} {ledgerFor.unit}</b></td>
        </tr>)}</tbody>
      </table></div>)}
    </Modal>
  </>
}
