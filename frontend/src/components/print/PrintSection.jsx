export default function PrintSection({ title, children }) {
  return <div className="pv-section">
    <h3>{title}</h3>
    {children}
  </div>;
}
