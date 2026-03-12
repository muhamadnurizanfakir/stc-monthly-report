"use client";

import { useState } from "react";
import type { Project } from "../lib/supabase";
import ProjectCard from "./ProjectCard";

export default function StabilizerSection({ projects, onRefresh }: { projects: Project[]; onRefresh?: () => void }) {
  const [showHidden, setShowHidden] = useState(false);
  const stabProjects = projects.filter(p => p.category === "stabilizer_bar");
  const visibleProjects = stabProjects.filter(p => p.is_visible !== false);
  const hiddenProjects = stabProjects.filter(p => p.is_visible === false);
  const displayProjects = showHidden ? stabProjects : visibleProjects;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-indigo-700 rounded-full" />
          <div>
            <h2 className="font-bold text-2xl text-slate-800">Stabilizer Bar</h2>
            <p className="text-slate-500 text-xs">{visibleProjects.length} active projects</p>
          </div>
        </div>
        {hiddenProjects.length > 0 && (
          <button
            onClick={() => setShowHidden(!showHidden)}
            className="text-xs font-semibold px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            {showHidden ? "Hide completed" : "Show " + hiddenProjects.length + " hidden project" + (hiddenProjects.length > 1 ? "s" : "")}
          </button>
        )}
      </div>
      {displayProjects.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 px-6 py-10 text-center text-slate-400 text-sm">
          No stabilizer bar projects for this period.
        </div>
      ) : (
        <div className="space-y-4">
          {displayProjects.map(p => (
            <ProjectCard key={p.id} project={p} onRefresh={onRefresh} />
          ))}
        </div>
      )}
    </div>
  );
}
