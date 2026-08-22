import { useEffect,useState } from 'react';import { useParams,Navigate } from 'react-router-dom';import { useAuth } from '../context/AuthContext';import api from '../services/api';import { money,fmtDate } from '../utils/format';
import { PrintPreviewLayout,PrintCompanyHeader,PrintInfoGrid,PrintInfoCard,PrintTable,PrintFinancialSummary } from '../components/print';

export default function ProjectReportPrint(){
  const {id}=useParams();
  const {user}=useAuth();
  const [data,setData]=useState(null);
  const [settings,setSettings]=useState(null);
  const [err,setErr]=useState('');

  useEffect(()=>{
    setData(null); setErr('');
    api.get(`/projects/${id}`).then(r=>setData(r.data)).catch(()=>setErr('Project not found'));
    api.get('/settings').then(r=>setSettings(r.data)).catch(()=>{});
  },[id]);

  if(!user) return <Navigate to="/login" replace/>;
  if(err) return <div className="loading">{err}</div>;
  if(!data) return <div className="loading">Loading project report...</div>;

  const {project:p,stages,finance:fi,variationTotal}=data;

  return <PrintPreviewLayout orientation="landscape">
    <PrintCompanyHeader settings={settings} docLabel="PROJECT REPORT" docNumber={p.project_code} status={p.status}/>

    <PrintInfoGrid>
      <PrintInfoCard title="Project" rows={[
        <b>{p.project_name}</b>,
        `Type: ${p.project_type||'—'}`,
        `Client: ${p.client_name||'—'}`,
        `Location: ${p.location||'—'}`
      ]}/>
      <PrintInfoCard title="Timeline" rows={[
        `Start Date: ${fmtDate(p.start_date_ad)}`,
        `Expected End: ${fmtDate(p.end_date_ad)}`,
        `Actual End: ${p.actual_end_date_ad?fmtDate(p.actual_end_date_ad):'N/A'}`,
        `Overall Progress: ${Number(p.progress_percentage||0).toFixed(0)}%`
      ]}/>
    </PrintInfoGrid>

    <PrintTable
      emptyText="No stages defined"
      columns={[
        {key:'stage',label:'Stage',render:s=>`${s.sort_order}. ${s.stage_name}`},
        {key:'weight',label:'Weight %',align:'right',render:s=>Number(s.weight_percentage).toFixed(0)+'%'},
        {key:'start',label:'Start Date',render:s=>fmtDate(s.start_date)},
        {key:'end',label:'End Date',render:s=>fmtDate(s.actual_end_date||s.expected_end_date)},
        {key:'progress',label:'Progress',align:'right',render:s=>Number(s.progress_percentage||0)+'%'},
        {key:'status',label:'Status'}
      ]}
      rows={stages}
    />

    {fi&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24,marginTop:16}}>
      <PrintFinancialSummary rows={[
        {label:'Contract Value',value:money(fi.contractValue)},
        {label:'Approved Variations',value:money(variationTotal)},
        {label:'Total Invoice',value:money(fi.totalInvoice)},
        {label:'Total Received',value:money(fi.totalReceived)},
        {label:'Outstanding',value:money(fi.outstanding)}
      ]}/>
      <PrintFinancialSummary rows={[
        {label:'Material Cost',value:money(fi.materialCost)},
        {label:'Labour Cost',value:money(fi.labourCost)},
        {label:'Other Cost',value:money(fi.otherCost)},
        {label:'Total Expense',value:money(fi.totalExpense)},
        {label:'Current Cash Profit',value:money(fi.currentCashProfit),grand:true},
        {label:'Projected Profit',value:money(fi.projectedProfit+Number(variationTotal||0))}
      ]}/>
    </div>}
  </PrintPreviewLayout>;
}
