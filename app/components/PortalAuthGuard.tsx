'use client';
import { useState, useEffect, ReactNode } from 'react';

interface PortalAuthGuardProps {
  children: ReactNode;
  module: 'portal' | 'lab';
  redirectTo?: string;
}

export default function PortalAuthGuard({ children, module }: PortalAuthGuardProps) {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const storageKey = module === 'lab' ? 'stc_lab_auth' : 'stc_portal_auth';
  const apiEndpoint = module === 'lab' ? '/api/lab-auth' : '/api/auth';
  const moduleLabel = module === 'lab' ? 'Lab Testing Portal' : 'STC Operations Portal';
  const moduleIcon = module === 'lab' ? '🔬' : '🏢';

  useEffect(() => {
    const auth = sessionStorage.getItem(storageKey);
    if (auth === 'true') setAuthed(true);
    setChecking(false);
  }, [storageKey]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const body = module === 'lab' 
      ? { type: 'portal_password', password }
      : { password };
    
    const res = await fetch(apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    
    if (data.ok) {
      sessionStorage.setItem(storageKey, 'true');
      setAuthed(true);
    } else {
      setError('Incorrect password. Please try again.');
      setPassword('');
    }
    setLoading(false);
  }

  if (checking) return null;

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center" 
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0f172a 100%)' }}>
        <div className="w-full max-w-sm px-4">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-orange-500 flex items-center justify-center text-3xl shadow-xl mx-auto mb-4">
              {moduleIcon}
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">{moduleLabel}</h1>
            <p className="text-blue-300 text-sm">Sapura Technical Centre Sdn Bhd</p>
          </div>
          <form onSubmit={handleLogin} className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-8">
            <h2 className="text-white font-bold text-lg mb-1">Access Required</h2>
            <p className="text-blue-300 text-xs mb-6">Enter the password to continue</p>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-blue-200 mb-2">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Enter password" autoFocus
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-blue-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            {error && <p className="text-red-400 text-xs mb-4">{error}</p>}
            <button type="submit" disabled={loading || !password}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50">
              {loading ? 'Verifying...' : 'Enter →'}
            </button>
            <a href="/" className="block text-center text-blue-400 text-xs mt-4 hover:text-blue-300">← Back to Home</a>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
