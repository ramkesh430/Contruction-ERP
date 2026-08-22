import { useEffect,useState } from 'react';import { useParams,Navigate } from 'react-router-dom';import { useAuth } from '../context/AuthContext';import api from '../services/api';import { money,fmtDate,todayStr } from '../utils/format';
import { PrintPreviewLayout,PrintCompanyHeader,PrintInfoCard,PrintTable,PrintFinancialSummary } from '../components/print';

export default function SupplierStatementPrint(){
  const {id}=useParams();
  const {user}=useAuth();
  const [data,setData]=useState(null);
  const [settings,setSettings]=useState(null);
  const [err,setErr]=useState('');

  useEffect(()=>{
    setData(null); setErr('');
    api.get(`/suppliers/${id}`).then(res=>setData(res.data)).catch(()=>setErr('Supplier not found'));
    api.get('/settings').then(res=>setSettings(res.data)).catch(()=>{});
  },[id]);

  if(!user) return <Navigate to="/login" replace/>;
  if(err) return <div className="loading">{err}</div>;
  if(!data) return <div className="loading">Loading statement...</div>;

  const {supplier:s,statement}=data;
  const closing=statement.at(-1)?.balance||0;

  return <PrintPreviewLayout orientation="landscape">
    <PrintCompanyHeader settings={settings} docLabel="SUPPLIER STATEMENT" docNumber={`As of ${fmtDate(todayStr())}`}/>

    <PrintInfoCard title="Supplier" rows={[
      <b>{s.name}</b>,
      s.address,
      `Phone: ${s.phone||'—'}`,
      `PAN/VAT: ${s.pan_vat_no||'—'}`
    ]}/>

    <div style={{marginTop:16}}>
      <PrintTable
        emptyText="No transactions recorded"
        columns={[
          {key:'date',label:'Date',render:r=>r.txn_date?fmtDate(r.txn_date):'—'},
          {key:'type',label:'Type'},
          {key:'ref',label:'Reference'},
          {key:'debit',label:'Debit',align:'right',render:r=>r.debit?money(r.debit):'—'},
          {key:'credit',label:'Credit',align:'right',render:r=>r.credit?money(r.credit):'—'},
          {key:'balance',label:'Balance',align:'right',render:r=>money(r.balance)}
        ]}
        rows={statement}
      />
    </div>

    <PrintFinancialSummary rows={[
      {label:'Closing Balance',value:money(closing),grand:true}
    ]}/>
  </PrintPreviewLayout>;
}
