'use client';

import { useState } from 'react';
import type { Report, Project, ShohinProject, EngineeringProject } from '../lib/supabase';
import Sidebar from './Sidebar';
import OverviewSection from './OverviewSection';
import CoilSpringSection from './CoilSpringSection';
import StabilizerSection from './StabilizerSection';
import ShohinSection from './ShohinSection';
import EngineeringSection from './EngineeringSection';

interface DashboardClientProps {
  report:              Report;
  projects:            Project[];
  shohinProjects:      ShohinProject[];
  engineeringProjects: EngineeringProject[];
}

type Section = 'overview' | 'coil_spring' | 'stabilizer' | 'shohin' | 'engineering';

export default function DashboardClient({
  report,
  projects,
  shohinProjects,
  engineeringProjects,
}: DashboardClientProps) {
  const [section, setSection] = useState<Section>('overview');

  const reportDate = new Date(report.report_date).toLocaleDateString('en-MY', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar
        activeSection={section}
        onNavigate={(id) => setSection(id as Section)}
        reportLabel={report.period_label}
        reportDate={reportDate}
      />
      <main className="flex-1 min-w-0 flex flex-col bg-slate-100">
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="font-semibold text-slate-800">STC</span>
            <span>›</span>
            <span>{report.title}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">
              Period: <strong className="text-slate-600">{report.period_label}</strong>
            </span>
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-slate-400">Live</span>
          </div>
        </header>

        <div className="flex-1 p-6 overflow-auto">
          {section === 'overview' && (
            <OverviewSection
              projects={projects}
              shohinProjects={shohinProjects}
              engineeringProjects={engineeringProjects}
              reportLabel={report.period_label}
            />
          )}
          {section === 'coil_spring' && (
            <CoilSpringSection projects={projects} />
          )}
          {section === 'stabilizer' && (
            <StabilizerSection projects={projects} />
          )}
          {section === 'shohin' && (
            <ShohinSection shohinProjects={shohinProjects} />
          )}
          {section === 'engineering' && (
            <EngineeringSection projects={engineeringProjects} />
          )}
        </div>

        <footer className="bg-white border-t border-slate-200 px-6 py-2 shrink-0">
          <p className="text-xs text-slate-400 text-center">
            Sapura Technical Centre Sdn Bhd · Together We Grow · {reportDate}
          </p>
        </footer>
      </main>
    </div>
  );
}
