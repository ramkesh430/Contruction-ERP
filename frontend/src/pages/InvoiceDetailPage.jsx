import { useEffect,useState } from 'react';import { useParams,useNavigate } from 'react-router-dom';import api from '../services/api';import Modal from '../components/Modal';import DataTable from '../components/DataTable';import { money,fmtDate,todayStr } from '../utils/format';import { Printer,ArrowLeft } from 'lucide-react';

export default function InvoiceDetailPage(){
  const {id}=useParams(); const nav=useNavigate();
  const [inv,setInv]=useState(null);
  const [payOpen,setPayOpen]=useState(false),[payForm,setPayForm]=useState({payment_method:'Cash',payment_date:todayStr(),amount:''});

  const load=()=>api.get(`/invoices/${id}`).then(r=>setInv(r.data));
  useEffect(()=>{load()},[id]);

  if(!inv)return <div className="loading">Loading invoice...</div>;

  function openPay(){ setPayForm({payment_method:'Cash',payment_date:todayStr(),amount:String(inv.due_amount)}); setPayOpen(true); }
  async function savePay(e){
    e.preventDefault();
    await api.post('/payments',{...payForm,invoice_id:id,client_id:inv.client_id,project_id:inv.project_id});
    setPayOpen(false); load();
  }

  const badgeClass=inv.effective_status.toLowerCase().replaceAll(' ','-');

  return <>
    <div className="page-head"><div><h1>Invoice {inv.invoice_no}</h1><p>Invoices / {inv.client_name||'—'}</p></div>
      <div className="row-actions">
        <button className="btn" onClick={()=>window.open(`/invoices/${id}/print`,'_blank')}><Printer size={15}/>Print / PDF</button>
        {Number(inv.due_amount)>0&&<button className="btn primary" onClick={openPay}>+ Record Payment</button>}
        <button className="btn" onClick={()=>nav('/invoices')}><ArrowLeft size={15}/>Back to Invoices</button>
      </div>
    </div>

    <div className="progress-layout">
      <div className="panel">
        <h3>Invoice Info</h3>
        <div className="info-list">
          <div className="row"><span>Client</span><b>{inv.client_name||'—'}</b></div>
          <div className="row"><span>Project</span><b>{inv.project_name||'—'}</b></div>
          <div className="row"><span>Invoice Date</span><b>{fmtDate(inv.invoice_date)}</b></div>
          <div className="row"><span>Due Date</span><b>{fmtDate(inv.due_date)}</b></div>
          <div className="row"><span>PAN / VAT</span><b>{inv.pan_vat_no||inv.client_pan_vat||'—'}</b></div>
          <div className="row"><span>Status</span><b><span className={`badge ${badgeClass}`}>{inv.effective_status}</span></b></div>
        </div>
      </div>
      <div className="panel">
        <h3>Amount Summary</h3>
        <div className="info-list">
          <div className="row"><span>Subtotal</span><b>{money(inv.subtotal)}</b></div>
          <div className="row"><span>Discount</span><b>{money(inv.discount)}</b></div>
          <div className="row"><span>Taxable Amount</span><b>{money(inv.taxable_amount)}</b></div>
          <div className="row"><span>VAT ({Number(inv.vat_rate)}%)</span><b>{money(inv.vat_amount)}</b></div>
          <div className="row"><span>Grand Total</span><b>{money(inv.grand_total)}</b></div>
          <div className="row"><span>Paid</span><b>{money(inv.paid_amount)}</b></div>
        </div>
        <div className={`profit-banner ${Number(inv.due_amount)>0?'negative':''}`} style={{marginTop:14}}><span>Due Amount</span><b>{money(inv.due_amount)}</b></div>
      </div>
    </div>

    <div className="panel" style={{marginTop:16}}>
      <h3>Line Items</h3>
      <DataTable rows={inv.items} columns={[
        {key:'description',label:'Description'},{key:'unit',label:'Unit'},{key:'quantity',label:'Qty'},
        {key:'rate',label:'Rate',render:r=>money(r.rate)},{key:'amount',label:'Amount',render:r=>money(r.amount)}
      ]}/>
    </div>

    <div className="panel" style={{marginTop:16}}>
      <h3>Payment History</h3>
      <DataTable rows={inv.payments} empty="No payments recorded against this invoice yet" columns={[
        {key:'receipt_no',label:'Receipt No.'},{key:'payment_date',label:'Date',render:r=>fmtDate(r.payment_date)},
        {key:'amount',label:'Amount',render:r=>money(r.amount)},{key:'payment_method',label:'Method'},
        {key:'status',label:'Status',render:r=><span className={`badge ${r.status?.toLowerCase()}`}>{r.status}</span>}
      ]}/>
    </div>

    <Modal open={payOpen} title="Record Payment" onClose={()=>setPayOpen(false)}>
      <form className="form-grid" onSubmit={savePay}>
        <div className="full" style={{fontSize:12,color:'#64748b'}}>Against invoice {inv.invoice_no} · Due {money(inv.due_amount)}</div>
        <label>Amount<input type="number" step="0.01" required value={payForm.amount} onChange={e=>setPayForm({...payForm,amount:e.target.value})}/></label>
        <label>Payment Date<input type="date" value={payForm.payment_date} onChange={e=>setPayForm({...payForm,payment_date:e.target.value})}/></label>
        <label>Payment Method<select value={payForm.payment_method} onChange={e=>setPayForm({...payForm,payment_method:e.target.value})}>{['Cash','Bank Transfer','Cheque','Card','Digital Wallet'].map(x=><option key={x}>{x}</option>)}</select></label>
        <label>Reference No.<input value={payForm.reference_no||''} onChange={e=>setPayForm({...payForm,reference_no:e.target.value})}/></label>
        <div className="form-actions full"><button type="button" className="btn" onClick={()=>setPayOpen(false)}>Cancel</button><button className="btn primary">Save Payment</button></div>
      </form>
    </Modal>
  </>
}
