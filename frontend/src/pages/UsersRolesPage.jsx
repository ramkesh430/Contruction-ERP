import { useEffect,useState } from 'react';import api from '../services/api';import { useAuth } from '../context/AuthContext';import Modal from '../components/Modal';import DataTable from '../components/DataTable';import BulkActionsBar from '../components/BulkActionsBar';import { useRowSelection } from '../hooks/useRowSelection';import { Pencil,Trash2 } from 'lucide-react';

const TEMPLATES={
  'Full Access':()=>true,
  'Read Only':p=>p.code.endsWith('.view'),
  'Finance':p=>/^(expenses|invoice|payments|salary)\.|reports\.view/.test(p.code),
  'Site Team':p=>/^(attendance\.manage|projects\.view|quotation\.view)$/.test(p.code),
  'Clear All':()=>false
};

export default function UsersRolesPage(){
  const { user:currentUser }=useAuth();
  const [section,setSection]=useState('users');
  const [users,setUsers]=useState([]),[roles,setRoles]=useState([]),[open,setOpen]=useState(false),[mode,setMode]=useState('create'),[editId,setEditId]=useState(null),[f,setF]=useState({}),[err,setErr]=useState('');
  const [permOpen,setPermOpen]=useState(false),[selectedRole,setSelectedRole]=useState(null),[permissions,setPermissions]=useState([]);
  const [roleOpen,setRoleOpen]=useState(false),[roleMode,setRoleMode]=useState('create'),[roleId,setRoleId]=useState(null),[roleForm,setRoleForm]=useState({}),[roleErr,setRoleErr]=useState('');
  const [logs,setLogs]=useState([]),[entityTypes,setEntityTypes]=useState([]),[logFilters,setLogFilters]=useState({user_id:'',entity_type:'',from:'',to:''});

  const load=()=>Promise.all([api.get('/users'),api.get('/roles')]).then(([u,r])=>{setUsers(u.data);setRoles(r.data)});
  useEffect(()=>{load()},[]);

  function loadLogs(fl=logFilters){
    const params={}; Object.entries(fl).forEach(([k,v])=>{ if(v) params[k]=v; });
    return api.get('/audit-logs',{params}).then(r=>{setLogs(r.data.rows);setEntityTypes(r.data.entityTypes)});
  }
  useEffect(()=>{ if(section==='activity') loadLogs(); },[section]);
  function applyLogFilters(e){ e.preventDefault(); loadLogs(logFilters); }
  function resetLogFilters(){ const fl={user_id:'',entity_type:'',from:'',to:''}; setLogFilters(fl); loadLogs(fl); }

  function openCreate(){setMode('create');setEditId(null);setF({});setErr('');setOpen(true)}
  function openEdit(row){setMode('edit');setEditId(row.id);setF({name:row.name,phone:row.phone,role_id:row.role_id,is_active:row.is_active});setErr('');setOpen(true)}
  async function save(e){e.preventDefault();setErr('');try{if(mode==='edit'){await api.put(`/users/${editId}`,f)}else{await api.post('/users',f)}setOpen(false);setF({});load()}catch(e){setErr(e.response?.data?.message||'Save failed')}}
  async function removeUser(row){if(!confirm(`Delete user "${row.name}"?`))return;try{await api.delete(`/users/${row.id}`);load()}catch(e){alert(e.response?.data?.message||'Delete failed')}}

  async function manage(role){setSelectedRole(role);const {data}=await api.get('/permissions',{params:{role_id:role.id}});setPermissions(data);setPermOpen(true)}
  async function savePerms(){await api.put(`/roles/${selectedRole.id}/permissions`,{permission_ids:permissions.filter(p=>p.assigned).map(p=>p.id)});setPermOpen(false)}

  function openCreateRole(){setRoleMode('create');setRoleId(null);setRoleForm({});setRoleErr('');setRoleOpen(true)}
  function openEditRole(row){setRoleMode('edit');setRoleId(row.id);setRoleForm({name:row.name,description:row.description});setRoleErr('');setRoleOpen(true)}
  async function saveRole(e){e.preventDefault();setRoleErr('');try{if(roleMode==='edit'){await api.put(`/roles/${roleId}`,roleForm)}else{await api.post('/roles',roleForm)}setRoleOpen(false);load()}catch(e){setRoleErr(e.response?.data?.message||'Save failed')}}
  async function removeRole(row){if(!confirm(`Delete role "${row.name}"?`))return;try{await api.delete(`/roles/${row.id}`);load()}catch(e){alert(e.response?.data?.message||'Delete failed')}}

  const userSel=useRowSelection(users);
  async function bulkDeleteUsers(){
    const ids=[...userSel.selectedIds].filter(id=>id!==currentUser?.id);
    if(!ids.length)return;
    if(!confirm(`Delete ${ids.length} selected user(s)?`))return;
    try{ await Promise.all(ids.map(id=>api.delete(`/users/${id}`))); userSel.clear(); load(); }
    catch(e){ alert(e.response?.data?.message||'Delete failed'); }
  }
  const roleSel=useRowSelection(roles);
  async function bulkDeleteRoles(){
    if(!confirm(`Delete ${roleSel.count} selected role(s)?`))return;
    try{ await Promise.all([...roleSel.selectedIds].map(id=>api.delete(`/roles/${id}`))); roleSel.clear(); load(); }
    catch(e){ alert(e.response?.data?.message||'Delete failed'); }
  }

  const grouped=permissions.reduce((acc,p)=>{ const mod=p.code.split('.')[0]; (acc[mod]=acc[mod]||[]).push(p); return acc; },{});
  function applyTemplate(name){ const fn=TEMPLATES[name]; setPermissions(permissions.map(p=>({...p,assigned:fn(p)}))); }
  function toggleModule(mod,checked){ setPermissions(permissions.map(p=>p.code.split('.')[0]===mod?{...p,assigned:checked}:p)); }

  return <>
    <div className="page-head"><div><h1>Users / Roles / Permissions</h1><p>Create users, assign permissions by role, and review account activity.</p></div>{section==='users'&&<button className="btn primary" onClick={openCreate}>+ Add User</button>}</div>
    <div className="tabs">
      <button className={`tab ${section==='users'?'active':''}`} onClick={()=>setSection('users')}>Users &amp; Roles</button>
      <button className={`tab ${section==='activity'?'active':''}`} onClick={()=>setSection('activity')}>Activity Log</button>
    </div>

    {section==='users'&&<>
      <BulkActionsBar count={userSel.count} onDelete={bulkDeleteUsers} onClear={userSel.clear}/>
      <div className="panel"><h3>Users</h3><DataTable rows={users} selection={userSel} columns={[
        {key:'name',label:'Name'},{key:'email',label:'Email'},{key:'role_name',label:'Role'},
        {key:'is_active',label:'Status',render:r=><span className={`badge ${r.is_active?'approved':'rejected'}`}>{r.is_active?'Active':'Disabled'}</span>},
        {key:'_actions',label:'Action',render:r=><div className="row-actions"><button type="button" className="icon-btn" title="Edit" onClick={()=>openEdit(r)}><Pencil size={15}/></button>{r.id!==currentUser?.id&&<button type="button" className="icon-btn danger" title="Delete" onClick={()=>removeUser(r)}><Trash2 size={15}/></button>}</div>}
      ]}/></div>
      <BulkActionsBar count={roleSel.count} onDelete={bulkDeleteRoles} onClear={roleSel.clear}/>
      <div className="panel" style={{marginTop:16}}><div className="panel-title"><h3>Roles</h3><button className="btn small" onClick={openCreateRole}>+ Add Role</button></div><DataTable rows={roles} selection={roleSel} columns={[
        {key:'name',label:'Role'},{key:'description',label:'Description'},
        {key:'action',label:'Permissions',render:r=><button className="btn small" onClick={()=>manage(r)}>Manage</button>},
        {key:'_actions',label:'Action',render:r=><div className="row-actions"><button type="button" className="icon-btn" title="Edit" onClick={()=>openEditRole(r)}><Pencil size={15}/></button><button type="button" className="icon-btn danger" title="Delete" onClick={()=>removeRole(r)}><Trash2 size={15}/></button></div>}
      ]}/></div>
    </>}

    {section==='activity'&&<>
      <form className="filter-row" onSubmit={applyLogFilters}>
        <label>User<select value={logFilters.user_id} onChange={e=>setLogFilters({...logFilters,user_id:e.target.value})}><option value="">All</option>{users.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
        <label>Module<select value={logFilters.entity_type} onChange={e=>setLogFilters({...logFilters,entity_type:e.target.value})}><option value="">All</option>{entityTypes.map(t=><option key={t} value={t}>{t}</option>)}</select></label>
        <label>From<input type="date" value={logFilters.from} onChange={e=>setLogFilters({...logFilters,from:e.target.value})}/></label>
        <label>To<input type="date" value={logFilters.to} onChange={e=>setLogFilters({...logFilters,to:e.target.value})}/></label>
        <button className="btn primary">Apply</button>
        <button type="button" className="btn" onClick={resetLogFilters}>Reset</button>
      </form>
      <div className="panel"><DataTable rows={logs} empty="No activity recorded yet" columns={[
        {key:'created_at',label:'Date & Time',render:r=>new Date(r.created_at).toLocaleString('en-IN')},
        {key:'user_name',label:'User',render:r=>r.user_name||'System'},
        {key:'action',label:'Action'},
        {key:'entity_type',label:'Module',render:r=>r.entity_type||'—'},
        {key:'entity_id',label:'Record ID',render:r=>r.entity_id||'—'}
      ]}/></div>
    </>}

    <Modal open={open} title={mode==='edit'?'Edit User':'Add User'} onClose={()=>setOpen(false)}>
      <form className="form-grid" onSubmit={save}>
        {err&&<div className="alert danger full">{err}</div>}
        <label>Name<input required value={f.name||''} onChange={e=>setF({...f,name:e.target.value})}/></label>
        {mode==='create'?<label>Email<input type="email" required value={f.email||''} onChange={e=>setF({...f,email:e.target.value})}/></label>:<label>Status<select value={f.is_active?'1':'0'} onChange={e=>setF({...f,is_active:e.target.value==='1'})}><option value="1">Active</option><option value="0">Disabled</option></select></label>}
        <label>Phone<input value={f.phone||''} onChange={e=>setF({...f,phone:e.target.value})}/></label>
        <label>Role<select required value={f.role_id||''} onChange={e=>setF({...f,role_id:e.target.value})}><option value="">Select</option>{roles.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label className="full">{mode==='edit'?'New Password (leave blank to keep current)':'Password'}<input type="password" required={mode==='create'} minLength="8" value={f.password||''} onChange={e=>setF({...f,password:e.target.value})}/></label>
        <div className="form-actions full"><button type="button" className="btn" onClick={()=>setOpen(false)}>Cancel</button><button className="btn primary">{mode==='edit'?'Save Changes':'Create User'}</button></div>
      </form>
    </Modal>
    <Modal open={permOpen} title={`Permissions — ${selectedRole?.name||''}`} onClose={()=>setPermOpen(false)} wide>
      <div className="row-actions" style={{marginBottom:14,flexWrap:'wrap'}}>
        <span style={{fontSize:12,fontWeight:700,color:'#64748b',alignSelf:'center'}}>Quick templates:</span>
        {Object.keys(TEMPLATES).map(name=><button key={name} type="button" className="btn small" onClick={()=>applyTemplate(name)}>{name}</button>)}
      </div>
      {Object.entries(grouped).map(([mod,perms])=>{
        const allChecked=perms.every(p=>p.assigned);
        return <div key={mod} style={{marginBottom:16}}>
          <label className="perm" style={{fontWeight:700,marginBottom:6,display:'flex'}}>
            <input type="checkbox" checked={allChecked} onChange={e=>toggleModule(mod,e.target.checked)}/>
            <span style={{textTransform:'capitalize'}}>{mod}</span>
          </label>
          <div className="permissions-grid">
            {perms.map(p=><label key={p.id} className="perm"><input type="checkbox" checked={!!p.assigned} onChange={e=>setPermissions(permissions.map(x=>x.id===p.id?{...x,assigned:e.target.checked}:x))}/><span>{p.code}</span></label>)}
          </div>
        </div>;
      })}
      <div className="form-actions"><button className="btn" onClick={()=>setPermOpen(false)}>Cancel</button><button className="btn primary" onClick={savePerms}>Save Permissions</button></div>
    </Modal>
    <Modal open={roleOpen} title={roleMode==='edit'?'Edit Role':'Add Role'} onClose={()=>setRoleOpen(false)}>
      <form className="form-grid" onSubmit={saveRole}>
        {roleErr&&<div className="alert danger full">{roleErr}</div>}
        <label className="full">Role Name<input required value={roleForm.name||''} onChange={e=>setRoleForm({...roleForm,name:e.target.value})}/></label>
        <label className="full">Description<input value={roleForm.description||''} onChange={e=>setRoleForm({...roleForm,description:e.target.value})}/></label>
        <div className="form-actions full"><button type="button" className="btn" onClick={()=>setRoleOpen(false)}>Cancel</button><button className="btn primary">Save</button></div>
      </form>
    </Modal>
  </>
}
