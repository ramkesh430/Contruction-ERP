import { useEffect,useState } from 'react';import { useParams,Navigate } from 'react-router-dom';import { useAuth } from '../context/AuthContext';import api from '../services/api';import { money,fmtDate } from '../utils/format';
import { PrintPreviewLayout,PrintCompanyHeader,PrintInfoCard,PrintFinancialSummary,PrintSignatureSection } from '../components/print';

export default function SupplierReceiptPrint(){
  const {id}=useParams();
  const {user}=useAuth();
  const [r,setR]=useState(null);
  const [settings,setSettings]=useState(null);
  const [err,setErr]=useState('');

  useEffect(()=>{
    setR(null); setErr('');
    api.get(`/supplier-payments/${id}`).then(res=>setR(res.data)).catch(()=>setErr('Payment not found'));
    api.get('/settings').then(res=>setSettings(res.data)).catch(()=>{});
  },[id]);

  if(!user) return <Navigate to="/login" replace/>;
  if(err) return <div className="loading">{err}</div>;
  if(!r) return <div className="loading">Loading receipt...</div>;

  return <PrintPreviewLayout>
    <PrintCompanyHeader settings={settings} docLabel="SUPPLIER PAYMENT RECEIPT" docNumber={`SP-${String(r.id).padStart(5,'0')}`}/>

    <PrintInfoCard title="Receipt Details" rows={[
      `Date: ${fmtDate(r.payment_date)}`,
      `Supplier: ${r.supplier_name||'—'}`,
      `Supplier PAN/VAT: ${r.supplier_pan_vat||'—'}`,
      `Project: ${r.project_name||'General'}`,
      `Against Purchase: ${r.purchase_no||'—'}`,
      `Payment Mode: ${r.payment_method||'—'}`,
      `Reference No: ${r.reference_no||'—'}`
    ]}/>

    <div style={{marginTop:16}}>
      <PrintFinancialSummary rows={[
        {label:'Amount Paid',value:money(r.amount),grand:true}
      ]}/>
    </div>

    {r.remarks&&<div className="pv-section"><h3>Remarks</h3><p>{r.remarks}</p></div>}

    <PrintSignatureSection settings={settings} columns={[
      {label:'Paid By'},
      {label:'Authorized Signatory',showStampSign:true}
    ]}/>
  </PrintPreviewLayout>;
}
