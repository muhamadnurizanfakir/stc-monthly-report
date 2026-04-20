import clsx from 'clsx';
import type { ProjectStatus } from '../lib/supabase';

const STATUS_CONFIG: Record<ProjectStatus, { label: string; cls: string }> = {
  on_track:  { label: 'On Track',  cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  completed: { label: 'Completed', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  delayed:   { label: 'Delayed',   cls: 'bg-red-50 text-red-700 border-red-200' },
  at_risk:   { label: 'At Risk',   cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  on_hold:   { label: 'On Hold',    cls: 'bg-slate-50 text-slate-600 border-slate-200' },
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.on_track;
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border', cfg.cls)}>
      {cfg.label}
    </span>
  );
}

export function ProgressBar({ pct, color }: { pct: number; color?: string }) {
  const fillColor = color ?? (pct === 100 ? '#16a34a' : pct >= 70 ? '#2563eb' : pct >= 40 ? '#f59e0b' : '#dc2626');
  return (
    <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden">
      <div
        className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(pct, 100)}%`, background: fillColor }}
      />
      <span className="absolute right-2 top-0 h-full flex items-center text-xs font-bold text-white mix-blend-difference">
        {pct}%
      </span>
    </div>
  );
}

export function CompletionDot({ pct }: { pct: number }) {
  const color = pct === 100 ? 'bg-green-500' : pct >= 70 ? 'bg-blue-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <span className={clsx('inline-block w-2 h-2 rounded-full shrink-0 mt-1', color)} />
  );
}
