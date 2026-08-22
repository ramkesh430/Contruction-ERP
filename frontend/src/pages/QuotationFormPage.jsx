import { useEffect,useState } from 'react';import { useParams,useNavigate } from 'react-router-dom';import api from '../services/api';import { money,fmtDate,todayStr } from '../utils/format';import { computeQuotationTotals,openQuotationPdf } from '../utils/quotationPdf';import { ArrowUp,ArrowDown,Copy,Plus,Trash2,Eye,ArrowLeft } from 'lucide-react';

const UNITS=['Sq.ft','Sq.m','Cft','Cum','Kg','Ton','Bag','Piece','Rft','Meter','Liter','Job','LS'];
const CATEGORIES=['Site Work','Earth Work','RCC','Masonry','Plaster','Flooring','Painting','Plumbing','Electrical','Roofing','Aluminium','Misc.'];
const DEFAULT_TERMS=`1. Payment Terms: As per the payment schedule below. Each milestone must be settled within 7 days of invoicing.
2. Quotation Validity: This quotation is valid for 30 days from the date of issue unless otherwise stated.
3. Material Responsibility: Materials are supplied by the contractor unless otherwise specified. Client-supplied materials must meet agreed specifications.
4. Work Completion: Timeline will be shared on project commencement and is subject to site conditions and material availability.
5. Taxes: Prices are exclusive of VAT unless stated otherwise. Applicable government taxes apply at prevailing rates.
6. Warranty: Structural work carries a 1-year workmanship warranty from handover, excluding damage from misuse or natural disaster.
7. Exclusions: Any work not explicitly listed in the BOQ above is excluded and will be charged separately.`;

const blankItem=()=>({category:'',description:'',unit:'Sq.ft',quantity:1,rate:0});
const defaultPaymentTerms=()=>[{milestone_name:'Advance',percentage:30},{milestone_name:'Foundation',percentage:20},{milestone_name:'Structure',percentage:25},{milestone_name:'Finishing',percentage:20},{milestone_name:'Handover',percentage:5}];
const initialForm=()=>({
  client_id:'',project_id:'',quotation_date:todayStr(),valid_until:'',status:'Draft',
  site_location:'',contact_person:'',contact_phone:'',title:'',reference_no:'',scope_of_work:'',
  discount_type:'Fixed',discount_value:0,vat_enabled:true,vat_rate:13,
  items:[blankItem()],payment_terms:defaultPaymentTerms(),terms_conditions:DEFAULT_TERMS,notes:''
});

export default function QuotationFormPage(){
  const {id}=useParams(); const nav=useNavigate(); const isEdit=!!id;
  const [settings,setSettings]=useState(null),[clients,setClients]=useState([]),[projects,setProjects]=useState([]);
  const [existing,setExisting]=useState(null);
  const [f,setF]=useState(initialForm());
  const [ready,setReady]=useState(!isEdit);
  const [saving,setSaving]=useState(''),[err,setErr]=useState('');
  const [attachments,setAttachments]=useState([]),[attFile,setAttFile]=useState(null);

  useEffect(()=>{
    api.get('/settings').then(r=>{ setSettings(r.data); if(!isEdit) setF(p=>({...p,vat_rate:Number(r.data.vat_rate??13),vat_enabled:!!r.data.vat_enabled})); });
    api.get('/clients').then(r=>setClients(r.data));
    api.get('/projects').then(r=>setProjects(r.data));
  },[]);

  useEffect(()=>{
    if(!isEdit)return;
    api.get(`/quotations/${id}`).then(r=>{
      const d=r.data; setExisting(d);
      setF({
        client_id:d.client_id||'',project_id:d.project_id||'',quotation_date:d.quotation_date?String(d.quotation_date).slice(0,10):todayStr(),
        valid_until:d.valid_until?String(d.valid_until).slice(0,10):'',status:d.status,
        site_location:d.site_location||'',contact_person:d.contact_person||'',contact_phone:d.contact_phone||'',
        title:d.title||'',reference_no:d.reference_no||'',scope_of_work:d.scope_of_work||'',
        discount_type:d.discount_type||'Fixed',discount_value:Number(d.discount_value||0),
        vat_enabled:!!d.vat_enabled,vat_rate:Number(d.vat_rate||13),
        items:d.items?.length?d.items.map(x=>({category:x.category||'',description:x.description,unit:x.unit||'Sq.ft',quantity:Number(x.quantity),rate:Number(x.rate)})):[blankItem()],
        payment_terms:d.payment_terms?.length?d.payment_terms.map(t=>({milestone_name:t.milestone_name,percentage:Number(t.percentage)})):defaultPaymentTerms(),
        terms_conditions:d.terms_conditions||DEFAULT_TERMS,notes:d.notes||''
      });
      setReady(true);
      loadAttachments();
    });
  },[id]);

  function loadAttachments(){ if(isEdit) api.get(`/quotations/${id}/attachments`).then(r=>setAttachments(r.data)); }

  const updItem=(i,k,v)=>setF({...f,items:f.items.map((x,n)=>n===i?{...x,[k]:v}:x)});
  const dupItem=i=>setF({...f,items:[...f.items.slice(0,i+1),{...f.items[i]},...f.items.slice(i+1)]});
  const delItem=i=>setF({...f,items:f.items.length>1?f.items.filter((_,n)=>n!==i):f.items});
  const moveItem=(i,dir)=>setF(p=>{const items=[...p.items];const j=i+dir;if(j<0||j>=items.length)return p;[items[i],items[j]]=[items[j],items[i]];return{...p,items}});
  const addBelow=i=>setF({...f,items:[...f.items.slice(0,i+1),blankItem(),...f.items.slice(i+1)]});

  const updTerm=(i,k,v)=>setF({...f,payment_terms:f.payment_terms.map((x,n)=>n===i?{...x,[k]:v}:x)});
  const addTerm=()=>setF({...f,payment_terms:[...f.payment_terms,{milestone_name:'',percentage:0}]});
  const delTerm=i=>setF({...f,payment_terms:f.payment_terms.filter((_,n)=>n!==i)});

  const totals=computeQuotationTotals(f.items,f);
  const termsSum=f.payment_terms.reduce((s,t)=>s+Number(t.percentage||0),0);

  function enrichForPdf(){
    const client=clients.find(c=>String(c.id)===String(f.client_id));
    const project=projects.find(p=>String(p.id)===String(f.project_id));
    return {...f,quotation_no:existing?.quotation_no,fiscal_year_code:existing?.fiscal_year_code,
      client_name:client?.name,client_phone:client?.phone,client_address:client?.address,client_pan_vat:client?.pan_vat_no,
      project_name:project?.project_name};
  }

  async function persist(statusOverride){
    setErr('');
    const payload={...f,status:statusOverride||f.status};
    if(isEdit) return (await api.put(`/quotations/${id}`,payload)).data;
    return (await api.post('/quotations',payload)).data;
  }
  async function saveDraft(){ setSaving('draft'); try{ await persist('Draft'); nav('/quotations'); }catch(e){ setErr(e.response?.data?.message||'Save failed'); } finally{ setSaving(''); } }
  async function saveAndSend(){ setSaving('send'); try{ await persist('Sent'); nav('/quotations'); }catch(e){ setErr(e.response?.data?.message||'Save failed'); } finally{ setSaving(''); } }
  async function saveAndPreview(){
    setSaving('preview');
    try{
      const result=await persist();
      const rid=result.id||id;
      window.open(`/quotations/${rid}/print`,'_blank');
      if(!isEdit) nav(`/quotations/${rid}/edit`,{replace:true});
    }catch(e){ setErr(e.response?.data?.message||'Save failed'); } finally{ setSaving(''); }
  }
  function previewNow(){ openQuotationPdf(enrichForPdf(),settings); }

  async function uploadAttachment(){
    if(!attFile)return;
    const fd=new FormData(); fd.append('file',attFile);
    await api.post(`/quotations/${id}/attachments`,fd);
    setAttFile(null); loadAttachments();
  }
  async function removeAttachment(attId){ if(!confirm('Delete this attachment?'))return; await api.delete(`/quotations/${id}/attachments/${attId}`); loadAttachments(); }
  const API_ROOT=(api.defaults.baseURL||'').replace(/\/api\/?$/,'');

  if(!ready) return <div className="loading">Loading quotation...</div>;

  return <>
    <div className="page-head">
      <div><h1>{isEdit?`Edit Quotation ${existing?.quotation_no||''}`:'New Quotation / BOQ'}</h1><p>Build a professional item-wise estimate with live totals.</p></div>
      <button className="btn" onClick={()=>nav('/quotations')}><ArrowLeft size={15}/>Back to List</button>
    </div>
    {err&&<div className="alert danger">{err}</div>}

    <div className="panel qf-section">
      <h3>Quotation Information</h3>
      <div className="form-grid">
        <label>Quotation No.<input disabled value={existing?.quotation_no||'Auto-generated on save'}/></label>
        <label>Fiscal Year<input disabled value={existing?.fiscal_year_code||'Current FY (auto)'}/></label>
        <label>Quotation Date<input type="date" value={f.quotation_date} onChange={e=>setF({...f,quotation_date:e.target.value})}/></label>
        <label>Valid Until<input type="date" required value={f.valid_until} onChange={e=>setF({...f,valid_until:e.target.value})}/></label>
        <label>Status<select value={f.status} onChange={e=>setF({...f,status:e.target.value})}>{['Draft','Sent','Approved','Rejected','Expired'].map(s=><option key={s}>{s}</option>)}</select></label>
      </div>
    </div>

    <div className="panel qf-section">
      <h3>Client &amp; Project</h3>
      <div className="form-grid">
        <label>Client<select value={f.client_id} onChange={e=>setF({...f,client_id:e.target.value})}><option value="">Select client</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label>Project<select value={f.project_id} onChange={e=>setF({...f,project_id:e.target.value})}><option value="">No project (standalone)</option>{projects.map(p=><option key={p.id} value={p.id}>{p.project_name}</option>)}</select></label>
        <label>Project / Site Location<input value={f.site_location} onChange={e=>setF({...f,site_location:e.target.value})}/></label>
        <label>Client PAN/VAT<input value={clients.find(c=>String(c.id)===String(f.client_id))?.pan_vat_no||''} disabled placeholder="From client record"/></label>
        <label>Contact Person (optional)<input value={f.contact_person} onChange={e=>setF({...f,contact_person:e.target.value})}/></label>
        <label>Contact Phone (optional)<input value={f.contact_phone} onChange={e=>setF({...f,contact_phone:e.target.value})}/></label>
      </div>
    </div>

    <div className="panel qf-section">
      <h3>Title / Subject</h3>
      <div className="form-grid">
        <label>Quotation Title<input value={f.title} onChange={e=>setF({...f,title:e.target.value})} placeholder="e.g. Residential Building Construction"/></label>
        <label>Reference No.<input value={f.reference_no} onChange={e=>setF({...f,reference_no:e.target.value})}/></label>
        <label className="full">Short Description / Scope of Work<textarea value={f.scope_of_work} onChange={e=>setF({...f,scope_of_work:e.target.value})}/></label>
      </div>
    </div>

    <div className="qf-split">
      <div className="qf-boq panel">
        <div className="line-head"><h3 style={{margin:0}}>BOQ Items</h3><button type="button" className="btn small" onClick={()=>setF({...f,items:[...f.items,blankItem()]})}>+ Add Item</button></div>
        <datalist id="boq-categories">{CATEGORIES.map(c=><option key={c} value={c}/>)}</datalist>
        <div className="table-wrap">
          <table className="boq-table">
            <thead><tr><th style={{width:130}}>Category</th><th>Description</th><th style={{width:100}}>Unit</th><th style={{width:90}}>Qty</th><th style={{width:110}}>Rate</th><th style={{width:110}}>Amount</th><th style={{width:150}}>Action</th></tr></thead>
            <tbody>
              {f.items.map((x,i)=><tr key={i}>
                <td><input list="boq-categories" placeholder="Category" value={x.category} onChange={e=>updItem(i,'category',e.target.value)}/></td>
                <td><input placeholder="Description" required value={x.description} onChange={e=>updItem(i,'description',e.target.value)}/></td>
                <td><select value={x.unit} onChange={e=>updItem(i,'unit',e.target.value)}>{UNITS.map(u=><option key={u}>{u}</option>)}</select></td>
                <td><input type="number" step="0.01" value={x.quantity} onChange={e=>updItem(i,'quantity',e.target.value)}/></td>
                <td><input type="number" step="0.01" value={x.rate} onChange={e=>updItem(i,'rate',e.target.value)}/></td>
                <td className="boq-amount">{money(Number(x.quantity||0)*Number(x.rate||0))}</td>
                <td>
                  <div className="row-actions">
                    <button type="button" className="icon-btn" title="Move Up" disabled={i===0} onClick={()=>moveItem(i,-1)}><ArrowUp size={15}/></button>
                    <button type="button" className="icon-btn" title="Move Down" disabled={i===f.items.length-1} onClick={()=>moveItem(i,1)}><ArrowDown size={15}/></button>
                    <button type="button" className="icon-btn" title="Duplicate" onClick={()=>dupItem(i)}><Copy size={15}/></button>
                    <button type="button" className="icon-btn" title="Add Below" onClick={()=>addBelow(i)}><Plus size={15}/></button>
                    <button type="button" className="icon-btn danger" title="Delete" onClick={()=>delItem(i)}><Trash2 size={15}/></button>
                  </div>
                </td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </div>

      <aside className="qf-summary">
        <div className="panel">
          <h3>Financial Summary</h3>
          <div className="form-grid" style={{marginBottom:12}}>
            <label>Discount Type<select value={f.discount_type} onChange={e=>setF({...f,discount_type:e.target.value})}><option value="Fixed">Fixed Amount (Rs.)</option><option value="Percentage">Percentage (%)</option></select></label>
            <label>Discount {f.discount_type==='Percentage'?'(%)':'(Rs.)'}<input type="number" step="0.01" value={f.discount_value} onChange={e=>setF({...f,discount_value:e.target.value})}/></label>
          </div>
          <div className="form-grid" style={{marginBottom:14}}>
            <label className="perm" style={{marginTop:6}}><input type="checkbox" checked={f.vat_enabled} onChange={e=>setF({...f,vat_enabled:e.target.checked})}/><span>Apply VAT</span></label>
            <label>VAT %<input type="number" step="0.01" disabled={!f.vat_enabled} value={f.vat_rate} onChange={e=>setF({...f,vat_rate:e.target.value})}/></label>
          </div>
          <div className="qf-totals">
            <div className="row"><span>Subtotal</span><b>{money(totals.subtotal)}</b></div>
            <div className="row"><span>Discount</span><b>- {money(totals.discount)}</b></div>
            <div className="row"><span>Taxable Amount</span><b>{money(totals.taxable)}</b></div>
            <div className="row"><span>{f.vat_enabled?`VAT ${Number(f.vat_rate||0)}%`:'VAT (Exempt)'}</span><b>{money(totals.vat)}</b></div>
            <div className="row grand"><span>Grand Total</span><b>{money(totals.grand)}</b></div>
          </div>
          <button type="button" className="btn wide" style={{marginTop:14}} onClick={previewNow}><Eye size={15}/>Preview PDF (unsaved)</button>
        </div>
      </aside>
    </div>

    <div className="panel qf-section">
      <h3>Payment Terms</h3>
      <p style={{margin:'0 0 10px',fontSize:12,color:termsSum===100?'#16a34a':'#b45309'}}>Total: {termsSum}% {termsSum!==100?'(should typically add up to 100%)':''}</p>
      {f.payment_terms.map((t,i)=><div className="line-row" key={i} style={{gridTemplateColumns:'2fr .8fr .5fr'}}>
        <input placeholder="Milestone (e.g. Advance)" value={t.milestone_name} onChange={e=>updTerm(i,'milestone_name',e.target.value)}/>
        <input type="number" placeholder="%" value={t.percentage} onChange={e=>updTerm(i,'percentage',e.target.value)}/>
        <button type="button" className="icon-btn danger" title="Remove" onClick={()=>delTerm(i)}><Trash2 size={15}/></button>
      </div>)}
      <button type="button" className="btn small" onClick={addTerm}>+ Add Milestone</button>
    </div>

    <div className="panel qf-section">
      <h3>Terms &amp; Conditions</h3>
      <textarea className="qf-terms" value={f.terms_conditions} onChange={e=>setF({...f,terms_conditions:e.target.value})}/>
    </div>

    <div className="panel qf-section">
      <h3>Notes / Exclusions</h3>
      <textarea className="qf-terms" placeholder="e.g. Electrical fittings not included. Client will provide water/electricity." value={f.notes} onChange={e=>setF({...f,notes:e.target.value})}/>
    </div>

    <div className="panel qf-section">
      <h3>Attachments</h3>
      {isEdit?<>
        <div className="table-wrap"><table><thead><tr><th>File</th><th>Uploaded</th><th>Action</th></tr></thead>
          <tbody>{attachments.length?attachments.map(a=><tr key={a.id}><td><a href={`${API_ROOT}${a.file_path}`} target="_blank" rel="noreferrer">{a.file_name}</a></td><td>{fmtDate(a.created_at)}</td><td><button type="button" className="icon-btn danger" title="Delete" onClick={()=>removeAttachment(a.id)}><Trash2 size={15}/></button></td></tr>):<tr><td colSpan={3} className="empty">No attachments yet</td></tr>}</tbody>
        </table></div>
        <div className="form-actions" style={{justifyContent:'flex-start',marginTop:10}}>
          <input type="file" onChange={e=>setAttFile(e.target.files[0])}/>
          <button type="button" className="btn" onClick={uploadAttachment} disabled={!attFile}>Upload</button>
        </div>
      </>:<p style={{color:'#94a3b8',fontSize:13}}>Save the quotation first to attach drawings, site plans or specification files.</p>}
    </div>

    <div className="qf-save-bar">
      <button type="button" className="btn" onClick={saveDraft} disabled={!!saving}>{saving==='draft'?'Saving...':'Save Draft'}</button>
      <button type="button" className="btn" onClick={saveAndPreview} disabled={!!saving}>{saving==='preview'?'Saving...':'Save & Preview'}</button>
      <button type="button" className="btn primary" onClick={saveAndSend} disabled={!!saving}>{saving==='send'?'Saving...':'Save & Send'}</button>
    </div>
  </>
}
