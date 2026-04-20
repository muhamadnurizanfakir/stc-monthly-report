'use client';
import { useState } from 'react';
import clsx from 'clsx';

interface SidebarProps {
  sections?: { id: string; name: string; icon: string; section_type?: string }[];
  activeSection: string;
  onNavigate: (id: string) => void;
  reportLabel: string;
  reportDate: string;
  assemblyCount?: number;
  machiningCount?: number;
  othersCount?: number;
}

export default function Sidebar({ activeSection, onNavigate, reportLabel, reportDate, sections = [], assemblyCount = 0, machiningCount = 0, othersCount = 0 }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [prodExpanded, setProdExpanded] = useState(true);

  // Dynamic product development sub-categories
  const prodDevSections = sections.filter(s => 
    !['assembly','machining','others'].includes(s.section_type ?? '')
  );
  // Fixed sections

  const isActive = (id: string) => activeSection === id;

  function NavBtn({ id, icon, label, indent = false }: { id: string; icon: string; label: string; indent?: boolean }) {
    return (
      <button onClick={() => onNavigate(id)}
        className={clsx(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-left',
          indent ? 'pl-8' : '',
          isActive(id) ? 'bg-orange-500/20 text-orange-400' : 'text-white/60 hover:bg-white/10 hover:text-white'
        )}>
        <span className="text-base shrink-0 w-5 text-center">{icon}</span>
        {!collapsed && <span className="truncate">{label}</span>}
      </button>
    );
  }

  return (
    <aside className={clsx(
      'flex flex-col transition-all duration-300 shrink-0',
      'bg-gradient-to-b from-slate-900 to-blue-950',
      'border-r border-white/10',
      collapsed ? 'w-16' : 'w-64'
    )} style={{ minHeight: '100vh' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center justify-center shrink-0 shadow-lg">
          <span className="text-white font-bold text-lg leading-none">S</span>
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-white font-bold text-sm leading-tight">STC</p>
            <p className="text-white/50 text-xs leading-tight">Monthly Report</p>
          </div>
        )}
        <button className="ml-auto text-white/40 hover:text-white transition-colors text-sm"
          onClick={() => setCollapsed(c => !c)}>
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      {/* Report Label */}
      {!collapsed && (
        <div className="mx-3 mt-3 mb-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
          <p className="text-orange-400 font-semibold text-xs">{reportLabel}</p>
          <p className="text-white/40 text-xs mt-0.5">{reportDate}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        
        {/* Overview */}
        <NavBtn id="overview" icon="◈" label="Overview" />

        {/* Product Development Group */}
        <div>
          <button onClick={() => setProdExpanded(e => !e)}
            className={clsx(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left',
              'text-white/80 hover:bg-white/10'
            )}>
            <span className="text-base shrink-0 w-5 text-center">🏭</span>
            {!collapsed && (
              <>
                <span className="truncate flex-1">Product Development</span>
                <span className="text-white/40 text-xs">{prodExpanded ? '▾' : '▸'}</span>
              </>
            )}
          </button>

          {prodExpanded && (
            <div className="ml-2 border-l border-white/10 pl-1 space-y-0.5">
              <NavBtn id="coil_spring" icon="⊙" label="Coil Spring" indent />
              <NavBtn id="stabilizer" icon="⊗" label="Stabilizer Bar" indent />
              {prodDevSections.map(s => (
                <NavBtn key={s.id} id={"section_" + s.id} icon={s.icon || "◦"} label={s.name} indent />
              ))}
            </div>
          )}
        </div>

        {/* Engineering */}
        <NavBtn id="engineering" icon="⊕" label="Engineering" />

        {/* Process Improvement */}
        <NavBtn id="shohin" icon="◉" label="Process Improvement" />

        {/* Assembly */}
        <NavBtn id="assembly" icon="🔧" label={`Assembly${assemblyCount > 0 ? ` (${assemblyCount})` : ''}`} />

        {/* Machining Parts */}
        <NavBtn id="machining" icon="⚙️" label={`Machining${machiningCount > 0 ? ` (${machiningCount})` : ''}`} />

        {/* Others */}
        <NavBtn id="others" icon="◆" label={`Others${othersCount > 0 ? ` (${othersCount})` : ''}`} />

      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="px-4 py-4 border-t border-white/10">
          <p className="text-white/30 text-xs">Sapura Industrial Berhad</p>
          <p className="text-white/20 text-xs">Together We Grow</p>
        </div>
      )}
    </aside>
  );
}
