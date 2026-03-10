'use client';

import { useState } from 'react';
import clsx from 'clsx';
import type { Project, ActionItem } from '../lib/supabase';
import { StatusBadge, ProgressBar, CompletionDot } from './StatusBadge';

interface ProjectCardProps {
  project: Project;
  index:   number;
}

export default function ProjectCard({ project, index }: ProjectCardProps) {
  const [expanded, setExpanded] = useState(false);
  const actions = project.action_items ?? [];
  const openItems = actions.filter(a => !a.is_info_only && a.completion_pct < 100);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div
        className="px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-950 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">{project.project_code}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-800 text-base">{project.project_name}</h3>
              <StatusBadge status={project.status} />
              {openItems.length > 0 && (
                <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-bold">
                  {openItems.length} open
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-500">
              {project.customer && <span>👤 {project.customer}</span>}
              {project.model    && <span>🔖 {project.model}</span>}
              {project.sop_date && (
                <span>📅 SOP {new Date(project.sop_date).toLocaleDateString('en-MY', { month: 'short', year: 'numeric' })}</span>
              )}
              {project.volume && (
                <span>📦 {project.volume.toLocaleString()} {project.volume_unit}</span>
              )}
            </div>
          </div>
          <div className="w-36 shrink-0">
            <ProgressBar pct={project.completion_pct} />
          </div>
          <span className={clsx('text-slate-400 text-xs transition-transform duration-200', expanded && 'rotate-180')}>
            ▼
          </span>
        </div>
        {project.summary_text && (
          <p className="mt-2 ml-14 text-xs text-slate-500 italic">{project.summary_text}</p>
        )}
      </div>

      {expanded && (
        <div className="border-t border-slate-100">
          {actions.length > 0 ? (
            <>
              <div className="px-5 py-2 bg-slate-50 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Action Items</span>
                <span className="text-xs text-slate-400">{actions.length} items</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left py-2 px-3 font-semibold text-slate-500 w-8">#</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-500 w-32">Category</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-500">Issue</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-500">Action Plan</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-500 w-24">Progress</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-500 w-24">Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actions.map((item, i) => (
                      <tr key={item.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className="py-2 px-3 text-slate-400 font-mono">{item.item_no ?? '—'}</td>
                        <td className="py-2 px-3">
                          {item.item_category && (
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs font-medium whitespace-nowrap">
                              {item.item_category}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex gap-1.5">
                            <CompletionDot pct={item.is_info_only ? 100 : item.completion_pct} />
                            <span className="text-slate-700">{item.issue_desc}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-slate-500">{item.action_plan ?? '—'}</td>
                        <td className="py-2 px-3">
                          {item.is_info_only ? (
                            <span className="text-slate-400 italic">Info</span>
                          ) : (
                            <ProgressBar pct={item.completion_pct} />
                          )}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap text-slate-500 font-mono">
                          {item.due_date
                            ? new Date(item.due_date).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: '2-digit' })
                            : <span className="text-slate-300">—</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="px-5 py-4 text-xs text-slate-400 text-center">No action items recorded.</div>
          )}
        </div>
      )}
    </div>
  );
}
