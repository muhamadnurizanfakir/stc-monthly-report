"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

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
}

const MONTHS = [
  { year: 2024, month: 6,  label: "Jun" },
  { year: 2024, month: 7,  label: "Jul" },
  { year: 2024, month: 8,  label: "Aug" },
  { year: 2024, month: 9,  label: "Sep" },
  { year: 2024, month: 10, label: "Oct" },
  { year: 2024, month: 11, label: "Nov" },
  { year: 2024, month: 12, label: "Dec" },
  { year: 2025, month: 1,  label: "Jan" },
  { year: 2025, month: 2,  label: "Feb" },
  { year: 2025, month: 3,  label: "Mar" },
  { year: 2025, month: 4,  label: "Apr" },
  { year: 2025, month: 5,  label: "May" },
  { year: 2025, month: 6,  label: "Jun" },
  { year: 2025, month: 7,  label: "Jul" },
  { year: 2025, month: 8,  label: "Aug" },
  { year: 2025, month: 9,  label: "Sept" },
  { year: 2025, month: 10, label: "Oct" },
  { year: 2025, month: 11, label: "Nov" },
  { year: 2025, month: 12, label: "Dec" },
];

const CHART_START = new Date(2024, 5, 1);
const CHART_END   = new Date(2025, 11, 31);
const TOTAL_DAYS  = (CHART_END.getTime() - CHART_START.getTime()) / 86400000;

function pct(dateStr: string): number {
  const d = new Date(dateStr);
  const offset = (d.getTime() - CHART_START.getTime()) / 86400000;
  return Math.max(0, Math.min(100, (offset / TOTAL_DAYS) * 100));
}

function barWidth(start: string, end: string): number {
  const s = Math.max(0, (new Date(start).getTime() - CHART_START.getTime()) / 86400000);
  const e = Math.min(TOTAL_DAYS, (new Date(end).getTime() - CHART_START.getTime()) / 86400000);
  return Math.max(0.5, ((e - s) / TOTAL_DAYS) * 100);
}

function monthPct(year: number, month: number): number {
  const d = new Date(year, month - 1, 1);
  return ((d.getTime() - CHART_START.getTime()) / 86400000 / TOTAL_DAYS) * 100;
}

function monthWidth(year: number, month: number): number {
  const start = new Date(year, month - 1, 1);
  const end   = new Date(year, month, 0);
  return (((end.getTime() - start.getTime()) / 86400000 + 1) / TOTAL_DAYS) * 100;
}

const BAR_COLORS: Record<string, string> = {
  plan:      "bg-green-300 border border-green-500",
  actual:    "bg-blue-300 border border-blue-500",
  postponed: "bg-red-400 border border-red-600",
};

const year2024start = monthPct(2024, 6);
const year2024width = monthPct(2025, 1) - monthPct(2024, 6);
const year2025start = monthPct(2025, 1);
const year2025width = 100 - monthPct(2025, 1);

export default function GanttChart({ projectId, shohinProjectId, engineeringProjectId, reportId }: Props) {
  const [activities, setActivities] = useState<GanttActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      let query = supabase
        .from("gantt_activities")
        .select("*, gantt_bars(*), gantt_milestones(*)")
        .order("sort_order");

      if (projectId) {
        query = query.eq("project_id", projectId);
      } else if (shohinProjectId) {
        query = query.eq("shohin_project_id", shohinProjectId);
      } else if (engineeringProjectId) {
        query = query.eq("engineering_project_id", engineeringProjectId);
      } else if (reportId) {
        query = query.eq("report_id", reportId);
      }

      const { data } = await query;
      setActivities(data ?? []);
      setLoading(false);
    }
    load();
  }, [projectId, shohinProjectId, engineeringProjectId, reportId]);

  if (loading) return (
    <div className="py-6 text-center text-slate-400 text-sm">Loading Gantt chart...</div>
  );
  if (activities.length === 0) return (
    <div className="py-6 text-center text-slate-400 text-sm">No Gantt data available for this project.</div>
  );

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: "1100px" }}>

        {/* Year header */}
        <div className="relative h-6 bg-slate-200 border border-slate-300" style={{ marginLeft: "140px" }}>
          <div
            className="absolute top-0 h-full bg-slate-600 flex items-center justify-center text-white text-xs font-bold border-r border-slate-400"
            style={{ left: year2024start + "%", width: year2024width + "%" }}
          >2024</div>
          <div
            className="absolute top-0 h-full bg-slate-700 flex items-center justify-center text-white text-xs font-bold"
            style={{ left: year2025start + "%", width: year2025width + "%" }}
          >2025</div>
        </div>

        {/* Month header */}
        <div className="relative h-6 bg-slate-100 border-b border-slate-300" style={{ marginLeft: "140px" }}>
          {MONTHS.map((m, i) => (
            <div
              key={i}
              className="absolute top-0 h-full flex items-center justify-center text-xs font-semibold text-slate-700 border-r border-slate-200"
              style={{ left: monthPct(m.year, m.month) + "%", width: monthWidth(m.year, m.month) + "%" }}
            >{m.label}</div>
          ))}
        </div>

        {/* Activity rows */}
        {activities.map((act, idx) => (
          <div key={act.id} className="relative flex" style={{ height: "36px" }}>
            <div
              className="shrink-0 flex items-center text-xs font-medium text-slate-700 bg-slate-50 border-b border-r border-slate-200 px-2"
              style={{ width: "140px" }}
            >
              <span className="text-slate-400 mr-1">{act.activity_no}.</span>
              {act.activity_name}
            </div>
            <div className={"relative flex-1 border-b border-slate-100 " + (idx % 2 === 0 ? "bg-white" : "bg-slate-50")}>
              {MONTHS.map((m, i) => (
                <div
                  key={i}
                  className="absolute top-0 h-full border-r border-slate-100"
                  style={{ left: monthPct(m.year, m.month) + "%", width: monthWidth(m.year, m.month) + "%" }}
                />
              ))}
              {act.gantt_bars.map(bar => (
                <div
                  key={bar.id}
                  className={"absolute top-2 h-5 rounded flex items-center justify-center overflow-hidden " + BAR_COLORS[bar.bar_type]}
                  style={{ left: pct(bar.start_date) + "%", width: barWidth(bar.start_date, bar.end_date) + "%" }}
                  title={bar.label ?? bar.bar_type}
                >
                  {bar.label && (
                    <span className="text-xs font-semibold text-slate-800 whitespace-nowrap px-1 truncate">
                      {bar.label}
                    </span>
                  )}
                </div>
              ))}
              {act.gantt_milestones.map(ms => (
                <div
                  key={ms.id}
                  className="absolute top-0 h-full flex items-center justify-center"
                  style={{ left: pct(ms.milestone_date) + "%", transform: "translateX(-50%)" }}
                  title={ms.label ?? ""}
                >
                  {ms.shape === "star" ? (
                    <span className="text-yellow-500 text-sm leading-none">★</span>
                  ) : (
                    <span
                      className="inline-block bg-slate-700"
                      style={{ width: "10px", height: "10px", transform: "rotate(45deg)" }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Legend */}
        <div className="flex items-center gap-6 mt-3 px-2" style={{ marginLeft: "140px" }}>
          <span className="text-xs font-semibold text-slate-500">Legend:</span>
          <div className="flex items-center gap-1.5">
            <div className="w-8 h-3 bg-green-300 border border-green-500 rounded" />
            <span className="text-xs text-slate-600">Plan</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-8 h-3 bg-blue-300 border border-blue-500 rounded" />
            <span className="text-xs text-slate-600">Actual</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-8 h-3 bg-red-400 border border-red-600 rounded" />
            <span className="text-xs text-slate-600">Postponed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-yellow-500">★</span>
            <span className="text-xs text-slate-600">Milestone (star)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block bg-slate-700" style={{ width: "10px", height: "10px", transform: "rotate(45deg)" }} />
            <span className="text-xs text-slate-600">Milestone (diamond)</span>
          </div>
        </div>

      </div>
    </div>
  );
}
