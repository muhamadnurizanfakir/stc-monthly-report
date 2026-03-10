import {
  getLatestReport,
  getProjectsByReport,
  getShohinByReport,
  getEngineeringByReport,
} from './lib/supabase';
import DashboardClient from './components/DashboardClient';

export const revalidate = 60;

export default async function HomePage() {
  const report = await getLatestReport();

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <p className="text-2xl font-bold mb-2">No Reports Found</p>
          <p className="text-slate-400">Please add a report to the database.</p>
        </div>
      </div>
    );
  }

  const [projects, shohinProjects, engineeringProjects] = await Promise.all([
    getProjectsByReport(report.id),
    getShohinByReport(report.id),
    getEngineeringByReport(report.id),
  ]);

  return (
    <DashboardClient
      report={report}
      projects={projects}
      shohinProjects={shohinProjects}
      engineeringProjects={engineeringProjects}
    />
  );
}
