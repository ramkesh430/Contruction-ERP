import { Building2 } from 'lucide-react';
import { fileUrl } from '../../utils/letterhead';

export default function PrintCompanyHeader({ settings, docLabel, docNumber, status, extra }) {
  return <div className="pv-head">
    <div className="pv-company">
      {settings?.logo
        ? <img src={fileUrl(settings.logo)} alt="logo"/>
        : <div className="pv-logo-fallback"><Building2 size={28}/></div>}
      <div>
        <h1>{settings?.name || 'Company Name'}</h1>
        {settings?.address && <p>{settings.address}</p>}
        <p>PAN/VAT: {settings?.pan_vat_no || '—'} &nbsp;|&nbsp; Phone: {settings?.phone || '—'}</p>
      </div>
    </div>
    <div className="pv-doc-title">
      <h2>{docLabel}</h2>
      {docNumber && <p><b>{docNumber}</b></p>}
      {status && <span className="pv-badge">{status}</span>}
      {extra}
    </div>
  </div>;
}
