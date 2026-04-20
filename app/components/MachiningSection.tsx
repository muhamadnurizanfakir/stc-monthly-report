'use client';
import { useState } from 'react';
import { ProgressBar } from './StatusBadge';
import GanttChart from './GanttChart';
import type { MachiningProject } from '../lib/supabase';

interface Props {
  projects: MachiningProject[];
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  on_track:  { bg: '#dcfce7', text: '#15803d' },
  at_risk:   { bg: '#fef9c3', text: '#854d0e' },
  delayed:   { bg: '#fee2e2', text: '#b91c1c' },
  completed: { bg: '#dbeafe', text: '#1d4ed8' },
  on_hold:   { bg: '#f1f5f9', text: '#64748b' },
};

export default function MachiningSection({ projects }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const visible = projects.filter(p => p.is_visible !== false);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">⚙️ Machining Parts</h1>
        <p className="text-slate-500 text-sm mt-1">{visible.length} project(s) tracked</p>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
          <p className="text-4xl mb-3">⚙️</p>
          <p className="text-slate-500 font-semibold">No projects yet</p>
          <p className="text-slate-400 text-sm mt-1">Add projects in Admin panel</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map(project => {
            const autoProgress = project.auto_progress !== false;
            const pct = project.completion_pct ?? 0;
            const style = STATUS_COLORS[project.status] ?? STATUS_COLORS.on_track;
            const actionItems = [...(project.machining_action_items ?? [])].sort((a, b) => (a.item_no ?? 0) - (b.item_no ?? 0));
            const isExpanded = expanded === project.id;
            return (
              <div key={project.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {project.project_code && <span className="text-xs font-mono text-slate-400">{project.project_code}</span>}
                        <h3 className="font-bold text-slate-800">{project.project_name}</h3>
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ background: style.bg, color: style.text }}>
                          {project.status.replace('_',' ')}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                        {project.customer && <span>👤 {project.customer}</span>}
                        {project.model && <span>🚗 {project.model}</span>}
                        {project.sop_date && <span>📅 SOP: {new Date(project.sop_date).toLocaleDateString('en-MY', { month:'short', year:'numeric' })}</span>}
                        {project.volume && <span>📦 {project.volume.toLocaleString()} units</span>}
                      </div>
                    </div>
                    <div className="text-right ml-4 shrink-0">
                      <p className="text-xs font-bold text-slate-700">{autoProgress ? `Auto: ${pct}%` : `Manual: ${pct}%`}</p>
                    </div>
                  </div>
                  <ProgressBar pct={pct} />
                  {project.summary_text && (
                    <p className="text-xs text-slate-500 mt-3 leading-relaxed">{project.summary_text}</p>
                  )}
                  <button onClick={() => setExpanded(isExpanded ? null : project.id)}
                    className="mt-3 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors">
                    {isExpanded ? '▲ Hide Details' : '▼ Show Gantt & Action Items'}
                  </button>
                </div>

                {isExpanded && (
                  <div>
                    {/* Gantt Chart */}
                    <div className="p-4 bg-slate-50 border-t border-slate-200">
                      <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Gantt Chart</p>
                      <GanttChart machiningProjectId={project.id} />
                    </div>
                    {/* Action Items */}
                    {actionItems.length > 0 && (
                      <div>
                        <div className="px-4 py-2 bg-blue-950 border-t border-blue-900">
                          <p className="text-xs font-bold text-white uppercase tracking-wider">Action Items</p>
                        </div>
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                              <th className="text-left px-4 py-2 font-semibold text-slate-500 w-8">No.</th>
                              <th className="text-left px-4 py-2 font-semibold text-slate-500 w-24">Category</th>
                              <th className="text-left px-4 py-2 font-semibold text-slate-500">Issue / Status</th>
                              <th className="text-left px-4 py-2 font-semibold text-slate-500">Action Plan</th>
                              <th className="text-left px-4 py-2 font-semibold text-slate-500 w-16">Due</th>
                              <th className="text-right px-4 py-2 font-semibold text-slate-500 w-12">%</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {actionItems.map((item, idx) => (
                              <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                <td className="px-4 py-2.5 text-slate-400">{item.item_no ?? idx + 1}</td>
                                <td className="px-4 py-2.5 text-slate-500">{(item as {item_category?: string}).item_category ?? '—'}</td>
                                <td className="px-4 py-2.5 text-slate-700 font-medium">{item.issue_desc}</td>
                                <td className="px-4 py-2.5 text-slate-600">{item.action_plan ?? '—'}</td>
                                <td className="px-4 py-2.5 text-slate-400">
                                  {item.due_date ? new Date(item.due_date).toLocaleDateString('en-MY', { day:'numeric', month:'short' }) : '—'}
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                  {item.is_info_only
                                    ? <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">Info</span>
                                    : <span className="font-semibold text-slate-700">{item.completion_pct}%</span>
                                  }
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
