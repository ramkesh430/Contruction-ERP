import { useEffect,useState } from 'react';import api from '../services/api';import Modal from '../components/Modal';import DataTable from '../components/DataTable';
const configs={
 materials:{title:'Materials',fields:[['name','Material Name','text'],['sku','SKU','text'],['unit','Unit','text'],['opening_stock','Opening Stock','number'],['minimum_stock','Minimum Stock','number'],['default_unit_cost','Unit Cost','number']],cols:[['name','Material'],['sku','SKU'],['unit','Unit'],['opening_stock','Opening'],['minimum_stock','Minimum']]},
 expenses:{title:'Expenses',fields:[['expense_date','Expense Date','date'],['expense_type','Type','select',['Material','Labour','Transport','Fuel','Equipment','Food','Office','Miscellaneous','Other']],['description','Description','text'],['amount','Amount','number'],['payment_method','Payment Method','text'],['reference_no','Reference No.','text']],cols:[['expense_date','Date'],['expense_type','Type'],['description','Description'],['amount','Amount'],['payment_method','Method']]},
 equipment:{title:'Equipment',fields:[['equipment_code','Code','text'],['name','Equipment Name','text'],['type','Type','text'],['purchase_cost','Purchase Cost','number'],['current_value','Current Value','number'],['status','Status','select',['Available','Assigned','On Site','Rented Out','Maintenance','Damaged','Inactive']]],cols:[['equipment_code','Code'],['name','Equipment'],['type','Type'],['status','Status'],['current_value','Current Value']]}
};
const moneyKeys=new Set(['amount','daily_wage','opening_due','current_value','total_due']);
export default function CrudPage({resource}){
  const cfg=configs[resource];
  const [rows,setRows]=useState([]),[open,setOpen]=useState(false),[mode,setMode]=useState('create'),[editId,setEditId]=useState(null),[form,setForm]=useState({}),[err,setErr]=useState('');
  const load=()=>api.get('/'+resource).then(r=>setRows(r.data));
  useEffect(()=>{load()},[resource]);
  function openCreate(){setMode('create');setEditId(null);setForm({});setErr('');setOpen(true);}
  function openEdit(row){setMode('edit');setEditId(row.id);setForm(row);setErr('');setOpen(true);}
  function openView(row){setMode('view');setEditId(row.id);setForm(row);setErr('');setOpen(true);}
  async function save(e){e.preventDefault();setErr('');try{if(mode==='edit'){await api.put(`/${resource}/${editId}`,form);}else{await api.post('/'+resource,form);}setOpen(false);setForm({});load()}catch(e){setErr(e.response?.data?.message||'Save failed')}}
  async function remove(row){if(!confirm(`Delete this ${cfg.title.replace(/s$/,'')}?`))return;await api.delete(`/${resource}/${row.id}`);load()}
  const columns=[...cfg.cols.map(([key,label])=>({key,label,render:key.includes('cost')||moneyKeys.has(key)?r=>'Rs. '+Number(r[key]||0).toLocaleString('en-IN'):undefined})),
    {key:'_actions',label:'Action',render:r=><div className="row-actions"><button type="button" className="icon-btn" title="View" onClick={()=>openView(r)}>👁</button><button type="button" className="icon-btn" title="Edit" onClick={()=>openEdit(r)}>✎</button><button type="button" className="icon-btn danger" title="Delete" onClick={()=>remove(r)}>🗑</button></div>}
  ];
  const titleSingular=cfg.title.replace('Employees & Labour','Employee').replace(/s$/,'');
  const modalTitle=mode==='create'?`Add ${cfg.title}`:mode==='edit'?`Edit ${titleSingular}`:`View ${titleSingular}`;
  return <><div className="page-head"><div><h1>{cfg.title}</h1><p>Manage {cfg.title.toLowerCase()} and related records.</p></div><button className="btn primary" onClick={openCreate}>+ Add {titleSingular}</button></div><div className="panel"><DataTable rows={rows} columns={columns}/></div><Modal open={open} title={modalTitle} onClose={()=>setOpen(false)}><form className="form-grid" onSubmit={save}>{err&&<div className="alert danger full">{err}</div>}{cfg.fields.map(([key,label,type,opts])=><label key={key}>{label}{type==='select'?<select disabled={mode==='view'} value={form[key]||''} onChange={e=>setForm({...form,[key]:e.target.value})}><option value="">Select</option>{opts.map(o=><option key={o}>{o}</option>)}</select>:<input disabled={mode==='view'} type={type} step={type==='number'?'0.01':undefined} value={form[key]??''} onChange={e=>setForm({...form,[key]:e.target.value})}/>}</label>)}<div className="form-actions full">{mode==='view'?<button type="button" className="btn" onClick={()=>setOpen(false)}>Close</button>:<><button type="button" className="btn" onClick={()=>setOpen(false)}>Cancel</button><button className="btn primary">Save</button></>}</div></form></Modal></>}
