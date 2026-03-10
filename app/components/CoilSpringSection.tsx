import type { Project } from '../lib/supabase';
import ProjectCard from './ProjectCard';

export default function CoilSpringSection({ projects }: { projects: Project[] }) {
  const coilProjects = projects.filter(p => p.category === 'coil_spring');

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-1 h-8 bg-blue-900 rounded-full" />
        <div>
          <h2 className="font-bold text-2xl text-slate-800">Coil Spring</h2>
          <p className="text-slate-500 text-xs">{coilProjects.length} active projects</p>
        </div>
      </div>
      {coilProjects.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 px-6 py-10 text-center text-slate-400 text-sm">
          No coil spring projects for this period.
        </div>
      ) : (
        <div className="space-y-4">
          {coilProjects.map((p, i) => (
            <ProjectCard key={p.id} project={p} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
