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

type ViewMode = 'month' | 'week' | 'day';

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

  // Navigation helpers
  function navigate(dir: number) {
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() + dir);
    else if (viewMode === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCurrentDate(d);
    setSelectedDay(null);
  }

  function goToday() { setCurrentDate(new Date()); setSelectedDay(null); }

  // Month view data
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

  // Week view data
  const weekDays = useMemo(() => {
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

  const daySessionsByDate = useMemo(() => {
    const map: Record<string, Session[]> = {};
    sessions.forEach(s => {
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s);
    });
    return map;
  }, [sessions]);

  function renderEvent(s: Session, compact = false) {
    const name = (s.ts_users as {name:string}|undefined)?.name ?? '';
    const short = (s.ts_users as {short_name?:string|null}|undefined)?.short_name ?? name.split(' ').map(w => w[0]).join('').slice(0,3);
    const color = userColorMap[name] ?? '#64748b';
    const clockIn = new Date(s.clock_in).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: false });
    const clockOut = s.clock_out ? new Date(s.clock_out).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: false }) : '—';
    return (
      <div key={s.id}
        className={"text-xs px-1.5 py-0.5 rounded font-medium text-white truncate " + (compact ? '' : 'mb-0.5')}
        style={{ background: color }}
        title={`${name}: ${s.factory_code} ${clockIn}-${clockOut}${s.notes ? ' · ' + s.notes : ''}`}>
        {s.factory_code}: {short}{!compact && s.notes ? ` - ${s.notes}` : ''}
      </div>
    );
  }

  const headerTitle = useMemo(() => {
    if (viewMode === 'month') return currentDate.toLocaleDateString('en-MY', { month: 'long', year: 'numeric' });
    if (viewMode === 'week') {
      const start = weekDays[0];
      const end = weekDays[6];
      return `${new Date(start+'T12:00').toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })} – ${new Date(end+'T12:00').toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    return currentDate.toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }, [viewMode, currentDate, weekDays]);

  const selectedDaySessions = selectedDay ? (daySessionsByDate[selectedDay] ?? []) : [];

  return (
    <div className="flex flex-col h-full">
      {/* Top Navigation Bar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {/* Prev / Today / Next */}
        <div className="flex items-center gap-1">
          <button onClick={() => navigate(-1)}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-sm font-medium">←</button>
          <button onClick={goToday}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-sm font-medium">Today</button>
          <button onClick={() => navigate(1)}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-sm font-medium">→</button>
        </div>

        {/* Title */}
        <h2 className="text-lg font-bold text-slate-800 flex-1">{headerTitle}</h2>

        {/* View Mode Tabs */}
        <div className="flex items-center bg-slate-100 rounded-lg p-1 gap-0.5">
          {(['month','week','day'] as ViewMode[]).map(v => (
            <button key={v} onClick={() => { setViewMode(v); setSelectedDay(null); }}
              className={"px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors " +
                (viewMode === v ? 'bg-white text-blue-700 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700')}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-slate-400">Loading...</div>
      ) : (
        <div className="flex-1 overflow-auto">

          {/* ── MONTH VIEW ── */}
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
                  const m = String(currentDate.getMonth()+1).padStart(2,'0');
                  const dateStr = `${y}-${m}-${String(day).padStart(2,'0')}`;
                  const daySessions = daySessionsByDate[dateStr] ?? [];
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
                        {daySessions.slice(0, 3).map(s => renderEvent(s))}
                        {daySessions.length > 3 && <div className="text-xs text-slate-400 pl-1">+{daySessions.length - 3} more</div>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected day detail */}
              {selectedDay && selectedDaySessions.length > 0 && (
                <div className="mt-4 bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-sm font-bold text-slate-700 mb-3">
                    {new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    <span className="ml-2 text-slate-400 font-normal text-xs">({selectedDaySessions.length} sessions)</span>
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {selectedDaySessions.map(s => {
                      const name = (s.ts_users as {name:string}|undefined)?.name ?? '';
                      const short = (s.ts_users as {short_name?:string|null}|undefined)?.short_name ?? '—';
                      const color = userColorMap[name] ?? '#64748b';
                      const clockIn = new Date(s.clock_in).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: false });
                      const clockOut = s.clock_out ? new Date(s.clock_out).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: false }) : 'Active';
                      return (
                        <div key={s.id} className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                          <div className="w-1 self-stretch rounded-full shrink-0" style={{ background: color }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-xs font-bold px-1.5 py-0.5 rounded text-white" style={{ background: color }}>{short}</span>
                              <span className="text-xs font-semibold text-slate-700 truncate">{name}</span>
                            </div>
                            <p className="text-xs text-slate-500">{s.factory_code} · {clockIn} → {clockOut}{s.hours_worked ? ` (${s.hours_worked.toFixed(1)}h)` : ''}</p>
                            {s.notes && <p className="text-xs text-slate-400 mt-0.5 italic">{s.notes}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── WEEK VIEW ── */}
          {viewMode === 'week' && (
            <div>
              <div className="grid grid-cols-7 gap-1 mb-1">
                {weekDays.map(dateStr => {
                  const d = new Date(dateStr + 'T12:00');
                  const isToday = dateStr === today;
                  return (
                    <div key={dateStr} className="text-center">
                      <p className="text-xs text-slate-500">{d.toLocaleDateString('en-MY', { weekday: 'short' })}</p>
                      <div className={"text-sm font-bold w-8 h-8 mx-auto flex items-center justify-center rounded-full " +
                        (isToday ? 'bg-orange-500 text-white' : 'text-slate-700')}>
                        {d.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {weekDays.map((dateStr, idx) => {
                  const daySessions = daySessionsByDate[dateStr] ?? [];
                  const isToday = dateStr === today;
                  const isWeekend = idx >= 5;
                  return (
                    <div key={dateStr}
                      className={"min-h-48 rounded-xl border p-2 " +
                        (isToday ? 'border-orange-300 bg-orange-50/50' :
                         isWeekend ? 'border-slate-200 bg-red-50/20' : 'border-slate-200 bg-white')}>
                      <div className="space-y-1">
                        {daySessions.map(s => {
                          const name = (s.ts_users as {name:string}|undefined)?.name ?? '';
                          const short = (s.ts_users as {short_name?:string|null}|undefined)?.short_name ?? name.split(' ').map(w => w[0]).join('').slice(0,3);
                          const color = userColorMap[name] ?? '#64748b';
                          const clockIn = new Date(s.clock_in).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: false });
                          const clockOut = s.clock_out ? new Date(s.clock_out).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: false }) : 'Active';
                          return (
                            <div key={s.id} className="rounded-lg p-1.5 text-white text-xs" style={{ background: color }}>
                              <p className="font-bold">{s.factory_code}: {short}</p>
                              <p className="opacity-90">{clockIn} → {clockOut}</p>
                              {s.notes && <p className="opacity-75 truncate">{s.notes}</p>}
                            </div>
                          );
                        })}
                        {daySessions.length === 0 && <p className="text-xs text-slate-300 text-center pt-4">—</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── DAY VIEW ── */}
          {viewMode === 'day' && (() => {
            const dateStr = currentDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
            const daySessions = daySessionsByDate[dateStr] ?? [];
            return (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <p className="text-lg font-bold text-slate-800 mb-4">
                  {currentDate.toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  <span className="ml-2 text-sm text-slate-400 font-normal">{daySessions.length} session(s)</span>
                </p>
                {daySessions.length === 0 ? (
                  <div className="text-center py-16 text-slate-300">
                    <p className="text-4xl mb-2">📅</p>
                    <p>No sessions on this day</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {daySessions.map(s => {
                      const name = (s.ts_users as {name:string}|undefined)?.name ?? '';
                      const short = (s.ts_users as {short_name?:string|null}|undefined)?.short_name ?? '—';
                      const color = userColorMap[name] ?? '#64748b';
                      const clockIn = new Date(s.clock_in).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: false });
                      const clockOut = s.clock_out ? new Date(s.clock_out).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: false }) : 'Active ●';
                      return (
                        <div key={s.id} className="flex items-start gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50">
                          <div className="w-2 self-stretch rounded-full shrink-0" style={{ background: color }} />
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ background: color }}>
                            {short}
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-slate-800">{name}</p>
                            <p className="text-sm text-slate-500 mt-0.5">{s.factory_code} · {clockIn} → {clockOut}{s.hours_worked ? ` · ${s.hours_worked.toFixed(1)}h` : ''}</p>
                            {s.notes && <p className="text-sm text-slate-400 mt-1 italic">📝 {s.notes}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

        </div>
      )}
    </div>
  );
}
