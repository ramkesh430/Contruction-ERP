import { useEffect,useMemo,useState } from 'react';

export function useRowSelection(rows){
  const [selectedIds,setSelectedIds]=useState(new Set());
  const idsKey=rows.map(r=>r.id).join(',');

  useEffect(()=>{
    setSelectedIds(prev=>{
      const validIds=new Set(rows.map(r=>r.id));
      const next=new Set([...prev].filter(id=>validIds.has(id)));
      return next.size===prev.size?prev:next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[idsKey]);

  function onToggle(id){
    setSelectedIds(prev=>{
      const next=new Set(prev);
      next.has(id)?next.delete(id):next.add(id);
      return next;
    });
  }
  function onToggleAll(){
    setSelectedIds(prev=>prev.size===rows.length&&rows.length>0?new Set():new Set(rows.map(r=>r.id)));
  }
  function clear(){ setSelectedIds(new Set()); }

  const selectedRows=useMemo(()=>rows.filter(r=>selectedIds.has(r.id)),[rows,selectedIds]);
  const allSelected=rows.length>0&&selectedIds.size===rows.length;
  const someSelected=selectedIds.size>0&&!allSelected;

  return {selectedIds,selectedRows,onToggle,onToggleAll,clear,allSelected,someSelected,count:selectedIds.size};
}
