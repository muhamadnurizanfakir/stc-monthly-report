'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';

interface Session {
  id: string;
  date: string;
  clock_in: string;
  clock_out: string | null;
  factory_code: string;
  notes: string | null;
  hours_worked: number | null;
  ts_users?: { name: string; short_name: string | null };
}

interface User {
  id: string;
  name: string;
  short_name: string | null;
}

// Generate consistent color per user
function getUserColor(userId: string, index: number): string {
  const COLORS = [
    '#2563eb','#16a34a','#dc2626','#d97706','#7c3aed',
    '#0891b2','#be185d','#059669','#ea580c','#4f46e5',
    '#0284c7','#15803d','#b91c1c','#a16207','#6d28d9',
  ];
  return COLORS[index % COLORS.length];
}

export default function TimesheetCalendar() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  });
  const [sessions, setSessions] = useState<Session[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [filterUser, setFilterUser] = useState<string>('');

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  async function fetchData() {
    setLoading(true);
    const [y, m] = selectedMonth.split('-');
    const lastDay = new Date(parseInt(y), parseInt(m), 0).toISOString().split('T')[0];
    const [{ data: sess }, { data: usr }] = await Promise.all([
      supabase.from('ts_sessions')
        .select('id, date, clock_in, clock_out, factory_code, notes, hours_worked, ts_users(name, short_name)')
        .gte('date', selectedMonth + '-01')
        .lte('date', lastDay)
        .order('clock_in'),
      supabase.from('ts_users').select('id, name, short_name').eq('is_active', true).order('name'),
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setSessions((sess ?? []) as any);
    setUsers(usr ?? []);
    setLoading(false);
  }

  // Build user color map
  const userColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    users.forEach((u, i) => { map[u.name] = getUserColor(u.id, i); });
    return map;
  }, [users]);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const [y, m] = selectedMonth.split('-');
    const year = parseInt(y);
    const month = parseInt(m);
    const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month, 0).getDate();
    const days: (number | null)[] = [];
    // Fill leading empty days (Mon-based: shift Sun to end)
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [selectedMonth]);

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
  const [y, m] = selectedMonth.split('-');

  const filteredSessions = filterUser
    ? sessions.filter(s => (s.ts_users as {name:string}|undefined)?.name === filterUser)
    : sessions;

  const daySessionsByDate = useMemo(() => {
    const map: Record<string, Session[]> = {};
    filteredSessions.forEach(s => {
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s);
    });
    return map;
  }, [filteredSessions]);

  const selectedDaySessions = selectedDay ? (daySessionsByDate[selectedDay] ?? []) : [];

  return (
    <div className="flex gap-4 h-full">
      {/* Calendar */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => {
              const d = new Date(parseInt(y), parseInt(m) - 2, 1);
              setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
              setSelectedDay(null);
            }} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm">←</button>
            <h2 className="text-lg font-bold text-slate-800">
              {new Date(parseInt(y), parseInt(m)-1, 1).toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })}
            </h2>
            <button onClick={() => {
              const d = new Date(parseInt(y), parseInt(m), 1);
              setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
              setSelectedDay(null);
            }} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm">→</button>
          </div>
          <input type="month" value={selectedMonth} onChange={e => { setSelectedMonth(e.target.value); setSelectedDay(null); }}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        {/* Day headers - Mon to Sun */}
        <div className="grid grid-cols-7 mb-1">
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
            <div key={d} className={"text-center text-xs font-bold py-2 " + (d === 'Sat' || d === 'Sun' ? 'text-red-400' : 'text-slate-500')}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading...</div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => {
              if (!day) return <div key={idx} />;
              const dateStr = `${y}-${m}-${String(day).padStart(2,'0')}`;
              const daySessions = daySessionsByDate[dateStr] ?? [];
              const isToday = dateStr === today;
              const isSelected = dateStr === selectedDay;
              const isWeekend = (idx % 7) >= 5; // Sat=5, Sun=6
              return (
                <div key={idx}
                  onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                  className={"min-h-24 rounded-xl border cursor-pointer transition-all p-1.5 " +
                    (isSelected ? 'border-blue-500 bg-blue-50 shadow-md' :
                     isToday ? 'border-orange-400 bg-orange-50' :
                     isWeekend ? 'border-slate-200 bg-red-50/30' :
                     'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50')}>
                  <div className={"text-xs font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full " +
                    (isToday ? 'bg-orange-500 text-white' : isWeekend ? 'text-red-400' : 'text-slate-600')}>
                    {day}
                  </div>
                  <div className="space-y-0.5 overflow-hidden">
                    {daySessions.slice(0, 4).map(s => {
                      const name = (s.ts_users as {name:string}|undefined)?.name ?? '';
                      const short = (s.ts_users as {short_name?:string|null}|undefined)?.short_name ?? name.split(' ').map(w => w[0]).join('').slice(0,3);
                      const color = userColorMap[name] ?? '#64748b';
                      return (
                        <div key={s.id}
                          className="text-xs px-1 py-0.5 rounded truncate font-medium text-white"
                          style={{ background: color }}
                          title={`${s.factory_code}: ${name} ${s.notes ? '- ' + s.notes : ''}`}>
                          {s.factory_code}: {short}{s.notes ? ` - ${s.notes}` : ''}
                        </div>
                      );
                    })}
                    {daySessions.length > 4 && (
                      <div className="text-xs text-slate-400 pl-1">+{daySessions.length - 4} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right Panel */}
      <div className="w-72 shrink-0">
        {/* User filter legend */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Staff Legend</p>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            <button onClick={() => setFilterUser('')}
              className={"w-full flex items-center gap-2 px-2 py-1 rounded-lg text-xs transition-colors " + (!filterUser ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50 text-slate-600')}>
              <span className="w-3 h-3 rounded-full bg-slate-400 shrink-0"></span>
              All Staff
            </button>
            {users.map((u, i) => {
              const color = getUserColor(u.id, i);
              const sessCount = sessions.filter(s => (s.ts_users as {name:string}|undefined)?.name === u.name).length;
              return (
                <button key={u.id} onClick={() => setFilterUser(filterUser === u.name ? '' : u.name)}
                  className={"w-full flex items-center gap-2 px-2 py-1 rounded-lg text-xs transition-colors " + (filterUser === u.name ? 'bg-slate-100 font-bold' : 'hover:bg-slate-50')}>
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: color }}></span>
                  <span className="truncate flex-1 text-left text-slate-700">{u.name}</span>
                  <span className="shrink-0 font-bold text-slate-400">[{sessCount}]</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected day details */}
        {selectedDay && (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
              {new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            {selectedDaySessions.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No sessions</p>
            ) : (
              <div className="space-y-2">
                {selectedDaySessions.map(s => {
                  const name = (s.ts_users as {name:string}|undefined)?.name ?? '';
                  const short = (s.ts_users as {short_name?:string|null}|undefined)?.short_name ?? '—';
                  const color = userColorMap[name] ?? '#64748b';
                  const clockIn = new Date(s.clock_in).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: false });
                  const clockOut = s.clock_out ? new Date(s.clock_out).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: false }) : 'Active';
                  return (
                    <div key={s.id} className="flex items-start gap-2 p-2 rounded-lg bg-slate-50">
                      <div className="w-1 self-stretch rounded-full shrink-0 mt-1" style={{ background: color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className="text-xs font-bold px-1 rounded text-white" style={{ background: color }}>{short}</span>
                          <span className="text-xs font-semibold text-slate-700 truncate">{name}</span>
                        </div>
                        <p className="text-xs text-slate-500">{s.factory_code} · {clockIn} → {clockOut} {s.hours_worked ? `(${s.hours_worked.toFixed(1)}h)` : ''}</p>
                        {s.notes && <p className="text-xs text-slate-400 mt-0.5 italic">{s.notes}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
