'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { LabRFQ, LabProject, LabDocumentSummary } from '../../lib/lab-types';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:        { bg: '#f1f5f9', text: '#64748b' },
  submitted:    { bg: '#dbeafe', text: '#1d4ed8' },
  under_review: { bg: '#ffedd5', text: '#c2410c' },
  quoted:       { bg: '#f3e8ff', text: '#7e22ce' },
  approved:     { bg: '#dcfce7', text: '#15803d' },
  rejected:     { bg: '#fee2e2', text: '#b91c1c' },
  cancelled:    { bg: '#f1f5f9', text: '#6b7280' },
  active:       { bg: '#dcfce7', text: '#15803d' },
  completed:    { bg: '#dbeafe', text: '#1d4ed8' },
  on_hold:      { bg: '#fef9c3', text: '#854d0e' },
  pending:      { bg: '#f1f5f9', text: '#64748b' },
  in_progress:  { bg: '#ffedd5', text: '#c2410c' },
  issued:       { bg: '#dcfce7', text: '#15803d' },
};

interface LabUser {
  id?: string;
  name: string;
  type: string;
  labUserId?: string;
}

export default function LabDashboard() {
  const [user, setUser] = useState<LabUser | null>(null);
  const [rfqs, setRfqs] = useState<LabRFQ[]>([]);
  const [projects, setProjects] = useState<LabProject[]>([]);
  const [documents, setDocuments] = useState<LabDocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'rfq' | 'projects' | 'documents'>('overview');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: rfqData }, { data: projData }, { data: docData }] = await Promise.all([
      supabase.from('lab_rfq').select('*, lab_companies(*), lab_rfq_items(*)').order('created_at', { ascending: false }).limit(20),
      supabase.from('lab_projects').select('*, lab_companies(*)').order('created_at', { ascending: false }).limit(20),
      supabase.from('lab_document_summary').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setRfqs(rfqData ?? []);
    setProjects(projData ?? []);
    setDocuments(docData ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const stored = sessionStorage.getItem('stc_lab_user');
    if (!stored) { window.location.href = '/lab/login'; return; }
    const labUser = JSON.parse(stored) as LabUser;
    setUser(labUser);
    fetchData();
  }, [fetchData]);

  function logout() {
    sessionStorage.removeItem('stc_lab_user');
    window.location.href = '/lab/login';
  }

  function StatusBadge({ status }: { status: string }) {
    const style = STATUS_COLORS[status] ?? { bg: '#f1f5f9', text: '#64748b' };
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold capitalize"
        style={{ background: style.bg, color: style.text }}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-blue-950 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <a href="/lab" className="text-blue-300 hover:text-white text-xs">← Lab Services</a>
          <span className="text-blue-700">|</span>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-white font-bold text-sm">{user.name}</p>
              <p className="text-blue-300 text-xs capitalize">{user.type} user</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href="/lab/rfq" className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold">+ New LTR</a>
          <button onClick={logout} className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-xs font-semibold">Logout</button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-48 bg-blue-950 border-r border-blue-900 shrink-0 py-4">
          {([
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'rfq', label: 'My LTRs', icon: '📋' },
            { id: 'projects', label: 'Projects', icon: '🗂️' },
            { id: 'documents', label: 'Documents', icon: '📄' },
          ] as { id: typeof activeTab; label: string; icon: string }[]).map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={"w-full flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors " +
                (activeTab === item.id ? "bg-orange-500 text-white" : "text-blue-300 hover:text-white hover:bg-blue-900")}>
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="text-slate-400 text-sm">Loading...</div>
            </div>
          ) : (
            <>
              {/* OVERVIEW */}
              {activeTab === 'overview' && (
                <div>
                  <h1 className="text-xl font-bold text-slate-800 mb-6">Welcome, {user.name}!</h1>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {[
                      { label: 'Total LTRs', value: rfqs.length, icon: '📋', color: '#3b82f6' },
                      { label: 'Active Projects', value: projects.filter(p => p.status === 'active').length, icon: '🗂️', color: '#16a34a' },
                      { label: 'Pending Review', value: rfqs.filter(r => r.status === 'under_review').length, icon: '🔍', color: '#f97316' },
                      { label: 'Completed', value: projects.filter(p => p.status === 'completed').length, icon: '✅', color: '#7c3aed' },
                    ].map(s => (
                      <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="text-2xl mb-2">{s.icon}</div>
                        <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                        <p className="text-xs text-slate-500">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Recent RFQs */}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
                    <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="font-bold text-slate-700">Recent RFQs</h3>
                      <button onClick={() => setActiveTab('rfq')} className="text-xs text-blue-600 hover:text-blue-800">View all →</button>
                    </div>
                    {rfqs.slice(0,5).length === 0 ? (
                      <div className="py-6 text-center text-slate-400 text-sm">
                        No LTRs yet. <a href="/lab/rfq" className="text-blue-600 hover:underline">Submit your first RFQ →</a>
                      </div>
                    ) : (
                      <table className="w-full text-xs">
                        <thead><tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left py-2 px-4 font-semibold text-slate-500">LTR No.</th>
                          <th className="text-left py-2 px-4 font-semibold text-slate-500">Project</th>
                          <th className="text-left py-2 px-4 font-semibold text-slate-500">Status</th>
                          <th className="text-left py-2 px-4 font-semibold text-slate-500">Date</th>
                        </tr></thead>
                        <tbody>
                          {rfqs.slice(0,5).map((r, i) => (
                            <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                              <td className="py-2 px-4 font-mono font-semibold text-blue-700">{r.rfq_number}</td>
                              <td className="py-2 px-4 text-slate-700">{r.project_name}</td>
                              <td className="py-2 px-4"><StatusBadge status={r.status} /></td>
                              <td className="py-2 px-4 text-slate-500">{new Date(r.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: '2-digit' })}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {/* RFQs */}
              {activeTab === 'rfq' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h1 className="text-xl font-bold text-slate-800">My LTRs</h1>
                    <a href="/lab/rfq" className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-semibold hover:bg-orange-600">+ New LTR</a>
                  </div>
                  {rfqs.length === 0 ? (
                    <div className="bg-white rounded-xl border border-slate-200 py-12 text-center">
                      <p className="text-slate-400 text-sm mb-2">No LTRs submitted yet</p>
                      <a href="/lab/rfq" className="text-blue-600 text-sm hover:underline">Submit your first RFQ →</a>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {rfqs.map(r => (
                        <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-5">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono font-bold text-blue-700 text-sm">{r.rfq_number}</span>
                                <StatusBadge status={r.status} />
                                {r.priority === 'urgent' && <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-xs font-semibold">🔥 Urgent</span>}
                              </div>
                              <p className="font-semibold text-slate-800">{r.project_name}</p>
                            </div>
                            <p className="text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString('en-MY')}</p>
                          </div>
                          {r.project_description && <p className="text-xs text-slate-500 mb-2">{r.project_description}</p>}
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span>📦 {r.lab_rfq_items?.length ?? 0} test item(s)</span>
                            {r.required_date && <span>📅 Required by: {new Date(r.required_date).toLocaleDateString('en-MY')}</span>}
                            {r.lab_companies && <span>🏢 {r.lab_companies.company_name}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Projects */}
              {activeTab === 'projects' && (
                <div>
                  <h1 className="text-xl font-bold text-slate-800 mb-4">My Projects</h1>
                  {projects.length === 0 ? (
                    <div className="bg-white rounded-xl border border-slate-200 py-12 text-center">
                      <p className="text-slate-400 text-sm">No projects yet. Projects are created after RFQ approval.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {projects.map(p => (
                        <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-5">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-green-700 text-sm">{p.project_number}</span>
                              <StatusBadge status={p.status} />
                            </div>
                            <p className="text-xs text-slate-400">{new Date(p.created_at).toLocaleDateString('en-MY')}</p>
                          </div>
                          <p className="font-semibold text-slate-800 mb-1">{p.project_name}</p>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            {p.start_date && <span>▶ Start: {new Date(p.start_date).toLocaleDateString('en-MY')}</span>}
                            {p.target_completion && <span>🎯 Target: {new Date(p.target_completion).toLocaleDateString('en-MY')}</span>}
                            {p.lab_companies && <span>🏢 {p.lab_companies.company_name}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Documents */}
              {activeTab === 'documents' && (
                <div>
                  <h1 className="text-xl font-bold text-slate-800 mb-4">Document Registry</h1>
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100">
                      <p className="text-xs text-slate-500">{documents.length} documents total</p>
                    </div>
                    {documents.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-sm">No documents yet.</div>
                    ) : (
                      <table className="w-full text-xs">
                        <thead><tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left py-2 px-4 font-semibold text-slate-500">Doc No.</th>
                          <th className="text-left py-2 px-4 font-semibold text-slate-500">Type</th>
                          <th className="text-left py-2 px-4 font-semibold text-slate-500">Title</th>
                          <th className="text-left py-2 px-4 font-semibold text-slate-500">Company</th>
                          <th className="text-left py-2 px-4 font-semibold text-slate-500">Status</th>
                          <th className="text-left py-2 px-4 font-semibold text-slate-500">Date</th>
                        </tr></thead>
                        <tbody>
                          {documents.map((d, i) => (
                            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                              <td className="py-2 px-4 font-mono font-semibold text-blue-700">{d.doc_number}</td>
                              <td className="py-2 px-4">
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-semibold">{d.doc_type}</span>
                              </td>
                              <td className="py-2 px-4 text-slate-700 max-w-xs truncate">{d.title}</td>
                              <td className="py-2 px-4 text-slate-500">{d.company_name ?? '—'}</td>
                              <td className="py-2 px-4"><StatusBadge status={d.status} /></td>
                              <td className="py-2 px-4 text-slate-500">{new Date(d.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: '2-digit' })}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
