export default function PrintFinancialSummary({ rows }) {
  return <table className="pv-summary"><tbody>
    {rows.filter(Boolean).map((r, i) => <tr key={i} className={r.grand ? 'pv-grand' : undefined}><td>{r.label}</td><td>{r.value}</td></tr>)}
  </tbody></table>;
}
