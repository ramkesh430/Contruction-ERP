import { Building2 } from 'lucide-react';
import { fileUrl } from '../utils/letterhead';

export function PrintHeader({ settings, fiscalYear, title, period }) {
  const contact = [settings?.phone ? `Phone: ${settings.phone}` : '', settings?.email, settings?.pan_vat_no ? `PAN/VAT: ${settings.pan_vat_no}` : '']
    .filter(Boolean).join(' · ');
  return <div className="print-only print-header">
    <div className="print-header-top">
      {settings?.logo
        ? <img src={fileUrl(settings.logo)} alt="logo" />
        : <div className="print-logo-fallback"><Building2 size={26} /></div>}
      <div>
        <h2>{settings?.name || 'Company Name'}</h2>
        {settings?.address && <p>{settings.address}</p>}
        {contact && <p>{contact}</p>}
      </div>
    </div>
    <div className="print-header-title">
      <h1>{title}</h1>
      {(fiscalYear || period) && <div>
        {fiscalYear && <span>Fiscal Year: {fiscalYear}</span>}
        {period && <span>Reporting Period: {period}</span>}
      </div>}
    </div>
  </div>;
}

export function PrintFooter() {
  return <div className="print-only print-footer">
    <div className="print-sign-row">
      <div><span>Prepared By</span></div>
      <div><span>Checked By</span></div>
      <div><span>Approved By</span></div>
    </div>
    <p className="print-generated">Generated on {new Date().toLocaleString('en-IN')}</p>
  </div>;
}
