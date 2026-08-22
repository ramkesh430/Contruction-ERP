import { useEffect,useState } from 'react';import api from '../services/api';import DataTable from '../components/DataTable';import { fmtDate,todayStr } from '../utils/format';import { Building2 } from 'lucide-react';

const API_ROOT=(api.defaults.baseURL||'').replace(/\/api\/?$/,'');
const fileUrl=p=>p?`${API_ROOT}${p}`:'';

export default function SettingsPage(){
  const [section,setSection]=useState('company');
  const [f,setF]=useState({}),[msg,setMsg]=useState('');
  const [logoFile,setLogoFile]=useState(null),[logoErr,setLogoErr]=useState('');
  const [stampFile,setStampFile]=useState(null),[stampErr,setStampErr]=useState('');
  const [signatureFile,setSignatureFile]=useState(null),[signatureErr,setSignatureErr]=useState('');
  const [qrFile,setQrFile]=useState(null),[qrErr,setQrErr]=useState('');
  const [years,setYears]=useState([]),[yearForm,setYearForm]=useState({code:'',name:'',start_date:'',end_date:''}),[yearErr,setYearErr]=useState('');

  const load=()=>api.get('/settings').then(r=>setF(r.data||{}));
  const loadYears=()=>api.get('/fiscal-years').then(r=>setYears(r.data));
  useEffect(()=>{load();loadYears()},[]);

  async function save(e){ e.preventDefault(); await api.put('/settings',f); setMsg('Settings saved successfully'); setTimeout(()=>setMsg(''),3000); }

  async function uploadLogo(e){
    e.preventDefault(); if(!logoFile)return; setLogoErr('');
    try{ const fd=new FormData(); fd.append('file',logoFile); const {data}=await api.post('/settings/logo',fd); setF({...f,logo:data.logo}); setLogoFile(null); }
    catch(e){ setLogoErr(e.response?.data?.message||'Upload failed'); }
  }

  async function uploadStamp(e){
    e.preventDefault(); if(!stampFile)return; setStampErr('');
    try{ const fd=new FormData(); fd.append('file',stampFile); const {data}=await api.post('/settings/stamp',fd); setF({...f,stamp_file:data.stamp_file}); setStampFile(null); }
    catch(e){ setStampErr(e.response?.data?.message||'Upload failed'); }
  }

  async function uploadSignature(e){
    e.preventDefault(); if(!signatureFile)return; setSignatureErr('');
    try{ const fd=new FormData(); fd.append('file',signatureFile); const {data}=await api.post('/settings/signature',fd); setF({...f,signature_file:data.signature_file}); setSignatureFile(null); }
    catch(e){ setSignatureErr(e.response?.data?.message||'Upload failed'); }
  }

  async function uploadQr(e){
    e.preventDefault(); if(!qrFile)return; setQrErr('');
    try{ const fd=new FormData(); fd.append('file',qrFile); const {data}=await api.post('/settings/qr',fd); setF({...f,qr_code:data.qr_code}); setQrFile(null); }
    catch(e){ setQrErr(e.response?.data?.message||'Upload failed'); }
  }

  async function addYear(e){
    e.preventDefault(); setYearErr('');
    try{ await api.post('/fiscal-years',yearForm); setYearForm({code:'',name:'',start_date:'',end_date:''}); loadYears(); }
    catch(e){ setYearErr(e.response?.data?.message||'Could not add fiscal year'); }
  }
  async function setCurrent(y){ if(!confirm(`Set ${y.name||y.code} as the current fiscal year?`))return; await api.post(`/fiscal-years/${y.id}/set-current`); loadYears(); }

  return <>
    <div className="page-head"><div><h1>Settings</h1><p>Company branding, VAT/tax defaults, numbering sequences and fiscal years.</p></div></div>
    <div className="tabs">
      <button className={`tab ${section==='company'?'active':''}`} onClick={()=>setSection('company')}>Company &amp; Branding</button>
      <button className={`tab ${section==='tax'?'active':''}`} onClick={()=>setSection('tax')}>Tax &amp; Numbering</button>
      <button className={`tab ${section==='invoicing'?'active':''}`} onClick={()=>setSection('invoicing')}>Invoicing</button>
      <button className={`tab ${section==='fiscal'?'active':''}`} onClick={()=>setSection('fiscal')}>Fiscal Years</button>
    </div>

    {section==='company'&&<div className="panel settings-panel">
      {msg&&<div className="alert success">{msg}</div>}
      <form className="form-grid" onSubmit={save}>
        <label>Company Name<input value={f.name||''} onChange={e=>setF({...f,name:e.target.value})}/></label>
        <label>PAN / VAT No.<input value={f.pan_vat_no||''} onChange={e=>setF({...f,pan_vat_no:e.target.value})}/></label>
        <label>Phone<input value={f.phone||''} onChange={e=>setF({...f,phone:e.target.value})}/></label>
        <label>Email<input value={f.email||''} onChange={e=>setF({...f,email:e.target.value})}/></label>
        <label className="full">Address<input value={f.address||''} onChange={e=>setF({...f,address:e.target.value})}/></label>
        <div className="form-actions full"><button className="btn primary">Save Company Info</button></div>
      </form>
      <h3 style={{marginTop:22}}>Logo</h3>
      {logoErr&&<div className="alert danger">{logoErr}</div>}
      <div style={{display:'flex',alignItems:'center',gap:18,flexWrap:'wrap'}}>
        {f.logo?<img src={fileUrl(f.logo)} alt="Company logo" style={{height:64,borderRadius:8,border:'1px solid #e4e9f0'}}/>:<div style={{height:64,width:64,borderRadius:8,background:'#f1f5f9',display:'grid',placeItems:'center',color:'#94a3b8'}}><Building2 size={26}/></div>}
        <form onSubmit={uploadLogo} style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap',minWidth:0}}>
          <input type="file" accept="image/*" onChange={e=>setLogoFile(e.target.files[0])}/>
          <button className="btn primary" type="submit">Upload Logo</button>
        </form>
      </div>
      <p style={{fontSize:12,color:'#94a3b8',marginTop:10}}>This logo appears on Quotation/BOQ PDFs and printed documents.</p>

      <h3 style={{marginTop:22}}>Authorized Signature</h3>
      {signatureErr&&<div className="alert danger">{signatureErr}</div>}
      <div style={{display:'flex',alignItems:'center',gap:18,flexWrap:'wrap'}}>
        {f.signature_file?<img src={fileUrl(f.signature_file)} alt="Signature" style={{height:64,borderRadius:8,border:'1px solid #e4e9f0'}}/>:<div style={{height:64,width:64,borderRadius:8,background:'#f1f5f9',display:'grid',placeItems:'center',color:'#94a3b8',fontSize:11}}>None</div>}
        <form onSubmit={uploadSignature} style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap',minWidth:0}}>
          <input type="file" accept="image/*" onChange={e=>setSignatureFile(e.target.files[0])}/>
          <button className="btn primary" type="submit">Upload Signature</button>
        </form>
      </div>
      <p style={{fontSize:12,color:'#94a3b8',marginTop:10}}>Appears in the signature block of printed Quotation/BOQ documents.</p>

      <h3 style={{marginTop:22}}>Company Stamp</h3>
      {stampErr&&<div className="alert danger">{stampErr}</div>}
      <div style={{display:'flex',alignItems:'center',gap:18,flexWrap:'wrap'}}>
        {f.stamp_file?<img src={fileUrl(f.stamp_file)} alt="Stamp" style={{height:64,borderRadius:8,border:'1px solid #e4e9f0'}}/>:<div style={{height:64,width:64,borderRadius:8,background:'#f1f5f9',display:'grid',placeItems:'center',color:'#94a3b8',fontSize:11}}>None</div>}
        <form onSubmit={uploadStamp} style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap',minWidth:0}}>
          <input type="file" accept="image/*" onChange={e=>setStampFile(e.target.files[0])}/>
          <button className="btn primary" type="submit">Upload Stamp</button>
        </form>
      </div>
      <p style={{fontSize:12,color:'#94a3b8',marginTop:10}}>Appears alongside the signature on printed Quotation/BOQ documents.</p>
    </div>}

    {section==='tax'&&<div className="panel settings-panel">
      {msg&&<div className="alert success">{msg}</div>}
      <form className="form-grid" onSubmit={save}>
        <label>VAT Enabled<select value={f.vat_enabled?'1':'0'} onChange={e=>setF({...f,vat_enabled:e.target.value==='1'})}><option value="1">Enabled</option><option value="0">Disabled</option></select></label>
        <label>VAT Rate %<input type="number" value={f.vat_rate??13} onChange={e=>setF({...f,vat_rate:e.target.value})}/></label>
        <label>Currency<input value={f.currency||'NPR'} onChange={e=>setF({...f,currency:e.target.value})}/></label>
        <label>Invoice Prefix<input value={f.invoice_prefix||'INV'} onChange={e=>setF({...f,invoice_prefix:e.target.value})}/></label>
        <label>Quotation Prefix<input value={f.quotation_prefix||'QT'} onChange={e=>setF({...f,quotation_prefix:e.target.value})}/></label>
        <label>Project Prefix<input value={f.project_prefix||'PRJ'} onChange={e=>setF({...f,project_prefix:e.target.value})}/></label>
        <label>Receipt Prefix<input value={f.receipt_prefix||'RCPT'} onChange={e=>setF({...f,receipt_prefix:e.target.value})}/></label>
        <div className="form-actions full"><button className="btn primary">Save Tax &amp; Numbering</button></div>
      </form>
    </div>}

    {section==='invoicing'&&<div className="panel settings-panel">
      {msg&&<div className="alert success">{msg}</div>}
      <h3 style={{marginTop:0}}>Bank Details</h3>
      <p style={{fontSize:12,color:'#94a3b8',marginTop:-6,marginBottom:14}}>Shown in the Payment Details section of printed invoices.</p>
      <form className="form-grid" onSubmit={save}>
        <label>Bank Name<input value={f.bank_name||''} onChange={e=>setF({...f,bank_name:e.target.value})}/></label>
        <label>Account Name<input value={f.bank_account_name||''} onChange={e=>setF({...f,bank_account_name:e.target.value})}/></label>
        <label>Account No.<input value={f.bank_account_no||''} onChange={e=>setF({...f,bank_account_no:e.target.value})}/></label>
        <label>Branch<input value={f.bank_branch||''} onChange={e=>setF({...f,bank_branch:e.target.value})}/></label>
        <label className="full">Invoice Terms &amp; Conditions<textarea className="qf-terms" placeholder="Default terms shown on every printed invoice" value={f.invoice_terms||''} onChange={e=>setF({...f,invoice_terms:e.target.value})}/></label>
        <div className="form-actions full"><button className="btn primary">Save Invoicing Settings</button></div>
      </form>
      <h3 style={{marginTop:22}}>Payment QR Code</h3>
      {qrErr&&<div className="alert danger">{qrErr}</div>}
      <div style={{display:'flex',alignItems:'center',gap:18,flexWrap:'wrap'}}>
        {f.qr_code?<img src={fileUrl(f.qr_code)} alt="Payment QR" style={{height:80,width:80,objectFit:'contain',borderRadius:8,border:'1px solid #e4e9f0'}}/>:<div style={{height:64,width:64,borderRadius:8,background:'#f1f5f9',display:'grid',placeItems:'center',color:'#94a3b8',fontSize:11}}>None</div>}
        <form onSubmit={uploadQr} style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap',minWidth:0}}>
          <input type="file" accept="image/*" onChange={e=>setQrFile(e.target.files[0])}/>
          <button className="btn primary" type="submit">Upload QR</button>
        </form>
      </div>
      <p style={{fontSize:12,color:'#94a3b8',marginTop:10}}>Appears in the Payment Details section of printed invoices, next to the bank details.</p>
    </div>}

    {section==='fiscal'&&<>
      <div className="panel settings-panel" style={{marginBottom:16}}>
        <h3>Add Fiscal Year</h3>
        {yearErr&&<div className="alert danger">{yearErr}</div>}
        <form className="form-grid" onSubmit={addYear}>
          <label>Code<input required placeholder="e.g. 2084-85" value={yearForm.code} onChange={e=>setYearForm({...yearForm,code:e.target.value})}/></label>
          <label>Name<input placeholder="e.g. FY 2084/85" value={yearForm.name} onChange={e=>setYearForm({...yearForm,name:e.target.value})}/></label>
          <label>Start Date<input type="date" value={yearForm.start_date} onChange={e=>setYearForm({...yearForm,start_date:e.target.value})}/></label>
          <label>End Date<input type="date" value={yearForm.end_date} onChange={e=>setYearForm({...yearForm,end_date:e.target.value})}/></label>
          <div className="form-actions full"><button className="btn primary">+ Add Fiscal Year</button></div>
        </form>
      </div>
      <div className="panel">
        <h3>Fiscal Years</h3>
        <DataTable rows={years} empty="No fiscal years configured yet" columns={[
          {key:'code',label:'Code'},{key:'name',label:'Name',render:r=>r.name||'—'},
          {key:'start_date',label:'Start',render:r=>fmtDate(r.start_date)},{key:'end_date',label:'End',render:r=>fmtDate(r.end_date)},
          {key:'is_current',label:'Status',render:r=>r.is_current?<span className="badge approved">Current</span>:<span className="badge">Inactive</span>},
          {key:'_actions',label:'Action',render:r=>!r.is_current&&<button className="btn small" onClick={()=>setCurrent(r)}>Set as Current</button>}
        ]}/>
      </div>
    </>}
  </>
}
