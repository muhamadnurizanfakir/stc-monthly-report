import { supabase } from './supabase';

export interface MilestoneProgress {
  project_id: string;
  milestone_progress: number | null;
  total_milestones: number;
  achieved_milestones: number;
  total_bars: number;
  done_bars: number;
}

export async function fetchMilestoneProgress(projectIds: string[]): Promise<Record<string, MilestoneProgress>> {
  if (projectIds.length === 0) return {};
  const { data } = await supabase
    .from('project_milestone_progress')
    .select('*')
    .in('project_id', projectIds);
  const map: Record<string, MilestoneProgress> = {};
  (data ?? []).forEach((mp: MilestoneProgress) => { map[mp.project_id] = mp; });
  return map;
}

export function calcProgress(
  projectId: string,
  completionPct: number | null,
  autoProgress: boolean,
  milestoneMap: Record<string, MilestoneProgress>
): { pct: number; label: string; isAuto: boolean } {
  const mp = milestoneMap[projectId];
  const hasData = mp && (mp.total_milestones + mp.total_bars) > 0;
  const hasAchieved = mp && (mp.achieved_milestones > 0 || mp.done_bars > 0);
  
  const useAuto = autoProgress && hasData && hasAchieved;
  const pct = useAuto ? (mp.milestone_progress ?? 0) : (completionPct ?? 0);
  
  const label = useAuto
    ? `Auto: ${pct}% (${mp.achieved_milestones}/${mp.total_milestones} ms · ${mp.done_bars}/${mp.total_bars} bars)`
    : `Manual: ${completionPct ?? 0}%`;

  return { pct, label, isAuto: useAuto };
}
