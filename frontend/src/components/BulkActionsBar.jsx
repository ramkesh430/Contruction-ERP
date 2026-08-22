import { Download,Trash2,X } from 'lucide-react';

export default function BulkActionsBar({count,onExport,onDelete,onClear}){
  if(!count) return null;
  return <div className="bulk-actions-bar no-print">
    <span>{count} selected</span>
    <div className="row-actions">
      {onExport&&<button type="button" className="btn small" onClick={onExport}><Download size={14}/>Export Selected</button>}
      {onDelete&&<button type="button" className="btn small danger" onClick={onDelete}><Trash2 size={14}/>Delete Selected</button>}
      <button type="button" className="btn small" onClick={onClear}><X size={14}/>Clear</button>
    </div>
  </div>;
}
