import { useEffect,useState } from 'react';import { useParams,Navigate } from 'react-router-dom';import { useAuth } from '../context/AuthContext';import api from '../services/api';import { money,fmtDate } from '../utils/format';
import { PrintPreviewLayout,PrintCompanyHeader,PrintInfoGrid,PrintInfoCard,PrintTable,PrintFinancialSummary,PrintSignatureSection,PrintSection } from '../components/print';

export default function QuotationPrint(){
  const {id}=useParams();
  const {user}=useAuth();
  const [q,setQ]=useState(null);
  const [settings,setSettings]=useState(null);
  const [err,setErr]=useState('');

  useEffect(()=>{
    setQ(null); setErr('');
    api.get(`/quotations/${id}`).then(r=>setQ(r.data)).catch(()=>setErr('Quotation not found'));
    api.get('/settings').then(r=>setSettings(r.data)).catch(()=>{});
  },[id]);

  if(!user) return <Navigate to="/login" replace/>;
  if(err) return <div className="loading">{err}</div>;
  if(!q) return <div className="loading">Loading quotation...</div>;

  const items=q.items||[];
  const projectLine=q.project_name
    ? `${q.project_name}${q.project_location?` - ${q.project_location}`:''}`
    : (q.site_location||'N/A');

  return <PrintPreviewLayout>
    <PrintCompanyHeader settings={settings} docLabel="QUOTATION" docNumber={q.quotation_no} status={q.status}/>

    <PrintInfoGrid>
      <PrintInfoCard title="Client" rows={[
        <b>{q.client_name||'—'}</b>,
        q.client_address,
        `Phone: ${q.client_phone||'—'}`,
        `Client PAN/VAT: ${q.client_pan_vat||'—'}`,
        q.contact_person&&`Attn: ${q.contact_person}${q.contact_phone?` (${q.contact_phone})`:''}`
      ]}/>
      <PrintInfoCard title="Quotation Details" rows={[
        `Date: ${fmtDate(q.quotation_date)}`,
        `Valid Until: ${q.valid_until?fmtDate(q.valid_until):'N/A'}`,
        `Fiscal Year: ${q.fiscal_year_code||'—'}`,
        `Project/Site: ${projectLine}`,
        q.reference_no&&`Reference No: ${q.reference_no}`
      ]}/>
    </PrintInfoGrid>

    {(q.title||q.scope_of_work)&&<PrintSection title={q.title||'Subject'}>
      {q.scope_of_work&&<p>{q.scope_of_work}</p>}
    </PrintSection>}

    <PrintTable
      emptyText="No items"
      columns={[
        {key:'no',label:'#',render:(x,i)=>i+1},
        {key:'category',label:'Category',render:x=>x.category||'—'},
        {key:'description',label:'Description'},
        {key:'unit',label:'Unit'},
        {key:'quantity',label:'Qty',align:'right',render:x=>Number(x.quantity||0).toLocaleString('en-IN')},
        {key:'rate',label:'Rate',align:'right',render:x=>money(x.rate)},
        {key:'amount',label:'Amount',align:'right',render:x=>money(Number(x.quantity||0)*Number(x.rate||0))}
      ]}
      rows={items}
    />

    <PrintFinancialSummary rows={[
      {label:'Subtotal',value:money(q.subtotal)},
      {label:`Discount${q.discount_type==='Percentage'?` (${Number(q.discount_value||0)}%)`:''}`,value:'- '+money(q.discount)},
      {label:'Taxable Amount',value:money(q.taxable_amount)},
      {label:`VAT${q.vat_enabled?` (${Number(q.vat_rate||0)}%)`:' (Exempt)'}`,value:money(q.vat_amount)},
      {label:'Grand Total',value:money(q.grand_total),grand:true}
    ]}/>

    {q.payment_terms?.some(t=>t.milestone_name)&&<PrintSection title="Payment Terms">
      <table><thead><tr><th>Milestone</th><th style={{textAlign:'right'}}>%</th></tr></thead>
      <tbody>{q.payment_terms.filter(t=>t.milestone_name).map((t,i)=><tr key={i}><td>{t.milestone_name}</td><td style={{textAlign:'right'}}>{Number(t.percentage||0)}%</td></tr>)}</tbody></table>
    </PrintSection>}

    {q.terms_conditions&&<PrintSection title="Terms & Conditions"><p style={{whiteSpace:'pre-wrap'}}>{q.terms_conditions}</p></PrintSection>}
    {q.notes&&<PrintSection title="Notes / Exclusions"><p style={{whiteSpace:'pre-wrap'}}>{q.notes}</p></PrintSection>}

    <PrintSignatureSection settings={settings} columns={[
      {label:'Prepared By'},
      {label:'Authorized Signatory',showStampSign:true}
    ]}/>
  </PrintPreviewLayout>;
}
