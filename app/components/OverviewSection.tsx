'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { Project, ShohinProject, EngineeringProject, CustomProject } from '../lib/supabase';
import { StatusBadge, ProgressBar } from './StatusBadge';

interface OverviewProps {
  projects:            Project[];
  shohinProjects:      ShohinProject[];
  engineeringProjects: EngineeringProject[];
  customProjects:      CustomProject[];
  reportLabel:         string;
}

const CAT_COLORS: Record<string, string> = {
  coil_spring:    '#1e3a8a',
  stabilizer_bar: '#0891b2',
  engineering:    '#7c3aed',
};

const CAT_LABELS: Record<string, string> = {
  coil_spring:    'Coil Spring',
  stabilizer_bar: 'Stabilizer Bar',
  engineering:    'Engineering',
};

export default function OverviewSection({ projects, shohinProjects, engineeringProjects, customProjects, reportLabel }: OverviewProps) {
  const stats = useMemo(() => {
    const total     = projects.length + shohinProjects.length + engineeringProjects.length + customProjects.length;
    const onTrack   = projects.filter(p => p.status === 'on_track').length;
    const completed = projects.filter(p => p.completion_pct === 100).length;
    const delayed   = projects.filter(p => p.status === 'delayed').length;
    const avgPct    = Math.round(projects.reduce((s, p) => s + p.completion_pct, 0) / (projects.length || 1));

    const statusDist = [
      { name: 'On Track',  value: onTrack,   color: '#16a34a' },
      { name: 'Completed', value: completed,  color: '#2563eb' },
      { name: 'Delayed',   value: delayed,    color: '#dc2626' },
    ].filter(d => d.value > 0);

    const byCategory = Object.entries(
      projects.reduce((acc, p) => {
        acc[p.category] = (acc[p.category] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value }));

    return { total, onTrack, completed, delayed, avgPct, statusDist, byCategory };
  }, [projects, shohinProjects, engineeringProjects, customProjects]);

  const kpis = [
    { label: 'Total Projects',   value: stats.total,        sub: 'active this period',   color: '#1e3a8a' },
    { label: 'On Track',         value: stats.onTrack,      sub: 'within schedule',       color: '#16a34a' },
    { label: 'Avg Completion',   value: `${stats.avgPct}%`, sub: 'across all projects',   color: '#f97316' },
    { label: 'Completed',        value: stats.completed,    sub: '100% milestone hit',    color: '#7c3aed' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-bold text-3xl text-slate-800">Project Overview</h1>
          <p className="text-slate-500 mt-0.5 text-sm">{reportLabel} — Functions Reporting & Presentation</p>
        </div>
        <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold border border-orange-200">
          FRP1 · 13-Feb-2026
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5"
            style={{ borderTop: `3px solid ${k.color}` }}>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{k.label}</p>
            <p className="font-black text-4xl mt-1 text-slate-800">{k.value}</p>
            <p className="text-slate-400 text-xs mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h3 className="font-bold text-slate-700 mb-4">Status Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={stats.statusDist} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                {stats.statusDist.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => `${v} projects`} />
              <Legend iconType="circle" iconSize={8} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h3 className="font-bold text-slate-700 mb-4">Customer Mix</h3>
          <div className="space-y-3 mt-2">
            {Object.entries(
              projects.reduce((acc, p) => {
                const c = p.customer ?? 'Unknown';
                acc[c] = (acc[c] ?? 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            ).map(([customer, count]) => (
              <div key={customer} className="flex items-center gap-2 text-xs">
                <span className="w-20 text-slate-500 truncate shrink-0">{customer}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full"
                    style={{ width: `${(count / projects.length) * 100}%`, background: '#1e3a8a' }}
                  />
                </div>
                <span className="w-4 text-slate-600 font-semibold shrink-0">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-700">All Projects Summary</h3>
          <span className="text-xs text-slate-400">{projects.length} projects</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left py-2 px-4 font-semibold text-slate-500">#</th>
                <th className="text-left py-2 px-4 font-semibold text-slate-500">Project</th>
                <th className="text-left py-2 px-4 font-semibold text-slate-500">Category</th>
                <th className="text-left py-2 px-4 font-semibold text-slate-500">Customer</th>
                <th className="text-left py-2 px-4 font-semibold text-slate-500">SOP</th>
                <th className="text-left py-2 px-4 font-semibold text-slate-500 w-36">Progress</th>
                <th className="text-left py-2 px-4 font-semibold text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {[...projects].sort((a, b) => {
                const order: Record<string, number> = { coil_spring: 0, stabilizer_bar: 1, engineering: 2 };
                const catDiff = (order[a.category] ?? 3) - (order[b.category] ?? 3);
                if (catDiff !== 0) return catDiff;
                return a.project_code.localeCompare(b.project_code);
              }).map((p, i) => (
                <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  <td className="py-2 px-4 text-slate-400 font-mono">{p.project_code}</td>
                  <td className="py-2 px-4 font-medium text-slate-700">{p.project_name}</td>
                  <td className="py-2 px-4">
                    <span className="px-2 py-0.5 rounded text-xs font-semibold"
                      style={{ background: CAT_COLORS[p.category] + '18', color: CAT_COLORS[p.category] }}>
                      {CAT_LABELS[p.category]}
                    </span>
                  </td>
                  <td className="py-2 px-4 text-slate-500">{p.customer ?? '—'}</td>
                  <td className="py-2 px-4 text-slate-500 font-mono whitespace-nowrap">
                    {p.sop_date ? new Date(p.sop_date).toLocaleDateString('en-MY', { month: 'short', year: '2-digit' }) : '—'}
                  </td>
                  <td className="py-2 px-4 w-36">
                    <ProgressBar pct={p.completion_pct} />
                  </td>
                  <td className="py-2 px-4"><StatusBadge status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
