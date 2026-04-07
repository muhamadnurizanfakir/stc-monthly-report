"use client";

import { useState } from "react";
import type { Project } from "../lib/supabase";
import { supabase } from "../lib/supabase";
import { StatusBadge } from "./StatusBadge";
import GanttChart from "./GanttChart";

interface ProjectCardProps {
  project: Project;
  onRefresh?: () => void;
}

export default function ProjectCard({ project, onRefresh }: ProjectCardProps) {
  const [expanded, setExpanded] = useState(false);
  const items = [...(project.action_items ?? [])].sort((a, b) => (a.item_no ?? 0) - (b.item_no ?? 0));

  // Calculate scheduled progress from start_date to sop_date
  const scheduledPct = (() => {
    const startD = (project as {start_date?: string|null}).start_date;
    const sopD = (project as {sop_date?: string|null}).sop_date;
    if (!startD || !sopD) return null;
    const start = new Date(startD).getTime();
    const end = new Date(sopD).getTime();
    const today = Date.now();
    if (end <= start) return null;
    return Math.min(100, Math.max(0, Math.round(((today - start) / (end - start)) * 100)));
  })();

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-4">
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-950 flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-sm">{project.project_code}</span>
            </div>
            <div>
              <h3 className="font-bold text-slate-800">{project.project_name}</h3>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {project.customer && <span className="text-xs text-slate-500">{project.customer}</span>}
                {project.model && <span className="text-xs text-slate-400">· {project.model}</span>}
                {project.sop_date && (
                  <span className="text-xs text-slate-400">
                    · SOP: {new Date(project.sop_date).toLocaleDateString("en-MY", { month: "short", year: "numeric" })}
                  </span>
                )}
                {project.volume && (
                  <span className="text-xs text-slate-400">· {project.volume.toLocaleString()} units/mo</span>
                )}
              </div>
            </div>
          </div>
          <div className="shrink-0">
            <StatusBadge status={project.status} />
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500 font-medium">Overall Progress</span>
            <div className="flex items-center gap-2">
              {scheduledPct !== null && (
                <span className="text-xs text-slate-400">Sched: {scheduledPct}%</span>
              )}
              <span className="text-xs font-bold text-slate-700">Actual: {project.completion_pct}%</span>
            </div>
          </div>
          {/* Dual progress bar */}
          <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden">
            {/* Scheduled bar (background, lighter) */}
            {scheduledPct !== null && (
              <div className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                style={{ width: scheduledPct + "%", background: scheduledPct > project.completion_pct ? "#fbbf24" : "#93c5fd", opacity: 0.5 }} />
            )}
            {/* Actual bar (foreground) */}
            <div className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
              style={{ width: project.completion_pct + "%", background: project.completion_pct >= 100 ? "#16a34a" : project.completion_pct >= (scheduledPct ?? 0) ? "#2563eb" : "#dc2626" }} />
            {/* Percentage label */}
            <span className="absolute right-1 top-0 bottom-0 flex items-center text-xs font-bold text-white" style={{ fontSize: 9 }}>
              {project.completion_pct}%
            </span>
          </div>
          {scheduledPct !== null && (
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm inline-block" style={{ background: "#93c5fd" }}></span>
                <span className="text-xs text-slate-400">Scheduled</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm inline-block" style={{ background: "#2563eb" }}></span>
                <span className="text-xs text-slate-400">Actual</span>
              </div>
              {scheduledPct > project.completion_pct && (
                <span className="text-xs text-red-500 font-semibold">⚠ {scheduledPct - project.completion_pct}% behind schedule</span>
              )}
              {project.completion_pct > scheduledPct && (
                <span className="text-xs text-green-600 font-semibold">✓ {project.completion_pct - scheduledPct}% ahead</span>
              )}
            </div>
          )}
        </div>

        {project.summary_text && (
          <p className="mt-3 text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
            {project.summary_text}
          </p>
        )}

        <div className="mt-4 flex items-center gap-2">
          <button onClick={async () => { const nv = !(project.is_visible !== false); await supabase.from("projects").update({ is_visible: nv }).eq("id", project.id); if (onRefresh) await onRefresh(); }}
            className={"text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors " + (project.is_visible !== false ? "text-green-700 bg-green-50 hover:bg-green-100" : "text-slate-500 bg-slate-100 hover:bg-slate-200")}>
            {project.is_visible !== false ? "👁 Visible" : "🙈 Hidden"}
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            {expanded ? "▲ Hide Details" : "▼ Show Gantt & Action Items"}
          </button>
        </div>
      </div>

      {/* Expanded: Gantt + Action Items */}
      {expanded && (
        <div className="border-t border-slate-200">

          {/* Gantt Chart Section */}
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Product Design & Development
              </p>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                {project.model && <span>Model: <strong>{project.model}</strong></span>}
                {project.customer && <span>Customer: <strong>{project.customer}</strong></span>}
                {project.sop_date && (
                  <span>SOP: <strong>{new Date(project.sop_date).toLocaleDateString("en-MY", { month: "short", year: "numeric" })}</strong></span>
                )}
                {project.volume && (
                  <span>Volume: <strong>{project.volume.toLocaleString()}</strong></span>
                )}
              </div>
            </div>
            <GanttChart projectId={project.id} />
          </div>

          {/* Action Items Section */}
          {items.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-slate-100 border-b border-slate-200">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Action Items</p>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <th className="px-4 py-2 text-left font-semibold w-8">No</th>
                    <th className="px-4 py-2 text-left font-semibold w-28">Items</th>
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
                      <td className="px-4 py-2.5 text-slate-600 font-medium">{item.item_category}</td>
                      <td className="px-4 py-2.5 text-slate-700">{item.issue_desc}</td>
                      <td className="px-4 py-2.5 text-slate-600">{item.action_plan}</td>
                      <td className="px-4 py-2.5 text-center">
                        {item.is_info_only ? (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">Info</span>
                        ) : (
                          <span className="font-semibold text-slate-700">{item.completion_pct}%</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center text-slate-500">
                        {item.due_date
                          ? item.due_date === "Info"
                            ? <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">Info</span>
                            : new Date(item.due_date).toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "2-digit" })
                          : "-"}
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
