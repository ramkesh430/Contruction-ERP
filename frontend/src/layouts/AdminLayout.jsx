import { NavLink,Outlet,useLocation,useNavigate } from 'react-router-dom';
import { useEffect,useRef,useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Home,Building2,User,FileText,Package,Truck,Users,ShieldCheck,Wallet,Receipt,ReceiptText,CreditCard,Wrench,BarChart3,Shield,Settings as SettingsIcon,ChevronRight,LogOut,Bell,Menu,Search } from 'lucide-react';
// Fourth element is the permission code required to see this nav item, or
// null if every logged-in user should see it regardless of role. Matches
// the codes now enforced server-side in backend/routes/index.js — a user
// without the permission would get a 403 from the API anyway, so hiding
// the link here just avoids sending them to a page that can't load.
const items=[
['/',Home,'Dashboard',null],['/projects',Building2,'Projects','projects.view'],['/clients',User,'Clients','clients.view'],['/quotations',FileText,'Quotation / BOQ','quotation.view'],['/materials',Package,'Materials','materials.view'],['/suppliers',Truck,'Suppliers','suppliers.view'],['/employees',Users,'Employees / Labour','employees.view'],['/attendance',ShieldCheck,'Attendance','attendance.manage'],['/salary',Wallet,'Salary','salary.view'],['/expenses',Receipt,'Expenses','expenses.view'],['/invoices',ReceiptText,'Invoice / Billing','invoice.view'],['/payments',CreditCard,'Payments / Receipts','payments.view'],['/equipment',Wrench,'Equipment','equipment.view'],['/reports',BarChart3,'Reports','reports.view'],['/users',Shield,'Users / Roles','users.manage'],['/settings',SettingsIcon,'Settings','settings.manage']
];
function timeAgo(iso){
  const s=Math.floor((Date.now()-new Date(iso).getTime())/1000);
  if(s<60)return 'just now'; if(s<3600)return Math.floor(s/60)+'m ago'; if(s<86400)return Math.floor(s/3600)+'h ago'; return Math.floor(s/86400)+'d ago';
}
function NotificationBell(){
  const [items,setItems]=useState([]),[open,setOpen]=useState(false);
  const ref=useRef(null);
  const load=()=>api.get('/notifications').then(r=>setItems(r.data)).catch(()=>{});
  useEffect(()=>{load();const t=setInterval(load,30000);return()=>clearInterval(t)},[]);
  useEffect(()=>{function onClick(e){if(ref.current&&!ref.current.contains(e.target))setOpen(false);}document.addEventListener('mousedown',onClick);return()=>document.removeEventListener('mousedown',onClick)},[]);
  const unread=items.filter(n=>!n.is_read).length;
  async function readOne(n){if(!n.is_read){await api.post(`/notifications/${n.id}/read`);load();}}
  async function readAll(){await api.post('/notifications/read-all');load();}
  return <div className="notif-wrap" ref={ref}>
    <button className="bell" onClick={()=>setOpen(v=>!v)}><Bell size={20}/>{unread>0&&<span className="notif-dot">{unread>9?'9+':unread}</span>}</button>
    {open&&<div className="notif-panel">
      <div className="notif-head"><b>Notifications</b>{unread>0&&<button className="link-btn" onClick={readAll}>Mark all read</button>}</div>
      <div className="notif-list">
        {items.length?items.map(n=><div key={n.id} className={`notif-item ${n.is_read?'':'unread'}`} onClick={()=>readOne(n)}>
          <b>{n.title}</b><p>{n.message}</p><small>{timeAgo(n.created_at)}</small>
        </div>):<div className="notif-empty">No notifications yet</div>}
      </div>
    </div>}
  </div>
}
const SEARCH_GROUPS=[
  ['clients','Clients',r=>r.name,r=>r.phone,r=>`/clients/${r.id}`],
  ['suppliers','Suppliers',r=>r.name,r=>r.phone,r=>`/suppliers/${r.id}`],
  ['projects','Projects',r=>r.project_name,r=>r.project_code,r=>`/projects/${r.id}`],
  ['employees','Employees',r=>r.name,r=>r.employee_code,r=>`/employees/${r.id}`],
  ['invoices','Invoices',r=>r.invoice_no,r=>r.client_name,r=>`/invoices/${r.id}`],
  ['quotations','Quotations',r=>r.quotation_no,r=>r.client_name,r=>`/quotations/${r.id}/edit`],
  ['payments','Payments',r=>r.receipt_no,r=>r.client_name,r=>`/receipts/${r.id}/print`],
];
function GlobalSearch(){
  const nav=useNavigate();
  const [q,setQ]=useState('');
  const [results,setResults]=useState(null);
  const [open,setOpen]=useState(false);
  const ref=useRef(null);
  useEffect(()=>{function onClick(e){if(ref.current&&!ref.current.contains(e.target))setOpen(false);}document.addEventListener('mousedown',onClick);return()=>document.removeEventListener('mousedown',onClick)},[]);
  useEffect(()=>{
    if(q.trim().length<2){setResults(null);return;}
    const t=setTimeout(()=>{api.get('/search',{params:{q}}).then(r=>{setResults(r.data);setOpen(true)}).catch(()=>{})},300);
    return()=>clearTimeout(t);
  },[q]);
  function goTo(path){setQ('');setResults(null);setOpen(false);nav(path)}
  const hasAny=results&&SEARCH_GROUPS.some(([key])=>results[key]?.length);
  return <div className="search" ref={ref}>
    <Search size={15}/>
    <input placeholder="Search here..." value={q} onChange={e=>setQ(e.target.value)} onFocus={()=>{if(results)setOpen(true)}}/>
    {open&&results&&<div className="search-results">
      {hasAny?SEARCH_GROUPS.map(([key,label,primary,secondary,link])=>results[key]?.length?<div key={key} className="search-group">
        <div className="search-group-title">{label}</div>
        {results[key].map(r=><div key={r.id} className="search-item" onClick={()=>goTo(link(r))}>
          <span>{primary(r)}</span>{secondary(r)&&<small>{secondary(r)}</small>}
        </div>)}
      </div>:null):<div className="search-empty">No results for "{q}"</div>}
    </div>}
  </div>;
}
export default function AdminLayout(){
  const [mini,setMini]=useState(false);const [mobileOpen,setMobileOpen]=useState(false);const {user,logout}=useAuth();const loc=useLocation();
  const visibleItems=items.filter(([,,,perm])=>!perm||user?.permissions?.includes(perm));
  const [currentFY,setCurrentFY]=useState('');
  useEffect(()=>{api.get('/fiscal-years').then(r=>{const cur=r.data.find(y=>y.is_current);setCurrentFY(cur?(cur.name||cur.code):'')}).catch(()=>{})},[]);
  useEffect(()=>{setMobileOpen(false)},[loc.pathname]);
  function toggleMenu(){ setMini(v=>!v); setMobileOpen(v=>!v); }
  return <div className={`app-shell ${mini?'mini':''}`}>
    {mobileOpen&&<div className="mobile-backdrop" onClick={()=>setMobileOpen(false)}/>}
    <aside className={`sidebar ${mobileOpen?'mobile-open':''}`}>
      <div className="brand"><img src="/logo.jpg" alt="CivilArch Design Space" className="brandmark"/><div><strong>CivilArch</strong><span>Design Space</span></div></div>
      <nav>{visibleItems.map(([to,Icon,label])=><NavLink key={to} to={to} end={to==='/' } title={label}><span className="nav-icon"><Icon size={19} strokeWidth={1.8}/></span><span className="nav-label">{label}</span><ChevronRight size={15} className="nav-chevron"/></NavLink>)}
        <button className="nav-logout" onClick={logout} title="Logout"><span className="nav-icon"><LogOut size={19} strokeWidth={1.8}/></span><span className="nav-label">Logout</span></button>
      </nav>
    </aside>
    <main className="main"><header className="topbar"><div className="top-left"><button className="menu-btn" onClick={toggleMenu}><Menu size={18}/></button><GlobalSearch/></div><div className="top-right">{currentFY&&<span className="nepal-date">🇳🇵 {currentFY}</span>}<NotificationBell/><div className="profile"><div className="avatar">{user?.name?.[0]||'A'}</div><div><b>{user?.name||'Admin'}</b><small>{user?.role||'Super Admin'}</small></div></div><button className="link-btn" onClick={logout}>Logout</button></div></header><section className="content" key={loc.pathname}><Outlet/></section></main>
  </div>
}
