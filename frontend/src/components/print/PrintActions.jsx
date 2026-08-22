import { ArrowLeft,Printer } from 'lucide-react';

export default function PrintActions({ onClose }) {
  function handleClose() {
    if (onClose) return onClose();
    if (window.history.length > 1) window.history.back();
    else window.close();
  }
  return <div className="no-print print-toolbar">
    <button className="btn" onClick={handleClose}><ArrowLeft size={15}/>Close</button>
    <button className="btn primary" onClick={() => window.print()}><Printer size={15}/>Print</button>
  </div>;
}
