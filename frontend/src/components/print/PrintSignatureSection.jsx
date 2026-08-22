import { fileUrl } from '../../utils/letterhead';

export default function PrintSignatureSection({ columns, settings }) {
  return <div className="pv-signature" style={{ gridTemplateColumns: `repeat(${columns.length},1fr)` }}>
    {columns.map((c, i) => <div className="pv-sign-col" key={i}>
      {c.showStampSign && <div className="pv-stamp-sign">
        {settings?.stamp_file && <img src={fileUrl(settings.stamp_file)} alt="Company stamp" className="pv-stamp"/>}
        {settings?.signature_file && <img src={fileUrl(settings.signature_file)} alt="Authorized signature" className="pv-signature-img"/>}
      </div>}
      <span>{c.label}</span>
    </div>)}
  </div>;
}
