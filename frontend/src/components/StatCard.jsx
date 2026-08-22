export default function StatCard({label,value,sub,icon,onClick,tone}){
  return <div className={`stat-card ${onClick?'clickable':''} ${tone?'tone-'+tone:''}`} onClick={onClick} role={onClick?'button':undefined} tabIndex={onClick?0:undefined}>
    <div className="stat-icon">{icon}</div>
    <div><div className="stat-label">{label}</div><div className="stat-value">{value}</div>{sub&&<div className="stat-sub">{sub}</div>}</div>
  </div>
}
