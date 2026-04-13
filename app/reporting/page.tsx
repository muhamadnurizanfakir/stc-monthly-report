import { supabase } from '../lib/supabase';
import {
  getProjectsByReport,
  getShohinByReport,
  getEngineeringByReport,
  getSectionsByReport,
  getCustomProjectsByReport,
} from '../lib/supabase';
import DashboardClient from '../components/DashboardClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function Home() {
  const { data: reports } = await supabase
    .from('reports')
    .select('*')
    .order('report_date', { ascending: false });

  const allReports = reports ?? [];
  const latestReport = allReports[0] ?? null;

  if (!latestReport) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <p className="text-slate-500 text-lg">No reports found.</p>
          <a href="/admin" className="text-blue-600 text-sm hover:underline mt-2 inline-block">
            Go to Admin to create a report
          </a>
        </div>
      </div>
    );
  }

  const [projects, shohinProjects, engineeringProjects, sections, customProjects] = await Promise.all([
    getProjectsByReport(latestReport.id),
    getShohinByReport(latestReport.id),
    getEngineeringByReport(latestReport.id),
    getSectionsByReport(latestReport.id),
    getCustomProjectsByReport(latestReport.id),
  ]);

  return (
    <DashboardClient
      initialReport={latestReport}
      allReports={allReports}
      initialProjects={projects}
      initialShohin={shohinProjects}
      initialSections={sections}
      initialCustomProjects={customProjects}
      initialEngineering={engineeringProjects}
    />
  );
}
