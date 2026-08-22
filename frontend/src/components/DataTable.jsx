export default function DataTable({columns,rows,empty='No records found',selection}){
  const showCheckbox=!!selection;
  return <div className="table-wrap"><table><thead><tr>
    {showCheckbox&&<th className="col-check"><input type="checkbox" checked={selection.allSelected} ref={el=>{if(el)el.indeterminate=!selection.allSelected&&selection.someSelected}} onChange={selection.onToggleAll}/></th>}
    {columns.map(c=><th key={c.key}>{c.label}</th>)}
  </tr></thead><tbody>{rows.length?rows.map((r,i)=><tr key={r.id||i} className={showCheckbox&&selection.selectedIds.has(r.id)?'row-selected':undefined}>
    {showCheckbox&&<td className="col-check"><input type="checkbox" checked={selection.selectedIds.has(r.id)} onChange={()=>selection.onToggle(r.id)}/></td>}
    {columns.map(c=><td key={c.key}>{c.render?c.render(r):r[c.key]??'—'}</td>)}
  </tr>):<tr><td colSpan={columns.length+(showCheckbox?1:0)} className="empty">{empty}</td></tr>}</tbody></table></div>
}
