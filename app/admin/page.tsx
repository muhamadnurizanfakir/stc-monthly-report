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
  const [form, setForm] = useState({
    title: "Functions Reporting and Presentation",
    report_date: "",
    period_label: "",
    created_by: "STC Engineering",
    notes: "",
  });

  useEffect(() => { fetchReports(); }, []);

  async function fetchReports() {
    setLoading(true);
    const { data } = await supabase.from("reports").select("*").order("report_date", { ascending: false });
    setReports(data ?? []);
    setLoading(false);
  }

  async function handleCreate() {
    if (!form.report_date || !form.period_label) { alert("Please fill in Report Date and Period Label"); return; }
    setSaving(true);
    const { error } = await supabase.from("reports").insert([form]);
    if (error) { alert("Error: " + error.message); }
    else {
      setSuccessMsg("Report created!");
      setShowForm(false);
      setForm({ title: "Functions Reporting and Presentation", report_date: "", period_label: "", created_by: "STC Engineering", notes: "" });
      fetchReports();
      setTimeout(() => setSuccessMsg(""), 3000);
    }
    setSaving(false);
  }

  async function handleDelete(id: string, label: string) {
    if (!confirm("Delete " + label + "?")) return;
    await supabase.from("reports").delete().eq("id", id);
    fetchReports();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reports</h1>
          <p className="text-slate-500 text-sm">Create and manage monthly reports</p>
        </div>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-blue-950 text-white rounded-lg text-sm font-semibold hover:bg-blue-900">
          + New Report
        </button>
      </div>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{successMsg}</div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-bold text-slate-800 mb-4">Create New Report</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Report Title</label>
              <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Period Label</label>
              <input type="text" value={form.period_label} onChange={e => setForm({ ...form, period_label: e.target.value })} placeholder="February 2026" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Report Date</label>
              <input type="date" value={form.report_date} onChange={e => setForm({ ...form, report_date: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Created By</label>
              <input type="text" value={form.created_by} onChange={e => setForm({ ...form, created_by: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-blue-950 text-white rounded-lg text-sm font-semibold hover:bg-blue-900 disabled:opacity-50">
              {saving ? "Saving..." : "Create Report"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-200">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">Loading...</div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">No reports yet.</div>
      ) : (
        <div className="space-y-3">
          {reports.map(report => (
            <div key={report.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800">{report.period_label}</h3>
                  <p className="text-sm text-slate-500">{report.title}</p>
                  <p className="text-xs text-slate-400">{new Date(report.report_date).toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" })}</p>
                </div>
                <div className="flex gap-2">
                  <a href={"/admin/reports/" + report.id} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100">Manage Projects</a>
                  <button onClick={() => handleDelete(report.id, report.period_label)} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}