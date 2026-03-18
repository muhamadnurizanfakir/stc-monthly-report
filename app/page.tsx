'use client';
import React, { useState, useEffect } from 'react';

const MODULES = [
  {
    id: 'reporting',
    title: 'Reporting',
    description: 'Monthly project status reports, Gantt charts, milestone tracking and progress monitoring for all STC engineering projects.',
    icon: '📊',
    href: '/reporting',
    color: '#3b82f6',
    tag: 'Project Management',
    available: true,
  },
  {
    id: 'timesheet',
    title: 'Timesheet',
    description: 'Factory time tracking with clock in/out, session history and hours summary across all Sapura group companies.',
    icon: '🕐',
    href: '/timesheet',
    color: '#0e7490',
    tag: 'Time Tracking',
    available: true,
  },
  {
    id: 'more',
    title: 'More Coming Soon',
    description: 'Additional operational modules will be added here as STC continues to grow.',
    icon: '🔮',
    href: '#',
    color: '#475569',
    tag: 'Future',
    available: false,
  },
];

export default function HomePage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const auth = sessionStorage.getItem('stc_portal_auth');
    if (auth === 'true') setLoggedIn(true);
    setChecking(false);
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
    const data = await res.json();
    if (data.ok) {
      sessionStorage.setItem('stc_portal_auth', 'true');
      setLoggedIn(true);
      setError('');
    } else {
      setError('Incorrect password. Please try again.');
      setPassword('');
    }
  }

  if (checking) return null;

  if (!loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0f172a 100%)' }}>
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-orange-500 flex items-center justify-center text-white font-bold text-3xl shadow-xl mx-auto mb-4">S</div>
            <h1 className="text-2xl font-bold text-white mb-1">STC Operations Portal</h1>
            <p className="text-blue-300 text-sm">Sapura Technical Centre Sdn Bhd</p>
          </div>
          <form onSubmit={handleLogin} className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-8">
            <h2 className="text-white font-bold text-lg mb-1">Welcome</h2>
            <p className="text-blue-300 text-xs mb-6">Enter the portal password to continue</p>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-blue-200 mb-2">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Enter password" autoFocus
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-blue-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            {error && <p className="text-red-400 text-xs mb-4">{error}</p>}
            <button type="submit" className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-sm transition-colors">
              Enter Portal →
            </button>
          </form>
          <p className="text-center text-blue-600 text-xs mt-4">© 2026 Sapura Technical Centre Sdn Bhd</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0f172a 100%)' }}>
      {/* Header */}
      <div className="px-8 py-5 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">S</div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Sapura Technical Centre</p>
            <p className="text-blue-300 text-xs">Sdn Bhd</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href="/admin" className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-colors border border-white/10">⚙️ Admin</a>
          <button onClick={() => { sessionStorage.removeItem('stc_portal_auth'); setLoggedIn(false); }}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-colors border border-white/10">Logout</button>
        </div>
      </div>

      {/* Hero */}
      <div className="px-8 pt-16 pb-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 border border-blue-400/30 rounded-full text-blue-300 text-xs font-semibold mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse inline-block"></span>
          R&amp;D &amp; Engineering Support Services
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">STC Operations Portal</h1>
        <p className="text-blue-200 text-base max-w-xl mx-auto leading-relaxed mb-2">
          Sapura Technical Centre — the R&amp;D and engineering support arm of
          <span className="text-white font-semibold"> Sapura Industrial Berhad</span>,
          specialising in automotive component development and manufacturing support.
        </p>
        <p className="text-blue-400 text-sm max-w-lg mx-auto">Select a module below to get started.</p>
      </div>

      {/* Module Cards */}
      <div className="flex-1 px-8 pb-16">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {MODULES.map(mod => (
            <a key={mod.id} href={mod.available ? mod.href : '#'}
              className={"group block rounded-2xl p-7 border transition-all duration-300 " +
                (mod.available ? "bg-white/8 border-white/15 hover:bg-white/15 hover:border-white/30 hover:shadow-2xl hover:-translate-y-2 cursor-pointer" : "bg-white/3 border-white/8 opacity-40 cursor-not-allowed")}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl mb-5 shadow-lg"
                style={{ background: mod.available ? mod.color + '33' : '#ffffff11', border: `1px solid ${mod.color}44` }}>
                {mod.icon}
              </div>
              <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold mb-3"
                style={{ background: mod.available ? mod.color + '22' : '#ffffff11', color: mod.available ? '#93c5fd' : '#64748b' }}>
                {mod.tag}
              </div>
              <h2 className="text-white font-bold text-xl mb-3">{mod.title}</h2>
              <p className="text-blue-200/80 text-sm leading-relaxed mb-5">{mod.description}</p>
              {mod.available && (
                <div className="flex items-center gap-2 text-sm font-semibold text-blue-300 group-hover:text-white transition-colors">
                  Open module <span className="group-hover:translate-x-2 transition-transform inline-block">→</span>
                </div>
              )}
            </a>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 px-8 py-5 flex items-center justify-between">
        <p className="text-blue-500 text-xs">© 2026 Sapura Technical Centre Sdn Bhd · A Sapura Industrial Berhad Company</p>
        <p className="text-blue-600 text-xs">Automotive Component R&amp;D · Engineering Support · Manufacturing Solutions</p>
      </div>
    </div>
  );
}
