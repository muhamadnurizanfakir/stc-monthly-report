'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Factory {
  id: string;
  code: string;
  name: string;
  sort_order: number;
}
interface Session {
  id: string;
  user_id: string;
  factory_code: string;
  clock_in: string;
  clock_out: string | null;
  hours_worked: number | null;
  notes: string | null;
  date: string;
  ts_users?: { name: string; employee_id: string | null };
}

export default function TimesheetDashboard() {
  const [factories, setFactories] = useState<Factory[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  });

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
  const todaySessions = sessions.filter(s => s.date === today);

  function getFactoryStats(code: string) {
    const fSessions = sessions.filter(s => s.factory_code === code);
    const todayHours = todaySessions.filter(s => s.factory_code === code).reduce((a, s) => a + (s.hours_worked ?? 0), 0);
    const monthHours = fSessions.reduce((a, s) => a + (s.hours_worked ?? 0), 0);
    const activeNow = activeSessions.filter(s => s.factory_code === code);
    return { todayHours, monthHours, activeNow };
  }

  const FACTORY_COLORS: Record<string, string> = {
    STCSB: '#1e3a8a', SMCSB: '#0e7490', AASSB: '#b45309',
    SAISB: '#7c3aed', SBTSB: '#be185d', EXTERNAL: '#475569',
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-blue-950 px-6 py-4 flex items-center justify-between">
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
          <a href="/timesheet/clock" className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold transition-colors">🕐 Clock In/Out</a>
          <a href="/admin/timesheet" className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold transition-colors">⚙️ Manage Users</a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Month selector + summary */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Factory Summary</h1>
            <p className="text-xs text-slate-500 mt-0.5">{activeSessions.length} currently clocked in</p>
          </div>
          <div className="flex items-center gap-3">
            <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        {/* Factory Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {factories.map(fac => {
            const stats = getFactoryStats(fac.code);
            const color = FACTORY_COLORS[fac.code] ?? '#475569';
            return (
              <div key={fac.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="px-2 py-1 rounded text-xs font-bold text-white" style={{ background: color }}>{fac.code}</div>
                  {stats.activeNow.length > 0 && (
                    <span className="flex items-center gap-1 text-xs text-green-600 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block"></span>
                      {stats.activeNow.length} active
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-slate-700 mb-3">{fac.name}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 rounded-lg p-2">
                    <p className="text-xs text-slate-400">Today</p>
                    <p className="text-lg font-bold text-slate-800">{stats.todayHours.toFixed(1)}<span className="text-xs font-normal text-slate-400">h</span></p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2">
                    <p className="text-xs text-slate-400">This Month</p>
                    <p className="text-lg font-bold text-slate-800">{stats.monthHours.toFixed(1)}<span className="text-xs font-normal text-slate-400">h</span></p>
                  </div>
                </div>
                {stats.activeNow.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    {stats.activeNow.map(s => (
                      <p key={s.id} className="text-xs text-green-600 truncate">
                        🟢 {(s.ts_users as {name:string}|undefined)?.name ?? 'Unknown'} — since {new Date(s.clock_in).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Recent Sessions Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-700">Session History</h3>
            <span className="text-xs text-slate-400">{sessions.length} sessions this month</span>
          </div>
          {loading ? (
            <div className="py-8 text-center text-slate-400 text-sm">Loading...</div>
          ) : sessions.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">No sessions this month.</div>
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
                  {sessions.map((s, i) => {
                    const color = FACTORY_COLORS[s.factory_code] ?? '#475569';
                    const user = s.ts_users as {name:string;employee_id:string|null}|undefined;
                    return (
                      <tr key={s.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className="py-2 px-4 font-mono text-slate-600">{new Date(s.date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}</td>
                        <td className="py-2 px-4 font-semibold text-slate-800">{user?.name ?? '—'} {user?.employee_id ? <span className="text-slate-400 font-normal">({user.employee_id})</span> : ''}</td>
                        <td className="py-2 px-4"><span className="px-2 py-0.5 rounded text-white text-xs font-semibold" style={{ background: color }}>{s.factory_code}</span></td>
                        <td className="py-2 px-4 font-mono text-slate-600">{new Date(s.clock_in).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="py-2 px-4 font-mono text-slate-600">{s.clock_out ? new Date(s.clock_out).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' }) : <span className="text-green-600 font-semibold animate-pulse">Active</span>}</td>
                        <td className="py-2 px-4">{s.hours_worked != null ? <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-semibold">{s.hours_worked}h</span> : '—'}</td>
                        <td className="py-2 px-4 text-slate-500">{s.notes ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
