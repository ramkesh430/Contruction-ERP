import { money, fmtDate } from './format';
import api from '../services/api';

const API_ROOT = (api.defaults.baseURL || '').replace(/\/api\/?$/, '');
const fileUrl = p => (!p ? '' : /^https?:\/\//.test(p) ? p : `${API_ROOT}${p}`);

export function computeQuotationTotals(items, f) {
  const subtotal = items.reduce((s, x) => s + Number(x.quantity || 0) * Number(x.rate || 0), 0);
  const discountValue = Number(f.discount_value || 0);
  const discount = f.discount_type === 'Percentage' ? subtotal * discountValue / 100 : discountValue;
  const taxable = Math.max(0, subtotal - discount);
  const vatRate = Number(f.vat_rate || 0);
  const vat = f.vat_enabled ? taxable * vatRate / 100 : 0;
  const grand = taxable + vat;
  return { subtotal, discount, taxable, vat, grand };
}

function esc(s) { return s == null ? '' : String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

export function buildQuotationHtml(q, settings) {
  const items = q.items || [];
  const totals = computeQuotationTotals(items, q);
  const itemRows = items.map((x, i) => `<tr>
      <td>${i + 1}</td><td>${esc(x.category) || '—'}</td><td>${esc(x.description)}</td><td>${esc(x.unit)}</td>
      <td style="text-align:right">${Number(x.quantity || 0).toLocaleString('en-IN')}</td>
      <td style="text-align:right">${money(x.rate)}</td>
      <td style="text-align:right">${money(Number(x.quantity || 0) * Number(x.rate || 0))}</td>
    </tr>`).join('');
  const termRows = (q.payment_terms || []).filter(t => t.milestone_name).map(t => `<tr><td>${esc(t.milestone_name)}</td><td style="text-align:right">${Number(t.percentage || 0)}%</td></tr>`).join('');
  const logo = settings?.logo ? `<img src="${fileUrl(settings.logo)}" alt="logo"/>` : `<div class="logo-fallback">🏗</div>`;

  return `<!doctype html><html><head><meta charset="utf-8"/><title>${esc(q.quotation_no || 'Quotation')}</title>
  <style>
    @page{ size:A4; margin:16mm; }
    *{box-sizing:border-box}
    body{font-family:Arial,Helvetica,sans-serif;color:#14213d;font-size:12.5px;margin:0}
    .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #14213d;padding-bottom:12px;margin-bottom:16px}
    .head .company{display:flex;gap:12px;align-items:center}
    .logo-fallback{font-size:34px}
    .head img{height:48px}
    .company h1{margin:0;font-size:18px}
    .company p{margin:2px 0 0;font-size:11px;color:#475569}
    .head .doc-title{text-align:right}
    .head .doc-title h2{margin:0;font-size:20px;letter-spacing:1px}
    .head .doc-title p{margin:2px 0 0;font-size:11px;color:#475569}
    .meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
    .meta-box{border:1px solid #dfe5ee;border-radius:6px;padding:10px 12px}
    .meta-box h3{margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#64748b}
    .meta-box div{font-size:12px;margin:2px 0}
    table{width:100%;border-collapse:collapse;margin-bottom:14px}
    th,td{border:1px solid #dfe5ee;padding:6px 8px;font-size:11.5px}
    th{background:#f1f5f9;text-align:left}
    .summary{width:280px;margin-left:auto;margin-bottom:16px}
    .summary td{border:none;padding:4px 2px}
    .summary tr td:last-child{text-align:right;font-weight:600}
    .summary .grand td{border-top:2px solid #14213d;font-size:14px;font-weight:800;padding-top:8px}
    .section{margin-bottom:14px}
    .section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#64748b;margin:0 0 6px;border-bottom:1px solid #e2e8f0;padding-bottom:4px}
    .section p, .section div{font-size:11.5px;white-space:pre-wrap;margin:0;line-height:1.5}
    .sign-grid{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:36px}
    .sign-box{border-top:1px solid #14213d;padding-top:6px;font-size:11px;text-align:center;color:#475569}
    .status-badge{display:inline-block;padding:3px 10px;border-radius:99px;background:#eff6ff;color:#1d4ed8;font-size:11px;font-weight:700}
  </style></head>
  <body>
    <div class="head">
      <div class="company">${logo}<div><h1>${esc(settings?.name || 'Construction Company')}</h1>
        <p>${esc(settings?.address || '')}</p>
        <p>PAN/VAT: ${esc(settings?.pan_vat_no) || '—'} &nbsp;|&nbsp; Phone: ${esc(settings?.phone) || '—'}</p>
      </div></div>
      <div class="doc-title"><h2>QUOTATION</h2>
        <p><b>${esc(q.quotation_no) || 'Unsaved Preview'}</b></p>
        <p><span class="status-badge">${esc(q.status || 'Draft')}</span></p>
      </div>
    </div>
    <div class="meta-grid">
      <div class="meta-box"><h3>Client</h3>
        <div><b>${esc(q.client_name) || '—'}</b></div>
        <div>${esc(q.client_address) || ''}</div>
        <div>Phone: ${esc(q.client_phone) || '—'}</div>
        <div>PAN/VAT: ${esc(q.client_pan_vat) || '—'}</div>
        ${q.contact_person ? `<div>Attn: ${esc(q.contact_person)}${q.contact_phone ? ' (' + esc(q.contact_phone) + ')' : ''}</div>` : ''}
      </div>
      <div class="meta-box"><h3>Quotation Details</h3>
        <div>Date: ${fmtDate(q.quotation_date)}</div>
        <div>Valid Until: ${fmtDate(q.valid_until)}</div>
        <div>Fiscal Year: ${esc(q.fiscal_year_code) || '—'}</div>
        <div>Project/Site: ${esc(q.project_name || q.site_location) || '—'}</div>
        ${q.reference_no ? `<div>Reference No: ${esc(q.reference_no)}</div>` : ''}
      </div>
    </div>
    ${q.title || q.scope_of_work ? `<div class="section"><h3>${esc(q.title) || 'Subject'}</h3>${q.scope_of_work ? `<p>${esc(q.scope_of_work)}</p>` : ''}</div>` : ''}
    <table><thead><tr><th>#</th><th>Category</th><th>Description</th><th>Unit</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
      <tbody>${itemRows || '<tr><td colspan="7" style="text-align:center;color:#94a3b8">No items</td></tr>'}</tbody>
    </table>
    <table class="summary"><tbody>
      <tr><td>Subtotal</td><td>${money(totals.subtotal)}</td></tr>
      <tr><td>Discount${q.discount_type === 'Percentage' ? ` (${Number(q.discount_value || 0)}%)` : ''}</td><td>- ${money(totals.discount)}</td></tr>
      <tr><td>Taxable Amount</td><td>${money(totals.taxable)}</td></tr>
      <tr><td>VAT${q.vat_enabled ? ` (${Number(q.vat_rate || 0)}%)` : ' (Exempt)'}</td><td>${money(totals.vat)}</td></tr>
      <tr class="grand"><td>Grand Total</td><td>${money(totals.grand)}</td></tr>
    </tbody></table>
    ${termRows ? `<div class="section"><h3>Payment Terms</h3><table><thead><tr><th>Milestone</th><th style="text-align:right">%</th></tr></thead><tbody>${termRows}</tbody></table></div>` : ''}
    ${q.terms_conditions ? `<div class="section"><h3>Terms &amp; Conditions</h3><p>${esc(q.terms_conditions)}</p></div>` : ''}
    ${q.notes ? `<div class="section"><h3>Notes / Exclusions</h3><p>${esc(q.notes)}</p></div>` : ''}
    <div class="sign-grid">
      <div class="sign-box">Prepared By</div>
      <div class="sign-box">Authorized Signatory${settings?.stamp_file ? ' (Stamp on file)' : ''}</div>
    </div>
  </body></html>`;
}

export function openQuotationPdf(q, settings) {
  const html = buildQuotationHtml(q, settings);
  const w = window.open('', '_blank', 'width=900,height=1000');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 350);
}
