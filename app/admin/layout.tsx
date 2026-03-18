'use client';

import { useState, useEffect } from 'react';

const ADMIN_PASSWORD = 'stc2026';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const saved = sessionStorage.getItem('stc_admin_auth');
    if (saved === 'true') setAuthed(true);
    setChecking(false);
  }, []);

  const handleLogin = () => {
    if (input === ADMIN_PASSWORD) {
      sessionStorage.setItem('stc_admin_auth', 'true');
      setAuthed(true);
      setError('');
    } else {
      setError('Wrong password. Try again.');
      setInput('');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('stc_admin_auth');
    setAuthed(false);
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-blue-950">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <div>
              <p className="font-bold text-slate-800">STC Admin</p>
              <p className="text-xs text-slate-400">Monthly Report Management</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-4">Enter admin password to continue</p>
          <input
            type="password"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="Password"
            className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {error && (
            <p className="text-red-500 text-xs mb-3">{error}</p>
          )}
          <button
            onClick={handleLogin}
            className="w-full bg-blue-950 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-blue-900 transition-colors"
          >
            Login
          </button>
          <p className="text-xs text-slate-400 text-center mt-4">
            
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">S</span>
          </div>
          <div>
            <p className="font-bold text-slate-800 text-sm">STC Admin Panel</p>
            <p className="text-xs text-slate-400">Manage reports, projects and action items</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a href="/" className="text-xs text-blue-600 hover:underline">
            Back to Dashboard
          </a>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors"
          >
            Logout
          </button>
        </div>
      </header>
      <main className="p-6 max-w-6xl mx-auto">
        {children}
      </main>
    </div>
  );
}
