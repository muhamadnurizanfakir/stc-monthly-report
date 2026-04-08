'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { Project, ShohinProject, EngineeringProject, CustomProject, Section } from '../lib/supabase';
import { StatusBadge, ProgressBar } from './StatusBadge';

interface OverviewProps {
  projects:            Project[];
  shohinProjects:      ShohinProject[];
  engineeringProjects: EngineeringProject[];
  customProjects:      CustomProject[];
  sections:            Section[];
  reportLabel:         string;
}

const CAT_COLORS: Record<string, string> = {
  coil_spring:     '#1e3a8a',  // dark blue
  stabilizer_bar:  '#0e7490',  // teal
  'Material Change': '#b45309', // amber brown
  shohin:          '#b45309',  // amber brown
  material_change: '#b45309',  // amber brown
  Engineering:     '#7c3aed',  // purple
  engineering:     '#7c3aed',  // purple
  Assembly:        '#be185d',  // pink
  assembly:        '#be185d',  // pink
  'Machining Parts': '#065f46', // dark green
  machining_parts: '#065f46',  // dark green
  other:           '#475569',  // slate
};

const DYNAMIC_COLORS = ['#b91c1c','#c2410c','#15803d','#0f766e','#1d4ed8','#6d28d9','#be185d','#0369a1','#92400e','#3f6212'];
function getCatColor(cat: string): string {
  if (CAT_COLORS[cat]) return CAT_COLORS[cat];
  let hash = 0;
  for (let i = 0; i < cat.length; i++) hash = cat.charCodeAt(i) + ((hash << 5) - hash);
  return DYNAMIC_COLORS[Math.abs(hash) % DYNAMIC_COLORS.length];
}
const CAT_LABELS: Record<string, string> = {
  coil_spring:     'Coil Spring',
  stabilizer_bar:  'Stabilizer Bar',
  'Material Change': 'Material Change',
  shohin:          'Material Change',
  material_change: 'Material Change',
  Engineering:     'Engineering',
  engineering:     'Engineering',
};

export default function OverviewSection({ projects, shohinProjects, engineeringProjects, customProjects, sections, reportLabel }: OverviewProps) {
  const stats = useMemo(() => {
    const allVisible = [
      ...projects.filter(p => p.is_visible !== false),
      ...shohinProjects.filter(p => p.is_visible !== false).map(p => ({ ...p, project_code: '', category: p.category ?? 'Material Change' })),
      ...engineeringProjects.filter(p => p.is_visible !== false).map(p => ({ ...p, project_code: '', category: p.category ?? 'Engineering' })),
      ...customProjects.filter(p => p.is_visible !== false).map(p => { const sec = sections.find(s => s.id === p.section_id); return { ...p, project_code: p.project_code ?? '', category: p.category ?? sec?.name ?? 'Other' }; }),
    ];
    const total     = allVisible.length;
    const onTrack   = allVisible.filter(p => p.status === 'on_track').length;
    const completed = allVisible.filter(p => (p.completion_pct ?? 0) === 100).length;
    const delayed   = allVisible.filter(p => p.status === 'delayed' || p.status === 'at_risk').length;
    const avgPct    = Math.round(allVisible.reduce((s, p) => s + (p.completion_pct ?? 0), 0) / (allVisible.length || 1));
    const statusDist = [
      { name: 'On Track',  value: onTrack,   color: '#16a34a' },
      { name: 'Completed', value: completed,  color: '#2563eb' },
      { name: 'Delayed',   value: delayed,    color: '#dc2626' },
    ].filter(d => d.value > 0);
    const byCategory = Object.entries(
      allVisible.reduce((acc, p) => {
        const cat = (p as {category?: string}).category ?? 'other';
        acc[cat] = (acc[cat] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value }));
    const categoryProgress = Object.entries(
      allVisible.reduce((acc, p) => {
        const cat = (p as {category?: string}).category ?? 'Other';
        if (!acc[cat]) acc[cat] = { total: 0, sum: 0 };
        acc[cat].total += 1;
        acc[cat].sum += (p.completion_pct ?? 0);
        return acc;
      }, {} as Record<string, { total: number; sum: number }>)
    ).map(([cat, { total, sum }]) => ({
      cat,
      avg: Math.round(sum / total),
      count: total,
      color: getCatColor(cat),
    })).sort((a, b) => {
      const ORDER: Record<string, number> = {
        coil_spring: 0, 'Coil Spring': 0,
        stabilizer_bar: 1, 'Stabilizer Bar': 1,
        'Material Change': 2, shohin: 2, material_change: 2,
        Engineering: 3, engineering: 3,
      };
      const ao = ORDER[a.cat] ?? 4;
      const bo = ORDER[b.cat] ?? 4;
      if (ao !== bo) return ao - bo;
      return a.cat.localeCompare(b.cat);
    });
    return { total, onTrack, completed, delayed, avgPct, statusDist, byCategory, allVisible, categoryProgress };
  }, [projects, shohinProjects, engineeringProjects, customProjects, sections]);

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
          <h3 className="font-bold text-slate-700 mb-4">Category Progress</h3>
          <div className="space-y-3">
            {stats.categoryProgress.map(({ cat, avg, count, color }) => (
              <div key={cat}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold" style={{ color }}>{CAT_LABELS[cat] ?? cat}</span>
                  <span className="text-xs text-slate-500">{avg}% &middot; {count} project{count !== 1 ? 's' : ''}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3">
                  <div className="h-3 rounded-full transition-all duration-500"
                    style={{ width: `${avg}%`, background: color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h3 className="font-bold text-slate-700 mb-1">Customer Mix</h3>
          <p className="text-xs text-slate-400 mb-3">OEM market share by project count</p>
          {(() => {
            const PIE_COLORS = ['#1e3a8a','#0e7490','#b45309','#7c3aed','#be185d','#065f46','#b91c1c','#0369a1','#92400e','#3f6212'];
            const customerData = Object.entries(
              stats.allVisible.reduce((acc, p) => {
                const c = (p as {customer?: string|null}).customer ?? 'Unknown';
                acc[c] = (acc[c] ?? 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
            const total = customerData.reduce((s, d) => s + d.value, 0);
            const renderLabel = ({ cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, value = 0 }: { cx?: number; cy?: number; midAngle?: number; innerRadius?: number; outerRadius?: number; value?: number }) => {
              const RADIAN = Math.PI / 180;
              const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
              const x = cx + radius * Math.cos(-midAngle * RADIAN);
              const y = cy + radius * Math.sin(-midAngle * RADIAN);
              const pct = Math.round((value / total) * 100);
              if (pct < 6) return null;
              return (<text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>{pct}%</text>);
            };
            return (
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <ResponsiveContainer width="100%" height={210}>
                    <PieChart>
                      <Pie data={customerData} cx="50%" cy="50%" outerRadius={90} dataKey="value" labelLine={false} label={renderLabel}>
                        {customerData.map((_: unknown, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: '11px', padding: '4px 8px' }} formatter={(value, name) => { const v = Number(value); return [`${String(name)}: ${Math.round((v/total)*100)}%`]; }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2 shrink-0 w-[120px]">
                  {customerData.map(({ name, value }: {name: string, value: number}, i: number) => (
                    <div key={name} className="flex items-center gap-1.5 text-xs text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="truncate font-medium">{name}</span>
                      <span className="text-slate-400 shrink-0">({value})</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-700">All Projects Summary</h3>
          <span className="text-xs text-slate-400">{stats.allVisible.length} projects</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="text-left py-2 px-4 font-semibold text-slate-500">Project</th>
                <th className="text-left py-2 px-4 font-semibold text-slate-500">Category</th>
                <th className="text-left py-2 px-4 font-semibold text-slate-500">Customer</th>
                <th className="text-left py-2 px-4 font-semibold text-slate-500">SOP</th>
                <th className="text-left py-2 px-4 font-semibold text-slate-500 w-36">Progress</th>
                <th className="text-left py-2 px-4 font-semibold text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {[...stats.allVisible].sort((a, b) => {
                const catOrder: Record<string, number> = {
                  coil_spring: 0, stabilizer_bar: 1,
                  'Material Change': 2, shohin: 2,
                  Engineering: 3, engineering: 3,
                };
                const ac = (a as {category?: string}).category ?? 'zzz';
                const bc = (b as {category?: string}).category ?? 'zzz';
                const ao = catOrder[ac] ?? 4;
                const bo = catOrder[bc] ?? 4;
                if (ao !== bo) return ao - bo;
                if (ac !== bc) return ac.localeCompare(bc);
                const acode = (a as {project_code?: string}).project_code ?? '';
                const bcode = (b as {project_code?: string}).project_code ?? '';
                return acode.localeCompare(bcode);
              }).map((p, i) => {
                const cat = (p as {category?: string}).category ?? 'other';
                return (
                <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  <td className="py-2 px-4 font-medium text-slate-700">{p.project_name}</td>
                  <td className="py-2 px-4">
                    <span className="px-2 py-0.5 rounded text-xs font-semibold"
                      style={{ background: getCatColor(cat) + '20', color: getCatColor(cat) }}>
                      {CAT_LABELS[cat] ?? cat}
                    </span>
                  </td>
                  <td className="py-2 px-4 text-slate-500">{(p as {customer?: string|null}).customer ?? '—'}</td>
                  <td className="py-2 px-4 text-slate-500 font-mono whitespace-nowrap">
                    {(() => { const s = (p as {sop_date?: string|null}).sop_date; return s ? new Date(s).toLocaleDateString('en-MY', { month: 'short', year: '2-digit' }) : '—'; })()}
                  </td>
                  <td className="py-2 px-4 w-36">
                    <ProgressBar pct={p.completion_pct ?? 0} />
                  </td>
                  <td className="py-2 px-4"><StatusBadge status={p.status} /></td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
