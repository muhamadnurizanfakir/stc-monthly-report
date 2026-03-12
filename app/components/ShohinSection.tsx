"use client";

import { useState } from "react";
import type { ShohinProject } from "../lib/supabase";
import { StatusBadge, ProgressBar } from "./StatusBadge";
import GanttChart from "./GanttChart";
import { supabase } from "../lib/supabase";

interface Props {
  shohinProjects: ShohinProject[];
  reportId: string;
}

export default function ShohinSection({ shohinProjects, reportId }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const visible = shohinProjects.filter(p => p.is_visible !== false);
  const hidden = shohinProjects.filter(p => p.is_visible === false);
  const displayProjects = showHidden ? shohinProjects : visible;
  const allActionItems = displayProjects.flatMap(p => (p.shohin_action_items ?? []).map(item => ({ ...item, project_name: p.project_name })));
  const overallPct = displayProjects.length > 0 ? Math.round(displayProjects.reduce((sum, p) => sum + p.completion_pct, 0) / displayProjects.length) : 0;

  async function toggleVisibility(id: string, current: boolean) {
    await supabase.from("shohin_projects").update({ is_visible: !current }).eq("id", id);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-amber-600 rounded-full" />
          <div>
            <h2 className="font-bold text-2xl text-slate-800">Coil Spring Material Change</h2>
            <p className="text-slate-500 text-xs">Shohin — {visible.length} projects tracked</p>
          </div>
        </div>
        {hidden.length > 0 && (
          <button onClick={() => setShowHidden(!showHidden)}
            className="text-xs font-semibold px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
            {showHidden ? "Hide completed" : "Show " + hidden.length + " hidden project" + (hidden.length > 1 ? "s" : "")}
          </button>
        )}
      </div>

      {shohinProjects.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 px-6 py-10 text-center text-slate-400 text-sm">
          No material change projects for this period.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

          {/* Project list header */}
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-bold text-slate-800 mb-3">Material Change Projects</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {displayProjects.map(p => (
                    <div key={p.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-800 truncate">{p.project_name}</p>
                          <StatusBadge status={p.status} />
                        </div>
                        {p.customer && <p className="text-xs text-slate-400 mt-0.5">{p.customer}</p>}
                        <div className="mt-1.5">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs text-slate-400">Progress</span>
                            <span className="text-xs font-bold text-slate-600">{p.completion_pct}%</span>
                          </div>
                          <ProgressBar pct={p.completion_pct} />
                        </div>
                      </div>
                      <button
                        onClick={() => toggleVisibility(p.id, p.is_visible !== false)}
                        className={"ml-3 shrink-0 px-2 py-1 rounded text-xs font-semibold " + (p.is_visible !== false ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}
                      >
                        {p.is_visible !== false ? "👁" : "🙈"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-slate-400 mb-1">Overall</p>
                <p className="text-3xl font-black text-slate-800">{overallPct}%</p>
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                {expanded ? "▲ Hide Details" : "▼ Show Gantt & Action Items"}
              </button>
            </div>
          </div>

          {/* Expanded: Gantt + Action Items */}
          {expanded && (
            <div>
              {/* Gantt */}
              <div className="p-4 bg-slate-50 border-b border-slate-200">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                  Product Design & Development
                </p>
                <GanttChart reportId={reportId} />
              </div>

              {/* Combined Action Items */}
              {allActionItems.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-slate-100 border-b border-slate-200">
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Action Items</p>
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                        <th className="px-4 py-2 text-left font-semibold w-8">No</th>
                        <th className="px-4 py-2 text-left font-semibold w-32">Project</th>
                        <th className="px-4 py-2 text-left font-semibold">Issue</th>
                        <th className="px-4 py-2 text-left font-semibold">Action Plan</th>
                        <th className="px-4 py-2 text-center font-semibold w-24">Completion</th>
                        <th className="px-4 py-2 text-center font-semibold w-24">Due Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allActionItems.map((item, i) => (
                        <tr key={item.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                          <td className="px-4 py-2.5 text-slate-400">{item.item_no}</td>
                          <td className="px-4 py-2.5 text-slate-600 font-medium text-xs">{item.project_name}</td>
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
      )}
    </div>
  );
}