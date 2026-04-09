'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface TsUser {
  id: string;
  name: string;
  employee_id: string | null;
}

type LoginMode = 'select' | 'internal_user' | 'internal_pin' | 'external';

export default function LabLoginPage() {
  const [mode, setMode] = useState<LoginMode>('select');
  const [tsUsers, setTsUsers] = useState<TsUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<TsUser | null>(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [extEmail, setExtEmail] = useState('');
  const [extPassword, setExtPassword] = useState('');
  const [extError, setExtError] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regError, setRegError] = useState('');
  const [companies, setCompanies] = useState<{id:string;company_name:string}[]>([]);
  const [regCompany, setRegCompany] = useState('');

  useEffect(() => {
    // Check if already logged in
    const user = sessionStorage.getItem('stc_lab_user');
    if (user) window.location.href = '/lab/dashboard';
    
    supabase.from('ts_users').select('id, name, employee_id').eq('is_active', true).order('name')
      .then(({ data }) => setTsUsers(data ?? []));
    supabase.from('lab_companies').select('id, company_name').eq('is_active', true).eq('company_type', 'external').order('company_name')
      .then(({ data }) => setCompanies(data ?? []));
  }, []);

  async function handlePinSubmit() {
    if (!selectedUser || pin.length !== 4) return;
    setLoading(true);
    const res = await fetch('/api/lab-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'internal_pin', userId: selectedUser.id, pin }),
    });
    const data = await res.json();
    if (data.ok) {
      sessionStorage.setItem('stc_lab_user', JSON.stringify(data.user));
      window.location.href = '/lab/dashboard';
    } else {
      setPinError('Wrong PIN. Try again.');
      setPin('');
    }
    setLoading(false);
  }

  async function handleExternalLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setExtError('');
    const res = await fetch('/api/lab-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'external_login', email: extEmail, password: extPassword }),
    });
    const data = await res.json();
    if (data.ok) {
      sessionStorage.setItem('stc_lab_user', JSON.stringify(data.user));
      window.location.href = '/lab/dashboard';
    } else {
      setExtError(data.error ?? 'Login failed');
    }
    setLoading(false);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setRegError('');
    const res = await fetch('/api/lab-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'external_register', registerName: regName, registerEmail: regEmail, registerPassword: regPassword, companyId: regCompany || null }),
    });
    const data = await res.json();
    if (data.ok) {
      sessionStorage.setItem('stc_lab_user', JSON.stringify(data.user));
      window.location.href = '/lab/dashboard';
    } else {
      setRegError(data.error ?? 'Registration failed');
    }
    setLoading(false);
  }

  const filteredUsers = tsUsers.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    (u.employee_id ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-purple-700 flex items-center justify-center text-2xl shadow-xl mx-auto mb-3">🔬</div>
          <h1 className="text-xl font-bold text-slate-800">Lab Testing Portal</h1>
          <p className="text-slate-500 text-xs mt-1">Sign in to submit RFQ and track your tests</p>
        </div>

        {/* Mode Selection */}
        {mode === 'select' && (
          <div className="bg-white rounded-2xl shadow-xl p-6 space-y-3">
            <h2 className="font-bold text-slate-700 mb-4">How would you like to sign in?</h2>
            <button onClick={() => setMode('internal_user')}
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-left">
              <div className="w-10 h-10 rounded-xl bg-blue-950 flex items-center justify-center text-white text-lg">🏢</div>
              <div>
                <p className="font-bold text-slate-800 text-sm">Internal Staff</p>
                <p className="text-xs text-slate-500">STC / Sapura group employees — use your PIN</p>
              </div>
            </button>
            <button onClick={() => setMode('external')}
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-purple-400 hover:bg-purple-50 transition-all text-left">
              <div className="w-10 h-10 rounded-xl bg-purple-700 flex items-center justify-center text-white text-lg">🌐</div>
              <div>
                <p className="font-bold text-slate-800 text-sm">External Customer</p>
                <p className="text-xs text-slate-500">External companies — use email & password</p>
              </div>
            </button>
            <a href="/lab" className="block text-center text-slate-400 text-xs mt-2 hover:text-slate-600">← Back to Lab Services</a>
          </div>
        )}

        {/* Internal - Select User */}
        {mode === 'internal_user' && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-blue-950 px-6 py-4 flex items-center justify-between">
              <h2 className="text-white font-bold">Select Your Name</h2>
              <button onClick={() => setMode('select')} className="text-blue-300 text-xs hover:text-white">← Back</button>
            </div>
            <div className="p-4">
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search name or ID..." className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {filteredUsers.map(u => (
                  <button key={u.id} onClick={() => { setSelectedUser(u); setMode('internal_pin'); }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left">
                    <div className="w-9 h-9 rounded-full bg-blue-950 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{u.name}</p>
                      {u.employee_id && <p className="text-xs text-slate-400">{u.employee_id}</p>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Internal - PIN */}
        {mode === 'internal_pin' && selectedUser && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-blue-950 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-white font-bold">Hello, {selectedUser.name}!</h2>
                <p className="text-blue-300 text-xs">Enter your 4-digit PIN</p>
              </div>
              <button onClick={() => { setMode('internal_user'); setPin(''); setPinError(''); }} className="text-blue-300 text-xs hover:text-white">← Back</button>
            </div>
            <div className="p-6">
              <div className="flex justify-center gap-3 mb-4">
                {[0,1,2,3].map(i => (
                  <div key={i} className={"w-12 h-12 rounded-xl border-2 flex items-center justify-center text-xl font-bold " + (pin.length > i ? "border-blue-500 bg-blue-50 text-blue-800" : "border-slate-200 text-slate-300")}>
                    {pin.length > i ? '●' : '○'}
                  </div>
                ))}
              </div>
              {pinError && <p className="text-red-500 text-xs text-center mb-3">{pinError}</p>}
              <div className="grid grid-cols-3 gap-3 mb-3">
                {[1,2,3,4,5,6,7,8,9,null,0,'⌫'].map((k, i) => (
                  <button key={i} disabled={k === null}
                    onClick={() => { if (k === '⌫') setPin(p => p.slice(0,-1)); else if (k !== null && pin.length < 4) setPin(p => p + k.toString()); }}
                    className={"h-14 rounded-xl text-lg font-bold transition-all " + (k === null ? "invisible" : k === '⌫' ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-slate-50 text-slate-800 hover:bg-blue-50 hover:text-blue-700 border border-slate-200")}>
                    {k}
                  </button>
                ))}
              </div>
              <button onClick={handlePinSubmit} disabled={pin.length !== 4 || loading}
                className="w-full py-3 bg-blue-950 text-white rounded-xl font-bold text-sm disabled:opacity-40 hover:bg-blue-900 transition-colors">
                {loading ? 'Signing in...' : '✓ Confirm PIN'}
              </button>
            </div>
          </div>
        )}

        {/* External Login / Register */}
        {mode === 'external' && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-purple-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-white font-bold">{showRegister ? 'Create Account' : 'External Customer Login'}</h2>
              <button onClick={() => setMode('select')} className="text-purple-200 text-xs hover:text-white">← Back</button>
            </div>
            <div className="p-6">
              {!showRegister ? (
                <form onSubmit={handleExternalLogin} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
                    <input type="email" value={extEmail} onChange={e => setExtEmail(e.target.value)} required
                      placeholder="your@company.com" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Password</label>
                    <input type="password" value={extPassword} onChange={e => setExtPassword(e.target.value)} required
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  </div>
                  {extError && <p className="text-red-500 text-xs">{extError}</p>}
                  <button type="submit" disabled={loading}
                    className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold text-sm disabled:opacity-50">
                    {loading ? 'Signing in...' : 'Sign In →'}
                  </button>
                  <button type="button" onClick={() => setShowRegister(true)}
                    className="w-full text-xs text-slate-500 hover:text-purple-700">
                    Don&apos;t have an account? Register here
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name *</label>
                    <input type="text" value={regName} onChange={e => setRegName(e.target.value)} required
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Email *</label>
                    <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} required
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Password *</label>
                    <input type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} required
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Company</label>
                    <select value={regCompany} onChange={e => setRegCompany(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                      <option value="">— Select company (optional) —</option>
                      {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                    </select>
                  </div>
                  {regError && <p className="text-red-500 text-xs">{regError}</p>}
                  <button type="submit" disabled={loading}
                    className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold text-sm disabled:opacity-50">
                    {loading ? 'Creating account...' : 'Create Account →'}
                  </button>
                  <button type="button" onClick={() => setShowRegister(false)}
                    className="w-full text-xs text-slate-500 hover:text-purple-700">
                    Already have an account? Sign in
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
