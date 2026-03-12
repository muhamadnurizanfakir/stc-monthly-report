import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type ProductCategory = 'coil_spring' | 'stabilizer_bar' | 'engineering';
export type ProjectStatus   = 'on_track' | 'delayed' | 'at_risk' | 'completed';

export interface Report {
  id:           string;
  title:        string;
  report_date:  string;
  period_label: string;
  created_by:   string | null;
  notes:        string | null;
  created_at:   string;
}

export interface Project {
  id:             string;
  report_id:      string;
  project_code:   string;
  project_name:   string;
  category:       ProductCategory;
  customer:       string | null;
  model:          string | null;
  sop_date:       string | null;
  volume:         number | null;
  volume_unit:    string;
  completion_pct: number;
  status:         ProjectStatus;
  summary_text:   string | null;
  mass_prod_date: string | null;
  is_visible:     boolean;
  action_items?:  ActionItem[];
  milestones?:    Milestone[];
}

export interface Milestone {
  id:             string;
  project_id:     string;
  milestone_name: string;
  milestone_type: string | null;
  planned_date:   string | null;
  actual_date:    string | null;
  sequence_order: number;
}

export interface ActionItem {
  id:             string;
  project_id:     string;
  item_no:        number | null;
  item_category:  string | null;
  issue_desc:     string;
  action_plan:    string | null;
  completion_pct: number;
  due_date:       string | null;
  is_info_only:   boolean;
}

export interface ShohinProject {
  id:             string;
  report_id:      string;
  project_name:   string;
  customer:       string | null;
  category:       string | null;
  completion_pct: number;
  status:         ProjectStatus;
  summary_text:   string | null;
  is_visible:     boolean;
  shohin_action_items?: ShohinActionItem[];
}

export interface ShohinActionItem {
  id:             string;
  shohin_id:      string;
  item_no:        number | null;
  item_category:  string | null;
  issue_desc:     string;
  action_plan:    string | null;
  completion_pct: number;
  due_date:       string | null;
  is_info_only:   boolean;
}

export interface EngineeringProject {
  id:             string;
  report_id:      string;
  project_name:   string;
  customer:       string | null;
  model:          string | null;
  sop_date:       string | null;
  volume:         number | null;
  completion_pct: number;
  status:         ProjectStatus;
  category:       string | null;
  summary_text:   string | null;
  engineering_action_items?: EngineeringActionItem[];
  is_visible:     boolean;
}

export interface EngineeringActionItem {
  id:             string;
  eng_project_id: string;
  item_no:        number | null;
  item_category:  string | null;
  issue_desc:     string;
  action_plan:    string | null;
  completion_pct: number;
  due_date:       string | null;
  is_info_only:   boolean;
}

export async function getLatestReport(): Promise<Report | null> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .order('report_date', { ascending: false })
    .limit(1)
    .single();
  if (error) { console.error(error); return null; }
  return data;
}

export async function getProjectsByReport(reportId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*, action_items(*), milestones(*)')
    .eq('report_id', reportId)
    .order('project_code');
  if (error) { console.error(error); return []; }
  return data ?? [];
}

export async function getShohinByReport(reportId: string): Promise<ShohinProject[]> {
  const { data, error } = await supabase
    .from('shohin_projects')
    .select('*, shohin_action_items(*)')
    .eq('report_id', reportId);
  if (error) { console.error(error); return []; }
  return data ?? [];
}

export async function getEngineeringByReport(reportId: string): Promise<EngineeringProject[]> {
  const { data, error } = await supabase
    .from('engineering_projects')
    .select('*, engineering_action_items(*)')
    .eq('report_id', reportId);
  if (error) { console.error(error); return []; }
  return data ?? [];
}

export interface Section {
  id:           string;
  report_id:    string;
  name:         string;
  icon:         string;
  color:        string;
  display_mode: 'individual' | 'combined';
  sort_order:   number;
}

export interface CustomProject {
  id:             string;
  section_id:     string;
  report_id:      string;
  project_code:   string | null;
  project_name:   string;
  customer:       string | null;
  model:          string | null;
  sop_date:       string | null;
  completion_pct: number;
  status:         ProjectStatus;
  category:       string | null;
  summary_text:   string | null;
  is_visible:     boolean;
  sort_order:     number;
  custom_action_items?: CustomActionItem[];
}

export interface CustomActionItem {
  id:               string;
  custom_project_id: string;
  item_no:          number | null;
  item_category:    string | null;
  issue_desc:       string;
  action_plan:      string | null;
  completion_pct:   number;
  due_date:         string | null;
  is_info_only:     boolean;
}

export async function getSectionsByReport(reportId: string): Promise<Section[]> {
  const { data, error } = await supabase
    .from('sections')
    .select('*')
    .eq('report_id', reportId)
    .order('sort_order');
  if (error) { console.error(error); return []; }
  return data ?? [];
}

export async function getCustomProjectsBySection(sectionId: string): Promise<CustomProject[]> {
  const { data, error } = await supabase
    .from('custom_projects')
    .select('*, custom_action_items(*)')
    .eq('section_id', sectionId)
    .order('sort_order');
  if (error) { console.error(error); return []; }
  return data ?? [];
}

export async function getCustomProjectsByReport(reportId: string): Promise<CustomProject[]> {
  const { data, error } = await supabase
    .from('custom_projects')
    .select('*, custom_action_items(*)')
    .eq('report_id', reportId)
    .order('sort_order');
  if (error) { console.error(error); return []; }
  return data ?? [];
}
