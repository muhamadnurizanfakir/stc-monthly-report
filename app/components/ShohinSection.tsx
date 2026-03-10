'use client';

import { useState } from 'react';
import clsx from 'clsx';
import type { ShohinProject } from '../lib/supabase';
import { StatusBadge, ProgressBar, CompletionDot } from './StatusBadge';

export default function ShohinSection({ shohinProjects }: { shohinProjects: ShohinProject[] }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-1 h-8 bg-amber-600 rounded-full" />
        <div>
          <h2 className="font-bold text-2xl text-slate-800">Coil Spring Material Change</h2>
          <p className="text-slate-500 text-xs">Shohin — {shohinProjects.length} projects tracked</p>
        </div>
      </div>
      {shohinProjects.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 px-6 py-10 text-center text-slate-400 text-sm">
          No material change projects for this period.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {shohinProjects.map((s, i) => (
            <ShohinCard key={s.id} project={s} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function ShohinCard({ project, index }: { project: ShohinProject; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const items = project.shohin_action_items ?? [];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div
        className="px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-600 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">{String(index + 1).padStart(2, '0')}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-slate-800 text-sm">{project.project_name}</h3>
              <StatusBadge status={project.status} />
            </div>
            {project.customer && (
              <p className="text-xs text-slate-500 mt-0.5">Customer: {project.customer}</p>
            )}
            <div className="mt-2">
              <ProgressBar pct={project.completion_pct} color="#ca8a04" />
            </div>
          </div>
          <span className={clsx('text-slate-400 text-xs mt-1 transition-transform duration-200', expanded && 'rotate-180')}>
            ▼
          </span>
        </div>
        {project.summary_text && (
          <p className="mt-2 ml-12 text-xs text-slate-500 italic">{project.summary_text}</p>
        )}
      </div>

      {expanded && items.length > 0 && (
        <div className="border-t border-slate-100">
          <div className="px-5 py-2 bg-slate-50">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Action Items</span>
          </div>
          <div className="px-5 py-3 space-y-3">
            {items.map(item => (
              <div key={item.id} className="flex gap-2 text-xs">
                <CompletionDot pct={item.is_info_only ? 100 : item.completion_pct} />
                <div className="flex-1">
                  <p className="text-slate-700">{item.issue_desc}</p>
                  {item.action_plan && (
                    <p className="text-slate-500 mt-0.5">→ {item.action_plan}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    {!item.is_info_only && (
                      <div className="w-24">
                        <ProgressBar pct={item.completion_pct} />
                      </div>
                    )}
                    {item.due_date && (
                      <span className="text-slate-400 font-mono text-xs">
                        Due: {new Date(item.due_date).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {expanded && items.length === 0 && (
        <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-400 text-center">
          No action items recorded.
        </div>
      )}
    </div>
  );
}
