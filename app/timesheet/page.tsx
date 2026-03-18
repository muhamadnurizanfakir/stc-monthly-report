'use client';
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

type NavItem = 'overview' | 'sessions';

export default function TimesheetDashboard() {
  const [factories, setFactories] = useState<Factory[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [nav, setNav] = useState<NavItem>('overview');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  });
  const [filterUser, setFilterUser] = useState('');

  useEffect(() => { fetchData(); }, [selectedMonth]);

  async function fetchData() {
    setLoading(true);
    const [{ data: fac }, { data: ses }] = await Promise.all([
      supabase.from('ts_factories').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('ts_sessions').select('*, ts_users(name, employee_id)')
        .gte('date', selectedMonth + '-01')
        .lte('date', selectedMonth + '-31')
        .order('clock_in', { ascending: false }),
    ]);
    setFactories(fac ?? []);
    setSessions(ses ?? []);
    setLoading(false);
  }

  const today = new Date().toISOString().split('T')[0];
  const activeSessions = sessions.filter(s => !s.clock_out);

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
  const allUsers = useMemo(() => {
    const names = new Set(sessions.map(s => (s.ts_users as {name:string}|undefined)?.name ?? ''));
    return Array.from(names).filter(Boolean).sort();
  }, [sessions]);

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
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* OVERVIEW */}
          {nav === 'overview' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-xl font-bold text-slate-800">Factory Overview</h1>
                <p className="text-xs text-slate-500">{activeSessions.length} currently clocked in · {totalMonthH.toFixed(1)}h this month</p>
              </div>

              {/* Big pie left + factory cards right */}
              <div className="flex gap-6">
                {/* Pie Chart */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shrink-0 w-72 flex flex-col items-center">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 self-start">Hours Distribution</p>
                  {pieData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={240}>
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" outerRadius={105} dataKey="value" labelLine={false} label={renderLabel}>
                            {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value}h (${totalMonthH > 0 ? Math.round((Number(value)/totalMonthH)*100) : 0}%)`, 'Hours']} contentStyle={{ fontSize: 11 }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="w-full mt-2 space-y-1.5">
                        {pieData.map(d => (
                          <div key={d.name} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: d.color }}></span>
                              <span className="font-semibold text-slate-700">{d.name}</span>
                            </div>
                            <span className="text-slate-500">{d.value}h · {totalMonthH > 0 ? Math.round((d.value/totalMonthH)*100) : 0}%</span>
                          </div>
                        ))}
                        <div className="pt-1 border-t border-slate-100 flex justify-between text-xs font-bold text-slate-700">
                          <span>Total</span><span>{totalMonthH.toFixed(1)}h</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-400 text-sm py-16">No data yet</div>
                  )}
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

          {/* SESSION HISTORY */}
          {nav === 'sessions' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-bold text-slate-800">Session History</h1>
                <div className="flex items-center gap-3">
                  <select value={filterUser} onChange={e => setFilterUser(e.target.value)}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">All Employees</option>
                    {allUsers.map(u => <option key={u} value={u}>{u}</option>)}
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
    </div>
  );
}
