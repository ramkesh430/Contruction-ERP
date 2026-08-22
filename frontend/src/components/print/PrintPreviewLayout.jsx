import PrintActions from './PrintActions';

export default function PrintPreviewLayout({ orientation = 'portrait', onClose, children }) {
  return <div className={`print-preview-page${orientation === 'landscape' ? ' landscape' : ''}`}>
    <PrintActions onClose={onClose}/>
    <div className="print-paper">{children}</div>
  </div>;
}
