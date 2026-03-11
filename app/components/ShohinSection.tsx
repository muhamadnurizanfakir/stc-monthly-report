"use client";

import { useState } from "react";
import type { ShohinProject } from "../lib/supabase";
import { StatusBadge, ProgressBar } from "./StatusBadge";
import GanttChart from "./GanttChart";

function ShohinCard({ project }: { project: ShohinProject }) {
  const [expanded, setExpanded] = useState(false);
  const items = project.shohin_action_items ?? [];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-600 flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-xs">S</span>
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">{project.project_name}</h3>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {project.customer && <span className="text-xs text-slate-500">{project.customer}</span>}

              </div>
            </div>
          </div>
          <StatusBadge status={project.status} />
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500 font-medium">Progress</span>
            <span className="text-xs font-bold text-slate-700">{project.completion_pct}%</span>
          </div>
          <ProgressBar pct={project.completion_pct} />
        </div>

        {project.summary_text && (
          <p className="mt-2 text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
            {project.summary_text}
          </p>
        )}

        <div className="mt-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            {expanded ? "▲ Hide Details" : "▼ Show Gantt & Action Items"}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-200">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Product Design & Development
            </p>
            <GanttChart shohinProjectId={project.id} />
          </div>

          {items.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-slate-100 border-b border-slate-200">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Action Items</p>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <th className="px-4 py-2 text-left font-semibold w-8">No</th>
                    <th className="px-4 py-2 text-left font-semibold">Issue</th>
                    <th className="px-4 py-2 text-left font-semibold">Action Plan</th>
                    <th className="px-4 py-2 text-center font-semibold w-24">Completion</th>
                    <th className="px-4 py-2 text-center font-semibold w-24">Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={item.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                      <td className="px-4 py-2.5 text-slate-400">{item.item_no}</td>
                      <td className="px-4 py-2.5 text-slate-700">{item.issue_desc}</td>
                      <td className="px-4 py-2.5 text-slate-600">{item.action_plan}</td>
                      <td className="px-4 py-2.5 text-center">
                        {item.is_info_only ? (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded">Info</span>
                        ) : (
                          <span className="font-semibold text-slate-700">{item.completion_pct}%</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center text-slate-500">
                        {item.due_date ? new Date(item.due_date).toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "2-digit" }) : "-"}
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
}

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
          {shohinProjects.map(s => (
            <ShohinCard key={s.id} project={s} />
          ))}
        </div>
      )}
    </div>
  );
}
