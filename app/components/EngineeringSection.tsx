'use client';

import { useState } from 'react';
import clsx from 'clsx';
import type { EngineeringProject } from '../lib/supabase';
import { StatusBadge, ProgressBar, CompletionDot } from './StatusBadge';

export default function EngineeringSection({ projects }: { projects: EngineeringProject[] }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-1 h-8 bg-purple-600 rounded-full" />
        <div>
          <h2 className="font-bold text-2xl text-slate-800">Engineering Projects</h2>
          <p className="text-slate-500 text-xs">{projects.length} engineering project{projects.length !== 1 ? 's' : ''}</p>
        </div>
      </div>
      {projects.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 px-6 py-10 text-center text-slate-400 text-sm">
          No engineering projects for this period.
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((p, i) => (
            <EngCard key={p.id} project={p} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function EngCard({ project, index }: { project: EngineeringProject; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const items = project.engineering_action_items ?? [];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div
        className="px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">{String(index + 1).padStart(2, '0')}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-800 text-base">{project.project_name}</h3>
              <StatusBadge status={project.status} />
            </div>
            <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-500">
              {project.customer && <span>👤 {project.customer}</span>}
              {project.model    && <span>🔖 {project.model}</span>}
              {project.volume   && <span>📦 {project.volume.toLocaleString()} units/month</span>}
            </div>
            <div className="mt-2 w-48">
              <ProgressBar pct={project.completion_pct} color="#7c3aed" />
            </div>
          </div>
          <span className={clsx('text-slate-400 text-xs mt-1 transition-transform duration-200', expanded && 'rotate-180')}>
            ▼
          </span>
        </div>
        {project.summary_text && (
          <p className="mt-2 ml-14 text-xs text-slate-500 italic">{project.summary_text}</p>
        )}
      </div>

      {expanded && (
        <div className="border-t border-slate-100">
          {items.length > 0 ? (
            <>
              <div className="px-5 py-2 bg-slate-50">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Action Items</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left py-2 px-3 font-semibold text-slate-500 w-8">#</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-500 w-36">Category</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-500">Issue</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-500">Action Plan</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-500 w-24">Progress</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-500 w-24">Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={item.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className="py-2 px-3 text-slate-400 font-mono">{item.item_no ?? '—'}</td>
                        <td className="py-2 px-3">
                          {item.item_category && (
                            <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 text-xs font-medium whitespace-nowrap">
                              {item.item_category}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex gap-1.5">
                            <CompletionDot pct={item.completion_pct} />
                            <span className="text-slate-700">{item.issue_desc}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-slate-500">{item.action_plan ?? '—'}</td>
                        <td className="py-2 px-3">
                          <ProgressBar pct={item.completion_pct} color="#7c3aed" />
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-500 whitespace-nowrap">
                          {item.due_date
                            ? new Date(item.due_date).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: '2-digit' })
                            : '—'
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="px-5 py-4 text-xs text-slate-400 text-center">No action items.</div>
          )}
        </div>
      )}
    </div>
  );
}
