import React from 'react';
export const dynamic = 'force-dynamic';

const MODULES = [
  {
    id: 'reporting',
    title: 'Reporting',
    description: 'Monthly project status reports, Gantt charts, and progress tracking for all STC projects.',
    icon: '📊',
    href: '/reporting',
    color: '#1e3a8a',
    available: true,
  },
  {
    id: 'timesheet',
    title: 'Timesheet',
    description: 'Employee time tracking, clock in/out, project task logging and hours summary.',
    icon: '🕐',
    href: '/timesheet',
    color: '#0e7490',
    available: true,
  },
  {
    id: 'more',
    title: 'More Coming Soon',
    description: 'Additional modules will be added here in the future.',
    icon: '🔮',
    href: '#',
    color: '#475569',
    available: false,
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-blue-950 flex flex-col">
      <div className="bg-blue-950 border-b border-blue-900 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orange-500 flex items-center justify-center text-white font-bold text-sm">S</div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Sapura Technical Centre</p>
            <p className="text-blue-300 text-xs">STC Operations Portal</p>
          </div>
        </div>
        <a href="/admin" className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold transition-colors">Admin</a>
      </div>

      <div className="px-8 pt-12 pb-8 text-center">
        <h1 className="text-3xl font-bold text-white mb-2">STC Operations Portal</h1>
        <p className="text-blue-300 text-sm max-w-md mx-auto">Select a module to get started.</p>
      </div>

      <div className="flex-1 px-8 pb-12">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MODULES.map(mod => (
            <a key={mod.id} href={mod.available ? mod.href : '#'}
              className={"group block bg-blue-900 rounded-2xl p-6 border border-blue-800 transition-all duration-200 " + (mod.available ? "hover:bg-blue-800 hover:border-blue-600 hover:shadow-xl hover:-translate-y-1 cursor-pointer" : "opacity-50 cursor-not-allowed")}>
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: mod.color + '33' }}>
                  {mod.icon}
                </div>
              </div>
              <h2 className="text-white font-bold text-lg mb-2">{mod.title}</h2>
              <p className="text-blue-300 text-sm leading-relaxed">{mod.description}</p>
              {mod.available && (
                <div className="mt-4 text-xs font-semibold text-blue-300 flex items-center gap-1">
                  Open module <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
                </div>
              )}
            </a>
          ))}
        </div>
      </div>

      <div className="border-t border-blue-900 px-8 py-4 text-center">
        <p className="text-blue-500 text-xs">© 2026 Sapura Technical Centre Sdn Bhd</p>
      </div>
    </div>
  );
}
