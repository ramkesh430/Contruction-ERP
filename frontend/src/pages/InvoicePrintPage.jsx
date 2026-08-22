import { useEffect,useState } from 'react';import { useParams,Navigate } from 'react-router-dom';import { useAuth } from '../context/AuthContext';import api from '../services/api';import { money,fmtDate } from '../utils/format';import { fileUrl } from '../utils/letterhead';
import { PrintPreviewLayout,PrintCompanyHeader,PrintInfoGrid,PrintInfoCard,PrintTable,PrintFinancialSummary,PrintSignatureSection,PrintSection } from '../components/print';

const DEFAULT_TERMS=`1. Payment should be made according to agreed terms.
2. VAT is applicable as mentioned above.
3. Additional work will be billed separately.`;

export default function InvoicePrintPage(){
  const {id}=useParams();
  const {user}=useAuth();
  const [inv,setInv]=useState(null);
  const [settings,setSettings]=useState(null);
  const [err,setErr]=useState('');

  useEffect(()=>{
    setInv(null); setErr('');
    api.get(`/invoices/${id}`).then(r=>setInv(r.data)).catch(()=>setErr('Invoice not found'));
    api.get('/settings').then(r=>setSettings(r.data)).catch(()=>{});
  },[id]);

  if(!user) return <Navigate to="/login" replace/>;
  if(err) return <div className="loading">{err}</div>;
  if(!inv) return <div className="loading">Loading invoice...</div>;

  const items=inv.items||[];
  const projectLine=inv.project_name
    ? `${inv.project_name}${inv.project_location?` - ${inv.project_location}`:''}`
    : 'N/A';
  const retention=Number(inv.grand_total||0)*Number(inv.retention_percentage||0)/100;
  const hasBank=settings?.bank_name||settings?.bank_account_name||settings?.bank_account_no||settings?.bank_branch||settings?.qr_code;

  return <PrintPreviewLayout>
    <PrintCompanyHeader settings={settings} docLabel="INVOICE" docNumber={inv.invoice_no} status={inv.effective_status||inv.status}/>

    <PrintInfoGrid>
      <PrintInfoCard title="Client" rows={[
        <b>{inv.client_name||'—'}</b>,
        inv.client_address,
        `Phone: ${inv.client_phone||'—'}`,
        `PAN/VAT: ${inv.client_pan_vat||'—'}`
      ]}/>
      <PrintInfoCard title="Invoice Details" rows={[
        `Invoice Date: ${fmtDate(inv.invoice_date)}`,
        `Due Date: ${inv.due_date?fmtDate(inv.due_date):'N/A'}`,
        `Fiscal Year: ${inv.fiscal_year_code||'—'}`,
        `Project/Site: ${projectLine}`
      ]}/>
    </PrintInfoGrid>

    <PrintTable
      emptyText="No items"
      columns={[
        {key:'no',label:'#',render:(x,i)=>i+1},
        {key:'description',label:'Description'},
        {key:'unit',label:'Unit',render:x=>x.unit||'—'},
        {key:'quantity',label:'Qty',align:'right',render:x=>Number(x.quantity||0).toLocaleString('en-IN')},
        {key:'rate',label:'Rate',align:'right',render:x=>money(x.rate)},
        {key:'amount',label:'Amount',align:'right',render:x=>money(x.amount)}
      ]}
      rows={items}
    />

    <PrintFinancialSummary rows={[
      {label:'Subtotal',value:money(inv.subtotal)},
      {label:'Discount',value:'- '+money(inv.discount)},
      {label:'Taxable Amount',value:money(inv.taxable_amount)},
      {label:`VAT (${Number(inv.vat_rate||0)}%)`,value:money(inv.vat_amount)},
      retention>0&&{label:`Retention (${Number(inv.retention_percentage||0)}%)`,value:'- '+money(retention)},
      {label:'Grand Total',value:money(inv.grand_total),grand:true},
      {label:'Paid',value:money(inv.paid_amount)},
      {label:'Due',value:money(inv.due_amount)}
    ]}/>

    {hasBank&&<PrintSection title="Payment Details">
      <div className="pv-pay-grid">
        <div>Bank: <b>{settings?.bank_name||'—'}</b></div>
        <div>Account Name: <b>{settings?.bank_account_name||'—'}</b></div>
        <div>Account No: <b>{settings?.bank_account_no||'—'}</b></div>
        <div>Branch: <b>{settings?.bank_branch||'—'}</b></div>
        <div>Payment Terms: <b>{inv.client_payment_terms||'As agreed'}</b></div>
        <div>Due Date: <b>{inv.due_date?fmtDate(inv.due_date):'N/A'}</b></div>
      </div>
      {settings?.qr_code&&<img src={fileUrl(settings.qr_code)} alt="Payment QR" className="pv-qr"/>}
    </PrintSection>}

    <PrintSection title="Terms & Conditions">
      <p style={{whiteSpace:'pre-wrap'}}>{settings?.invoice_terms||DEFAULT_TERMS}</p>
    </PrintSection>

    <PrintSignatureSection settings={settings} columns={[
      {label:'Prepared By'},
      {label:'Authorized Signatory',showStampSign:true}
    ]}/>
  </PrintPreviewLayout>;
}
