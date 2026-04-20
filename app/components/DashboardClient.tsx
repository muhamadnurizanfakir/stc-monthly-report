"use client";

import { useState, useEffect } from "react";
import type { Report, Project, ShohinProject, EngineeringProject } from "../lib/supabase";
import { supabase } from "../lib/supabase";
import type { Section, AssemblyProject, MachiningProject, OthersProject } from "../lib/supabase";
import Sidebar from "./Sidebar";
import OverviewSection from "./OverviewSection";
import CoilSpringSection from "./CoilSpringSection";
import StabilizerSection from "./StabilizerSection";
import ShohinSection from "./ShohinSection";
import EngineeringSection from "./EngineeringSection";
import AssemblySection from "./AssemblySection";
import MachiningSection from "./MachiningSection";
import OthersSection from "./OthersSection";


export default function DashboardClient() {
  const [activeSection, setActiveSection] = useState("overview");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [shohinProjects, setShohinProjects] = useState<ShohinProject[]>([]);
  const [engineeringProjects, setEngineeringProjects] = useState<EngineeringProject[]>([]);
  const [loadingReport, setLoadingReport] = useState(true);
  const [sections, setSections] = useState<Section[]>([]);
  const [assemblyProjects, setAssemblyProjects] = useState<AssemblyProject[]>([]);
  const [machiningProjects, setMachiningProjects] = useState<MachiningProject[]>([]);
  const [othersProjects, setOthersProjects] = useState<OthersProject[]>([]);
  const [reportList, setReportList] = useState<Report[]>([]);

  useEffect(() => {
    async function initialLoad() {
      const { data: reports } = await supabase.from("reports").select("*").order("report_date", { ascending: false });
      if (!reports || reports.length === 0) { setLoadingReport(false); return; }
      setReportList(reports);
      const latest = reports[0];
      setSelectedReport(latest);
      const [{ data: proj }, { data: shohin }, { data: eng }, { data: sec }, { data: asmD }, { data: machD }, { data: othD }] = await Promise.all([
        supabase.from("projects").select("*, action_items(*), milestones(*)").eq("report_id", latest.id).order("project_code"),
        supabase.from("shohin_projects").select("*, shohin_action_items(*)").eq("report_id", latest.id),
        supabase.from("engineering_projects").select("*, engineering_action_items(*)").eq("report_id", latest.id),
        supabase.from("sections").select("*").eq("report_id", latest.id).order("sort_order"),
        supabase.from("assembly_projects").select("*, assembly_action_items(*)").eq("report_id", latest.id).order("sort_order"),
        supabase.from("machining_projects").select("*, machining_action_items(*)").eq("report_id", latest.id).order("sort_order"),
        supabase.from("others_projects").select("*, others_action_items(*)").eq("report_id", latest.id).order("sort_order"),
      ]);
      // Fetch milestone progress separately and merge
      const projectIds = (proj ?? []).map((p: {id: string}) => p.id);
      const milestoneMap: Record<string, {milestone_progress: number|null; total_milestones: number; achieved_milestones: number; total_bars: number; done_bars: number}> = {};
      if (projectIds.length > 0) {
        const { data: mpData } = await supabase.from("project_milestone_progress")
          .select("project_id, milestone_progress, total_milestones, achieved_milestones, total_bars, done_bars")
          .in("project_id", projectIds);
        (mpData ?? []).forEach((mp: {project_id: string; milestone_progress: number|null; total_milestones: number; achieved_milestones: number; total_bars: number; done_bars: number}) => {
          milestoneMap[mp.project_id] = mp;
        });
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const projWithMilestones = (proj ?? []).map((p: any) => ({
        ...p,
        project_milestone_progress: milestoneMap[p.id] ? [milestoneMap[p.id]] : [],
      })) as Project[];
      setProjects(projWithMilestones);
      setShohinProjects(shohin ?? []);
      setEngineeringProjects(eng ?? []);
      setSections(sec ?? []);
      setAssemblyProjects(asmD ?? []);
      setMachiningProjects(machD ?? []);
      setOthersProjects(othD ?? []);
      setLoadingReport(false);
    }
    initialLoad();
  }, []);

  async function refreshCurrentReport() {
    if (!selectedReport) return;
    const reportId = selectedReport?.id ?? '';
    const [{ data: proj }, { data: shohin }, { data: eng }, { data: sec }, { data: asmD }, { data: machD }, { data: othD }] = await Promise.all([
      supabase.from("projects").select("*, action_items(*), milestones(*)").eq("report_id", reportId).order("project_code"),
      supabase.from("shohin_projects").select("*, shohin_action_items(*)").eq("report_id", reportId),
      supabase.from("engineering_projects").select("*, engineering_action_items(*)").eq("report_id", reportId),
      supabase.from("sections").select("*").eq("report_id", reportId).order("sort_order"),
      supabase.from("assembly_projects").select("*, assembly_action_items(*)").eq("report_id", reportId).order("sort_order"),
      supabase.from("machining_projects").select("*, machining_action_items(*)").eq("report_id", reportId).order("sort_order"),
      supabase.from("others_projects").select("*, others_action_items(*)").eq("report_id", reportId).order("sort_order"),
    ]);
    if (proj)  setProjects(proj);
    if (shohin) setShohinProjects(shohin);
    if (eng)   setEngineeringProjects(eng);
    if (sec)   setSections(sec);
    if (asmD)  setAssemblyProjects(asmD);
    if (machD) setMachiningProjects(machD);
    if (othD)  setOthersProjects(othD);
  }

  async function handleReportChange(reportId: string) {
    const report = reportList.find(r => r.id === reportId);
    if (!report || !selectedReport) return;
    setLoadingReport(true);
    setSelectedReport(report);
    const [{ data: proj }, { data: shohin }, { data: eng }, { data: sec }, { data: asmD }, { data: machD }, { data: othD }] = await Promise.all([
      supabase.from("projects").select("*, action_items(*), milestones(*)").eq("report_id", reportId).order("project_code"),
      supabase.from("shohin_projects").select("*, shohin_action_items(*)").eq("report_id", reportId),
      supabase.from("engineering_projects").select("*, engineering_action_items(*)").eq("report_id", reportId),
      supabase.from("sections").select("*").eq("report_id", reportId).order("sort_order"),
      supabase.from("assembly_projects").select("*, assembly_action_items(*)").eq("report_id", reportId).order("sort_order"),
      supabase.from("machining_projects").select("*, machining_action_items(*)").eq("report_id", reportId).order("sort_order"),
      supabase.from("others_projects").select("*, others_action_items(*)").eq("report_id", reportId).order("sort_order"),
    ]);
    // Merge milestone progress
    const projectIds2 = (proj ?? []).map((p: {id: string}) => p.id);
    const milestoneMap2: Record<string, object> = {};
    if (projectIds2.length > 0) {
      const { data: mpData2 } = await supabase.from("project_milestone_progress")
        .select("project_id, milestone_progress, total_milestones, achieved_milestones, total_bars, done_bars")
        .in("project_id", projectIds2);
      (mpData2 ?? []).forEach((mp: {project_id: string}) => { milestoneMap2[mp.project_id] = mp; });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const projWithMs2 = (proj ?? []).map((p: any) => ({
      ...p, project_milestone_progress: milestoneMap2[p.id] ? [milestoneMap2[p.id]] : [],
    })) as Project[];
    setProjects(projWithMs2);
    setShohinProjects(shohin ?? []);
    setEngineeringProjects(eng ?? []);
    setSections(sec ?? []);
    setAssemblyProjects(asmD ?? []);
    setMachiningProjects(machD ?? []);
    setOthersProjects(othD ?? []);
    setSections(sec ?? []);
    setLoadingReport(false);
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-blue-950 text-white px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
            <span className="font-black text-white text-lg">S</span>
          </div>
          <div>
            <h1 className="font-black text-lg tracking-tight">Sapura Technical Centre</h1>
            <p className="text-blue-200 text-xs">{selectedReport?.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-blue-200 text-xs font-medium whitespace-nowrap">Report Period:</label>
            <select
              value={selectedReport?.id ?? ""}
              onChange={e => handleReportChange(e.target.value)}
              className="bg-blue-900 text-white text-sm rounded-lg px-3 py-1.5 border border-blue-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {reportList.map(r => (
                <option key={r.id} value={r.id}>{r.period_label}</option>
              ))}
            </select>
          </div>
          <a href="/" className="px-3 py-1.5 bg-blue-800 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors">🏠 Home</a>
          <a href="/admin" className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold transition-colors">
            Admin
          </a>
        </div>
      </header>

      <div className="flex flex-1">
        <Sidebar activeSection={activeSection} onNavigate={setActiveSection} reportLabel={selectedReport?.period_label ?? ""} reportDate={selectedReport?.report_date ?? ""} sections={sections} assemblyCount={assemblyProjects.length} machiningCount={machiningProjects.length} othersCount={othersProjects.length} />
        <main className="flex-1 p-6 overflow-auto">
          {loadingReport ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-blue-950 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-slate-500 text-sm">Loading {selectedReport?.period_label}...</p>
              </div>
            </div>
          ) : (
            <>
              {activeSection === "overview" && (
                <OverviewSection reportLabel={selectedReport?.period_label ?? ""} projects={projects} shohinProjects={shohinProjects} engineeringProjects={engineeringProjects} assemblyProjects={assemblyProjects} machiningProjects={machiningProjects} othersProjects={othersProjects} />
              )}
              {activeSection === "coil_spring" && (
                <CoilSpringSection projects={projects} onRefresh={refreshCurrentReport} />
              )}
              {activeSection === "stabilizer" && (
                <StabilizerSection projects={projects} onRefresh={refreshCurrentReport} />
              )}
              {activeSection === "shohin" && (
                <ShohinSection shohinProjects={shohinProjects} reportId={selectedReport?.id ?? ''} onRefresh={refreshCurrentReport} />
              )}

              {activeSection === "engineering" && (
                <EngineeringSection projects={engineeringProjects} onRefresh={refreshCurrentReport} />
              )}
              {activeSection === "assembly" && (
                <AssemblySection projects={assemblyProjects} />
              )}
              {activeSection === "machining" && (
                <MachiningSection projects={machiningProjects} />
              )}
              {activeSection === "others" && (
                <OthersSection projects={othersProjects} />
              )}
            </>
          )}
        </main>
      </div>

      <footer className="bg-blue-950 text-blue-300 text-xs text-center py-3">
        Together We Grow · Sapura Technical Centre Sdn Bhd · {selectedReport?.period_label}
      </footer>
    </div>
  );
}