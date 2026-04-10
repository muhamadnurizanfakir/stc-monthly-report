'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

interface AuditLog {
  id: string;
  user_name: string | null;
  action: string;
  entity_type: string;
  entity_number: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
}

const ACTION_COLORS: Record<string, { bg: string; text: string }> = {
  CREATE:         { bg: '#dcfce7', text: '#15803d' },
  CREATE_DRAFT:   { bg: '#f0fdf4', text: '#16a34a' },
  SUBMIT:         { bg: '#dbeafe', text: '#1d4ed8' },
  UPDATE:         { bg: '#fef9c3', text: '#854d0e' },
  UPDATE_STATUS:  { bg: '#ffedd5', text: '#c2410c' },
  APPROVE:        { bg: '#dcfce7', text: '#15803d' },
  REJECT:         { bg: '#fee2e2', text: '#b91c1c' },
  ISSUE:          { bg: '#dbeafe', text: '#1d4ed8' },
  UPLOAD:         { bg: '#f3e8ff', text: '#7e22ce' },
  DELETE:         { bg: '#fee2e2', text: '#b91c1c' },
  VIEW:           { bg: '#f1f5f9', text: '#64748b' },
};

const ENTITY_ICONS: Record<string, string> = {
  rfq: '🧪', ltr: '🧪', quotation: '💰', project: '🗂️',
  sample: '📦', test: '🔬', report: '📄', user: '👤',
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEntity, setFilterEntity] = useState('all');
  const [filterAction, setFilterAction] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const query = supabase.from('lab_audit_logs').select('*')
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    const { data } = await query;
    setLogs(data ?? []);
    setLoading(false);
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function getActionColor(action: string) {
    const key = Object.keys(ACTION_COLORS).find(k => action.startsWith(k));
    return ACTION_COLORS[key ?? ''] ?? { bg: '#f1f5f9', text: '#64748b' };
  }

  const filtered = logs.filter(l => {
    const matchEntity = filterEntity === 'all' || l.entity_type === filterEntity;
    const matchAction = filterAction === 'all' || l.action.startsWith(filterAction);
    const matchSearch = !search ||
      (l.user_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (l.entity_number ?? '').toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase());
    return matchEntity && matchAction && matchSearch;
  });

  const entityTypes = Array.from(new Set(logs.map(l => l.entity_type)));
  const actionTypes = Array.from(new Set(Object.keys(ACTION_COLORS)));

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-blue-950 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/lab/admin" className="text-blue-300 hover:text-white text-xs">← Lab Admin</a>
          <span className="text-blue-700">|</span>
          <span className="text-white font-bold text-sm">🔍 Audit Log</span>
          <span className="px-2 py-0.5 bg-blue-800 text-blue-200 rounded-full text-xs">ISO 17025 Traceability</span>
        </div>
        <button onClick={fetchData} className="px-3 py-1.5 bg-blue-800 hover:bg-blue-700 text-white rounded-lg text-xs">🔄 Refresh</button>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Filters */}
        <div className="flex gap-3 mb-4 flex-wrap">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search user, document number, action..."
            className="flex-1 min-w-48 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <select value={filterEntity} onChange={e => setFilterEntity(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">All Entities</option>
            {entityTypes.map(e => <option key={e} value={e}>{ENTITY_ICONS[e] ?? ''} {e}</option>)}
          </select>
          <select value={filterAction} onChange={e => setFilterAction(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">All Actions</option>
            {actionTypes.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Total Entries', value: logs.length, color: '#3b82f6' },
            { label: 'Submissions', value: logs.filter(l => l.action.includes('SUBMIT')).length, color: '#16a34a' },
            { label: 'Approvals', value: logs.filter(l => l.action.includes('APPROVE')).length, color: '#7c3aed' },
            { label: 'Reports Issued', value: logs.filter(l => l.action.includes('ISSUE')).length, color: '#0e7490' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-3 text-center">
              <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Log Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <p className="text-xs text-slate-500 font-semibold">{filtered.length} entries shown</p>
            <p className="text-xs text-slate-400">Append-only — cannot be modified (ISO 17025)</p>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-blue-950 text-blue-100">
                <th className="text-left py-3 px-4 font-semibold">Date & Time</th>
                <th className="text-left py-3 px-4 font-semibold">User</th>
                <th className="text-left py-3 px-4 font-semibold">Action</th>
                <th className="text-left py-3 px-4 font-semibold">Entity</th>
                <th className="text-left py-3 px-4 font-semibold">Document No.</th>
                <th className="text-left py-3 px-4 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-8 text-center text-slate-400">Loading audit logs...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-slate-400">No audit logs found.</td></tr>
              ) : filtered.map((l, i) => {
                const actionStyle = getActionColor(l.action);
                return (
                  <tr key={l.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="py-2.5 px-4 text-slate-500 font-mono whitespace-nowrap">
                      <p>{new Date(l.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: '2-digit' })}</p>
                      <p className="text-slate-400">{new Date(l.created_at).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-700">{l.user_name ?? 'System'}</td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{ background: actionStyle.bg, color: actionStyle.text }}>
                        {l.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 capitalize">
                      {ENTITY_ICONS[l.entity_type] ?? ''} {l.entity_type}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-semibold text-blue-700">{l.entity_number ?? '—'}</td>
                    <td className="py-2.5 px-4 text-slate-500 max-w-xs">
                      {l.new_values ? (
                        <span className="truncate block">{JSON.stringify(l.new_values).substring(0, 60)}{JSON.stringify(l.new_values).length > 60 ? '...' : ''}</span>
                      ) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {/* Pagination */}
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
            <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
              className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs disabled:opacity-40 hover:bg-slate-200">← Previous</button>
            <p className="text-xs text-slate-500">Page {page + 1}</p>
            <button onClick={() => setPage(page + 1)} disabled={logs.length < PAGE_SIZE}
              className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs disabled:opacity-40 hover:bg-slate-200">Next →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
