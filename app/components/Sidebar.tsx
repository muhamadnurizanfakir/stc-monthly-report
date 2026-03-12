'use client';

import { useState } from 'react';
import clsx from 'clsx';

interface NavItem {
  id:    string;
  label: string;
  icon:  string;
}

interface SidebarProps {
  sections?: { id: string; name: string; icon: string }[];
  activeSection: string;
  onNavigate:    (id: string) => void;
  reportLabel:   string;
  reportDate:    string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview',    label: 'Overview',        icon: '◈' },
  { id: 'coil_spring', label: 'Coil Spring',      icon: '⊙' },
  { id: 'stabilizer',  label: 'Stabilizer Bar',   icon: '⊗' },
  { id: 'shohin',      label: 'Material Change',  icon: '◉' },
  { id: 'engineering', label: 'Engineering',      icon: '⊕' },
];

export default function Sidebar({ activeSection, onNavigate, reportLabel, reportDate, sections = [] }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={clsx(
        'flex flex-col transition-all duration-300 shrink-0',
        'bg-gradient-to-b from-slate-900 to-blue-950',
        'border-r border-white/10',
        collapsed ? 'w-16' : 'w-60'
      )}
      style={{ minHeight: '100vh' }}
    >
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
        <button
          className="ml-auto text-white/40 hover:text-white transition-colors text-sm"
          onClick={() => setCollapsed(c => !c)}
        >
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      {!collapsed && (
        <div className="mx-3 mt-3 mb-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
          <p className="text-orange-400 font-semibold text-xs">{reportLabel}</p>
          <p className="text-white/40 text-xs mt-0.5">{reportDate}</p>
        </div>
      )}

      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {[...NAV_ITEMS, ...sections.map(s => ({ id: "section_" + s.id, label: s.name, icon: s.icon }))].map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={clsx(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-left',
              activeSection === item.id
                ? 'bg-orange-500/20 text-orange-400'
                : 'text-white/60 hover:bg-white/10 hover:text-white'
            )}
          >
            <span className="text-base shrink-0 w-5 text-center">{item.icon}</span>
            {!collapsed && <span className="truncate">{item.label}</span>}
          </button>
        ))}
      </nav>

      {!collapsed && (
        <div className="px-4 py-4 border-t border-white/10">
          <p className="text-white/30 text-xs">Sapura Industrial Berhad</p>
          <p className="text-white/20 text-xs">Together We Grow</p>
        </div>
      )}
    </aside>
  );
}
