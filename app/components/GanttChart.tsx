"use client";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "../lib/supabase";

interface GanttMilestone {
  id: string;
  milestone_date: string;
  shape: string;
  label: string | null;
  is_achieved: boolean;
}
interface GanttBar {
  id: string;
  bar_type: string;
  start_date: string;
  end_date: string;
  label: string | null;
  actual_end: string | null;
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
  customProjectId?: string;
  sectionId?: string;
}

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const BAR_COLORS: Record<string, string> = {
  plan:      "#1e3a8a",
  actual:    "#16a34a",
  postponed: "#dc2626",
};

function buildRange(activities: GanttActivity[]) {
  const allDates: number[] = [];
  function pd(s: string) { const [y,m,d] = s.split('-').map(Number); return new Date(y,m-1,d); }
  for (const act of activities) {
    for (const bar of act.gantt_bars ?? []) {
      if (bar.start_date) allDates.push(pd(bar.start_date).getTime());
      if (bar.end_date)   allDates.push(pd(bar.end_date).getTime());
    }
    for (const ms of act.gantt_milestones ?? []) {
      if (ms.milestone_date) allDates.push(pd(ms.milestone_date).getTime());
    }
  }
  const now = new Date();
  const defStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const defEnd   = new Date(now.getFullYear(), now.getMonth() + 11, 1);
  const minD = allDates.length > 0 ? new Date(Math.min(...allDates)) : defStart;
  const maxD = allDates.length > 0 ? new Date(Math.max(...allDates)) : defEnd;
  const start = new Date(minD.getFullYear(), minD.getMonth() - 1, 1);
  const end   = new Date(maxD.getFullYear(), maxD.getMonth() + 1,  1);
  const months: { year: number; month: number; label: string }[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    months.push({ year: cur.getFullYear(), month: cur.getMonth() + 1, label: MONTH_LABELS[cur.getMonth()] });
    cur.setMonth(cur.getMonth() + 1);
  }
  const totalDays = (end.getTime() - start.getTime()) / 86400000 || 1;
  return { months, start, end, totalDays };
}

export default function GanttChart({ projectId, shohinProjectId, engineeringProjectId, reportId, customProjectId, sectionId }: Props) {
  const [activities, setActivities] = useState<GanttActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      let query = supabase
        .from("gantt_activities")
        .select("*, gantt_bars(*), gantt_milestones(*)")
        .order("sort_order");
      if (projectId) query = query.eq("project_id", projectId);
      else if (shohinProjectId) query = query.eq("shohin_project_id", shohinProjectId);
      else if (engineeringProjectId) query = query.eq("engineering_project_id", engineeringProjectId);
      else if (reportId) query = query.eq("report_id", reportId);
      else if (customProjectId) query = query.eq("custom_project_id", customProjectId);
      else if (sectionId) query = query.eq("section_id", sectionId);
      const { data } = await query;
      setActivities(data ?? []);
      setLoading(false);
    }
    load();
  }, [projectId, shohinProjectId, engineeringProjectId, reportId, customProjectId, sectionId]);

  const { months, start, totalDays } = useMemo(() => buildRange(activities), [activities]);

  function parseDate(dateStr: string) {
    // Parse as local date to avoid timezone offset issues
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  function pct(dateStr: string) {
    const offset = (parseDate(dateStr).getTime() - start.getTime()) / 86400000;
    return Math.max(0, Math.min(100, (offset / totalDays) * 100));
  }
  function bWidth(s: string, e: string) {
    const sd = Math.max(0, (parseDate(s).getTime() - start.getTime()) / 86400000);
    // Add 1 day to end date to include the full last day
    const endDate = parseDate(e);
    endDate.setDate(endDate.getDate() + 1);
    const ed = Math.min(totalDays, (endDate.getTime() - start.getTime()) / 86400000);
    return Math.max(0.5, ((ed - sd) / totalDays) * 100);
  }

  if (loading) return <div className="text-xs text-slate-400 py-4 text-center">Loading Gantt...</div>;
  if (activities.length === 0) return <div className="text-xs text-slate-400 py-4 text-center">No Gantt data yet. Add activities in Admin.</div>;

  const ROW_H = 28;
  const LABEL_W = 140;
  const chartH = activities.length * ROW_H + 40;

  return (
    <div className="overflow-x-auto rounded border border-slate-200 bg-white">
      <div style={{ minWidth: 600 }}>
        {/* Year header */}
        <div className="flex" style={{ marginLeft: LABEL_W }}>
          {Object.entries(
            months.reduce((acc, m) => { acc[m.year] = (acc[m.year] ?? 0) + 1; return acc; }, {} as Record<number, number>)
          ).map(([year, count]) => (
            <div key={year} style={{ flex: count }} className="text-center text-xs font-bold text-white bg-blue-950 py-1 border-r border-blue-800">
              {year}
            </div>
          ))}
        </div>
        {/* Month header */}
        <div className="flex border-b border-slate-200" style={{ marginLeft: LABEL_W }}>
          {months.map((m, i) => (
            <div key={i} style={{ flex: 1 }} className="text-center text-xs text-slate-500 py-1 border-r border-slate-100 font-medium">
              {m.label}
            </div>
          ))}
        </div>
        {/* Activity rows */}
        <div style={{ height: chartH, position: "relative" }}>
          {/* Column grid */}
          <div className="absolute inset-0 flex pointer-events-none" style={{ marginLeft: LABEL_W }}>
            {months.map((m, i) => (
              <div key={i} style={{ flex: 1 }} className="border-r border-slate-100 h-full" />
            ))}
          </div>
          {/* Row labels */}
          <div className="absolute top-0 left-0 bottom-0" style={{ width: LABEL_W }}>
            {activities.map((act, i) => (
              <div key={act.id} style={{ height: ROW_H, top: i * ROW_H, position: "absolute", width: LABEL_W }}
                className="flex items-center px-2 border-b border-slate-50">
                <span className="text-xs text-slate-600 truncate">{act.activity_name}</span>
              </div>
            ))}
          </div>
          {/* Bars & milestones */}
          <div className="absolute top-0 bottom-0" style={{ left: LABEL_W, right: 0 }}>
            {activities.map((act, i) => (
              <div key={act.id} style={{ height: ROW_H, top: i * ROW_H, position: "absolute", width: "100%" }}
                className="border-b border-slate-50">
                {act.gantt_bars.map(bar => (
                  <div key={bar.id} style={{ left: pct(bar.start_date) + "%", width: bWidth(bar.start_date, bar.end_date) + "%", top: "25%", height: "50%", position: "absolute" }}>
                    {/* Plan bar */}
                    <div title={bar.label ?? bar.bar_type} style={{ position: "absolute", inset: 0, background: BAR_COLORS[bar.bar_type] ?? "#64748b", borderRadius: 3, opacity: 0.85 }}>
                      {bar.label && <span className="text-white text-xs px-1 truncate leading-none" style={{ fontSize: 9 }}>{bar.label}</span>}
                    </div>
                    {/* Actual progress green bar */}
                    {bar.actual_end && bar.bar_type === "plan" && (
                      <div title={"Actual progress: " + bar.actual_end}
                        style={{ position: "absolute", top: 0, left: 0, height: "100%", width: Math.min(bWidth(bar.start_date, bar.actual_end), 100) + "%", background: "#16a34a", borderRadius: 3, opacity: 0.9 }} />
                    )}
                  </div>
                ))}
                {act.gantt_milestones.map(ms => (
                  <div key={ms.id} title={(ms.label ?? ms.shape) + (ms.is_achieved ? " ✅ Achieved" : "")}
                    style={{ left: pct(ms.milestone_date) + "%", top: "50%", transform: "translate(-50%,-50%)", position: "absolute", fontSize: 14, lineHeight: 1, color: ms.is_achieved ? "#16a34a" : undefined }}>
                    {ms.shape === "star" ? "★" : "◆"}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        {/* Legend */}
        <div className="flex gap-4 px-3 py-2 border-t border-slate-100 bg-slate-50">
          {Object.entries(BAR_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1">
              <div style={{ width: 16, height: 8, background: color, borderRadius: 2 }} />
              <span className="text-xs text-slate-500 capitalize">{type}</span>
            </div>
          ))}
          <div className="flex items-center gap-1"><span style={{ fontSize: 12 }}>★</span><span className="text-xs text-slate-500">Milestone</span></div>
          <div className="flex items-center gap-1"><span style={{ fontSize: 12 }}>◆</span><span className="text-xs text-slate-500">Event</span></div>
          <div className="flex items-center gap-1"><span style={{ fontSize: 12, color: "#16a34a" }}>◆</span><span className="text-xs text-slate-500">Achieved</span></div>
          <div className="flex items-center gap-1"><span style={{ display:"inline-block", width:12, height:8, background:"#16a34a", borderRadius:2 }}></span><span className="text-xs text-slate-500">Progress</span></div>
        </div>
      </div>
    </div>
  );
}
