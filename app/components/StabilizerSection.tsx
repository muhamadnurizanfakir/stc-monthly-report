import type { Project } from '../lib/supabase';
import ProjectCard from './ProjectCard';

export default function StabilizerSection({ projects }: { projects: Project[] }) {
  const stabiProjects = projects.filter(p => p.category === 'stabilizer_bar');

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-1 h-8 bg-cyan-600 rounded-full" />
        <div>
          <h2 className="font-bold text-2xl text-slate-800">Stabilizer Bar</h2>
          <p className="text-slate-500 text-xs">{stabiProjects.length} active projects</p>
        </div>
      </div>
      {stabiProjects.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 px-6 py-10 text-center text-slate-400 text-sm">
          No stabilizer bar projects for this period.
        </div>
      ) : (
        <div className="space-y-4">
          {stabiProjects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}
