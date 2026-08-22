import { useEffect,useState } from 'react';import { useParams,Navigate } from 'react-router-dom';import { useAuth } from '../context/AuthContext';import api from '../services/api';import { money,fmtDate } from '../utils/format';
import { PrintPreviewLayout,PrintCompanyHeader,PrintInfoCard,PrintFinancialSummary,PrintSignatureSection } from '../components/print';

export default function PaymentReceiptPrint(){
  const {id}=useParams();
  const {user}=useAuth();
  const [r,setR]=useState(null);
  const [settings,setSettings]=useState(null);
  const [err,setErr]=useState('');

  useEffect(()=>{
    setR(null); setErr('');
    api.get(`/payments/${id}`).then(res=>setR(res.data)).catch(()=>setErr('Payment not found'));
    api.get('/settings').then(res=>setSettings(res.data)).catch(()=>{});
  },[id]);

  if(!user) return <Navigate to="/login" replace/>;
  if(err) return <div className="loading">{err}</div>;
  if(!r) return <div className="loading">Loading receipt...</div>;

  return <PrintPreviewLayout>
    <PrintCompanyHeader settings={settings} docLabel="PAYMENT RECEIPT" docNumber={r.receipt_no} status={r.status}/>

    <PrintInfoCard title="Receipt Details" rows={[
      `Date: ${fmtDate(r.payment_date)}`,
      `Client: ${r.client_name||'—'}`,
      `Project: ${r.project_name||'—'}`,
      `Against Invoice: ${r.invoice_no||'—'}`,
      `Payment Mode: ${r.payment_method||'—'}`,
      `Reference No: ${r.reference_no||'—'}`,
      `Fiscal Year: ${r.fiscal_year_code||'—'}`
    ]}/>

    <div style={{marginTop:16}}>
      <PrintFinancialSummary rows={[
        {label:'Amount Received',value:money(r.amount),grand:true}
      ]}/>
    </div>

    {r.remarks&&<div className="pv-section"><h3>Remarks</h3><p>{r.remarks}</p></div>}

    <PrintSignatureSection settings={settings} columns={[
      {label:'Received By'},
      {label:'Authorized Signatory',showStampSign:true}
    ]}/>
  </PrintPreviewLayout>;
}
