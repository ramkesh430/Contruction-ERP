import { useState } from 'react';import { useAuth } from '../context/AuthContext';import { useNavigate } from 'react-router-dom';import { BarChart3,Package,HardHat,Mail,Lock } from 'lucide-react';

const features = [
  [<BarChart3 size={16}/>, 'Real-time project & profit dashboards'],
  [<Package size={16}/>, 'Materials, stock & purchase tracking'],
  [<HardHat size={16}/>, 'Attendance, payroll & advances'],
  ['🇳🇵', 'Nepali FY & VAT-ready billing'],
];

function Skyline() {
  return (
    <svg className="aside-skyline" viewBox="0 0 480 150" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="0" y1="149" x2="480" y2="149" stroke="rgba(255,255,255,.25)" strokeWidth="1"/>
      <rect className="bld draw" x="18" y="88" width="42" height="61" rx="2"/>
      <rect className="win" style={{ animationDelay: '1.4s' }} x="27" y="100" width="6" height="6"/>
      <rect className="win" style={{ animationDelay: '1.6s' }} x="40" y="100" width="6" height="6"/>
      <rect className="win" style={{ animationDelay: '1.8s' }} x="27" y="115" width="6" height="6"/>
      <rect className="win" style={{ animationDelay: '2s' }} x="40" y="115" width="6" height="6"/>

      <rect className="bld draw" style={{ animationDelay: '.15s' }} x="70" y="58" width="36" height="91" rx="2"/>
      <rect className="win" style={{ animationDelay: '1.7s' }} x="79" y="72" width="6" height="6"/>
      <rect className="win" style={{ animationDelay: '1.9s' }} x="91" y="72" width="6" height="6"/>
      <rect className="win" style={{ animationDelay: '2.1s' }} x="79" y="88" width="6" height="6"/>
      <rect className="win" style={{ animationDelay: '2.3s' }} x="91" y="88" width="6" height="6"/>
      <rect className="win" style={{ animationDelay: '2.5s' }} x="79" y="104" width="6" height="6"/>
      <rect className="win" style={{ animationDelay: '2.7s' }} x="91" y="104" width="6" height="6"/>

      <rect className="bld draw" style={{ animationDelay: '.3s' }} x="114" y="102" width="30" height="47" rx="2"/>

      <rect className="bld draw" style={{ animationDelay: '.45s' }} x="154" y="38" width="46" height="111" rx="2"/>
      <rect className="win" style={{ animationDelay: '2.2s' }} x="165" y="52" width="6" height="6"/>
      <rect className="win" style={{ animationDelay: '2.4s' }} x="182" y="52" width="6" height="6"/>
      <rect className="win" style={{ animationDelay: '2.6s' }} x="165" y="68" width="6" height="6"/>
      <rect className="win" style={{ animationDelay: '2.8s' }} x="182" y="68" width="6" height="6"/>
      <rect className="win" style={{ animationDelay: '3s' }} x="165" y="84" width="6" height="6"/>
      <rect className="win" style={{ animationDelay: '3.2s' }} x="182" y="84" width="6" height="6"/>

      <rect className="bld draw" style={{ animationDelay: '.6s' }} x="330" y="78" width="34" height="71" rx="2"/>
      <rect className="win" style={{ animationDelay: '2.5s' }} x="340" y="92" width="6" height="6"/>
      <rect className="win" style={{ animationDelay: '2.7s' }} x="352" y="92" width="6" height="6"/>
      <rect className="win" style={{ animationDelay: '2.9s' }} x="340" y="108" width="6" height="6"/>

      <rect className="bld draw" style={{ animationDelay: '.75s' }} x="368" y="100" width="28" height="49" rx="2"/>

      <g className="crane draw" style={{ animationDelay: '.9s' }}>
        <line x1="250" y1="149" x2="250" y2="18" strokeWidth="2"/>
        <line x1="222" y1="24" x2="250" y2="18" strokeWidth="2"/>
        <line x1="250" y1="18" x2="322" y2="26" strokeWidth="2"/>
        <line x1="235" y1="18" x2="235" y2="34" strokeWidth="1.4"/>
      </g>
      <g className="hook">
        <line x1="305" y1="27" x2="305" y2="55" stroke="rgba(255,255,255,.55)" strokeWidth="1.4"/>
        <rect x="300" y="55" width="10" height="8" rx="1.5" fill="rgba(255,255,255,.55)"/>
      </g>
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setErr('');
    try { await login(email, password); nav('/'); }
    catch (e) { setErr(e.response?.data?.message || 'Login failed'); }
    finally { setLoading(false); }
  }

  return (
    <div className="login-screen">
      <div className="login-shell">
        <aside className="login-aside">
          <div className="aside-orb orb-a" />
          <div className="aside-orb orb-b" />
          <div className="aside-grid" />
          <div className="aside-content">
            <div className="aside-brand">
              <img src="/logo.jpg" alt="CivilArch Design Space" className="brand-mark"/>
              <div><strong>CivilArch</strong><span>Design Space</span></div>
            </div>
            <h2>Build. Track. Deliver.</h2>
            <p>Complete project, finance and site management for construction companies — projects, BOQ, materials, payroll and Nepali FY-ready billing, all in one place.</p>
            <ul className="aside-features">
              {features.map(([icon, text], i) => (
                <li key={text} style={{ animationDelay: `${0.5 + i * 0.15}s` }}><span>{icon}</span>{text}</li>
              ))}
            </ul>
          </div>
          <Skyline />
        </aside>
        <main className="login-main">
          <div className="login-form-card">
            <div className="login-form-brand"><img src="/logo.jpg" alt="CivilArch Design Space" className="brand-mark"/><strong>CivilArch Design Space</strong></div>
            <h1>Welcome back</h1>
            <p className="sub">Sign in to continue to your dashboard.</p>
            {err && <div className="alert danger shake" key={err}>{err}</div>}
            <form onSubmit={submit}>
              <label>Email
                <div className="field-icon">
                  <span><Mail size={15}/></span>
                  <input value={email} onChange={e => setEmail(e.target.value)} type="email" required autoFocus />
                </div>
              </label>
              <label>Password
                <div className="field-icon">
                  <span><Lock size={15}/></span>
                  <input value={password} onChange={e => setPassword(e.target.value)} type={showPw ? 'text' : 'password'} required />
                  <button type="button" className="pw-toggle" onClick={() => setShowPw(v => !v)}>{showPw ? 'Hide' : 'Show'}</button>
                </div>
              </label>
              <button className="btn primary wide" disabled={loading}>
                {loading ? <span className="spinner" /> : 'Sign In'}
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
