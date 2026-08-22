export const money = n => 'Rs. ' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
export const fmtDate = v => v ? String(v).slice(0, 10) : '—';
export const todayStr = () => new Date().toISOString().slice(0, 10);
