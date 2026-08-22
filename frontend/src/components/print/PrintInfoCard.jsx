export function PrintInfoGrid({ children }) {
  return <div className="pv-meta-grid">{children}</div>;
}

export default function PrintInfoCard({ title, rows }) {
  return <div className="pv-meta-box">
    <h3>{title}</h3>
    {rows.filter(r => r !== false && r != null).map((r, i) => <div key={i}>{r}</div>)}
  </div>;
}
