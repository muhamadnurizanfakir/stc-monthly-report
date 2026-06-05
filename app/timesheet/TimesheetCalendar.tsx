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

type ViewMode = 'month' | 'month-list' | 'week-list' | 'day-list';

function getUserColor(index: number): string {
  const COLORS = [
    '#2563eb','#16a34a','#dc2626','#d97706','#7c3aed',
    '#0891b2','#be185d','#059669','#ea580c','#4f46e5',
    '#0284c7','#15803d','#b91c1c','#a16207','#6d28d9',
  ];
  return COLORS[index % COLORS.length];
}

export default function TimesheetCalendar() {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [sessions, setSessions] = useState<Session[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const selectedMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}`;

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

  const userColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    users.forEach((u, i) => { map[u.name] = getUserColor(i); });
    return map;
  }, [users]);

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });

  function navigate(dir: number) {
    const d = new Date(currentDate);
    if (viewMode === 'month' || viewMode === 'month-list') d.setMonth(d.getMonth() + dir);
    else if (viewMode === 'week-list') d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCurrentDate(d);
    setSelectedDay(null);
  }

  // Month grid days
  const monthDays = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const days: (number | null)[] = [];
    for (let i = 0; i < offset; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [currentDate]);

  // Week dates
  const weekDates = useMemo(() => {
    const d = new Date(currentDate);
    const day = d.getDay();
    const offset = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - offset);
    return Array.from({ length: 7 }, (_, i) => {
      const dd = new Date(d);
      dd.setDate(d.getDate() + i);
      return dd.toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
    });
  }, [currentDate]);

  // Month list dates
  const monthListDates = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(y, m, i + 1);
      return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
    });
  }, [currentDate]);

  const sessionsByDate = useMemo(() => {
    const map: Record<string, Session[]> = {};
    sessions.forEach(s => {
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s);
    });
    return map;
  }, [sessions]);

  const headerTitle = useMemo(() => {
    if (viewMode === 'month' || viewMode === 'month-list')
      return currentDate.toLocaleDateString('en-MY', { month: 'long', year: 'numeric' });
    if (viewMode === 'week-list') {
      const start = weekDates[0];
      const end = weekDates[6];
      return `${new Date(start+'T12:00').toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })} – ${new Date(end+'T12:00').toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    return currentDate.toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }, [viewMode, currentDate, weekDates]);

  function renderSessionRow(s: Session) {
    const name = (s.ts_users as {name:string}|undefined)?.name ?? '';
    const short = (s.ts_users as {short_name?:string|null}|undefined)?.short_name ?? name.split(' ').map((w:string) => w[0]).join('').slice(0,3);
    const color = userColorMap[name] ?? '#64748b';
    const clockIn = new Date(s.clock_in).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: false });
    const clockOut = s.clock_out ? new Date(s.clock_out).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: false }) : 'Active';
    return (
      <div key={s.id} className="flex items-center gap-3 py-2 px-4 hover:bg-slate-50 transition-colors">
        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
        <span className="text-xs font-bold px-2 py-0.5 rounded text-white shrink-0 w-12 text-center" style={{ background: color }}>{short}</span>
        <span className="text-sm font-medium text-slate-700 flex-1 truncate">{name}</span>
        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded shrink-0">{s.factory_code}</span>
        <span className="text-xs font-mono text-slate-600 shrink-0">{clockIn} – {clockOut}</span>
        {s.hours_worked && <span className="text-xs font-bold text-blue-600 shrink-0">{s.hours_worked.toFixed(1)}h</span>}
        {!s.clock_out && <span className="text-xs text-green-500 font-bold animate-pulse shrink-0">● Active</span>}
        {s.notes && <span className="text-xs text-slate-400 italic truncate max-w-36 shrink-0">📝 {s.notes}</span>}
      </div>
    );
  }

  function renderDateBlock(dateStr: string) {
    const daySessions = sessionsByDate[dateStr] ?? [];
    const isToday = dateStr === today;
    const d = new Date(dateStr + 'T12:00:00');
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;

    return (
      <div key={dateStr} className={"bg-white rounded-xl border overflow-hidden " +
        (isToday ? 'border-orange-400' : 'border-slate-200')}>
        <div className={"flex items-center gap-4 px-4 py-3 border-b " +
          (isToday ? 'bg-orange-50 border-orange-200' :
           isWeekend ? 'bg-red-50/40 border-slate-100' : 'bg-slate-50 border-slate-100')}>
          <div className={"w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 " +
            (isToday ? 'bg-orange-500 text-white' : isWeekend ? 'bg-red-100 text-red-600' : 'bg-blue-950 text-white')}>
            <span className="text-xs font-medium leading-none">{d.toLocaleDateString('en-MY', { weekday: 'short' })}</span>
            <span className="text-lg font-bold leading-tight">{d.getDate()}</span>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">
              {d.toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })}
              {isToday && <span className="ml-2 text-xs font-normal text-orange-500">Today</span>}
            </p>
            <p className="text-xs text-slate-400">
              {daySessions.length} session(s) · {daySessions.reduce((a, s) => a + (s.hours_worked ?? 0), 0).toFixed(1)}h total
            </p>
          </div>
          {daySessions.length === 0 && (
            <span className="ml-auto text-xs text-slate-300 italic">No sessions</span>
          )}
        </div>
        {daySessions.length > 0 && (
          <div className="divide-y divide-slate-50">
            {daySessions.map(s => renderSessionRow(s))}
          </div>
        )}
      </div>
    );
  }

  const VIEWS: { id: ViewMode; label: string }[] = [
    { id: 'month', label: 'Month' },
    { id: 'month-list', label: 'Month List' },
    { id: 'week-list', label: 'Week List' },
    { id: 'day-list', label: 'Day' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Top Nav */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1">
          <button onClick={() => navigate(-1)}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-sm">←</button>
          <button onClick={() => { setCurrentDate(new Date()); setSelectedDay(null); }}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-sm">Today</button>
          <button onClick={() => navigate(1)}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-sm">→</button>
        </div>
        <h2 className="text-lg font-bold text-slate-800 flex-1">{headerTitle}</h2>
        <div className="flex items-center bg-slate-100 rounded-lg p-1 gap-0.5">
          {VIEWS.map(v => (
            <button key={v.id} onClick={() => { setViewMode(v.id); setSelectedDay(null); }}
              className={"px-3 py-1.5 rounded-md text-sm font-medium transition-colors " +
                (viewMode === v.id ? 'bg-white text-blue-700 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700')}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-slate-400">Loading...</div>
      ) : (
        <div className="flex-1 overflow-y-auto">

          {/* ── MONTH GRID VIEW ── */}
          {viewMode === 'month' && (
            <div>
              <div className="grid grid-cols-7 mb-1">
                {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
                  <div key={d} className={"text-center text-xs font-bold py-2 " + (d === 'Sat' || d === 'Sun' ? 'text-red-400' : 'text-slate-500')}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {monthDays.map((day, idx) => {
                  if (!day) return <div key={idx} />;
                  const y = currentDate.getFullYear();
                  const mo = String(currentDate.getMonth()+1).padStart(2,'0');
                  const dateStr = `${y}-${mo}-${String(day).padStart(2,'0')}`;
                  const daySessions = sessionsByDate[dateStr] ?? [];
                  const isToday = dateStr === today;
                  const isSelected = dateStr === selectedDay;
                  const isWeekend = (idx % 7) >= 5;
                  return (
                    <div key={idx} onClick={() => setSelectedDay(isSelected ? null : dateStr)}
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
                        {daySessions.slice(0,3).map(s => {
                          const name = (s.ts_users as {name:string}|undefined)?.name ?? '';
                          const short = (s.ts_users as {short_name?:string|null}|undefined)?.short_name ?? name.split(' ').map((w:string) => w[0]).join('').slice(0,3);
                          const color = userColorMap[name] ?? '#64748b';
                          return (
                            <div key={s.id} className="text-xs px-1.5 py-0.5 rounded text-white truncate font-medium" style={{ background: color }}>
                              {s.factory_code}: {short}{s.notes ? ` - ${s.notes}` : ''}
                            </div>
                          );
                        })}
                        {daySessions.length > 3 && <div className="text-xs text-slate-400 pl-1">+{daySessions.length - 3} more</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Selected day detail */}
              {selectedDay && (sessionsByDate[selectedDay] ?? []).length > 0 && (
                <div className="mt-4 bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-sm font-bold text-slate-700 mb-3">
                    {new Date(selectedDay+'T12:00').toLocaleDateString('en-MY', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
                    <span className="ml-2 text-slate-400 font-normal text-xs">({(sessionsByDate[selectedDay]??[]).length} sessions)</span>
                  </p>
                  <div className="divide-y divide-slate-100">
                    {(sessionsByDate[selectedDay]??[]).map(s => renderSessionRow(s))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── MONTH LIST VIEW ── */}
          {viewMode === 'month-list' && (
            <div className="space-y-2">
              {monthListDates.map(dateStr => renderDateBlock(dateStr))}
            </div>
          )}

          {/* ── WEEK LIST VIEW ── */}
          {viewMode === 'week-list' && (
            <div className="space-y-2">
              {weekDates.map(dateStr => renderDateBlock(dateStr))}
            </div>
          )}

          {/* ── DAY VIEW ── */}
          {viewMode === 'day-list' && (() => {
            const dateStr = currentDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
            return <div>{renderDateBlock(dateStr)}</div>;
          })()}

        </div>
      )}
    </div>
  );
}
