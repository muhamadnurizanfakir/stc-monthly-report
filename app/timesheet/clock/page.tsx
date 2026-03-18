'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface TsUser { id: string; name: string; employee_id: string | null; default_factory: string | null; designation: string | null; hourly_rate: number | null; }
interface Factory { id: string; code: string; name: string; }
interface ActiveSession { id: string; factory_code: string; clock_in: string; }
interface Session {
  id: string; factory_code: string; clock_in: string; clock_out: string | null;
  hours_worked: number | null; notes: string | null; date: string;
}

type Step = 'select_user' | 'enter_pin';
type Nav = 'timer' | 'overview' | 'history' | 'calculation';

const FACTORY_COLORS: Record<string, string> = {
  STCSB: '#1e3a8a', SMCSB: '#0e7490', AASSB: '#b45309',
  SAISB: '#7c3aed', SBTSB: '#be185d', SIB: '#065f46', EXTERNAL: '#475569',
};
const FALLBACK_COLORS = ['#1e3a8a','#0e7490','#b45309','#7c3aed','#be185d','#065f46','#b91c1c'];
function getColor(code: string, idx = 0) { return FACTORY_COLORS[code] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length]; }

export default function ClockPage() {
  const [users, setUsers] = useState<TsUser[]>([]);
  const [factories, setFactories] = useState<Factory[]>([]);
  const [step, setStep] = useState<Step>('select_user');
  const [selectedUser, setSelectedUser] = useState<TsUser | null>(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [search, setSearch] = useState('');
  const [nav, setNav] = useState<Nav>('timer');
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [selectedFactory, setSelectedFactory] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  });

  useEffect(() => { fetchInit(); }, []);

  const fetchActiveSession = useCallback(async (userId: string) => {
    const { data } = await supabase.from('ts_sessions')
      .select('id, factory_code, clock_in').eq('user_id', userId).is('clock_out', null).maybeSingle();
    if (data) { setActiveSession(data); setSelectedFactory(data.factory_code); }
    else setActiveSession(null);
  }, []);

  const fetchSessions = useCallback(async (userId: string, month: string) => {
    const { data } = await supabase.from('ts_sessions').select('*')
      .eq('user_id', userId).gte('date', month + '-01').lte('date', month + '-31')
      .order('clock_in', { ascending: false });
    setSessions(data ?? []);
  }, []);

  useEffect(() => {
    if (!activeSession) return;
    setElapsed(Math.floor((Date.now() - new Date(activeSession.clock_in).getTime()) / 1000));
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(activeSession.clock_in).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  useEffect(() => {
    if (selectedUser) fetchSessions(selectedUser.id, selectedMonth);
  }, [selectedMonth, selectedUser, fetchSessions]);

  async function fetchInit() {
    const [{ data: u }, { data: f }] = await Promise.all([
      supabase.from('ts_users').select('id, name, employee_id, default_factory, designation, hourly_rate').eq('is_active', true).order('name'),
      supabase.from('ts_factories').select('*').eq('is_active', true).order('sort_order'),
    ]);
    setUsers(u ?? []); setFactories(f ?? []);
  }

  async function handlePinSubmit() {
    if (!selectedUser || pin.length !== 4) return;
    const { data } = await supabase.from('ts_users').select('id').eq('id', selectedUser.id).eq('pin', pin).maybeSingle();
    if (!data) { setPinError('Wrong PIN. Try again.'); setPin(''); return; }
    setPinError('');
    await fetchActiveSession(selectedUser.id);
    await fetchSessions(selectedUser.id, selectedMonth);
    setNav('timer');
    setStep('select_user'); // reset login UI but user is now logged in
  }

  async function handleClockIn() {
    if (!selectedUser || !selectedFactory) return;
    setSaving(true);
    const now = new Date().toISOString();
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
    const { data } = await supabase.from('ts_sessions').insert([{
      user_id: selectedUser.id, factory_code: selectedFactory, clock_in: now, date: today,
    }]).select().single();
    setActiveSession(data);
    setSaving(false);
  }

  async function handleClockOut() {
    if (!activeSession || !selectedUser) return;
    setSaving(true);
    const hours = parseFloat(((Date.now() - new Date(activeSession.clock_in).getTime()) / 3600000).toFixed(2));
    await supabase.from('ts_sessions').update({ clock_out: new Date().toISOString(), hours_worked: hours, notes: notes || null }).eq('id', activeSession.id);
    setActiveSession(null); setElapsed(0); setNotes(''); setSelectedFactory('');
    await fetchSessions(selectedUser.id, selectedMonth);
    setSaving(false);
  }

  function formatElapsed(sec: number) {
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  function logout() {
    setSelectedUser(null); setActiveSession(null); setElapsed(0);
    setNotes(''); setSelectedFactory(''); setSessions([]); setPin(''); setPinError('');
    setNav('timer'); setSearch('');
  }

  // Stats for overview
  const factoryStats = useMemo(() => factories.map((fac, idx) => {
    const fs = sessions.filter(s => s.factory_code === fac.code);
    const monthH = fs.reduce((a, s) => a + (s.hours_worked ?? 0), 0);
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
    const todayH = fs.filter(s => s.date === todayStr).reduce((a, s) => a + (s.hours_worked ?? 0), 0);
    return { ...fac, monthH, todayH, color: getColor(fac.code, idx) };
  }), [factories, sessions]);

  const totalH = factoryStats.reduce((a, f) => a + f.monthH, 0);
  const pieData = factoryStats.filter(f => f.monthH > 0).map(f => ({ name: f.code, value: parseFloat(f.monthH.toFixed(2)), color: f.color }));

  const renderLabel = ({ cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, value = 0 }: { cx?: number; cy?: number; midAngle?: number; innerRadius?: number; outerRadius?: number; value?: number }) => {
    const R = Math.PI / 180;
    const r = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + r * Math.cos(-midAngle * R), y = cy + r * Math.sin(-midAngle * R);
    const pct = totalH > 0 ? Math.round((value / totalH) * 100) : 0;
    if (pct < 6) return null;
    return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>{pct}%</text>;
  };

  const filteredUsers = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || (u.employee_id ?? '').toLowerCase().includes(search.toLowerCase()));

  // ── LOGIN SCREENS ──
  if (!selectedUser || step === 'enter_pin') {
    return (
      <div className="min-h-screen bg-blue-950 flex flex-col">
        <div className="bg-blue-950 border-b border-blue-900 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/timesheet" className="text-blue-300 hover:text-white text-xs">← Dashboard</a>
            <span className="text-blue-700">|</span>
            <p className="text-white font-bold text-sm">🕐 Staff Login</p>
          </div>
        </div>
        <div className="flex-1 flex items-start justify-center pt-10 px-4">
          <div className="w-full max-w-md">

            {/* Select User */}
            {!selectedUser && (
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
                        <div className="w-9 h-9 rounded-full bg-blue-950 flex items-center justify-center text-white font-bold text-sm shrink-0">{u.name.charAt(0).toUpperCase()}</div>
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

            {/* Enter PIN */}
            {selectedUser && step === 'enter_pin' && (
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-blue-950 px-6 py-4">
                  <h2 className="text-white font-bold text-lg">Hello, {selectedUser.name}!</h2>
                  <p className="text-blue-300 text-xs mt-1">Enter your 4-digit PIN</p>
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
                  <button onClick={handlePinSubmit} disabled={pin.length !== 4}
                    className="w-full py-3 bg-blue-950 text-white rounded-xl font-bold text-sm disabled:opacity-40 hover:bg-blue-900 transition-colors mb-2">
                    ✓ Confirm PIN
                  </button>
                  <button onClick={() => { setSelectedUser(null); setPin(''); setPinError(''); setStep('select_user'); }}
                    className="w-full text-xs text-slate-400 hover:text-slate-600">← Back</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── PERSONAL DASHBOARD ──
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-blue-950 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <a href="/timesheet" className="text-blue-300 hover:text-white text-xs">← Dashboard</a>
          <span className="text-blue-700">|</span>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-sm">{selectedUser.name.charAt(0)}</div>
            <div>
              <p className="text-white font-bold text-sm">{selectedUser.name}</p>
              {selectedUser.employee_id && <p className="text-blue-300 text-xs">{selectedUser.employee_id}</p>}
            </div>
          </div>
          {activeSession && <span className="flex items-center gap-1 px-2 py-1 bg-green-900 rounded-full text-xs text-green-400 font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block"></span>Clocked In</span>}
        </div>
        <div className="flex items-center gap-2">
          <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
            className="border border-blue-800 bg-blue-900 text-white rounded-lg px-3 py-1.5 text-xs focus:outline-none" />
          <button onClick={logout} className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-xs font-semibold">Logout</button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-48 bg-blue-950 border-r border-blue-900 shrink-0 py-4">
          {([
            { id: 'timer', label: 'Timer', icon: '⏱️' },
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'history', label: 'Session History', icon: '📋' },
            { id: 'calculation', label: 'Calculation', icon: '💰' },
          ] as { id: Nav; label: string; icon: string }[]).map(item => (
            <button key={item.id} onClick={() => setNav(item.id)}
              className={"w-full flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors " + (nav === item.id ? "bg-orange-500 text-white" : "text-blue-300 hover:text-white hover:bg-blue-900")}>
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* TIMER */}
          {nav === 'timer' && (
            <div className="max-w-md mx-auto">
              {activeSession ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="px-6 py-4" style={{ background: getColor(activeSession.factory_code) }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-bold">{activeSession.factory_code}</p>
                        <p className="text-white/70 text-xs">{factories.find(f => f.code === activeSession.factory_code)?.name}</p>
                      </div>
                      <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
                    </div>
                  </div>
                  <div className="p-6 text-center">
                    <p className="text-xs text-slate-400 mb-1">Time Elapsed</p>
                    <p className="text-5xl font-bold text-slate-800 font-mono mb-1">{formatElapsed(elapsed)}</p>
                    <p className="text-xs text-slate-400 mb-6">Since {new Date(activeSession.clock_in).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}</p>
                    <div className="mb-4 text-left">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Notes (optional)</label>
                      <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
                        placeholder="What did you work on?" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <button onClick={handleClockOut} disabled={saving}
                      className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm disabled:opacity-50">
                      {saving ? 'Saving...' : '🔴 Clock Out'}
                    </button>
                    <button onClick={() => { setActiveSession(null); setSelectedFactory(''); }}
                      className="w-full mt-2 py-2 text-xs text-slate-400 hover:text-slate-600">+ Clock into another factory</button>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-blue-950 px-6 py-4">
                    <h2 className="text-white font-bold">Select Factory</h2>
                    <p className="text-blue-300 text-xs mt-1">Choose where you are working today</p>
                  </div>
                  <div className="p-4 space-y-2">
                    {factories.map(fac => (
                      <button key={fac.id} onClick={() => setSelectedFactory(fac.code)}
                        className={"w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all " + (selectedFactory === fac.code ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300")}>
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: getColor(fac.code) }}>{fac.code}</div>
                        <p className="font-semibold text-slate-700 text-sm text-left">{fac.name}</p>
                        {selectedFactory === fac.code && <span className="ml-auto text-blue-500 font-bold">✓</span>}
                      </button>
                    ))}
                    <button onClick={handleClockIn} disabled={!selectedFactory || saving}
                      className="w-full mt-2 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm disabled:opacity-50 transition-colors">
                      {saving ? 'Starting...' : '🟢 Clock In'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* OVERVIEW */}
          {nav === 'overview' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-bold text-slate-800">My Overview</h1>
                <p className="text-xs text-slate-500">{totalH.toFixed(1)}h this month</p>
              </div>
              <div className="flex gap-6 items-start">
                {/* Pie */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shrink-0 w-96 flex gap-6 items-center">
                  <div className="shrink-0 w-96">
                  {pieData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={360}>
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" outerRadius={160} dataKey="value" labelLine={false} label={renderLabel}>
                            {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value}h`, 'Hours']} contentStyle={{ fontSize: 11 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-slate-400 text-sm">No data this month</div>
                  )}
                  </div>

                </div>
                {/* Factory Cards */}
                <div className="flex-1 grid grid-cols-2 gap-4 content-start self-start">
                  {factoryStats.map(fac => (
                    <div key={fac.id} className="bg-white rounded-xl border border-slate-200 p-4">
                      <div className="px-2 py-1 rounded text-xs font-bold text-white inline-block mb-2" style={{ background: fac.color }}>{fac.code}</div>
                      <p className="text-xs font-semibold text-slate-600 mb-3 leading-tight">{fac.name}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-50 rounded-lg p-2">
                          <p className="text-xs text-slate-400">Today</p>
                          <p className="text-base font-bold text-slate-800">{fac.todayH.toFixed(1)}<span className="text-xs text-slate-400">h</span></p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-2">
                          <p className="text-xs text-slate-400">Month</p>
                          <p className="text-base font-bold text-slate-800">{fac.monthH.toFixed(1)}<span className="text-xs text-slate-400">h</span></p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {factoryStats.every(f => f.monthH === 0) && (
                    <div className="col-span-2 text-slate-400 text-sm text-center py-8">No sessions recorded this month.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SESSION HISTORY */}
          {nav === 'history' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-bold text-slate-800">My Sessions</h1>
                <p className="text-xs text-slate-500">{sessions.length} sessions · {totalH.toFixed(1)}h total</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {sessions.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-sm">No sessions this month.</div>
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Date</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Factory</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Clock In</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Clock Out</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Hours</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((s, i) => (
                        <tr key={s.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                          <td className="py-2 px-4 font-mono text-slate-600">{new Date(s.date + 'T00:00:00').toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: '2-digit' })}</td>
                          <td className="py-2 px-4"><span className="px-2 py-0.5 rounded text-white text-xs font-semibold" style={{ background: getColor(s.factory_code) }}>{s.factory_code}</span></td>
                          <td className="py-2 px-4 font-mono text-slate-600">{new Date(s.clock_in).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="py-2 px-4 font-mono text-slate-600">{s.clock_out ? new Date(s.clock_out).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' }) : <span className="text-green-600 font-semibold animate-pulse">Active</span>}</td>
                          <td className="py-2 px-4">{s.hours_worked != null ? <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-semibold">{s.hours_worked}h</span> : '—'}</td>
                          <td className="py-2 px-4 text-slate-500 max-w-xs truncate">{s.notes ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
          {/* CALCULATION */}
          {nav === 'calculation' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-bold text-slate-800">My Charges</h1>
                <p className="text-xs text-slate-500">{selectedMonth}</p>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs text-slate-500">Total Hours</p>
                  <p className="text-2xl font-bold text-slate-800">{totalH.toFixed(1)}h</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs text-slate-500">Hourly Rate</p>
                  <p className="text-2xl font-bold text-slate-800">{selectedUser.hourly_rate != null ? `RM ${selectedUser.hourly_rate.toFixed(2)}` : '—'}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs text-slate-500">Total Charge</p>
                  <p className="text-2xl font-bold text-blue-700">RM {(totalH * (selectedUser.hourly_rate ?? 0)).toFixed(2)}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="font-bold text-slate-700">Charge by Factory</h3>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left py-2 px-4 font-semibold text-slate-500">Factory</th>
                      <th className="text-right py-2 px-4 font-semibold text-slate-500">Hours</th>
                      <th className="text-right py-2 px-4 font-semibold text-slate-500">Rate (RM/hr)</th>
                      <th className="text-right py-2 px-4 font-semibold text-slate-500">Charge (RM)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {factoryStats.filter(f => f.monthH > 0).map((fac, i) => {
                      const rate = selectedUser.hourly_rate ?? 0;
                      const charge = fac.monthH * rate;
                      return (
                        <tr key={fac.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                          <td className="py-2 px-4"><span className="px-2 py-0.5 rounded text-white text-xs font-semibold mr-2" style={{ background: fac.color }}>{fac.code}</span>{fac.name}</td>
                          <td className="py-2 px-4 text-right font-mono text-slate-600">{fac.monthH.toFixed(1)}h</td>
                          <td className="py-2 px-4 text-right font-mono text-slate-600">RM {rate.toFixed(2)}</td>
                          <td className="py-2 px-4 text-right font-semibold text-blue-700">RM {charge.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-blue-50 border-t-2 border-blue-200">
                      <td className="py-2 px-4 font-bold text-slate-800">TOTAL</td>
                      <td className="py-2 px-4 text-right font-bold font-mono">{totalH.toFixed(1)}h</td>
                      <td className="py-2 px-4"></td>
                      <td className="py-2 px-4 text-right font-bold text-blue-800">RM {(totalH * (selectedUser.hourly_rate ?? 0)).toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
