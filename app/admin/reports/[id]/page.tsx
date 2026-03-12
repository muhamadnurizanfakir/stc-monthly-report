"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import type { Project } from "../../../lib/supabase";
import GanttEditor from "./GanttEditor";

const CAT_ORDER: Record<string, number> = { coil_spring: 0, stabilizer_bar: 1, engineering: 2 };
const CATEGORIES = [
  { value: "coil_spring", label: "Coil Spring" },
  { value: "stabilizer_bar", label: "Stabilizer Bar" },
  { value: "engineering", label: "Engineering" },
];
const STATUSES = [
  { value: "on_track", label: "On Track" },
  { value: "delayed", label: "Delayed" },
  { value: "at_risk", label: "At Risk" },
  { value: "completed", label: "Completed" },
];
const emptyProject = { project_code: "", project_name: "", category: "coil_spring", customer: "", model: "", sop_date: "", volume: "", completion_pct: "0", status: "on_track", summary_text: "" };
const emptyShohin = { project_name: "", customer: "", completion_pct: "0", status: "on_track", summary_text: "" };
const emptyEng = { project_name: "", customer: "", model: "", sop_date: "", volume: "", summary_text: "", completion_pct: "0", status: "on_track" };

interface ShohinRow { id: string; project_name: string; customer: string | null; completion_pct: number; status: string; summary_text: string | null; is_visible: boolean; shohin_action_items?: ActionItemRow[]; }
interface EngRow { id: string; project_name: string; customer: string | null; model: string | null; sop_date: string | null; volume: number | null; summary_text: string | null; completion_pct: number; status: string; is_visible: boolean; engineering_action_items?: ActionItemRow[]; }
interface ActionItemRow { id: string; item_no: number | null; item_category?: string | null; issue_desc: string; action_plan: string | null; completion_pct: number; due_date: string | null; is_info_only: boolean; }

type ActiveTab = "coil_spring" | "shohin" | "engineering";

export default function ReportDetailPage() {
  const params = useParams();
  const reportId = params.id as string;
  const [reportLabel, setReportLabel] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [shohinProjects, setShohinProjects] = useState<ShohinRow[]>([]);
  const [engProjects, setEngProjects] = useState<EngRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("coil_spring");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyProject);
  const [shohinForm, setShohinForm] = useState(emptyShohin);
  const [engForm, setEngForm] = useState(emptyEng);
  const [editingShohinId, setEditingShohinId] = useState<string | null>(null);
  const [editingEngId, setEditingEngId] = useState<string | null>(null);
  const [expandedActions, setExpandedActions] = useState<string | null>(null);
  const [expandedGantt, setExpandedGantt] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const { data: report } = await supabase.from("reports").select("period_label").eq("id", reportId).single();
    if (report) setReportLabel(report.period_label);
    const [{ data: proj }, { data: shohin }, { data: eng }] = await Promise.all([
      supabase.from("projects").select("*, action_items(*)").eq("report_id", reportId),
      supabase.from("shohin_projects").select("*, shohin_action_items(*)").eq("report_id", reportId),
      supabase.from("engineering_projects").select("*, engineering_action_items(*)").eq("report_id", reportId),
    ]);
    const sorted = (proj ?? []).sort((a, b) => {
      const catDiff = (CAT_ORDER[a.category] ?? 3) - (CAT_ORDER[b.category] ?? 3);
      return catDiff !== 0 ? catDiff : a.project_code.localeCompare(b.project_code);
    });
    setProjects(sorted);
    setShohinProjects(shohin ?? []);
    setEngProjects(eng ?? []);
    setLoading(false);
  }

  // ---- Main project CRUD ----
  function startEditProject(p: Project) {
    setEditingId(p.id); setShowForm(true);
    setForm({ project_code: p.project_code, project_name: p.project_name, category: p.category, customer: p.customer ?? "", model: p.model ?? "", sop_date: p.sop_date ?? "", volume: p.volume?.toString() ?? "", completion_pct: p.completion_pct.toString(), status: p.status, summary_text: p.summary_text ?? "" });
  }
  async function handleSaveProject() {
    if (!form.project_name || !form.project_code) { alert("Code and Name required"); return; }
    setSaving(true);
    const payload = { report_id: reportId, project_code: form.project_code, project_name: form.project_name, category: form.category, customer: form.customer || null, model: form.model || null, sop_date: form.sop_date || null, volume: form.volume ? parseInt(form.volume) : null, completion_pct: parseInt(form.completion_pct), status: form.status, summary_text: form.summary_text || null };
    if (editingId) await supabase.from("projects").update(payload).eq("id", editingId);
    else await supabase.from("projects").insert([payload]);
    setSuccessMsg(editingId ? "Project updated!" : "Project added!"); setShowForm(false); setEditingId(null);
    fetchData(); setTimeout(() => setSuccessMsg(""), 3000); setSaving(false);
  }
  async function handleDeleteProject(id: string, name: string) {
    if (!confirm("Delete " + name + "?")) return;
    await supabase.from("projects").delete().eq("id", id);
    fetchData();
  }

  // ---- Shohin CRUD ----
  function startEditShohin(s: ShohinRow) {
    setEditingShohinId(s.id); setShowForm(true);
    setShohinForm({ project_name: s.project_name, customer: s.customer ?? "", completion_pct: s.completion_pct.toString(), status: s.status, summary_text: s.summary_text ?? "" });
  }
  async function handleSaveShohin() {
    if (!shohinForm.project_name) { alert("Name required"); return; }
    setSaving(true);
    const payload = { report_id: reportId, project_name: shohinForm.project_name, customer: shohinForm.customer || null, completion_pct: parseInt(shohinForm.completion_pct), status: shohinForm.status, summary_text: shohinForm.summary_text || null };
    if (editingShohinId) await supabase.from("shohin_projects").update(payload).eq("id", editingShohinId);
    else await supabase.from("shohin_projects").insert([payload]);
    setSuccessMsg("Saved!"); setShowForm(false); setEditingShohinId(null);
    fetchData(); setTimeout(() => setSuccessMsg(""), 3000); setSaving(false);
  }
  async function handleDeleteShohin(id: string, name: string) {
    if (!confirm("Delete " + name + "?")) return;
    await supabase.from("shohin_projects").delete().eq("id", id);
    fetchData();
  }

  // ---- Engineering CRUD ----
  function startEditEng(e: EngRow) {
    setEditingEngId(e.id); setShowForm(true);
    setEngForm({ project_name: e.project_name, customer: e.customer ?? "", model: e.model ?? "", sop_date: e.sop_date ?? "", volume: e.volume?.toString() ?? "", summary_text: e.summary_text ?? "", completion_pct: e.completion_pct.toString(), status: e.status });
  }
  async function handleSaveEng() {
    if (!engForm.project_name) { alert("Name required"); return; }
    setSaving(true);
    const payload = { report_id: reportId, project_name: engForm.project_name, customer: engForm.customer || null, model: engForm.model || null, sop_date: engForm.sop_date || null, volume: engForm.volume ? parseInt(engForm.volume) : null, summary_text: engForm.summary_text || null, completion_pct: parseInt(engForm.completion_pct), status: engForm.status };
    if (editingEngId) await supabase.from("engineering_projects").update(payload).eq("id", editingEngId);
    else await supabase.from("engineering_projects").insert([payload]);
    setSuccessMsg("Saved!"); setShowForm(false); setEditingEngId(null);
    fetchData(); setTimeout(() => setSuccessMsg(""), 3000); setSaving(false);
  }
  async function handleDeleteEng(id: string, name: string) {
    if (!confirm("Delete " + name + "?")) return;
    await supabase.from("engineering_projects").delete().eq("id", id);
    fetchData();
  }

  const tabCounts = {
    coil_spring: projects.filter(p => p.category === "coil_spring" || p.category === "stabilizer_bar").length,
    shohin: shohinProjects.length,
    engineering: engProjects.length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <a href="/admin" className="hover:text-blue-600">Reports</a>
            <span>›</span>
            <span className="text-slate-800 font-semibold">{reportLabel}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Manage Projects</h1>
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); setEditingShohinId(null); setEditingEngId(null); setForm(emptyProject); setShohinForm(emptyShohin); setEngForm(emptyEng); }}
          className="px-4 py-2 bg-blue-950 text-white rounded-lg text-sm font-semibold hover:bg-blue-900">
          + Add Project
        </button>
      </div>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{successMsg}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {([["coil_spring", "Coil Spring & Stabilizer", tabCounts.coil_spring], ["shohin", "Material Change", tabCounts.shohin], ["engineering", "Engineering", tabCounts.engineering]] as [ActiveTab, string, number][]).map(([id, label, count]) => (
          <button key={id} onClick={() => { setActiveTab(id); setShowForm(false); }}
            className={"px-4 py-2 text-sm font-semibold border-b-2 transition-colors " + (activeTab === id ? "border-blue-950 text-blue-950" : "border-transparent text-slate-500 hover:text-slate-700")}>
            {label} <span className="ml-1 px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-xs">{count}</span>
          </button>
        ))}
      </div>

      {/* Add/Edit Form */}
      {showForm && activeTab === "coil_spring" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-bold text-slate-800 mb-4">{editingId ? "Edit Project" : "Add Coil Spring / Stabilizer Project"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Code *</label>
              <input type="text" value={form.project_code} onChange={e => setForm({ ...form, project_code: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div className="md:col-span-2"><label className="block text-xs font-semibold text-slate-600 mb-1">Name *</label>
              <input type="text" value={form.project_name} onChange={e => setForm({ ...form, project_name: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Customer</label>
              <input type="text" value={form.customer} onChange={e => setForm({ ...form, customer: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Model</label>
              <input type="text" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">SOP Date</label>
              <input type="date" value={form.sop_date} onChange={e => setForm({ ...form, sop_date: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Volume</label>
              <input type="number" value={form.volume} onChange={e => setForm({ ...form, volume: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Completion %</label>
              <input type="number" min="0" max="100" value={form.completion_pct} onChange={e => setForm({ ...form, completion_pct: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select></div>
            <div className="md:col-span-3"><label className="block text-xs font-semibold text-slate-600 mb-1">Summary</label>
              <textarea value={form.summary_text} onChange={e => setForm({ ...form, summary_text: e.target.value })} rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSaveProject} disabled={saving} className="px-4 py-2 bg-blue-950 text-white rounded-lg text-sm font-semibold hover:bg-blue-900 disabled:opacity-50">{saving ? "Saving..." : editingId ? "Update" : "Add"}</button>
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-200">Cancel</button>
          </div>
        </div>
      )}

      {showForm && activeTab === "shohin" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-bold text-slate-800 mb-4">{editingShohinId ? "Edit Material Change Project" : "Add Material Change Project"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><label className="block text-xs font-semibold text-slate-600 mb-1">Project Name *</label>
              <input type="text" value={shohinForm.project_name} onChange={e => setShohinForm({ ...shohinForm, project_name: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Customer</label>
              <input type="text" value={shohinForm.customer} onChange={e => setShohinForm({ ...shohinForm, customer: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Completion %</label>
              <input type="number" min="0" max="100" value={shohinForm.completion_pct} onChange={e => setShohinForm({ ...shohinForm, completion_pct: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
              <select value={shohinForm.status} onChange={e => setShohinForm({ ...shohinForm, status: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select></div>
            <div className="md:col-span-2"><label className="block text-xs font-semibold text-slate-600 mb-1">Summary</label>
              <textarea value={shohinForm.summary_text} onChange={e => setShohinForm({ ...shohinForm, summary_text: e.target.value })} rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSaveShohin} disabled={saving} className="px-4 py-2 bg-blue-950 text-white rounded-lg text-sm font-semibold hover:bg-blue-900 disabled:opacity-50">{saving ? "Saving..." : editingShohinId ? "Update" : "Add"}</button>
            <button onClick={() => { setShowForm(false); setEditingShohinId(null); }} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-200">Cancel</button>
          </div>
        </div>
      )}

      {showForm && activeTab === "engineering" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-bold text-slate-800 mb-4">{editingEngId ? "Edit Engineering Project" : "Add Engineering Project"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><label className="block text-xs font-semibold text-slate-600 mb-1">Name *</label>
              <input type="text" value={engForm.project_name} onChange={e => setEngForm({ ...engForm, project_name: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Customer</label>
              <input type="text" value={engForm.customer} onChange={e => setEngForm({ ...engForm, customer: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Model</label>
              <input type="text" value={engForm.model} onChange={e => setEngForm({ ...engForm, model: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">SOP Date</label>
              <input type="date" value={engForm.sop_date} onChange={e => setEngForm({ ...engForm, sop_date: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div className="md:col-span-2"><label className="block text-xs font-semibold text-slate-600 mb-1">Summary</label>
              <textarea value={engForm.summary_text} onChange={e => setEngForm({ ...engForm, summary_text: e.target.value })} rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Completion %</label>
              <input type="number" min="0" max="100" value={engForm.completion_pct} onChange={e => setEngForm({ ...engForm, completion_pct: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
              <select value={engForm.status} onChange={e => setEngForm({ ...engForm, status: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select></div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSaveEng} disabled={saving} className="px-4 py-2 bg-blue-950 text-white rounded-lg text-sm font-semibold hover:bg-blue-900 disabled:opacity-50">{saving ? "Saving..." : editingEngId ? "Update" : "Add"}</button>
            <button onClick={() => { setShowForm(false); setEditingEngId(null); }} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-200">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">Loading...</div>
      ) : (
        <div className="space-y-3">

          {/* Coil Spring + Stabilizer Tab */}
          {activeTab === "coil_spring" && projects.map(p => (
            <div key={p.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={"w-9 h-9 rounded-lg flex items-center justify-center shrink-0 " + (p.category === "coil_spring" ? "bg-blue-950" : "bg-indigo-700")}>
                    <span className="text-white font-bold text-xs">{p.project_code}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{p.project_name}</p>
                    <p className="text-xs text-slate-400">{p.customer} · {p.category.replace("_", " ")} · {p.completion_pct}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={async () => { await supabase.from("projects").update({ is_visible: !p.is_visible }).eq("id", p.id); fetchData(); }}
                    className={"px-3 py-1.5 rounded-lg text-xs font-semibold " + (p.is_visible ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}>
                    {p.is_visible ? "👁 Visible" : "🙈 Hidden"}
                  </button>
                  <button onClick={() => setExpandedActions(expandedActions === p.id ? null : p.id)}
                    className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-semibold hover:bg-purple-100">
                    {expandedActions === p.id ? "▲ Hide" : "▼ Actions"} ({(p.action_items ?? []).length})
                  </button>
                  <button onClick={() => setExpandedGantt(expandedGantt === p.id ? null : p.id)}
                    className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-semibold hover:bg-amber-100">
                    {expandedGantt === p.id ? "▲ Hide" : "📊 Gantt"}
                  </button>
                  <button onClick={() => startEditProject(p)} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100">✏️ Edit</button>
                  <button onClick={() => handleDeleteProject(p.id, p.project_name)} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100">🗑️</button>
                </div>
              </div>
              {expandedActions === p.id && <ActionItemsPanel projectId={p.id} items={p.action_items ?? []} table="action_items" fkField="project_id" onRefresh={fetchData} />}
              {expandedGantt === p.id && <div className="border-t border-slate-100 p-4 bg-purple-50"><GanttEditor projectId={p.id} projectName={p.project_name} /></div>}
            </div>
          ))}

          {/* Shohin Master Gantt */}
          {activeTab === "shohin" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-600 flex items-center justify-center shrink-0">
                    <span className="text-white font-bold text-xs">G</span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">Material Change — Master Gantt Chart</p>
                    <p className="text-xs text-slate-400">Shared Gantt chart for all material change projects</p>
                  </div>
                </div>
                <button onClick={() => setExpandedGantt(expandedGantt === "shohin-master" ? null : "shohin-master")}
                  className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-semibold hover:bg-amber-100">
                  {expandedGantt === "shohin-master" ? "▲ Hide Gantt" : "📊 Edit Master Gantt"}
                </button>
              </div>
              {expandedGantt === "shohin-master" && (
                <div className="border-t border-slate-100 p-4 bg-purple-50">
                  <GanttEditor reportId={reportId} projectName="Material Change Master Gantt" />
                </div>
              )}
            </div>
          )}

          {/* Shohin Tab */}
          {activeTab === "shohin" && shohinProjects.map(s => (
            <div key={s.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-600 flex items-center justify-center shrink-0">
                    <span className="text-white font-bold text-xs">S</span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{s.project_name}</p>
                    <p className="text-xs text-slate-400">{s.customer} · {s.completion_pct}% complete</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={async () => { await supabase.from("shohin_projects").update({ is_visible: !s.is_visible }).eq("id", s.id); fetchData(); }}
                    className={"px-3 py-1.5 rounded-lg text-xs font-semibold " + (s.is_visible ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}>
                    {s.is_visible ? "👁 Visible" : "🙈 Hidden"}
                  </button>
                  <button onClick={() => setExpandedActions(expandedActions === s.id ? null : s.id)}
                    className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-semibold hover:bg-purple-100">
                    {expandedActions === s.id ? "▲ Hide" : "▼ Actions"} ({(s.shohin_action_items ?? []).length})
                  </button>
                  <button onClick={() => startEditShohin(s)} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100">✏️ Edit</button>
                  <button onClick={() => handleDeleteShohin(s.id, s.project_name)} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100">🗑️</button>
                </div>
              </div>
              {expandedActions === s.id && <ActionItemsPanel projectId={s.id} items={s.shohin_action_items ?? []} table="shohin_action_items" fkField="shohin_id" onRefresh={fetchData} />}
            </div>
          ))}

          {/* Engineering Tab */}
          {activeTab === "engineering" && engProjects.map(e => (
            <div key={e.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-teal-700 flex items-center justify-center shrink-0">
                    <span className="text-white font-bold text-xs">E</span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{e.project_name}</p>
                    <p className="text-xs text-slate-400">{e.customer ?? "Engineering"} · {e.completion_pct}% complete</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={async () => { await supabase.from("engineering_projects").update({ is_visible: !e.is_visible }).eq("id", e.id); fetchData(); }}
                    className={"px-3 py-1.5 rounded-lg text-xs font-semibold " + (e.is_visible ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}>
                    {e.is_visible ? "👁 Visible" : "🙈 Hidden"}
                  </button>
                  <button onClick={() => setExpandedActions(expandedActions === e.id ? null : e.id)}
                    className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-semibold hover:bg-purple-100">
                    {expandedActions === e.id ? "▲ Hide" : "▼ Actions"} ({(e.engineering_action_items ?? []).length})
                  </button>
                  <button onClick={() => setExpandedGantt(expandedGantt === e.id ? null : e.id)}
                    className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-semibold hover:bg-amber-100">
                    {expandedGantt === e.id ? "▲ Hide" : "📊 Gantt"}
                  </button>
                  <button onClick={() => startEditEng(e)} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100">✏️ Edit</button>
                  <button onClick={() => handleDeleteEng(e.id, e.project_name)} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100">🗑️</button>
                </div>
              </div>
              {expandedActions === e.id && <ActionItemsPanel projectId={e.id} items={e.engineering_action_items ?? []} table="engineering_action_items" fkField="engineering_project_id" onRefresh={fetchData} />}
              {expandedGantt === e.id && <div className="border-t border-slate-100 p-4 bg-purple-50"><GanttEditor engineeringProjectId={e.id} projectName={e.project_name} /></div>}
            </div>
          ))}

        </div>
      )}
    </div>
  );
}

function ActionItemsPanel({ projectId, items, table, fkField, onRefresh }: {
  projectId: string;
  items: { id: string; item_no?: number | null; item_category?: string | null; issue_desc: string; action_plan: string | null; completion_pct: number; due_date: string | null; is_info_only: boolean }[];
  table: string;
  fkField: string;
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ item_no: "", item_category: "", issue_desc: "", action_plan: "", completion_pct: "0", due_date: "", is_info_only: false });

  function startEdit(item: typeof items[0]) {
    setEditingId(item.id);
    setForm({ item_no: item.item_no?.toString() ?? "", item_category: (item as {item_category?: string | null}).item_category ?? "", issue_desc: item.issue_desc, action_plan: item.action_plan ?? "", completion_pct: item.completion_pct.toString(), due_date: item.due_date ?? "", is_info_only: item.is_info_only });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.issue_desc) { alert("Issue description required"); return; }
    setSaving(true);
    const payload: Record<string, unknown> = { [fkField]: projectId, item_no: form.item_no ? parseInt(form.item_no) : null, issue_desc: form.issue_desc, action_plan: form.action_plan || null, completion_pct: parseInt(form.completion_pct), due_date: form.due_date || null, is_info_only: form.is_info_only };
    if (table === "action_items" || table === "shohin_action_items") payload.item_category = form.item_category || null;
    if (editingId) await supabase.from(table).update(payload).eq("id", editingId);
    else await supabase.from(table).insert([payload]);
    setShowForm(false); setEditingId(null); onRefresh(); setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this action item?")) return;
    await supabase.from(table).delete().eq("id", id);
    onRefresh();
  }

  return (
    <div className="border-t border-slate-100 bg-slate-50 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Action Items</p>
        <button onClick={() => { setEditingId(null); setForm({ item_no: "", item_category: "", issue_desc: "", action_plan: "", completion_pct: "0", due_date: "", is_info_only: false }); setShowForm(true); }}
          className="px-3 py-1 bg-blue-950 text-white rounded-lg text-xs font-semibold hover:bg-blue-900">+ Add</button>
      </div>
      {showForm && (
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">No</label>
              <input type="number" value={form.item_no} onChange={e => setForm({ ...form, item_no: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
              <input type="text" value={form.item_category} onChange={e => setForm({ ...form, item_category: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div className="col-span-2"><label className="block text-xs font-semibold text-slate-600 mb-1">Issue *</label>
              <textarea value={form.issue_desc} onChange={e => setForm({ ...form, issue_desc: e.target.value })} rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div className="col-span-2"><label className="block text-xs font-semibold text-slate-600 mb-1">Action Plan</label>
              <textarea value={form.action_plan} onChange={e => setForm({ ...form, action_plan: e.target.value })} rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Completion %</label>
              <input type="number" min="0" max="100" value={form.completion_pct} onChange={e => setForm({ ...form, completion_pct: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Due Date</label>
              <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_info_only} onChange={e => setForm({ ...form, is_info_only: e.target.checked })} className="w-4 h-4" />
              <label className="text-xs text-slate-600">Info only</label>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 bg-blue-950 text-white rounded-lg text-xs font-semibold disabled:opacity-50">{saving ? "Saving..." : editingId ? "Update" : "Add"}</button>
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold">Cancel</button>
          </div>
        </div>
      )}
      {items.length === 0 ? <p className="text-xs text-slate-400 text-center py-3">No action items yet.</p> : (
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className="bg-white rounded-lg border border-slate-100 px-4 py-3 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {item.item_no && <span className="text-xs font-mono text-slate-400">#{item.item_no}</span>}
                  {(item as {item_category?: string | null}).item_category && <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">{(item as {item_category?: string | null}).item_category}</span>}
                  {item.is_info_only && <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">Info</span>}
                  {!item.is_info_only && <span className="text-xs font-semibold text-slate-700">{item.completion_pct}%</span>}
                </div>
                <p className="text-xs text-slate-700 mt-1">{item.issue_desc}</p>
                {item.action_plan && <p className="text-xs text-slate-500 mt-0.5">{item.action_plan}</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => startEdit(item)} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100">✏️</button>
                <button onClick={() => handleDelete(item.id)} className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}