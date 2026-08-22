export default function PrintTable({ columns, rows, emptyText = 'No items' }) {
  return <table className="pv-table">
    <thead><tr>{columns.map(c => <th key={c.key} style={c.align === 'right' ? { textAlign: 'right' } : undefined}>{c.label}</th>)}</tr></thead>
    <tbody>
      {rows.length
        ? rows.map((r, i) => <tr key={r.id || i}>
            {columns.map(c => <td key={c.key} style={c.align === 'right' ? { textAlign: 'right' } : undefined}>{c.render ? c.render(r, i) : r[c.key]}</td>)}
          </tr>)
        : <tr><td colSpan={columns.length} style={{ textAlign: 'center', color: '#94a3b8' }}>{emptyText}</td></tr>}
    </tbody>
  </table>;
}
