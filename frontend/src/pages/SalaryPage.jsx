import { useEffect,useState } from 'react';import api from '../services/api';import Modal from '../components/Modal';import DataTable from '../components/DataTable';import BulkActionsBar from '../components/BulkActionsBar';import { useRowSelection } from '../hooks/useRowSelection';import StatCard from '../components/StatCard';import { money,fmtDate,todayStr } from '../utils/format';import { Pencil,Trash2,Users,Wallet,HandCoins,AlertCircle,Printer } from 'lucide-react';
export default function SalaryPage(){
  const [tab,setTab]=useState('salary');
  const [rows,setRows]=useState([]),[employees,setEmployees]=useState([]),[open,setOpen]=useState(false),[f,setF]=useState({salary_month:new Date().toISOString().slice(0,7)});
  const [advances,setAdvances]=useState([]),[advOpen,setAdvOpen]=useState(false),[advForm,setAdvForm]=useState({advance_date:todayStr()});
  const [editSalary,setEditSalary]=useState(null),[editSalaryForm,setEditSalaryForm]=useState({});
  const [editAdvance,setEditAdvance]=useState(null),[editAdvanceForm,setEditAdvanceForm]=useState({});
  const load=()=>Promise.all([api.get('/salaries'),api.get('/employees'),api.get('/advances')]).then(([a,b,c])=>{setRows(a.data);setEmployees(b.data);setAdvances(c.data)});
  useEffect(()=>{load()},[]);
  async function save(e){e.preventDefault();await api.post('/salaries/process',f);setOpen(false);load()}
  async function onEmployeeChange(id){
    setF(prev=>({...prev,employee_id:id}));
    if(id){const {data}=await api.get(`/advances/employee/${id}/outstanding`);setF(prev=>({...prev,employee_id:id,advance_deduction:data.outstanding||0}))}
  }
  async function saveAdvance(e){e.preventDefault();await api.post('/advances',advForm);setAdvOpen(false);setAdvForm({advance_date:todayStr()});load()}

  function openEditSalary(row){setEditSalary(row);setEditSalaryForm({overtime_amount:row.overtime_amount,bonus:row.bonus,allowance:row.allowance,advance_deduction:row.advance_deduction,other_deduction:row.other_deduction,status:row.status})}
  async function saveSalaryEdit(){await api.put(`/salaries/${editSalary.id}`,editSalaryForm);setEditSalary(null);load()}
  async function removeSalary(row){if(!confirm(`Delete salary record for ${row.employee_name} (${row.salary_month})?`))return;await api.delete(`/salaries/${row.id}`);load()}

  function openEditAdvance(row){setEditAdvance(row);setEditAdvanceForm({advance_date:String(row.advance_date).slice(0,10),amount:row.amount,remarks:row.remarks||''})}
  async function saveAdvanceEdit(){await api.put(`/advances/${editAdvance.id}`,editAdvanceForm);setEditAdvance(null);load()}
  async function removeAdvance(row){if(!confirm(`Delete advance record for ${row.employee_name}?`))return;await api.delete(`/advances/${row.id}`);load()}

  function exportSalaryCSV(list=rows){
    const cols=['salary_month','employee_name','salary_type','basic_salary','allowance','overtime_amount','advance_deduction','other_deduction','net_salary','status'];
    const header=['Month','Employee','Type','Basic Salary','Allowance','Overtime','Advance Deduction','Other Deduction','Net Salary','Status'];
    const lines=[header, ...list.map(r=>cols.map(k=>r[k]??''))];
    const csv=lines.map(l=>l.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=`salary-records-${todayStr()}.csv`; a.click(); URL.revokeObjectURL(url);
  }
  function exportAdvancesCSV(list=advances){
    const cols=['employee_name','advance_date','amount','recovered_amount','outstanding','remarks'];
    const header=['Employee','Date','Amount','Recovered','Outstanding','Remarks'];
    const lines=[header, ...list.map(r=>cols.map(k=>r[k]??''))];
    const csv=lines.map(l=>l.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=`advances-${todayStr()}.csv`; a.click(); URL.revokeObjectURL(url);
  }
  const [salaryFilters,setSalaryFilters]=useState({employee_id:'',salary_month:'',status:''});
  const filteredRows=rows.filter(r=>{
    if(salaryFilters.employee_id&&String(r.employee_id)!==String(salaryFilters.employee_id))return false;
    if(salaryFilters.salary_month&&r.salary_month!==salaryFilters.salary_month)return false;
    if(salaryFilters.status&&r.status!==salaryFilters.status)return false;
    return true;
  });
  const [advFilters,setAdvFilters]=useState({employee_id:''});
  const filteredAdvances=advances.filter(r=>{
    if(advFilters.employee_id&&String(r.employee_id)!==String(advFilters.employee_id))return false;
    return true;
  });

  const salarySel=useRowSelection(filteredRows);
  async function bulkDeleteSalary(){
    if(!confirm(`Delete ${salarySel.count} selected salary record(s)?`))return;
    await Promise.all([...salarySel.selectedIds].map(id=>api.delete(`/salaries/${id}`)));
    salarySel.clear(); load();
  }
  const advanceSel=useRowSelection(filteredAdvances);
  async function bulkDeleteAdvances(){
    if(!confirm(`Delete ${advanceSel.count} selected advance record(s)?`))return;
    await Promise.all([...advanceSel.selectedIds].map(id=>api.delete(`/advances/${id}`)));
    advanceSel.clear(); load();
  }

  const currentMonth=new Date().toISOString().slice(0,7);
  const monthRows=rows.filter(r=>r.salary_month===currentMonth);
  const totalSalary=monthRows.reduce((s,r)=>s+Number(r.net_salary||0),0);
  const totalAdvance=monthRows.reduce((s,r)=>s+Number(r.advance_deduction||0),0);
  const netPayable=monthRows.filter(r=>r.status!=='Paid').reduce((s,r)=>s+Number(r.net_salary||0),0);
  const outstandingAdvances=advances.reduce((s,r)=>s+Number(r.outstanding||0),0);

  return <>
    <div className="page-head"><div><h1>Salary</h1><p>Process monthly or daily labour salary from attendance and adjustments.</p></div>
      <div className="row-actions">
        <button className="btn" onClick={()=>window.open('/reports/salary/print','_blank')}><Printer size={15}/>Print Report</button>
        {tab==='salary'?<button className="btn primary" onClick={()=>setOpen(true)}>+ Process Salary</button>:<button className="btn primary" onClick={()=>setAdvOpen(true)}>+ Give Advance</button>}
      </div>
    </div>
    <div className="stats-grid cols-4">
      <StatCard label="Total Employees" value={employees.length} sub="Active" icon={<Users size={20}/>}/>
      <StatCard label="Total Salary" value={money(totalSalary)} sub={currentMonth} icon={<Wallet size={20}/>}/>
      <StatCard label="Total Advance" value={money(totalAdvance)} sub={currentMonth} icon={<HandCoins size={20}/>}/>
      <StatCard label="Net Payable" value={money(netPayable)} sub="Unpaid" icon={<AlertCircle size={20}/>}/>
    </div>
    <div className="tabs">
      <button className={`tab ${tab==='salary'?'active':''}`} onClick={()=>setTab('salary')}>Salary Records</button>
      <button className={`tab ${tab==='advances'?'active':''}`} onClick={()=>setTab('advances')}>Advances{outstandingAdvances>0?` (${money(outstandingAdvances)} out)`:''}</button>
    </div>
    {tab==='salary'?<>
      <div className="filter-row">
        <label>Employee<select value={salaryFilters.employee_id} onChange={e=>setSalaryFilters({...salaryFilters,employee_id:e.target.value})}><option value="">All</option>{employees.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label>Month<input type="month" value={salaryFilters.salary_month} onChange={e=>setSalaryFilters({...salaryFilters,salary_month:e.target.value})}/></label>
        <label>Status<select value={salaryFilters.status} onChange={e=>setSalaryFilters({...salaryFilters,status:e.target.value})}><option value="">All</option>{['Draft','Processed','Paid'].map(s=><option key={s}>{s}</option>)}</select></label>
        <button type="button" className="btn" onClick={()=>setSalaryFilters({employee_id:'',salary_month:'',status:''})}>Reset</button>
      </div>
      <BulkActionsBar count={salarySel.count} onExport={()=>exportSalaryCSV(salarySel.selectedRows)} onDelete={bulkDeleteSalary} onClear={salarySel.clear}/>
      <div className="panel"><DataTable rows={filteredRows} selection={salarySel} empty="No salary records match the current filters" columns={[
        {key:'salary_month',label:'Month'},{key:'employee_name',label:'Employee'},{key:'salary_type',label:'Type'},{key:'attendance_days',label:'Attendance Days'},
        {key:'basic_salary',label:'Basic Salary',render:r=>money(r.basic_salary)},{key:'allowance',label:'Allowance',render:r=>money(r.allowance)},
        {key:'overtime_amount',label:'Overtime',render:r=>money(r.overtime_amount)},
        {key:'advance_deduction',label:'Deduction',render:r=>money(Number(r.advance_deduction||0)+Number(r.other_deduction||0))},
        {key:'net_salary',label:'Net Salary',render:r=>money(r.net_salary)},
        {key:'status',label:'Status',render:r=><span className={`badge ${r.status?.toLowerCase()}`}>{r.status}</span>},
        {key:'_actions',label:'Action',render:r=><div className="row-actions"><button type="button" className="icon-btn" title="Print Payslip" onClick={()=>window.open(`/payslips/${r.id}/print`,'_blank')}><Printer size={15}/></button><button type="button" className="icon-btn" title="Edit" onClick={()=>openEditSalary(r)}><Pencil size={15}/></button><button type="button" className="icon-btn danger" title="Delete" onClick={()=>removeSalary(r)}><Trash2 size={15}/></button></div>}
      ]}/></div>
      </>
      :<>
      <div className="filter-row">
        <label>Employee<select value={advFilters.employee_id} onChange={e=>setAdvFilters({...advFilters,employee_id:e.target.value})}><option value="">All</option>{employees.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <button type="button" className="btn" onClick={()=>setAdvFilters({employee_id:''})}>Reset</button>
      </div>
      <BulkActionsBar count={advanceSel.count} onExport={()=>exportAdvancesCSV(advanceSel.selectedRows)} onDelete={bulkDeleteAdvances} onClear={advanceSel.clear}/>
      <div className="panel"><DataTable rows={filteredAdvances} selection={advanceSel} empty="No advance records match the current filters" columns={[
        {key:'employee_name',label:'Employee'},{key:'advance_date',label:'Date',render:r=>fmtDate(r.advance_date)},
        {key:'amount',label:'Amount',render:r=>money(r.amount)},{key:'recovered_amount',label:'Recovered',render:r=>money(r.recovered_amount)},
        {key:'outstanding',label:'Outstanding',render:r=>money(r.outstanding)},{key:'remarks',label:'Remarks'},
        {key:'_actions',label:'Action',render:r=><div className="row-actions"><button type="button" className="icon-btn" title="Edit" onClick={()=>openEditAdvance(r)}><Pencil size={15}/></button><button type="button" className="icon-btn danger" title="Delete" onClick={()=>removeAdvance(r)}><Trash2 size={15}/></button></div>}
      ]}/></div>
      </>}
    <Modal open={open} title="Process Salary" onClose={()=>setOpen(false)}>
      <form className="form-grid" onSubmit={save}>
        <label>Employee<select required onChange={e=>onEmployeeChange(e.target.value)}><option value="">Select</option>{employees.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label>Salary Month<input type="month" value={f.salary_month} onChange={e=>setF({...f,salary_month:e.target.value})}/></label>
        <label>Overtime Amount<input type="number" onChange={e=>setF({...f,overtime_amount:e.target.value})}/></label>
        <label>Bonus<input type="number" onChange={e=>setF({...f,bonus:e.target.value})}/></label>
        <label>Allowance<input type="number" onChange={e=>setF({...f,allowance:e.target.value})}/></label>
        <label>Advance Deduction<input type="number" value={f.advance_deduction??''} onChange={e=>setF({...f,advance_deduction:e.target.value})}/></label>
        <label>Other Deduction<input type="number" onChange={e=>setF({...f,other_deduction:e.target.value})}/></label>
        <div className="form-actions full"><button type="button" className="btn" onClick={()=>setOpen(false)}>Cancel</button><button className="btn primary">Process</button></div>
      </form>
    </Modal>
    <Modal open={advOpen} title="Give Advance" onClose={()=>setAdvOpen(false)}>
      <form className="form-grid" onSubmit={saveAdvance}>
        <label>Employee<select required value={advForm.employee_id||''} onChange={e=>setAdvForm({...advForm,employee_id:e.target.value})}><option value="">Select</option>{employees.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label>Date<input type="date" value={advForm.advance_date} onChange={e=>setAdvForm({...advForm,advance_date:e.target.value})}/></label>
        <label>Amount<input type="number" required value={advForm.amount||''} onChange={e=>setAdvForm({...advForm,amount:e.target.value})}/></label>
        <label className="full">Remarks<input value={advForm.remarks||''} onChange={e=>setAdvForm({...advForm,remarks:e.target.value})}/></label>
        <div className="form-actions full"><button type="button" className="btn" onClick={()=>setAdvOpen(false)}>Cancel</button><button className="btn primary">Save</button></div>
      </form>
    </Modal>
    <Modal open={!!editSalary} title={`Edit Salary — ${editSalary?.employee_name||''}`} onClose={()=>setEditSalary(null)}>
      {editSalary&&<div className="form-grid">
        <label>Overtime Amount<input type="number" value={editSalaryForm.overtime_amount??''} onChange={e=>setEditSalaryForm({...editSalaryForm,overtime_amount:e.target.value})}/></label>
        <label>Bonus<input type="number" value={editSalaryForm.bonus??''} onChange={e=>setEditSalaryForm({...editSalaryForm,bonus:e.target.value})}/></label>
        <label>Allowance<input type="number" value={editSalaryForm.allowance??''} onChange={e=>setEditSalaryForm({...editSalaryForm,allowance:e.target.value})}/></label>
        <label>Advance Deduction<input type="number" value={editSalaryForm.advance_deduction??''} onChange={e=>setEditSalaryForm({...editSalaryForm,advance_deduction:e.target.value})}/></label>
        <label>Other Deduction<input type="number" value={editSalaryForm.other_deduction??''} onChange={e=>setEditSalaryForm({...editSalaryForm,other_deduction:e.target.value})}/></label>
        <label>Status<select value={editSalaryForm.status||''} onChange={e=>setEditSalaryForm({...editSalaryForm,status:e.target.value})}>{['Draft','Processed','Paid'].map(s=><option key={s}>{s}</option>)}</select></label>
        <div className="form-actions full"><button type="button" className="btn" onClick={()=>setEditSalary(null)}>Cancel</button><button type="button" className="btn primary" onClick={saveSalaryEdit}>Save</button></div>
      </div>}
    </Modal>
    <Modal open={!!editAdvance} title={`Edit Advance — ${editAdvance?.employee_name||''}`} onClose={()=>setEditAdvance(null)}>
      {editAdvance&&<div className="form-grid">
        <label>Date<input type="date" value={editAdvanceForm.advance_date||''} onChange={e=>setEditAdvanceForm({...editAdvanceForm,advance_date:e.target.value})}/></label>
        <label>Amount<input type="number" value={editAdvanceForm.amount??''} onChange={e=>setEditAdvanceForm({...editAdvanceForm,amount:e.target.value})}/></label>
        <label className="full">Remarks<input value={editAdvanceForm.remarks||''} onChange={e=>setEditAdvanceForm({...editAdvanceForm,remarks:e.target.value})}/></label>
        <div className="form-actions full"><button type="button" className="btn" onClick={()=>setEditAdvance(null)}>Cancel</button><button type="button" className="btn primary" onClick={saveAdvanceEdit}>Save</button></div>
      </div>}
    </Modal>
  </>
}
