'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

interface TsUser {
  id: string;
  name: string;
  employee_id: string | null;
  default_factory: string | null;
}
interface Factory {
  id: string;
  code: string;
  name: string;
}
interface ActiveSession {
  id: string;
  factory_code: string;
  clock_in: string;
}

type Step = 'select_user' | 'enter_pin' | 'select_factory' | 'active';

export default function ClockPage() {
  const [users, setUsers] = useState<TsUser[]>([]);
  const [factories, setFactories] = useState<Factory[]>([]);
  const [step, setStep] = useState<Step>('select_user');
  const [selectedUser, setSelectedUser] = useState<TsUser | null>(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [selectedFactory, setSelectedFactory] = useState('');
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchInit();
  }, []);

  const fetchActiveSession = useCallback(async (userId: string) => {
    const { data } = await supabase.from('ts_sessions')
      .select('id, factory_code, clock_in')
      .eq('user_id', userId)
      .is('clock_out', null)
      .maybeSingle();
    if (data) {
      setActiveSession(data);
      setSelectedFactory(data.factory_code);
      setStep('active');
    } else {
      setActiveSession(null);
      setStep('select_factory');
    }
  }, []);

  useEffect(() => {
    if (!activeSession) return;
    // Set immediately so no 1-second delay
    setElapsed(Math.floor((Date.now() - new Date(activeSession.clock_in).getTime()) / 1000));
    const interval = setInterval(() => {
      // Always recalculate from DB timestamp - works after reconnect/reopen
      setElapsed(Math.floor((Date.now() - new Date(activeSession.clock_in).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  async function fetchInit() {
    const [{ data: u }, { data: f }] = await Promise.all([
      supabase.from('ts_users').select('id, name, employee_id, default_factory').eq('is_active', true).order('name'),
      supabase.from('ts_factories').select('*').eq('is_active', true).order('sort_order'),
    ]);
    setUsers(u ?? []);
    setFactories(f ?? []);
  }

  async function handlePinSubmit() {
    if (!selectedUser || pin.length !== 4) return;
    const { data } = await supabase.from('ts_users').select('id').eq('id', selectedUser.id).eq('pin', pin).maybeSingle();
    if (!data) { setPinError('Wrong PIN. Try again.'); setPin(''); return; }
    setPinError('');
    await fetchActiveSession(selectedUser.id);
  }

  async function handleClockIn() {
    if (!selectedUser || !selectedFactory) return;
    setSaving(true);
    const now = new Date().toISOString();
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
    const { data } = await supabase.from('ts_sessions').insert([{
      user_id: selectedUser.id,
      factory_code: selectedFactory,
      clock_in: now,
      date: today,
    }]).select().single();
    setActiveSession(data);
    setStep('active');
    setSaving(false);
  }

  async function handleClockOut() {
    if (!activeSession || !selectedUser) return;
    setSaving(true);
    const now = new Date().toISOString();
    const hours = parseFloat(((Date.now() - new Date(activeSession.clock_in).getTime()) / 3600000).toFixed(2));
    await supabase.from('ts_sessions').update({
      clock_out: now,
      hours_worked: hours,
      notes: notes || null,
    }).eq('id', activeSession.id);
    setActiveSession(null);
    setElapsed(0);
    setNotes('');
    setStep('select_factory');
    setSaving(false);
  }

  function formatElapsed(sec: number) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  function reset() {
    setStep('select_user');
    setSelectedUser(null);
    setPin('');
    setPinError('');
    setSelectedFactory('');
    setActiveSession(null);
    setElapsed(0);
    setNotes('');
    setSearch('');
  }

  const FACTORY_COLORS: Record<string, string> = {
    STCSB: '#1e3a8a', SMCSB: '#0e7490', AASSB: '#b45309',
    SAISB: '#7c3aed', SBTSB: '#be185d', EXTERNAL: '#475569',
  };

  const filteredUsers = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || (u.employee_id ?? '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-blue-950 flex flex-col">
      {/* Header */}
      <div className="bg-blue-950 border-b border-blue-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/timesheet" className="text-blue-300 hover:text-white text-xs">← Dashboard</a>
          <span className="text-blue-700">|</span>
          <p className="text-white font-bold text-sm">🕐 Clock In / Out</p>
        </div>
        {selectedUser && (
          <button onClick={reset} className="text-xs text-blue-300 hover:text-white">Switch User ↩</button>
        )}
      </div>

      <div className="flex-1 flex items-start justify-center pt-10 px-4">
        <div className="w-full max-w-md">

          {/* STEP 1: Select User */}
          {step === 'select_user' && (
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-blue-950 px-6 py-4">
                <h2 className="text-white font-bold text-lg">Select Your Name</h2>
                <p className="text-blue-300 text-xs mt-1">Tap your name to continue</p>
              </div>
              <div className="p-4">
                <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search name or ID..." className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {filteredUsers.map(u => (
                    <button key={u.id} onClick={() => { setSelectedUser(u); setStep('enter_pin'); }}
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
                  {filteredUsers.length === 0 && <p className="text-center text-slate-400 text-sm py-4">No users found.</p>}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Enter PIN */}
          {step === 'enter_pin' && selectedUser && (
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-blue-950 px-6 py-4">
                <h2 className="text-white font-bold text-lg">Hello, {selectedUser.name}!</h2>
                <p className="text-blue-300 text-xs mt-1">Enter your 4-digit PIN</p>
              </div>
              <div className="p-6">
                <div className="flex justify-center gap-3 mb-6">
                  {[0,1,2,3].map(i => (
                    <div key={i} className={"w-12 h-12 rounded-xl border-2 flex items-center justify-center text-xl font-bold " + (pin.length > i ? "border-blue-500 bg-blue-50 text-blue-800" : "border-slate-200 text-slate-300")}>
                      {pin.length > i ? '●' : '○'}
                    </div>
                  ))}
                </div>
                {pinError && <p className="text-red-500 text-xs text-center mb-3">{pinError}</p>}
                <div className="grid grid-cols-3 gap-3">
                  {[1,2,3,4,5,6,7,8,9,null,0,'⌫'].map((k, i) => (
                    <button key={i} disabled={k === null}
                      onClick={() => {
                        if (k === '⌫') { setPin(p => p.slice(0,-1)); }
                        else if (k !== null && pin.length < 4) {
                          const newPin = pin + k.toString();
                          setPin(newPin);
                        }
                      }}
                      className={"h-14 rounded-xl text-lg font-bold transition-all " + (k === null ? "invisible" : k === '⌫' ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-slate-50 text-slate-800 hover:bg-blue-50 hover:text-blue-700 border border-slate-200")}>
                      {k}
                    </button>
                  ))}
                </div>
                <button onClick={handlePinSubmit} disabled={pin.length !== 4}
                  className="w-full mt-3 py-3 bg-blue-950 text-white rounded-xl font-bold text-sm disabled:opacity-40 transition-colors hover:bg-blue-900">
                  ✓ Confirm PIN
                </button>
                <button onClick={() => { setStep('select_user'); setPin(''); setPinError(''); }}
                  className="w-full mt-2 text-xs text-slate-400 hover:text-slate-600">← Back</button>
              </div>
            </div>
          )}

          {/* STEP 3: Select Factory */}
          {step === 'select_factory' && selectedUser && (
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-blue-950 px-6 py-4">
                <h2 className="text-white font-bold text-lg">{selectedUser.name}</h2>
                <p className="text-blue-300 text-xs mt-1">Select factory to clock in</p>
              </div>
              <div className="p-4 space-y-2">
                {factories.map(fac => {
                  const color = FACTORY_COLORS[fac.code] ?? '#475569';
                  return (
                    <button key={fac.id} onClick={() => setSelectedFactory(fac.code)}
                      className={"w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all " + (selectedFactory === fac.code ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300")}>
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: color }}>{fac.code}</div>
                      <p className="font-semibold text-slate-700 text-sm">{fac.name}</p>
                      {selectedFactory === fac.code && <span className="ml-auto text-blue-500">✓</span>}
                    </button>
                  );
                })}
                <button onClick={handleClockIn} disabled={!selectedFactory || saving}
                  className="w-full mt-2 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm disabled:opacity-50 transition-colors">
                  {saving ? 'Starting...' : '🟢 Clock In'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Active Session */}
          {step === 'active' && selectedUser && activeSession && (
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="px-6 py-4" style={{ background: FACTORY_COLORS[activeSession.factory_code] ?? '#1e3a8a' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-bold text-lg">{selectedUser.name}</p>
                    <p className="text-white/70 text-xs">{activeSession.factory_code} — Clocked In</p>
                  </div>
                  <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
                </div>
              </div>
              <div className="p-6 text-center">
                <p className="text-xs text-slate-400 mb-1">Time Elapsed</p>
                <p className="text-5xl font-bold text-slate-800 font-mono mb-1">{formatElapsed(elapsed)}</p>
                <p className="text-xs text-slate-400 mb-6">
                  Since {new Date(activeSession.clock_in).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-slate-600 mb-1 text-left">Notes (optional)</label>
                  <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="What did you work on?" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <button onClick={handleClockOut} disabled={saving}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm disabled:opacity-50 transition-colors">
                  {saving ? 'Saving...' : '🔴 Clock Out'}
                </button>
                <button onClick={() => { setStep('select_factory'); setActiveSession(null); }}
                  className="w-full mt-2 py-2 text-xs text-slate-400 hover:text-slate-600">
                  + Clock into another factory
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
