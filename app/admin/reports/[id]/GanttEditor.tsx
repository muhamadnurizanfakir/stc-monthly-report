"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";

interface GanttMilestone {
  id: string;
  milestone_date: string;
  shape: string;
  label: string | null;
}

interface GanttBar {
  id: string;
  bar_type: string;
  start_date: string;
  end_date: string;
  label: string | null;
}

interface GanttActivity {
  id: string;
  activity_no: number;
  activity_name: string;
  sort_order: number;
  gantt_bars: GanttBar[];
  gantt_milestones: GanttMilestone[];
}

interface Props {
  projectId?: string;
  shohinProjectId?: string;
  engineeringProjectId?: string;
  reportId?: string;
  projectName: string;
}

const BAR_TYPES = ["plan", "actual", "postponed"];
const SHAPES = ["star", "diamond"];

const BAR_COLORS: Record<string, string> = {
  plan:      "bg-green-100 text-green-800 border border-green-300",
  actual:    "bg-blue-100 text-blue-800 border border-blue-300",
  postponed: "bg-red-100 text-red-800 border border-red-300",
};

export default function GanttEditor({ projectId, shohinProjectId, engineeringProjectId, reportId, projectName }: Props) {
  const [activities, setActivities] = useState<GanttActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showBarForm, setShowBarForm] = useState<string | null>(null);
  const [showMsForm, setShowMsForm] = useState<string | null>(null);
  const [editingBar, setEditingBar] = useState<GanttBar | null>(null);
  const [editingMs, setEditingMs] = useState<GanttMilestone | null>(null);
  const [saving, setSaving] = useState(false);

  const [barForm, setBarForm] = useState({ bar_type: "plan", start_date: "", end_date: "", label: "" });
  const [msForm, setMsForm] = useState({ milestone_date: "", shape: "diamond", label: "" });

  useEffect(() => { fetchActivities(); }, []);

  async function fetchActivities() {
    setLoading(true);
    let query = supabase
      .from("gantt_activities")
      .select("*, gantt_bars(*), gantt_milestones(*)")
      .order("sort_order");
    if (projectId) query = query.eq("project_id", projectId);
    else if (shohinProjectId) query = query.eq("shohin_project_id", shohinProjectId);
    else if (engineeringProjectId) query = query.eq("engineering_project_id", engineeringProjectId);
    else if (reportId) query = query.eq("report_id", reportId);
    const { data } = await query;
    setActivities(data ?? []);
    setLoading(false);
  }

  function openBarForm(actId: string, bar?: GanttBar) {
    setShowBarForm(actId);
    setShowMsForm(null);
    if (bar) {
      setEditingBar(bar);
      setBarForm({ bar_type: bar.bar_type, start_date: bar.start_date, end_date: bar.end_date, label: bar.label ?? "" });
    } else {
      setEditingBar(null);
      setBarForm({ bar_type: "plan", start_date: "", end_date: "", label: "" });
    }
  }

  function openMsForm(actId: string, ms?: GanttMilestone) {
    setShowMsForm(actId);
    setShowBarForm(null);
    if (ms) {
      setEditingMs(ms);
      setMsForm({ milestone_date: ms.milestone_date, shape: ms.shape, label: ms.label ?? "" });
    } else {
      setEditingMs(null);
      setMsForm({ milestone_date: "", shape: "diamond", label: "" });
    }
  }

  async function saveBar(actId: string) {
    if (!barForm.start_date || !barForm.end_date) { alert("Start and end date required"); return; }
    setSaving(true);
    const payload = {
      activity_id: actId,
      bar_type: barForm.bar_type,
      start_date: barForm.start_date,
      end_date: barForm.end_date,
      label: barForm.label || null,
    };
    if (editingBar) {
      await supabase.from("gantt_bars").update(payload).eq("id", editingBar.id);
    } else {
      await supabase.from("gantt_bars").insert([payload]);
    }
    setShowBarForm(null);
    setEditingBar(null);
    fetchActivities();
    setSaving(false);
  }

  async function deleteBar(id: string) {
    if (!confirm("Delete this bar?")) return;
    await supabase.from("gantt_bars").delete().eq("id", id);
    fetchActivities();
  }

  async function saveMilestone(actId: string) {
    if (!msForm.milestone_date) { alert("Date required"); return; }
    setSaving(true);
    const payload = {
      activity_id: actId,
      milestone_date: msForm.milestone_date,
      shape: msForm.shape,
      label: msForm.label || null,
    };
    if (editingMs) {
      await supabase.from("gantt_milestones").update(payload).eq("id", editingMs.id);
    } else {
      await supabase.from("gantt_milestones").insert([payload]);
    }
    setShowMsForm(null);
    setEditingMs(null);
    fetchActivities();
    setSaving(false);
  }

  async function deleteMilestone(id: string) {
    if (!confirm("Delete this milestone?")) return;
    await supabase.from("gantt_milestones").delete().eq("id", id);
    fetchActivities();
  }

  async function addActivity() {
    const name = prompt("Activity name:");
    if (!name) return;
    const maxNo = activities.length > 0 ? Math.max(...activities.map(a => a.activity_no)) + 1 : 1;
    const payload: Record<string, unknown> = { activity_no: maxNo, activity_name: name, sort_order: maxNo };
    if (projectId) payload.project_id = projectId;
    else if (shohinProjectId) payload.shohin_project_id = shohinProjectId;
    else if (engineeringProjectId) payload.engineering_project_id = engineeringProjectId;
    else if (reportId) payload.report_id = reportId;
    await supabase.from("gantt_activities").insert([payload]);
    fetchActivities();
  }

  async function deleteActivity(id: string, name: string) {
    if (!confirm("Delete activity " + name + " and all its bars/milestones?")) return;
    await supabase.from("gantt_activities").delete().eq("id", id);
    fetchActivities();
  }

  if (loading) return <div className="py-4 text-center text-slate-400 text-xs">Loading Gantt editor...</div>;

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="bg-purple-50 px-4 py-3 flex items-center justify-between border-b border-purple-100">
        <div>
          <p className="text-xs font-bold text-purple-800 uppercase tracking-wider">Gantt Chart Editor</p>
          <p className="text-xs text-purple-600 mt-0.5">{projectName}</p>
        </div>
        <button
          onClick={addActivity}
          className="px-3 py-1.5 bg-purple-700 text-white rounded-lg text-xs font-semibold hover:bg-purple-800"
        >
          + Add Activity Row
        </button>
      </div>

      {activities.length === 0 ? (
        <div className="p-6 text-center text-slate-400 text-sm">
          No activities yet. Click + Add Activity Row to start.
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {activities.map(act => (
            <div key={act.id} className="bg-white">
              {/* Activity header */}
              <div
                className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50"
                onClick={() => setExpanded(expanded === act.id ? null : act.id)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-400 w-5">{act.activity_no}.</span>
                  <span className="text-sm font-semibold text-slate-700">{act.activity_name}</span>
                  <span className="text-xs text-slate-400">
                    {act.gantt_bars.length} bar{act.gantt_bars.length !== 1 ? "s" : ""}
                    {" · "}
                    {act.gantt_milestones.length} milestone{act.gantt_milestones.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={e => { e.stopPropagation(); deleteActivity(act.id, act.activity_name); }}
                    className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100"
                  >
                    🗑️
                  </button>
                  <span className="text-slate-400 text-xs">{expanded === act.id ? "▲" : "▼"}</span>
                </div>
              </div>

              {/* Expanded activity content */}
              {expanded === act.id && (
                <div className="px-4 pb-4 bg-slate-50 border-t border-slate-100">

                  {/* Bars section */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Bars</p>
                      <button
                        onClick={() => openBarForm(act.id)}
                        className="px-2 py-1 bg-blue-950 text-white rounded text-xs font-semibold hover:bg-blue-900"
                      >
                        + Add Bar
                      </button>
                    </div>

                    {showBarForm === act.id && (
                      <div className="bg-white rounded-lg border border-slate-200 p-3 mb-3">
                        <p className="text-xs font-semibold text-slate-700 mb-2">
                          {editingBar ? "Edit Bar" : "Add Bar"}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Type</label>
                            <select
                              value={barForm.bar_type}
                              onChange={e => setBarForm({ ...barForm, bar_type: e.target.value })}
                              className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              {BAR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Label (optional)</label>
                            <input
                              type="text"
                              value={barForm.label}
                              onChange={e => setBarForm({ ...barForm, label: e.target.value })}
                              placeholder="e.g. SPTT3"
                              className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Start Date</label>
                            <input
                              type="date"
                              value={barForm.start_date}
                              onChange={e => setBarForm({ ...barForm, start_date: e.target.value })}
                              className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">End Date</label>
                            <input
                              type="date"
                              value={barForm.end_date}
                              onChange={e => setBarForm({ ...barForm, end_date: e.target.value })}
                              className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => saveBar(act.id)}
                            disabled={saving}
                            className="px-3 py-1.5 bg-blue-950 text-white rounded text-xs font-semibold hover:bg-blue-900 disabled:opacity-50"
                          >
                            {saving ? "Saving..." : editingBar ? "Update" : "Add"}
                          </button>
                          <button
                            onClick={() => { setShowBarForm(null); setEditingBar(null); }}
                            className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded text-xs font-semibold hover:bg-slate-200"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {act.gantt_bars.length === 0 ? (
                      <p className="text-xs text-slate-400 py-1">No bars yet.</p>
                    ) : (
                      <div className="space-y-1">
                        {act.gantt_bars.map(bar => (
                          <div key={bar.id} className="flex items-center justify-between bg-white rounded border border-slate-100 px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className={"px-2 py-0.5 rounded text-xs font-semibold " + BAR_COLORS[bar.bar_type]}>
                                {bar.bar_type}
                              </span>
                              <span className="text-xs text-slate-600">
                                {bar.start_date} → {bar.end_date}
                              </span>
                              {bar.label && (
                                <span className="text-xs text-slate-500 italic">&quot;{bar.label}&quot;</span>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => openBarForm(act.id, bar)}
                                className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100"
                              >✏️</button>
                              <button
                                onClick={() => deleteBar(bar.id)}
                                className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100"
                              >🗑️</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Milestones section */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Milestones</p>
                      <button
                        onClick={() => openMsForm(act.id)}
                        className="px-2 py-1 bg-blue-950 text-white rounded text-xs font-semibold hover:bg-blue-900"
                      >
                        + Add Milestone
                      </button>
                    </div>

                    {showMsForm === act.id && (
                      <div className="bg-white rounded-lg border border-slate-200 p-3 mb-3">
                        <p className="text-xs font-semibold text-slate-700 mb-2">
                          {editingMs ? "Edit Milestone" : "Add Milestone"}
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Date</label>
                            <input
                              type="date"
                              value={msForm.milestone_date}
                              onChange={e => setMsForm({ ...msForm, milestone_date: e.target.value })}
                              className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Shape</label>
                            <select
                              value={msForm.shape}
                              onChange={e => setMsForm({ ...msForm, shape: e.target.value })}
                              className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              {SHAPES.map(s => <option key={s} value={s}>{s === "star" ? "★ Star" : "◆ Diamond"}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Label (optional)</label>
                            <input
                              type="text"
                              value={msForm.label}
                              onChange={e => setMsForm({ ...msForm, label: e.target.value })}
                              placeholder="e.g. SPTT3"
                              className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => saveMilestone(act.id)}
                            disabled={saving}
                            className="px-3 py-1.5 bg-blue-950 text-white rounded text-xs font-semibold hover:bg-blue-900 disabled:opacity-50"
                          >
                            {saving ? "Saving..." : editingMs ? "Update" : "Add"}
                          </button>
                          <button
                            onClick={() => { setShowMsForm(null); setEditingMs(null); }}
                            className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded text-xs font-semibold hover:bg-slate-200"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {act.gantt_milestones.length === 0 ? (
                      <p className="text-xs text-slate-400 py-1">No milestones yet.</p>
                    ) : (
                      <div className="space-y-1">
                        {act.gantt_milestones.map(ms => (
                          <div key={ms.id} className="flex items-center justify-between bg-white rounded border border-slate-100 px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{ms.shape === "star" ? "★" : "◆"}</span>
                              <span className="text-xs text-slate-600">{ms.milestone_date}</span>
                              {ms.label && (
                                <span className="text-xs text-slate-500 italic">&quot;{ms.label}&quot;</span>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => openMsForm(act.id, ms)}
                                className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100"
                              >✏️</button>
                              <button
                                onClick={() => deleteMilestone(ms.id)}
                                className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100"
                              >🗑️</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
