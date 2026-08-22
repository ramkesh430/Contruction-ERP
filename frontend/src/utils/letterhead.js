import api from '../services/api';

const API_ROOT = (api.defaults.baseURL || '').replace(/\/api\/?$/, '');
export const fileUrl = p => (!p ? '' : /^https?:\/\//.test(p) ? p : `${API_ROOT}${p}`);

export function letterheadHtml(settings, rightHtml) {
  const logo = settings?.logo
    ? `<img src="${fileUrl(settings.logo)}" alt="logo" style="height:48px;width:48px;object-fit:cover;border-radius:8px;flex:0 0 auto"/>`
    : `<div style="font-size:30px">🏗</div>`;
  const meta = [settings?.address, settings?.phone ? `Phone: ${settings.phone}` : '', settings?.pan_vat_no ? `PAN/VAT: ${settings.pan_vat_no}` : '']
    .filter(Boolean).join(' &middot; ');
  return `<div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #14213d;padding-bottom:12px;margin-bottom:18px">
    <div style="display:flex;gap:12px;align-items:center">${logo}<div><h2 style="margin:0;font-size:19px">${settings?.name || 'Company Name'}</h2>${meta ? `<p style="margin:3px 0 0;color:#64748b;font-size:12px">${meta}</p>` : ''}</div></div>
    ${rightHtml ? `<div style="text-align:right">${rightHtml}</div>` : ''}
  </div>`;
}
