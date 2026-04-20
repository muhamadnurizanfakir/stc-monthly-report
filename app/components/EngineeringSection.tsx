'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ProgressBar } from './StatusBadge';
import { fetchMilestoneProgress, calcProgress } from '../lib/progressUtils';
import type { MilestoneProgress } from '../lib/progressUtils';
import GanttChart from './GanttChart';
import type { EngineeringProject } from '../lib/supabase';

interface Props {
  projects: EngineeringProject[];
  onRefresh: () => void;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  on_track:  { bg: '#dcfce7', text: '#15803d' },
  at_risk:   { bg: '#fef9c3', text: '#854d0e' },
  delayed:   { bg: '#fee2e2', text: '#b91c1c' },
  completed: { bg: '#dbeafe', text: '#1d4ed8' },
  on_hold:   { bg: '#f1f5f9', text: '#64748b' },
};

export default function EngineeringSection({ projects, onRefresh }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [milestoneMap, setMilestoneMap] = useState<Record<string, MilestoneProgress>>({});

  useEffect(() => {
    const ids = projects.map(p => p.id);
    if (ids.length > 0) fetchMilestoneProgress(ids).then(setMilestoneMap);
  }, [projects]);

  const visible = projects.filter(p => p.is_visible !== false);
  const hidden = projects.filter(p => p.is_visible === false);
  const display = showHidden ? projects : visible;

  async function toggleVisibility(id: string, current: boolean) {
    await supabase.from('engineering_projects').update({ is_visible: !current }).eq('id', id);
    onRefresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">⊕ Engineering</h1>
          <p className="text-slate-500 text-sm mt-1">{visible.length} project(s) tracked</p>
        </div>
        {hidden.length > 0 && (
          <button onClick={() => setShowHidden(h => !h)}
            className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs hover:bg-slate-200">
            {showHidden ? 'Hide completed' : `Show ${hidden.length} hidden`}
          </button>
        )}
      </div>

      {display.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
          <p className="text-4xl mb-3">⊕</p>
          <p className="text-slate-500 font-semibold">No projects yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {display.map(project => {
            const { pct, label: progressLabel } = calcProgress(project.id, project.completion_pct, project.auto_progress !== false, milestoneMap);
            const style = STATUS_COLORS[project.status] ?? STATUS_COLORS.on_track;
            const actionItems = [...(project.engineering_action_items ?? [])].sort((a, b) => (a.item_no ?? 0) - (b.item_no ?? 0));
            const isExpanded = expanded === project.id;
            return (
              <div key={project.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {(project as {project_code?: string|null}).project_code && <span className="text-xs font-mono text-slate-400">{(project as {project_code?: string|null}).project_code}</span>}
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
                      <p className="text-xs font-bold text-slate-700">{progressLabel}</p>
                    </div>
                  </div>
                  <ProgressBar pct={pct} />
                  {project.summary_text && <p className="text-xs text-slate-500 mt-3 leading-relaxed">{project.summary_text}</p>}
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => setExpanded(isExpanded ? null : project.id)}
                      className="text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors">
                      {isExpanded ? '▲ Hide Details' : '▼ Show Gantt & Action Items'}
                    </button>
                    <button onClick={() => toggleVisibility(project.id, project.is_visible !== false)}
                      className={"ml-auto px-3 py-1.5 rounded-lg text-xs " + (project.is_visible !== false ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500")}>
                      {project.is_visible !== false ? '● Visible' : '○ Hidden'}
                    </button>
                  </div>
                </div>
                {isExpanded && (
                  <div>
                    <div className="p-4 bg-slate-50 border-t border-slate-200">
                      <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Gantt Chart</p>
                      <GanttChart engineeringProjectId={project.id} />
                    </div>
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
