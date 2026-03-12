"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { Report } from "../lib/supabase";

export default function AdminPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [copyFrom, setCopyFrom] = useState("");
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "Functions Reporting & Presentation",
    report_date: "",
    period_label: "",
    created_by: "STC Engineering",
    notes: "",
  });

  useEffect(() => { fetchReports(); }, []);

  async function fetchReports() {
    setLoading(true);
    const { data } = await supabase
      .from("reports")
      .select("*")
      .order("report_date", { ascending: false });
    setReports(data ?? []);
    setLoading(false);
  }

  async function handleCreate() {
    if (!form.report_date || !form.period_label) {
      alert("Please fill in Report Date and Period Label");
      return;
    }
    setSaving(true);

    const { data: newReport, error } = await supabase
      .from("reports")
      .insert([form])
      .select()
      .single();

    if (error || !newReport) {
      alert("Error: " + (error?.message ?? "Unknown error"));
      setSaving(false);
      return;
    }

    if (copyFrom) {
      await copyPreviousReport(copyFrom, newReport.id);
    }

    setSuccessMsg("Report created" + (copyFrom ? " and data copied!" : "!"));
    setShowForm(false);
    setCopyFrom("");
    setForm({ title: "Functions Reporting & Presentation", report_date: "", period_label: "", created_by: "STC Engineering", notes: "" });
    fetchReports();
    setTimeout(() => setSuccessMsg(""), 4000);
    setSaving(false);
  }

  async function copyPreviousReport(sourceId: string, destId: string) {
    // Copy main projects
    const { data: projects } = await supabase
      .from("projects")
      .select("*, action_items(*), gantt_activities(*, gantt_bars(*), gantt_milestones(*))")
      .eq("report_id", sourceId);

    for (const p of projects ?? []) {
      const { data: newProject } = await supabase.from("projects").insert([{
        report_id: destId, project_code: p.project_code, project_name: p.project_name,
        category: p.category, customer: p.customer, model: p.model, sop_date: p.sop_date,
        volume: p.volume, completion_pct: p.completion_pct, status: p.status,
        summary_text: p.summary_text, is_visible: p.is_visible,
      }]).select().single();

      if (!newProject) continue;

      for (const item of p.action_items ?? []) {
        await supabase.from("action_items").insert([{
          project_id: newProject.id, item_no: item.item_no, item_category: item.item_category,
          issue_desc: item.issue_desc, action_plan: item.action_plan,
          completion_pct: item.completion_pct, due_date: item.due_date, is_info_only: item.is_info_only,
        }]);
      }

      for (const act of p.gantt_activities ?? []) {
        const { data: newAct } = await supabase.from("gantt_activities").insert([{
          project_id: newProject.id, activity_no: act.activity_no,
          activity_name: act.activity_name, sort_order: act.sort_order,
        }]).select().single();

        if (!newAct) continue;
        for (const bar of act.gantt_bars ?? []) {
          await supabase.from("gantt_bars").insert([{
            activity_id: newAct.id, bar_type: bar.bar_type,
            start_date: bar.start_date, end_date: bar.end_date, label: bar.label,
          }]);
        }
        for (const ms of act.gantt_milestones ?? []) {
          await supabase.from("gantt_milestones").insert([{
            activity_id: newAct.id, milestone_date: ms.milestone_date,
            shape: ms.shape, label: ms.label,
          }]);
        }
      }
    }

    // Copy shohin projects
    const { data: shohinProjects } = await supabase
      .from("shohin_projects")
      .select("*, shohin_action_items(*), gantt_activities(*, gantt_bars(*), gantt_milestones(*))")
      .eq("report_id", sourceId);

    for (const s of shohinProjects ?? []) {
      const { data: newShohin } = await supabase.from("shohin_projects").insert([{
        report_id: destId, project_name: s.project_name, customer: s.customer,
        completion_pct: s.completion_pct, status: s.status,
        summary_text: s.summary_text, is_visible: s.is_visible,
      }]).select().single();

      if (!newShohin) continue;

      for (const item of s.shohin_action_items ?? []) {
        await supabase.from("shohin_action_items").insert([{
          shohin_id: newShohin.id, item_no: item.item_no, item_category: item.item_category,
          issue_desc: item.issue_desc, action_plan: item.action_plan,
          completion_pct: item.completion_pct, due_date: item.due_date, is_info_only: item.is_info_only,
        }]);
      }

      for (const act of s.gantt_activities ?? []) {
        const { data: newAct } = await supabase.from("gantt_activities").insert([{
          shohin_project_id: newShohin.id, activity_no: act.activity_no,
          activity_name: act.activity_name, sort_order: act.sort_order,
        }]).select().single();

        if (!newAct) continue;
        for (const bar of act.gantt_bars ?? []) {
          await supabase.from("gantt_bars").insert([{
            activity_id: newAct.id, bar_type: bar.bar_type,
            start_date: bar.start_date, end_date: bar.end_date, label: bar.label,
          }]);
        }
        for (const ms of act.gantt_milestones ?? []) {
          await supabase.from("gantt_milestones").insert([{
            activity_id: newAct.id, milestone_date: ms.milestone_date,
            shape: ms.shape, label: ms.label,
          }]);
        }
      }
    }

    // Copy engineering projects
    const { data: engProjects } = await supabase
      .from("engineering_projects")
      .select("*, engineering_action_items(*), gantt_activities(*, gantt_bars(*), gantt_milestones(*))")
      .eq("report_id", sourceId);

    for (const e of engProjects ?? []) {
      const { data: newEng } = await supabase.from("engineering_projects").insert([{
        report_id: destId, project_code: e.project_code, project_name: e.project_name,
        description: e.description, completion_pct: e.completion_pct,
        status: e.status, is_visible: e.is_visible,
      }]).select().single();

      if (!newEng) continue;

      for (const item of e.engineering_action_items ?? []) {
        await supabase.from("engineering_action_items").insert([{
          engineering_project_id: newEng.id, item_no: item.item_no,
          issue_desc: item.issue_desc, action_plan: item.action_plan,
          completion_pct: item.completion_pct, due_date: item.due_date, is_info_only: item.is_info_only,
        }]);
      }

      for (const act of e.gantt_activities ?? []) {
        const { data: newAct } = await supabase.from("gantt_activities").insert([{
          engineering_project_id: newEng.id, activity_no: act.activity_no,
          activity_name: act.activity_name, sort_order: act.sort_order,
        }]).select().single();

        if (!newAct) continue;
        for (const bar of act.gantt_bars ?? []) {
          await supabase.from("gantt_bars").insert([{
            activity_id: newAct.id, bar_type: bar.bar_type,
            start_date: bar.start_date, end_date: bar.end_date, label: bar.label,
          }]);
        }
        for (const ms of act.gantt_milestones ?? []) {
          await supabase.from("gantt_milestones").insert([{
            activity_id: newAct.id, milestone_date: ms.milestone_date,
            shape: ms.shape, label: ms.label,
          }]);
        }
      }
    }
  }

  function startEditReport(report: Report) {
    setEditingReportId(report.id);
    setForm({ title: report.title ?? "Functions Reporting & Presentation", report_date: report.report_date, period_label: report.period_label, created_by: report.created_by ?? "STC Engineering", notes: report.notes ?? "" });
    setShowForm(true);
    setCopyFrom("");
  }

  async function handleSaveReport() {
    if (!form.report_date || !form.period_label) { alert("Date and Period Label required"); return; }
    setSaving(true);
    if (editingReportId) {
      await supabase.from("reports").update({ title: form.title, report_date: form.report_date, period_label: form.period_label, created_by: form.created_by, notes: form.notes }).eq("id", editingReportId);
    } else {
      await handleCreate();
      setSaving(false);
      return;
    }
    setSuccessMsg("Report updated!");
    setShowForm(false);
    setEditingReportId(null);
    fetchReports();
    setTimeout(() => setSuccessMsg(""), 3000);
    setSaving(false);
  }

  async function handleDelete(id: string, label: string) {
    if (!confirm("Delete report " + label + "? This deletes ALL projects inside!")) return;
    await supabase.from("reports").delete().eq("id", id);
    fetchReports();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reports</h1>
          <p className="text-slate-500 text-sm mt-0.5">Create and manage monthly reports</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-950 text-white rounded-lg text-sm font-semibold hover:bg-blue-900 transition-colors"
        >
          + New Report
        </button>
      </div>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {successMsg}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-bold text-slate-800 mb-4">Create New Report</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Report Title</label>
              <input type="text" value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Period Label</label>
              <input type="text" value={form.period_label}
                onChange={e => setForm({ ...form, period_label: e.target.value })}
                placeholder="February 2026"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Report Date</label>
              <input type="date" value={form.report_date}
                onChange={e => setForm({ ...form, report_date: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Created By</label>
              <input type="text" value={form.created_by}
                onChange={e => setForm({ ...form, created_by: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Copy data from previous report? (optional)
              </label>
              <select value={copyFrom}
                onChange={e => setCopyFrom(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">-- Start fresh (no copy) --</option>
                {reports.map(r => (
                  <option key={r.id} value={r.id}>{r.period_label}</option>
                ))}
              </select>
              {copyFrom && (
                <p className="text-xs text-blue-600 mt-1">
                  All projects, action items and Gantt data will be copied from {reports.find(r => r.id === copyFrom)?.period_label}.
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={editingReportId ? handleSaveReport : handleCreate} disabled={saving}
              className="px-4 py-2 bg-blue-950 text-white rounded-lg text-sm font-semibold hover:bg-blue-900 disabled:opacity-50">
              {saving ? "Saving..." : editingReportId ? "Update Report" : "Create Report"}
            </button>
            <button onClick={() => { setShowForm(false); setCopyFrom(""); }}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-200">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">Loading...</div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">
          No reports yet. Create your first one above!
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(report => (
            <div key={report.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800">{report.period_label}</h3>
                  <p className="text-sm text-slate-500 mt-0.5">{report.title}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(report.report_date).toLocaleDateString("en-MY", {
                      day: "numeric", month: "long", year: "numeric"
                    })}
                    {report.created_by && " · " + report.created_by}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a href={"/admin/reports/" + report.id}
                    className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100">
                    Manage Projects
                  </a>
                  <button onClick={() => startEditReport(report)}
                    className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100">✏️ Edit</button>
                  <button onClick={() => handleDelete(report.id, report.period_label)}
                    className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
