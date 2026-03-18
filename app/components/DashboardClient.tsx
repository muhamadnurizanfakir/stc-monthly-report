"use client";

import { useState, useEffect } from "react";
import type { Report, Project, ShohinProject, EngineeringProject } from "../lib/supabase";
import { supabase } from "../lib/supabase";
import type { Section, CustomProject } from "../lib/supabase";
import CustomSection from "./CustomSection";
import Sidebar from "./Sidebar";
import OverviewSection from "./OverviewSection";
import CoilSpringSection from "./CoilSpringSection";
import StabilizerSection from "./StabilizerSection";
import ShohinSection from "./ShohinSection";
import EngineeringSection from "./EngineeringSection";

interface Props {
  initialReport: Report;
  allReports: Report[];
  initialProjects: Project[];
  initialShohin: ShohinProject[];
  initialSections: Section[];
  initialCustomProjects: CustomProject[];
  initialEngineering: EngineeringProject[];
}

export default function DashboardClient({ initialReport, allReports, initialProjects, initialShohin, initialEngineering, initialSections, initialCustomProjects }: Props) {
  const [activeSection, setActiveSection] = useState("overview");
  const [selectedReport, setSelectedReport] = useState<Report>(initialReport);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [shohinProjects, setShohinProjects] = useState<ShohinProject[]>(initialShohin);
  const [engineeringProjects, setEngineeringProjects] = useState<EngineeringProject[]>(initialEngineering);
  const [loadingReport, setLoadingReport] = useState(false);
  const [sections, setSections] = useState<Section[]>(initialSections);
  const [customProjects, setCustomProjects] = useState<CustomProject[]>(initialCustomProjects);
  const [reportList, setReportList] = useState<Report[]>(allReports);

  useEffect(() => {
    async function refreshReports() {
      const { data } = await supabase.from("reports").select("*").order("report_date", { ascending: false });
      if (data && data.length > 0) setReportList(data);
    }
    refreshReports();
  }, []);

  async function refreshCurrentReport() {
    const reportId = selectedReport.id;
    const [{ data: proj }, { data: shohin }, { data: eng }, { data: sec }, { data: cust }] = await Promise.all([
      supabase.from("projects").select("*, action_items(*)").eq("report_id", reportId).order("project_code"),
      supabase.from("shohin_projects").select("*, shohin_action_items(*)").eq("report_id", reportId),
      supabase.from("engineering_projects").select("*, engineering_action_items(*)").eq("report_id", reportId),
      supabase.from("sections").select("*").eq("report_id", reportId).order("sort_order"),
      supabase.from("custom_projects").select("*, custom_action_items(*)").eq("report_id", reportId),
    ]);
    if (proj)  setProjects(proj);
    if (shohin) setShohinProjects(shohin);
    if (eng)   setEngineeringProjects(eng);
    if (sec)   setSections(sec);
    if (cust)  setCustomProjects(cust);
  }

  async function handleReportChange(reportId: string) {
    const report = allReports.find(r => r.id === reportId);
    if (!report) return;
    setLoadingReport(true);
    setSelectedReport(report);
    const [{ data: proj }, { data: shohin }, { data: eng }, { data: sec }, { data: cust }] = await Promise.all([
      supabase.from("projects").select("*, action_items(*)").eq("report_id", reportId).order("project_code"),
      supabase.from("shohin_projects").select("*, shohin_action_items(*)").eq("report_id", reportId),
      supabase.from("engineering_projects").select("*, engineering_action_items(*)").eq("report_id", reportId),
      supabase.from("sections").select("*").eq("report_id", reportId).order("sort_order"),
      supabase.from("custom_projects").select("*, custom_action_items(*)").eq("report_id", reportId),
    ]);
    setProjects(proj ?? []);
    setShohinProjects(shohin ?? []);
    setEngineeringProjects(eng ?? []);
    setSections(sec ?? []);
    setCustomProjects(cust ?? []);
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
            <p className="text-blue-200 text-xs">{selectedReport.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-blue-200 text-xs font-medium whitespace-nowrap">Report Period:</label>
            <select
              value={selectedReport.id}
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
        <Sidebar activeSection={activeSection} onNavigate={setActiveSection} reportLabel={selectedReport.period_label} reportDate={selectedReport.report_date} sections={sections} />
        <main className="flex-1 p-6 overflow-auto">
          {loadingReport ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-blue-950 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-slate-500 text-sm">Loading {selectedReport.period_label}...</p>
              </div>
            </div>
          ) : (
            <>
              {activeSection === "overview" && (
                <OverviewSection reportLabel={selectedReport.period_label} projects={projects} shohinProjects={shohinProjects} engineeringProjects={engineeringProjects} customProjects={customProjects} sections={sections} />
              )}
              {activeSection === "coil_spring" && (
                <CoilSpringSection projects={projects} onRefresh={refreshCurrentReport} />
              )}
              {activeSection === "stabilizer" && (
                <StabilizerSection projects={projects} onRefresh={refreshCurrentReport} />
              )}
              {activeSection === "shohin" && (
                <ShohinSection shohinProjects={shohinProjects} reportId={selectedReport.id} onRefresh={refreshCurrentReport} />
              )}
              {sections.map(sec => (
                activeSection === "section_" + sec.id && (
                  <CustomSection
                    key={sec.id}
                    section={sec}
                    projects={customProjects.filter(p => p.section_id === sec.id)}
                    onRefresh={refreshCurrentReport}
                  />
                )
              ))}
              {activeSection === "engineering" && (
                <EngineeringSection projects={engineeringProjects} onRefresh={refreshCurrentReport} />
              )}
            </>
          )}
        </main>
      </div>

      <footer className="bg-blue-950 text-blue-300 text-xs text-center py-3">
        Together We Grow · Sapura Technical Centre Sdn Bhd · {selectedReport.period_label}
      </footer>
    </div>
  );
}