"use client";
import { useState } from "react";
import type { EngineeringProject } from "../lib/supabase";
import { StatusBadge, ProgressBar } from "./StatusBadge";
import GanttChart from "./GanttChart";
import { supabase } from "../lib/supabase";

function EngineeringCard({ project, onRefresh }: { project: EngineeringProject; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(project.is_visible !== false);
  const items = [...(project.engineering_action_items ?? [])].sort((a, b) => (a.item_no ?? 0) - (b.item_no ?? 0));

  async function toggleVisibility() {
    const newVal = !visible;
    setVisible(newVal);
    await supabase.from("engineering_projects").update({ is_visible: newVal }).eq("id", project.id);
    await onRefresh();
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-4">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-700 flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-xs">E</span>
            </div>
            <div>
              <h3 className="font-bold text-slate-800">{project.project_name}</h3>
              {project.summary_text && <p className="text-xs text-slate-500 mt-0.5">{project.summary_text}</p>}
            </div>
          </div>
          <StatusBadge status={project.status} />
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500 font-medium">Overall Progress</span>
            <span className="text-xs font-bold text-slate-700">{project.completion_pct}%</span>
          </div>
          <ProgressBar pct={project.completion_pct} />
        </div>
        <div className="mt-4 flex items-center gap-2">
          <button onClick={toggleVisibility}
            className={"text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors " + (visible ? "text-green-700 bg-green-50 hover:bg-green-100" : "text-slate-500 bg-slate-100 hover:bg-slate-200")}>
            {visible ? "👁 Visible" : "🙈 Hidden"}
          </button>
          <button onClick={() => setExpanded(!expanded)}
            className="text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg transition-colors">
            {expanded ? "▲ Hide Details" : "▼ Show Gantt & Action Items"}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-slate-200">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Product Design & Development</p>
            <GanttChart engineeringProjectId={project.id} />
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
                        {item.is_info_only ? <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded">Info</span> : <span className="font-semibold text-slate-700">{item.completion_pct}%</span>}
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

export default function EngineeringSection({ projects, onRefresh }: { projects: EngineeringProject[]; onRefresh: () => void }) {
  const [showHidden, setShowHidden] = useState(false);
  const visibleProjects = projects.filter(p => p.is_visible !== false);
  const hiddenProjects = projects.filter(p => p.is_visible === false);
  const displayProjects = showHidden ? projects : visibleProjects;
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-teal-700 rounded-full" />
          <div>
            <h2 className="font-bold text-2xl text-slate-800">Engineering</h2>
            <p className="text-slate-500 text-xs">{visibleProjects.length} active projects</p>
          </div>
        </div>
        {hiddenProjects.length > 0 && (
          <button onClick={() => setShowHidden(!showHidden)}
            className="text-xs font-semibold px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
            {showHidden ? "Hide completed" : "Show " + hiddenProjects.length + " hidden project" + (hiddenProjects.length > 1 ? "s" : "")}
          </button>
        )}
      </div>
      {displayProjects.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 px-6 py-10 text-center text-slate-400 text-sm">No engineering projects for this period.</div>
      ) : (
        <div className="space-y-4">
          {displayProjects.map(p => <EngineeringCard key={p.id} project={p} onRefresh={onRefresh} />)}
        </div>
      )}
    </div>
  );
}