import { useEffect,useState } from 'react';import { useParams,Navigate } from 'react-router-dom';import { useAuth } from '../context/AuthContext';import api from '../services/api';import { money } from '../utils/format';
import { PrintPreviewLayout,PrintCompanyHeader,PrintInfoCard,PrintFinancialSummary,PrintSignatureSection } from '../components/print';

function monthLabel(m){
  if(!m) return '—';
  const [y,mo]=m.split('-');
  return new Date(Number(y),Number(mo)-1).toLocaleDateString('en-IN',{month:'long',year:'numeric'});
}

export default function PayslipPrint(){
  const {id}=useParams();
  const {user}=useAuth();
  const [s,setS]=useState(null);
  const [settings,setSettings]=useState(null);
  const [err,setErr]=useState('');

  useEffect(()=>{
    setS(null); setErr('');
    api.get(`/salaries/${id}`).then(res=>setS(res.data)).catch(()=>setErr('Salary record not found'));
    api.get('/settings').then(res=>setSettings(res.data)).catch(()=>{});
  },[id]);

  if(!user) return <Navigate to="/login" replace/>;
  if(err) return <div className="loading">{err}</div>;
  if(!s) return <div className="loading">Loading payslip...</div>;

  const deduction=Number(s.advance_deduction||0)+Number(s.other_deduction||0);

  return <PrintPreviewLayout>
    <PrintCompanyHeader settings={settings} docLabel="SALARY PAYSLIP" docNumber={monthLabel(s.salary_month)} status={s.status}/>

    <PrintInfoCard title="Employee Details" rows={[
      `Name: ${s.employee_name||'—'}`,
      `Employee Code: ${s.employee_code||'—'}`,
      `Designation: ${s.designation||'—'}`,
      `Salary Type: ${s.salary_type||'—'}`,
      `Salary Month: ${monthLabel(s.salary_month)}`,
      s.salary_type==='Daily'&&`Attendance Days: ${Number(s.attendance_days||0)}`
    ]}/>

    <div style={{marginTop:16}}>
      <PrintFinancialSummary rows={[
        {label:'Basic Salary',value:money(s.basic_salary)},
        {label:'Overtime',value:money(s.overtime_amount)},
        {label:'Bonus',value:money(s.bonus)},
        {label:'Allowance',value:money(s.allowance)},
        {label:'Advance Deduction',value:'- '+money(s.advance_deduction)},
        {label:'Other Deduction',value:'- '+money(s.other_deduction)},
        {label:'Net Salary',value:money(s.net_salary),grand:true}
      ]}/>
    </div>

    <PrintSignatureSection settings={settings} columns={[
      {label:'Employee Signature'},
      {label:'Authorized Signatory',showStampSign:true}
    ]}/>
  </PrintPreviewLayout>;
}
