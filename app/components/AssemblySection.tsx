'use client';
import type { AssemblyProject } from '../lib/supabase';
import { ProgressBar } from './StatusBadge';

interface Props {
  projects: AssemblyProject[];
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  on_track:  { bg: '#dcfce7', text: '#15803d' },
  at_risk:   { bg: '#fef9c3', text: '#854d0e' },
  delayed:   { bg: '#fee2e2', text: '#b91c1c' },
  completed: { bg: '#dbeafe', text: '#1d4ed8' },
  on_hold:   { bg: '#f1f5f9', text: '#64748b' },
};

export default function AssemblySection({ projects }: Props) {
  const visible = projects.filter(p => p.is_visible !== false);
  const hidden = projects.filter(p => p.is_visible === false);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">🔧 Assembly</h1>
          <p className="text-slate-500 text-sm mt-1">{visible.length} project(s) tracked</p>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
          <p className="text-4xl mb-3">🔧</p>
          <p className="text-slate-500 font-semibold">No projects yet</p>
          <p className="text-slate-400 text-sm mt-1">Add projects in Admin panel</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map(project => {
            const autoProgress = project.auto_progress !== false;
            const pct = autoProgress ? (project.completion_pct ?? 0) : (project.completion_pct ?? 0);
            const style = STATUS_COLORS[project.status] ?? STATUS_COLORS.on_track;
            return (
              <div key={project.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {project.project_code && <span className="text-xs font-mono text-slate-400">{project.project_code}</span>}
                        <h3 className="font-bold text-slate-800">{project.project_name}</h3>
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: style.bg, color: style.text }}>
                          {project.status.replace('_',' ')}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                        {project.customer && <span>👤 {project.customer}</span>}
                        {project.model && <span>🚗 {project.model}</span>}
                        {project.sop_date && <span>📅 SOP: {new Date(project.sop_date).toLocaleDateString('en-MY', {month:'short',year:'numeric'})}</span>}
                        {project.volume && <span>📦 {project.volume.toLocaleString()} units</span>}
                      </div>
                    </div>
                    <div className="text-right ml-4 shrink-0">
                      <span className="text-xs font-bold text-slate-700">
                        {autoProgress ? `Auto: ${pct}%` : `Manual: ${pct}%`}
                      </span>
                    </div>
                  </div>
                  <ProgressBar pct={pct} />
                  {project.summary_text && (
                    <p className="text-xs text-slate-500 mt-3 leading-relaxed">{project.summary_text}</p>
                  )}
                  {(project.assembly_action_items ?? []).length > 0 && (
                    <div className="mt-4 border-t border-slate-100 pt-3">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Action Items</p>
                      <div className="space-y-2">
                        {(project.assembly_action_items ?? []).map(item => (
                          <div key={item.id} className="flex items-start gap-2 text-xs">
                            <span className="shrink-0 mt-0.5 {item.is_info_only ? 'text-blue-500' : item.completion_pct === 100 ? 'text-green-500' : 'text-orange-500'}">
                              {item.is_info_only ? 'ℹ' : item.completion_pct === 100 ? '✓' : '→'}
                            </span>
                            <div className="flex-1">
                              <p className="text-slate-700">{item.issue_desc}</p>
                              {item.action_plan && <p className="text-slate-400 mt-0.5">{item.action_plan}</p>}
                            </div>
                            {!item.is_info_only && (
                              <span className="shrink-0 text-slate-400">{item.completion_pct}%</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {hidden.length > 0 && (
            <p className="text-xs text-slate-400 text-center">+ {hidden.length} hidden project(s)</p>
          )}
        </div>
      )}
    </div>
  );
}
