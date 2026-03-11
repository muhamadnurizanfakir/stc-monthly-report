"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import type { Project } from "../../../lib/supabase";
import GanttEditor from "./GanttEditor";

const CATEGORIES = [
  { value: "coil_spring",    label: "Coil Spring" },
  { value: "stabilizer_bar", label: "Stabilizer Bar" },
  { value: "engineering",    label: "Engineering" },
];

const STATUSES = [
  { value: "on_track",  label: "On Track" },
  { value: "delayed",   label: "Delayed" },
  { value: "at_risk",   label: "At Risk" },
  { value: "completed", label: "Completed" },
];

const emptyProject = {
  project_code: "", project_name: "", category: "coil_spring",
  customer: "", model: "", sop_date: "", volume: "",
  completion_pct: "0", status: "on_track", summary_text: "",
};

export default function ReportDetailPage() {
  const params = useParams();
  const reportId = params.id as string;
  const [reportLabel, setReportLabel] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyProject);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [showGantt, setShowGantt] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const { data: report } = await supabase.from("reports").select("period_label").eq("id", reportId).single();
    if (report) setReportLabel(report.period_label);
    const { data: proj } = await supabase.from("projects").select("*, action_items(*)").eq("report_id", reportId).order("project_code");
    setProjects(proj ?? []);
    setLoading(false);
  }

  function startEdit(p: Project) {
    setEditingId(p.id);
    setForm({
      project_code: p.project_code, project_name: p.project_name, category: p.category,
      customer: p.customer ?? "", model: p.model ?? "", sop_date: p.sop_date ?? "",
      volume: p.volume?.toString() ?? "", completion_pct: p.completion_pct.toString(),
      status: p.status, summary_text: p.summary_text ?? "",
    });
    setShowForm(true);
    setSelectedProject(null);
  }

  function startNew() {
    setEditingId(null);
    setForm(emptyProject);
    setShowForm(true);
    setSelectedProject(null);
  }

  async function handleSave() {
    if (!form.project_name || !form.project_code) { alert("Project Code and Name are required"); return; }
    setSaving(true);
    const payload = {
      report_id: reportId, project_code: form.project_code, project_name: form.project_name,
      category: form.category, customer: form.customer || null, model: form.model || null,
      sop_date: form.sop_date || null, volume: form.volume ? parseInt(form.volume) : null,
      completion_pct: parseInt(form.completion_pct), status: form.status,
      summary_text: form.summary_text || null,
    };
    if (editingId) {
      const { error } = await supabase.from("projects").update(payload).eq("id", editingId);
      if (error) { alert("Error: " + error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("projects").insert([payload]);
      if (error) { alert("Error: " + error.message); setSaving(false); return; }
    }
    setSuccessMsg(editingId ? "Project updated!" : "Project added!");
    setShowForm(false);
    setEditingId(null);
    fetchData();
    setTimeout(() => setSuccessMsg(""), 3000);
    setSaving(false);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm("Delete project " + name + "? This will also delete all its action items!")) return;
    await supabase.from("projects").delete().eq("id", id);
    fetchData();
    setSelectedProject(null);
  }

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
          <p className="text-slate-500 text-sm">{projects.length} projects in this report</p>
        </div>
        <button onClick={startNew} className="px-4 py-2 bg-blue-950 text-white rounded-lg text-sm font-semibold hover:bg-blue-900">
          + Add Project
        </button>
      </div>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {successMsg}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-bold text-slate-800 mb-4">{editingId ? "Edit Project" : "Add New Project"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Project Code *</label>
              <input type="text" value={form.project_code} onChange={e => setForm({ ...form, project_code: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Project Name *</label>
              <input type="text" value={form.project_name} onChange={e => setForm({ ...form, project_name: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Customer</label>
              <input type="text" value={form.customer} onChange={e => setForm({ ...form, customer: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Model</label>
              <input type="text" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">SOP Date</label>
              <input type="date" value={form.sop_date} onChange={e => setForm({ ...form, sop_date: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Volume</label>
              <input type="number" value={form.volume} onChange={e => setForm({ ...form, volume: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Completion %</label>
              <input type="number" min="0" max="100" value={form.completion_pct} onChange={e => setForm({ ...form, completion_pct: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Summary Text</label>
              <textarea value={form.summary_text} onChange={e => setForm({ ...form, summary_text: e.target.value })} rows={2}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 bg-blue-950 text-white rounded-lg text-sm font-semibold hover:bg-blue-900 disabled:opacity-50">
              {saving ? "Saving..." : editingId ? "Update Project" : "Add Project"}
            </button>
            <button onClick={() => { setShowForm(false); setEditingId(null); }}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-200">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">Loading...</div>
      ) : (
        <div className="space-y-3">
          {projects.map(p => (
            <div key={p.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-950 flex items-center justify-center shrink-0">
                    <span className="text-white font-bold text-xs">{p.project_code}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{p.project_name}</p>
                    <p className="text-xs text-slate-400">
                      {p.customer && p.customer + " · "}
                      {p.category.replace("_", " ")} · {p.completion_pct}% complete
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedProject(selectedProject === p.id ? null : p.id)}
                    className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-semibold hover:bg-purple-100">
                    {selectedProject === p.id ? "▲ Hide" : "▼ Action Items"} ({(p.action_items ?? []).length})
                  </button>
                  <button
                    onClick={() => setShowGantt(showGantt === p.id ? null : p.id)}
                    className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-semibold hover:bg-amber-100">
                    {showGantt === p.id ? "▲ Hide Gantt" : "📊 Edit Gantt"}
                  </button>
                  <button onClick={() => startEdit(p)}
                    className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100">
                    ✏️ Edit
                  </button>
                  <button onClick={() => handleDelete(p.id, p.project_name)}
                    className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100">
                    🗑️
                  </button>
                </div>
              </div>

              {selectedProject === p.id && (
                <ActionItemsPanel project={p} onRefresh={fetchData} />
              )}

              {showGantt === p.id && (
                <div className="border-t border-slate-100 p-4 bg-purple-50">
                  <GanttEditor projectId={p.id} projectName={p.project_name} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActionItemsPanel({ project, onRefresh }: { project: Project; onRefresh: () => void }) {
  const items = project.action_items ?? [];
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    item_no: "", item_category: "", issue_desc: "", action_plan: "",
    completion_pct: "0", due_date: "", is_info_only: false,
  });

  function startEdit(item: NonNullable<Project["action_items"]>[0]) {
    setEditingId(item.id);
    setForm({
      item_no: item.item_no?.toString() ?? "", item_category: item.item_category ?? "",
      issue_desc: item.issue_desc, action_plan: item.action_plan ?? "",
      completion_pct: item.completion_pct.toString(), due_date: item.due_date ?? "",
      is_info_only: item.is_info_only,
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.issue_desc) { alert("Issue description is required"); return; }
    setSaving(true);
    const payload = {
      project_id: project.id, item_no: form.item_no ? parseInt(form.item_no) : null,
      item_category: form.item_category || null, issue_desc: form.issue_desc,
      action_plan: form.action_plan || null, completion_pct: parseInt(form.completion_pct),
      due_date: form.due_date || null, is_info_only: form.is_info_only,
    };
    if (editingId) {
      await supabase.from("action_items").update(payload).eq("id", editingId);
    } else {
      await supabase.from("action_items").insert([payload]);
    }
    setShowForm(false);
    setEditingId(null);
    onRefresh();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this action item?")) return;
    await supabase.from("action_items").delete().eq("id", id);
    onRefresh();
  }

  return (
    <div className="border-t border-slate-100 bg-slate-50 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Action Items</p>
        <button onClick={() => { setEditingId(null); setForm({ item_no: "", item_category: "", issue_desc: "", action_plan: "", completion_pct: "0", due_date: "", is_info_only: false }); setShowForm(true); }}
          className="px-3 py-1 bg-blue-950 text-white rounded-lg text-xs font-semibold hover:bg-blue-900">
          + Add Item
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">No</label>
              <input type="number" value={form.item_no} onChange={e => setForm({ ...form, item_no: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
              <input type="text" value={form.item_category} onChange={e => setForm({ ...form, item_category: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Issue Description *</label>
              <textarea value={form.issue_desc} onChange={e => setForm({ ...form, issue_desc: e.target.value })} rows={2}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Action Plan</label>
              <textarea value={form.action_plan} onChange={e => setForm({ ...form, action_plan: e.target.value })} rows={2}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Completion %</label>
              <input type="number" min="0" max="100" value={form.completion_pct} onChange={e => setForm({ ...form, completion_pct: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Due Date</label>
              <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="info_only" checked={form.is_info_only} onChange={e => setForm({ ...form, is_info_only: e.target.checked })} className="w-4 h-4" />
              <label htmlFor="info_only" className="text-xs text-slate-600">Info only</label>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleSave} disabled={saving}
              className="px-3 py-1.5 bg-blue-950 text-white rounded-lg text-xs font-semibold hover:bg-blue-900 disabled:opacity-50">
              {saving ? "Saving..." : editingId ? "Update" : "Add"}
            </button>
            <button onClick={() => { setShowForm(false); setEditingId(null); }}
              className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-200">
              Cancel
            </button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-4">No action items yet.</p>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className="bg-white rounded-lg border border-slate-200 px-4 py-3 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {item.item_no && <span className="text-xs font-mono text-slate-400">#{item.item_no}</span>}
                  {item.item_category && <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">{item.item_category}</span>}
                  {item.is_info_only && <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">Info</span>}
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
