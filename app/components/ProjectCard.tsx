"use client";

import { useState } from "react";
import type { Project } from "../lib/supabase";
import { StatusBadge, ProgressBar } from "./StatusBadge";
import GanttChart from "./GanttChart";

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showGantt, setShowGantt] = useState(false);
  const items = project.action_items ?? [];

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
                {project.customer && (
                  <span className="text-xs text-slate-500">{project.customer}</span>
                )}
                {project.model && (
                  <span className="text-xs text-slate-400">· {project.model}</span>
                )}
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
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={project.status} />
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500 font-medium">Overall Progress</span>
            <span className="text-xs font-bold text-slate-700">{project.completion_pct}%</span>
          </div>
          <ProgressBar pct={project.completion_pct} />
        </div>

        {project.summary_text && (
          <p className="mt-3 text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
            {project.summary_text}
          </p>
        )}

        <div className="flex items-center gap-2 mt-4">
          {items.length > 0 && (
            <button
              onClick={() => { setExpanded(!expanded); setShowGantt(false); }}
              className="text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              {expanded ? "▲ Hide" : "▼ Show"} Action Items ({items.length})
            </button>
          )}
          <button
            onClick={() => { setShowGantt(!showGantt); setExpanded(false); }}
            className="text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            {showGantt ? "▲ Hide" : "📊 Show"} Gantt Chart
          </button>
        </div>
      </div>

      {/* Action Items */}
      {expanded && items.length > 0 && (
        <div className="border-t border-slate-100">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-2 text-left font-semibold w-8">No</th>
                <th className="px-4 py-2 text-left font-semibold">Category</th>
                <th className="px-4 py-2 text-left font-semibold">Issue</th>
                <th className="px-4 py-2 text-left font-semibold">Action Plan</th>
                <th className="px-4 py-2 text-center font-semibold w-20">Progress</th>
                <th className="px-4 py-2 text-center font-semibold w-24">Due Date</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                  <td className="px-4 py-2 text-slate-400">{item.item_no}</td>
                  <td className="px-4 py-2 text-slate-600 font-medium">{item.item_category}</td>
                  <td className="px-4 py-2 text-slate-700">{item.issue_desc}</td>
                  <td className="px-4 py-2 text-slate-600">{item.action_plan}</td>
                  <td className="px-4 py-2 text-center">
                    {item.is_info_only ? (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">Info</span>
                    ) : (
                      <span className="font-semibold text-slate-700">{item.completion_pct}%</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center text-slate-500">
                    {item.due_date
                      ? item.due_date === "Info"
                        ? "Info"
                        : new Date(item.due_date).toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "2-digit" })
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Gantt Chart */}
      {showGantt && (
        <div className="border-t border-slate-100 p-4 bg-slate-50">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Product Design & Development — Gantt Chart
            </p>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>Model: {project.model}</span>
              <span>·</span>
              <span>Customer: {project.customer}</span>
              {project.sop_date && <span>· SOP: {new Date(project.sop_date).toLocaleDateString("en-MY", { month: "short", year: "numeric" })}</span>}
            </div>
          </div>
          <GanttChart projectId={project.id} />
        </div>
      )}
    </div>
  );
}
