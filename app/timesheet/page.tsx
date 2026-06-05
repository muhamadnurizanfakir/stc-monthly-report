'use client';
import TimesheetCalendar from './TimesheetCalendar';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface Factory { id: string; code: string; name: string; sort_order: number; }
interface Session {
  id: string; user_id: string; factory_code: string;
  clock_in: string; clock_out: string | null;
  hours_worked: number | null; notes: string | null; date: string;
  ts_users?: { name: string; employee_id: string | null };
}

const FACTORY_COLORS: Record<string, string> = {
  STCSB: '#1e3a8a', SMCSB: '#0e7490', AASSB: '#b45309',
  SAISB: '#7c3aed', SBTSB: '#be185d', SIB: '#065f46',
  EXTERNAL: '#475569',
};
function getColor(code: string, idx: number) {
  const FALLBACKS = ['#1e3a8a','#0e7490','#b45309','#7c3aed','#be185d','#065f46','#b91c1c','#0369a1'];
  return FACTORY_COLORS[code] ?? FALLBACKS[idx % FALLBACKS.length];
}

type NavItem = 'overview' | 'sessions' | 'calculation' | 'calendar';

export default function TimesheetDashboard() {
  const [factories, setFactories] = useState<Factory[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessions, setActiveSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [nav, setNav] = useState<NavItem>('overview');
  const [generating, setGenerating] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<Session | null>(null);
  const [deleteModal, setDeleteModal] = useState<Session | null>(null);
  const [modalPassword, setModalPassword] = useState('');
  const [modalError, setModalError] = useState('');
  const [editForm, setEditForm] = useState({ date: '', clock_in: '', clock_out: '', factory_code: '', notes: '' });
  const [modalSaving, setModalSaving] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  });
  const [filterUser, setFilterUser] = useState('');
  const [allUsers, setAllUsers] = useState<{id: string; name: string}[]>([]);

  useEffect(() => { fetchData(); }, [selectedMonth]);

  async function verifyPassword() {
    const res = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: modalPassword }) });
    const data = await res.json();
    return data.ok;
  }

  async function handleDeleteSession() {
    setModalSaving(true);
    const ok = await verifyPassword();
    if (!ok) { setModalError('Wrong password.'); setModalSaving(false); return; }
    await supabase.from('ts_sessions').delete().eq('id', deleteModal!.id);
    setDeleteModal(null); setModalPassword(''); setModalError('');
    fetchData();
    setModalSaving(false);
  }

  async function handleEditSession() {
    setModalSaving(true);
    const ok = await verifyPassword();
    if (!ok) { setModalError('Wrong password.'); setModalSaving(false); return; }
    const date = editForm.date || editModal!.date;
    const clockIn = new Date(date + 'T' + editForm.clock_in + ':00+08:00').toISOString();
    const clockOut = editForm.clock_out ? new Date(date + 'T' + editForm.clock_out + ':00+08:00').toISOString() : null;
    const hrs = clockOut ? parseFloat(((new Date(clockOut).getTime() - new Date(clockIn).getTime()) / 3600000).toFixed(2)) : null;
    await supabase.from('ts_sessions').update({
      clock_in: clockIn, clock_out: clockOut, hours_worked: hrs,
      factory_code: editForm.factory_code, notes: editForm.notes || null,
    }).eq('id', editModal!.id);
    setEditModal(null); setModalPassword(''); setModalError('');
    fetchData();
    setModalSaving(false);
  }

  async function generateInvoice(factoryCode: string) {
    setGenerating(factoryCode);
    try {
      const res = await fetch(`/api/invoice?period=${selectedMonth}&factory=${factoryCode}`);
      const data = await res.json();
      const { generateFactoryInvoice } = await import('./invoiceGenerator');
      await generateFactoryInvoice(data.stc, data.factory, data.sessions, selectedMonth);
    } catch { alert('Error generating invoice'); }
    setGenerating(null);
  }

  async function generateAllInvoices() {
    setGenerating('all');
    try {
      const { generateAllFactoryInvoices } = await import('./invoiceGenerator');
      const allData = [];
      for (const fac of factories) {
        const res = await fetch(`/api/invoice?period=${selectedMonth}&factory=${fac.code}`);
        const data = await res.json();
        if (data.sessions?.length > 0) allData.push({ factory: data.factory, sessions: data.sessions, stc: data.stc });
      }
      if (allData.length === 0) { alert('No sessions found for any factory this month.'); setGenerating(null); return; }
      await generateAllFactoryInvoices(allData[0].stc, allData, selectedMonth);
    } catch { alert('Error generating invoices'); }
    setGenerating(null);
  }

  async function fetchData() {
    setLoading(true);
    const lastDay = (() => { const [y,m] = selectedMonth.split('-'); return new Date(parseInt(y), parseInt(m), 0).toISOString().split('T')[0]; })();
    const [{ data: fac }, { data: usrData }, { data: ses }, { data: activeSes }] = await Promise.all([
      supabase.from('ts_factories').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('ts_users').select('id, name').eq('is_active', true).order('name'),
      supabase.from('ts_sessions').select('*, ts_users(name, employee_id, designation, hourly_rate)')
        .gte('date', selectedMonth + '-01')
        .lte('date', lastDay)
        .order('clock_in', { ascending: false }),
      supabase.from('ts_sessions').select('*, ts_users(name, employee_id)')
        .is('clock_out', null),
    ]);
    setFactories(fac ?? []);
    setAllUsers(usrData ?? []);
    setSessions(ses ?? []);
    // Auto clock-out sessions that are still active from previous days
    const yesterdayStr = new Date(Date.now() - 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
    const oldActiveSessions = (activeSes ?? []).filter(s => s.date <= yesterdayStr);
    for (const s of oldActiveSessions) {
      // Clock out at 23:59 on the session date
      const autoClockOut = new Date(s.date + 'T23:59:00+08:00').toISOString();
      const hrs = parseFloat(((new Date(autoClockOut).getTime() - new Date(s.clock_in).getTime()) / 3600000).toFixed(2));
      await supabase.from('ts_sessions').update({
        clock_out: autoClockOut,
        hours_worked: Math.min(hrs, 12), // cap at 12 hours
        notes: (s.notes ? s.notes + ' | ' : '') + 'Auto clock-out 23:59',
      }).eq('id', s.id);
    }
    // Refetch active sessions after auto clock-out
    const { data: freshActive } = await supabase.from('ts_sessions').select('*, ts_users(name, employee_id)').is('clock_out', null);
    setActiveSessions(freshActive ?? []);
    setLoading(false);
    setLoading(false);
  }

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
  // activeSessions comes from state now - always current regardless of month filter

  const factoryStats = useMemo(() => factories.map((fac, idx) => {
    const fs = sessions.filter(s => s.factory_code === fac.code);
    const todayH = sessions.filter(s => s.factory_code === fac.code && s.date === today).reduce((a, s) => a + (s.hours_worked ?? 0), 0);
    const monthH = fs.reduce((a, s) => a + (s.hours_worked ?? 0), 0);
    const active = activeSessions.filter(s => s.factory_code === fac.code);
    return { ...fac, todayH, monthH, active, color: getColor(fac.code, idx) };
  }), [factories, sessions, today, activeSessions]);

  const pieData = useMemo(() =>
    factoryStats.filter(f => f.monthH > 0).map(f => ({ name: f.code, value: parseFloat(f.monthH.toFixed(1)), color: f.color })),
  [factoryStats]);

  const totalMonthH = factoryStats.reduce((a, f) => a + f.monthH, 0);

  // Session history filtered

  const filteredSessions = useMemo(() => {
    if (!filterUser) return sessions;
    return sessions.filter(s => (s.ts_users as {name:string}|undefined)?.name === filterUser);
  }, [sessions, filterUser]);

  const filteredTotalH = filteredSessions.reduce((a, s) => a + (s.hours_worked ?? 0), 0);

  const renderLabel = ({ cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, value = 0 }: { cx?: number; cy?: number; midAngle?: number; innerRadius?: number; outerRadius?: number; value?: number }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const pct = totalMonthH > 0 ? Math.round((value / totalMonthH) * 100) : 0;
    if (pct < 5) return null;
    return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>{pct}%</text>;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <div className="bg-blue-950 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <a href="/" className="text-blue-300 hover:text-white text-xs transition-colors">← Home</a>
          <span className="text-blue-700">|</span>
          <div className="flex items-center gap-2">
            <span className="text-xl">🕐</span>
            <div>
              <p className="text-white font-bold text-sm">Timesheet</p>
              <p className="text-blue-300 text-xs">Factory Time Tracking</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
            className="border border-blue-800 bg-blue-900 text-white rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <a href="/timesheet/clock" className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold transition-colors">🕐 Clock In/Out</a>
          <a href="/admin/timesheet" className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold transition-colors">⚙️ Manage</a>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-48 bg-blue-950 border-r border-blue-900 shrink-0 py-4">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'sessions', label: 'Session History', icon: '📋' },
            { id: 'calculation', label: 'Calculation', icon: '💰' },
          ].map(item => (
            <button key={item.id} onClick={() => setNav(item.id as NavItem)}
              className={"w-full flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors " + (nav === item.id ? "bg-orange-500 text-white" : "text-blue-300 hover:text-white hover:bg-blue-900")}>
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
          <div className="mt-4 px-4 border-t border-blue-900 pt-4">
            <p className="text-xs text-blue-500 mb-2">Active Now</p>
            {activeSessions.length === 0
              ? <p className="text-xs text-blue-600">Nobody clocked in</p>
              : activeSessions.map(s => (
                <div key={s.id} className="flex items-center gap-1.5 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0"></span>
                  <p className="text-xs text-green-400 truncate">{(s.ts_users as {name:string}|undefined)?.name ?? '—'}</p>
                </div>
              ))
            }
            <div className="mt-4 border-t border-blue-900 pt-3">
              <p className="text-xs text-blue-500 mb-2">All Staff — {selectedMonth}</p>
              {allUsers.map(u => {
                const count = sessions.filter(s => (s.ts_users as {name:string}|undefined)?.name === u.name).length;
                const isActive = activeSessions.some(s => (s.ts_users as {name:string}|undefined)?.name === u.name);
                return (
                  <button key={u.id}
                    onClick={() => setFilterUser(filterUser === u.name ? '' : u.name)}
                    className={"w-full flex items-center gap-1.5 mb-1 px-1 py-0.5 rounded hover:bg-blue-800/40 transition-colors text-left " + (filterUser === u.name ? 'bg-blue-800/60' : '')}>
                    <span className={"w-1.5 h-1.5 rounded-full shrink-0 " + (isActive ? 'bg-green-400 animate-pulse' : count > 0 ? 'bg-blue-400' : 'bg-slate-600')}></span>
                    <span className="text-xs text-blue-200 truncate flex-1">{u.name}</span>
                    <span className={"text-xs font-bold shrink-0 " + (count > 0 ? 'text-orange-400' : 'text-slate-500')}>
                      [{count}]
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* OVERVIEW */}
          {nav === 'calendar' && (
            <div className="h-full">
              <TimesheetCalendar />
            </div>
          )}
          {nav === 'overview' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-xl font-bold text-slate-800">Factory Overview</h1>
                <p className="text-xs text-slate-500">{activeSessions.length} currently clocked in · {totalMonthH.toFixed(1)}h this month</p>
              </div>

              {/* Big pie left + factory cards right */}
              <div className="flex gap-6 items-start">
                {/* Pie Chart */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 flex gap-8 items-center shrink-0">
                  <div className="shrink-0 w-96">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Hours Distribution</p>
                  {pieData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={360}>
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" outerRadius={160} dataKey="value" labelLine={false} label={renderLabel}>
                            {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value}h (${totalMonthH > 0 ? Math.round((Number(value)/totalMonthH)*100) : 0}%)`, 'Hours']} contentStyle={{ fontSize: 11 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </>
                  ) : (
                    <div className="h-72 flex items-center justify-center text-slate-400 text-sm">No data yet</div>
                  )}
                  </div>

                </div>

                {/* Factory Cards Grid */}
                <div className="flex-1 grid grid-cols-2 xl:grid-cols-3 gap-4 content-start">
                  {factoryStats.map(fac => (
                    <div key={fac.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <div className="px-2 py-1 rounded text-xs font-bold text-white" style={{ background: fac.color }}>{fac.code}</div>
                        {fac.active.length > 0 && (
                          <span className="flex items-center gap-1 text-xs text-green-600 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block"></span>
                            {fac.active.length} active
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-slate-600 mb-3 leading-tight">{fac.name}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-50 rounded-lg p-2">
                          <p className="text-xs text-slate-400">Today</p>
                          <p className="text-base font-bold text-slate-800">{fac.todayH.toFixed(1)}<span className="text-xs font-normal text-slate-400">h</span></p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-2">
                          <p className="text-xs text-slate-400">Month</p>
                          <p className="text-base font-bold text-slate-800">{fac.monthH.toFixed(1)}<span className="text-xs font-normal text-slate-400">h</span></p>
                        </div>
                      </div>
                      {fac.active.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-100">
                          {fac.active.map(s => (
                            <p key={s.id} className="text-xs text-green-600 truncate">🟢 {(s.ts_users as {name:string}|undefined)?.name ?? 'Unknown'}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* CALCULATION */}
          {nav === 'calculation' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-bold text-slate-800">Monthly Charges</h1>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-slate-500 mr-2">Based on hourly rates × hours worked</p>
                  <button onClick={generateAllInvoices} disabled={generating !== null}
                    className="px-3 py-1.5 bg-blue-950 hover:bg-blue-900 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors">
                    {generating === 'all' ? '⏳ Generating...' : '📄 Generate All Invoices'}
                  </button>
                </div>
              </div>

              {/* Summary by Factory */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="font-bold text-slate-700">Charge Summary by Factory</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{selectedMonth}</p>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left py-2 px-4 font-semibold text-slate-500">Factory</th>
                      <th className="text-right py-2 px-4 font-semibold text-slate-500">Total Hours</th>
                      <th className="text-right py-2 px-4 font-semibold text-slate-500">Total Charge (RM)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {factories.map((fac, i) => {
                      const fs = sessions.filter(s => s.factory_code === fac.code);
                      const totalHrs = fs.reduce((a, s) => a + (s.hours_worked ?? 0), 0);
                      const totalCharge = fs.reduce((a, s) => a + ((s.hours_worked ?? 0) * ((s.ts_users as {hourly_rate?: number|null}|undefined)?.hourly_rate ?? 0)), 0);
                      return (
                        <tr key={fac.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                          <td className="py-2 px-4">
                            <span className="px-2 py-0.5 rounded text-white text-xs font-semibold" style={{ background: getColor(fac.code, i) }}>{fac.code}</span>
                            <span className="ml-2 text-slate-600">{fac.name}</span>
                          </td>
                          <td className="py-2 px-4 text-right font-mono text-slate-700">{totalHrs.toFixed(1)}h</td>
                          <td className="py-2 px-4 text-right font-semibold text-blue-700">RM {totalCharge.toFixed(2)}</td>
                          <td className="py-2 px-4 text-right">
                            {totalHrs > 0 && (
                              <button onClick={() => generateInvoice(fac.code)} disabled={generating !== null}
                                className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100 disabled:opacity-50">
                                {generating === fac.code ? '⏳' : '📄'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-blue-50 border-t-2 border-blue-200">
                      <td className="py-2 px-4 font-bold text-slate-800">TOTAL</td>
                      <td className="py-2 px-4 text-right font-bold font-mono text-slate-800">{sessions.reduce((a, s) => a + (s.hours_worked ?? 0), 0).toFixed(1)}h</td>
                      <td className="py-2 px-4 text-right font-bold text-blue-800">RM {sessions.reduce((a, s) => a + ((s.hours_worked ?? 0) * ((s.ts_users as {hourly_rate?: number|null}|undefined)?.hourly_rate ?? 0)), 0).toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Detail by Engineer */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="font-bold text-slate-700">Charge Detail by Engineer</h3>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left py-2 px-4 font-semibold text-slate-500">Engineer</th>
                      <th className="text-left py-2 px-4 font-semibold text-slate-500">Designation</th>
                      <th className="text-left py-2 px-4 font-semibold text-slate-500">Factory</th>
                      <th className="text-right py-2 px-4 font-semibold text-slate-500">Rate (RM/hr)</th>
                      <th className="text-right py-2 px-4 font-semibold text-slate-500">Hours</th>
                      <th className="text-right py-2 px-4 font-semibold text-slate-500">Charge (RM)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.filter(s => s.hours_worked).map((s, i) => {
                      const user = s.ts_users as {name:string; employee_id:string|null; designation?:string; hourly_rate?:number}|undefined;
                      const rate = user?.hourly_rate ?? 0;
                      const charge = (s.hours_worked ?? 0) * rate;
                      const color = getColor(s.factory_code, 0);
                      return (
                        <tr key={s.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                          <td className="py-2 px-4 font-semibold text-slate-800">{user?.name ?? '—'}</td>
                          <td className="py-2 px-4 text-slate-500">{user?.designation ?? '—'}</td>
                          <td className="py-2 px-4"><span className="px-2 py-0.5 rounded text-white text-xs font-semibold" style={{ background: color }}>{s.factory_code}</span></td>
                          <td className="py-2 px-4 text-right font-mono text-slate-600">{rate > 0 ? `RM ${rate.toFixed(2)}` : '—'}</td>
                          <td className="py-2 px-4 text-right font-mono text-slate-600">{s.hours_worked}h</td>
                          <td className="py-2 px-4 text-right font-semibold text-blue-700">{charge > 0 ? `RM ${charge.toFixed(2)}` : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SESSION HISTORY */}
          {nav === 'sessions' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-bold text-slate-800">Session History</h1>
                <div className="flex items-center gap-3">
                  <select value={filterUser} onChange={e => setFilterUser(e.target.value)}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">All Employees</option>
                    {allUsers.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                  </select>
                  {filterUser && <button onClick={() => setFilterUser('')} className="text-xs text-slate-400 hover:text-slate-600">Clear</button>}
                </div>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs text-slate-500">Total Sessions</p>
                  <p className="text-2xl font-bold text-slate-800">{filteredSessions.length}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs text-slate-500">Total Hours</p>
                  <p className="text-2xl font-bold text-slate-800">{filteredTotalH.toFixed(1)}h</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs text-slate-500">{filterUser ? 'Employee' : 'Employees'}</p>
                  <p className="text-2xl font-bold text-slate-800">{filterUser ? filterUser : new Set(filteredSessions.map(s => (s.ts_users as {name:string}|undefined)?.name)).size}</p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {loading ? (
                  <div className="py-8 text-center text-slate-400 text-sm">Loading...</div>
                ) : filteredSessions.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-sm">No sessions found.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left py-2 px-4 font-semibold text-slate-500">Date</th>
                          <th className="text-left py-2 px-4 font-semibold text-slate-500">Employee</th>
                          <th className="text-left py-2 px-4 font-semibold text-slate-500">Factory</th>
                          <th className="text-left py-2 px-4 font-semibold text-slate-500">Clock In</th>
                          <th className="text-left py-2 px-4 font-semibold text-slate-500">Clock Out</th>
                          <th className="text-left py-2 px-4 font-semibold text-slate-500">Hours</th>
                          <th className="text-left py-2 px-4 font-semibold text-slate-500">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSessions.map((s, i) => {
                          const color = getColor(s.factory_code, 0);
                          const user = s.ts_users as {name:string;employee_id:string|null}|undefined;
                          return (
                            <tr key={s.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                              <td className="py-2 px-4 font-mono text-slate-600">{new Date(s.date + 'T00:00:00').toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: '2-digit' })}</td>
                              <td className="py-2 px-4 font-semibold text-slate-800">{user?.name ?? '—'}{user?.employee_id ? <span className="text-slate-400 font-normal ml-1">({user.employee_id})</span> : ''}</td>
                              <td className="py-2 px-4"><span className="px-2 py-0.5 rounded text-white text-xs font-semibold" style={{ background: color }}>{s.factory_code}</span></td>
                              <td className="py-2 px-4 font-mono text-slate-600">{new Date(s.clock_in).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}</td>
                              <td className="py-2 px-4 font-mono text-slate-600">{s.clock_out ? new Date(s.clock_out).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' }) : <span className="text-green-600 font-semibold animate-pulse">Active</span>}</td>
                              <td className="py-2 px-4">{s.hours_worked != null ? <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-semibold">{s.hours_worked}h</span> : '—'}</td>
                              <td className="py-2 px-4 text-slate-500 max-w-[150px] truncate">{s.notes ?? '—'}</td>
                              <td className="py-2 px-4">
                                <div className="flex gap-1">
                                  <button onClick={() => { setEditModal(s); setEditForm({ date: s.date, clock_in: new Date(s.clock_in).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: false }), clock_out: s.clock_out ? new Date(s.clock_out).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: false }) : '', factory_code: s.factory_code, notes: s.notes ?? '' }); setModalPassword(''); setModalError(''); }}
                                    className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100">✏️</button>
                                  <button onClick={() => { setDeleteModal(s); setModalPassword(''); setModalError(''); }}
                                    className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100">🗑️</button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      {/* DELETE MODAL */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="font-bold text-slate-800 text-lg mb-2">Delete Session</h3>
            <p className="text-sm text-slate-600 mb-1">Delete session for <span className="font-semibold">{(deleteModal.ts_users as {name:string}|undefined)?.name}</span>?</p>
            <p className="text-xs text-slate-400 mb-4">{new Date(deleteModal.date + 'T00:00:00').toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })} · {deleteModal.factory_code} · {deleteModal.hours_worked ?? 0}h</p>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Admin Password</label>
            <input type="password" value={modalPassword} onChange={e => setModalPassword(e.target.value)}
              placeholder="Enter password" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-red-400" />
            {modalError && <p className="text-red-500 text-xs mb-2">{modalError}</p>}
            <div className="flex gap-2 mt-2">
              <button onClick={handleDeleteSession} disabled={modalSaving || !modalPassword}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                {modalSaving ? 'Deleting...' : '🗑️ Delete'}
              </button>
              <button onClick={() => { setDeleteModal(null); setModalPassword(''); setModalError(''); }}
                className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-200">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="font-bold text-slate-800 text-lg mb-1">Edit Session</h3>
            <p className="text-xs text-slate-400 mb-4">{(editModal.ts_users as {name:string}|undefined)?.name} · {new Date(editModal.date + 'T00:00:00').toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Clock In</label>
                <div className="mb-3">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
                  <input type="date" value={editForm.date} onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <input type="time" value={editForm.clock_in} onChange={e => setEditForm({ ...editForm, clock_in: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Clock Out</label>
                <input type="time" value={editForm.clock_out} onChange={e => setEditForm({ ...editForm, clock_out: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Factory</label>
                <select value={editForm.factory_code} onChange={e => setEditForm({ ...editForm, factory_code: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {factories.map(f => <option key={f.id} value={f.code}>{f.code} — {f.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
                <input type="text" value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Admin Password</label>
            <input type="password" value={modalPassword} onChange={e => setModalPassword(e.target.value)}
              placeholder="Enter password" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {modalError && <p className="text-red-500 text-xs mb-2">{modalError}</p>}
            <div className="flex gap-2 mt-2">
              <button onClick={handleEditSession} disabled={modalSaving || !modalPassword}
                className="flex-1 py-2 bg-blue-950 hover:bg-blue-900 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                {modalSaving ? 'Saving...' : '✅ Save Changes'}
              </button>
              <button onClick={() => { setEditModal(null); setModalPassword(''); setModalError(''); }}
                className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-200">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
