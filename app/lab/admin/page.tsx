'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { LabRFQ, LabProject, LabSample, LabTestExecution, LabReport, LabDocumentSummary } from '../../lib/lab-types';

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
  sent:         { bg: '#dbeafe', text: '#1d4ed8' },
  received:     { bg: '#dcfce7', text: '#15803d' },
  in_test:      { bg: '#ffedd5', text: '#c2410c' },
  disposed:     { bg: '#f1f5f9', text: '#6b7280' },
};

type AdminTab = 'overview' | 'rfq' | 'quotations' | 'projects' | 'samples' | 'tests' | 'reports' | 'documents' | 'catalogue' | 'users' | 'outsourced' | 'companies' | 'audit';

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_COLORS[status] ?? { bg: '#f1f5f9', text: '#64748b' };
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold capitalize"
      style={{ background: style.bg, color: style.text }}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export default function LabAdminPage() {
  const [tab, setTab] = useState<AdminTab>('overview');
  const [rfqs, setRfqs] = useState<LabRFQ[]>([]);
  const [projects, setProjects] = useState<LabProject[]>([]);
  const [samples, setSamples] = useState<LabSample[]>([]);
  const [tests, setTests] = useState<LabTestExecution[]>([]);
  const [reports, setReports] = useState<LabReport[]>([]);
  const [documents, setDocuments] = useState<LabDocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [labUser, setLabUser] = useState<{name:string;role:string;designation?:string} | null>(null);
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [
      { data: rfqData },
      { data: projData },
      { data: samData },
      { data: testData },
      { data: repData },
      { data: docData },
    ] = await Promise.all([
      supabase.from('lab_rfq').select('*, lab_companies(*), lab_rfq_items(*)').order('created_at', { ascending: false }),
      supabase.from('lab_projects').select('*, lab_companies(*)').order('created_at', { ascending: false }),
      supabase.from('lab_samples').select('*, lab_projects(project_name, project_number)').order('created_at', { ascending: false }),
      supabase.from('lab_test_executions').select('*, lab_projects(project_name), lab_outsourced_labs(lab_name)').order('created_at', { ascending: false }),
      supabase.from('lab_reports').select('*, lab_projects(project_name, project_number)').order('created_at', { ascending: false }),
      supabase.from('lab_document_summary').select('*').order('created_at', { ascending: false }),
    ]);
    setRfqs(rfqData ?? []);
    setProjects(projData ?? []);
    setSamples(samData ?? []);
    setTests(testData ?? []);
    setReports(repData ?? []);
    setDocuments(docData ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const auth = sessionStorage.getItem('stc_lab_admin_auth');
    const user = sessionStorage.getItem('stc_lab_user');
    if (user) {
      const parsed = JSON.parse(user);
      setLabUser(parsed);
      // Staff roles auto-auth to admin
      if (['lab_admin','lab_engineer','lab_reviewer','lab_approver'].includes(parsed.role)) {
        setAuthed(true);
        fetchAll();
        return;
      }
    }
    if (auth === 'true') { setAuthed(true); fetchAll(); }
    else setLoading(false);
  }, [fetchAll]);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/lab-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'portal_password', password }),
    });
    const data = await res.json();
    if (data.ok) {
      sessionStorage.setItem('stc_lab_admin_auth', 'true');
      setAuthed(true);
      fetchAll();
    } else {
      setAuthError('Wrong password');
    }
  }

  async function updateRFQStatus(id: string, status: string) {
    await supabase.from('lab_rfq').update({ status, ...(status === 'submitted' ? { submitted_at: new Date().toISOString() } : {}) }).eq('id', id);
    await supabase.from('lab_audit_logs').insert([{ action: 'UPDATE_STATUS', entity_type: 'rfq', entity_id: id, new_values: { status } }]);
    fetchAll();
  }

  async function updateProjectStatus(id: string, status: string) {
    await supabase.from('lab_projects').update({ status }).eq('id', id);
    fetchAll();
  }

  async function updateTestStatus(id: string, status: string) {
    await supabase.from('lab_test_executions').update({ status }).eq('id', id);
    fetchAll();
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-blue-950 flex items-center justify-center text-2xl mx-auto mb-3">⚙️</div>
            <h1 className="font-bold text-slate-800 text-lg">Lab Admin Panel</h1>
            <p className="text-slate-500 text-xs mt-1">Enter lab password to continue</p>
          </div>
          <form onSubmit={handleAuth} className="space-y-3">
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Lab password" autoFocus
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {authError && <p className="text-red-500 text-xs">{authError}</p>}
            <button type="submit" className="w-full py-3 bg-blue-950 text-white rounded-xl font-bold text-sm hover:bg-blue-900">Enter Admin →</button>
            <a href="/lab" className="block text-center text-slate-400 text-xs hover:text-slate-600">← Back to Lab</a>
          </form>
        </div>
      </div>
    );
  }

  const TABS: { id: AdminTab; label: string; icon: string; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'rfq', label: 'LTR', icon: '📋', count: rfqs.filter(r => r.status === 'submitted').length },
    { id: 'quotations', label: 'Quotations', icon: '💰' },
    { id: 'projects', label: 'Projects', icon: '🗂️', count: projects.filter(p => p.status === 'active').length },
    { id: 'samples', label: 'Samples', icon: '📦' },
    { id: 'tests', label: 'Tests', icon: '🔬', count: tests.filter(t => t.status === 'in_progress').length },
    { id: 'reports', label: 'Reports', icon: '📄' },
    { id: 'documents', label: 'Documents', icon: '🗃️' },
    { id: 'catalogue', label: 'Catalogue', icon: '📚' },
    { id: 'users', label: 'Users', icon: '👥' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-blue-950 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <a href="/lab" className="text-blue-300 hover:text-white text-xs">← Lab</a>
          <span className="text-blue-700">|</span>
          <div className="flex items-center gap-3">
            <span className="text-white font-bold text-sm">⚙️ Lab Admin Panel</span>
            {labUser && (
              <span className="px-2 py-0.5 bg-green-700 text-green-100 rounded-full text-xs font-semibold">
                {labUser.role?.replace('lab_','').replace('_',' ')} — {labUser.name}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchAll} className="px-3 py-1.5 bg-blue-800 hover:bg-blue-700 text-white rounded-lg text-xs">🔄 Refresh</button>
          <button onClick={() => { sessionStorage.removeItem('stc_lab_admin_auth'); setAuthed(false); }}
            className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-xs">Logout</button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-48 bg-blue-950 shrink-0 py-2 overflow-y-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={"w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors " +
                (tab === t.id ? "bg-orange-500 text-white" : "text-blue-300 hover:text-white hover:bg-blue-900")}>
              <span className="flex items-center gap-2"><span>{t.icon}</span>{t.label}</span>
              {t.count !== undefined && t.count > 0 && (
                <span className="bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Loading...</div>
          ) : (
            <>
              {/* OVERVIEW */}
              {tab === 'overview' && (
                <div>
                  <h1 className="text-xl font-bold text-slate-800 mb-6">Lab Overview</h1>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {[
                      { label: 'Total LTRs', value: rfqs.length, icon: '📋', color: '#3b82f6' },
                      { label: 'Active Projects', value: projects.filter(p => p.status === 'active').length, icon: '🗂️', color: '#16a34a' },
                      { label: 'Samples in Lab', value: samples.filter(s => s.status === 'in_test').length, icon: '📦', color: '#f97316' },
                      { label: 'Reports Issued', value: reports.filter(r => r.status === 'issued').length, icon: '📄', color: '#7c3aed' },
                    ].map(s => (
                      <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="text-2xl mb-2">{s.icon}</div>
                        <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                        <p className="text-xs text-slate-500">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  {/* Pending actions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                      <h3 className="font-bold text-slate-700 mb-3 text-sm">⏳ Pending LTR Review</h3>
                      {rfqs.filter(r => r.status === 'submitted').length === 0 ? (
                        <p className="text-slate-400 text-xs">No pending RFQs</p>
                      ) : rfqs.filter(r => r.status === 'submitted').slice(0, 5).map(r => (
                        <div key={r.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                          <div>
                            <p className="text-xs font-mono text-blue-700">{r.rfq_number}</p>
                            <p className="text-xs text-slate-600 truncate max-w-xs">{r.project_name}</p>
                          </div>
                          <button onClick={() => { setTab('rfq'); }} className="text-xs text-blue-600 hover:text-blue-800">Review →</button>
                        </div>
                      ))}
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                      <h3 className="font-bold text-slate-700 mb-3 text-sm">🔬 Tests In Progress</h3>
                      {tests.filter(t => t.status === 'in_progress').length === 0 ? (
                        <p className="text-slate-400 text-xs">No tests in progress</p>
                      ) : tests.filter(t => t.status === 'in_progress').slice(0, 5).map(t => (
                        <div key={t.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                          <div>
                            <p className="text-xs font-mono text-orange-700">{t.test_number}</p>
                            <p className="text-xs text-slate-600 truncate max-w-xs">{t.test_name}</p>
                          </div>
                          <StatusBadge status={t.status} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* RFQ MANAGEMENT */}
              {tab === 'rfq' && (
                <div>
                  <h1 className="text-xl font-bold text-slate-800 mb-4">LTR Management</h1>
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead><tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">LTR No.</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Project</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Company</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Contact</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Items</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Priority</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Status</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Actions</th>
                      </tr></thead>
                      <tbody>
                        {rfqs.map((r, i) => (
                          <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                            <td className="py-2 px-4 font-mono font-semibold text-blue-700">{r.rfq_number}</td>
                            <td className="py-2 px-4 text-slate-700 max-w-[150px] truncate">{r.project_name}</td>
                            <td className="py-2 px-4 text-slate-500">{r.lab_companies?.company_name ?? '—'}</td>
                            <td className="py-2 px-4 text-slate-500">{r.contact_name}</td>
                            <td className="py-2 px-4 text-center">{r.lab_rfq_items?.length ?? 0}</td>
                            <td className="py-2 px-4">
                              {r.priority === 'urgent' && <span className="text-red-500 font-semibold">🔥 Urgent</span>}
                              {r.priority === 'normal' && <span className="text-slate-500">Normal</span>}
                              {r.priority === 'low' && <span className="text-slate-400">Low</span>}
                            </td>
                            <td className="py-2 px-4"><StatusBadge status={r.status} /></td>
                            <td className="py-2 px-4">
                              <select value={r.status} onChange={e => updateRFQStatus(r.id, e.target.value)}
                                className="border border-slate-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500">
                                {['draft','submitted','under_review','quoted','approved','rejected','cancelled'].map(s => (
                                  <option key={s} value={s}>{s.replace(/_/g,' ')}</option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {rfqs.length === 0 && <div className="py-8 text-center text-slate-400 text-sm">No LTRs yet.</div>}
                  </div>
                </div>
              )}

              {/* PROJECTS */}
              {tab === 'projects' && (
                <div>
                  <h1 className="text-xl font-bold text-slate-800 mb-2">Project Management</h1>
                  <div className="mb-4"><a href="/lab/admin/projects" className="inline-block px-4 py-2 bg-blue-950 text-white rounded-xl text-xs font-bold hover:bg-blue-900">Open Full Project Manager →</a></div>
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead><tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Project No.</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Name</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Company</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Start</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Target</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Status</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Actions</th>
                      </tr></thead>
                      <tbody>
                        {projects.map((p, i) => (
                          <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                            <td className="py-2 px-4 font-mono font-semibold text-green-700">{p.project_number}</td>
                            <td className="py-2 px-4 text-slate-700 max-w-[150px] truncate">{p.project_name}</td>
                            <td className="py-2 px-4 text-slate-500">{p.lab_companies?.company_name ?? '—'}</td>
                            <td className="py-2 px-4 text-slate-500">{p.start_date ? new Date(p.start_date).toLocaleDateString('en-MY') : '—'}</td>
                            <td className="py-2 px-4 text-slate-500">{p.target_completion ? new Date(p.target_completion).toLocaleDateString('en-MY') : '—'}</td>
                            <td className="py-2 px-4"><StatusBadge status={p.status} /></td>
                            <td className="py-2 px-4">
                              <select value={p.status} onChange={e => updateProjectStatus(p.id, e.target.value)}
                                className="border border-slate-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500">
                                {['active','on_hold','completed','cancelled'].map(s => (
                                  <option key={s} value={s}>{s.replace(/_/g,' ')}</option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {projects.length === 0 && <div className="py-8 text-center text-slate-400 text-sm">No projects yet.</div>}
                  </div>
                </div>
              )}

              {/* SAMPLES */}
              {tab === 'samples' && (
                <div>
                  <h1 className="text-xl font-bold text-slate-800 mb-2">Sample Management</h1>
                  <div className="mb-4"><a href="/lab/admin/samples" className="inline-block px-4 py-2 bg-blue-950 text-white rounded-xl text-xs font-bold hover:bg-blue-900">Open Sample Registry →</a></div>
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead><tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Sample No.</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Description</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Project</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Qty</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Received</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Location</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Status</th>
                      </tr></thead>
                      <tbody>
                        {samples.map((s, i) => (
                          <tr key={s.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                            <td className="py-2 px-4 font-mono font-semibold text-purple-700">{s.sample_number}</td>
                            <td className="py-2 px-4 text-slate-700 max-w-[150px] truncate">{s.sample_description}</td>
                            <td className="py-2 px-4 text-slate-500">{(s.lab_projects as {project_name?:string}|undefined)?.project_name ?? '—'}</td>
                            <td className="py-2 px-4 text-slate-500">{s.quantity_received} {s.quantity_unit}</td>
                            <td className="py-2 px-4 text-slate-500">{new Date(s.received_date).toLocaleDateString('en-MY')}</td>
                            <td className="py-2 px-4 text-slate-500">{s.storage_location ?? '—'}</td>
                            <td className="py-2 px-4"><StatusBadge status={s.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {samples.length === 0 && <div className="py-8 text-center text-slate-400 text-sm">No samples registered yet.</div>}
                  </div>
                </div>
              )}

              {/* TESTS */}
              {tab === 'tests' && (
                <div>
                  <h1 className="text-xl font-bold text-slate-800 mb-2">Test Executions</h1>
                  <div className="mb-4"><a href="/lab/admin/tests" className="inline-block px-4 py-2 bg-blue-950 text-white rounded-xl text-xs font-bold hover:bg-blue-900">Open Test Execution Manager →</a></div>
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead><tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Test No.</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Test Name</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Project</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Type</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Outsourced Lab</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Status</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Actions</th>
                      </tr></thead>
                      <tbody>
                        {tests.map((t, i) => (
                          <tr key={t.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                            <td className="py-2 px-4 font-mono font-semibold text-orange-700">{t.test_number}</td>
                            <td className="py-2 px-4 text-slate-700 max-w-[140px] truncate">{t.test_name}</td>
                            <td className="py-2 px-4 text-slate-500">{(t.lab_projects as {project_name?:string}|undefined)?.project_name ?? '—'}</td>
                            <td className="py-2 px-4">
                              <span className={"px-2 py-0.5 rounded text-xs font-semibold " + (t.test_type === 'inhouse' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700')}>
                                {t.test_type === 'inhouse' ? 'In-House' : 'Outsourced'}
                              </span>
                            </td>
                            <td className="py-2 px-4 text-slate-500">{(t.lab_outsourced_labs as {lab_name?:string}|undefined)?.lab_name ?? '—'}</td>
                            <td className="py-2 px-4"><StatusBadge status={t.status} /></td>
                            <td className="py-2 px-4">
                              <select value={t.status} onChange={e => updateTestStatus(t.id, e.target.value)}
                                className="border border-slate-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500">
                                {['pending','in_progress','completed','failed','cancelled'].map(s => (
                                  <option key={s} value={s}>{s.replace(/_/g,' ')}</option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {tests.length === 0 && <div className="py-8 text-center text-slate-400 text-sm">No test executions yet.</div>}
                  </div>
                </div>
              )}

              {/* REPORTS */}
              {tab === 'reports' && (
                <div>
                  <h1 className="text-xl font-bold text-slate-800 mb-2">Reports</h1>
                  <div className="mb-4"><a href="/lab/admin/reports" className="inline-block px-4 py-2 bg-blue-950 text-white rounded-xl text-xs font-bold hover:bg-blue-900">Open Report Manager →</a></div>
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead><tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Report No.</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Title</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Project</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Type</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Rev</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Status</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Issued</th>
                      </tr></thead>
                      <tbody>
                        {reports.map((r, i) => (
                          <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                            <td className="py-2 px-4 font-mono font-semibold text-purple-700">{r.report_number}</td>
                            <td className="py-2 px-4 text-slate-700 max-w-[150px] truncate">{r.report_title}</td>
                            <td className="py-2 px-4 text-slate-500">{(r.lab_projects as {project_name?:string}|undefined)?.project_name ?? '—'}</td>
                            <td className="py-2 px-4 text-slate-500 capitalize">{r.report_type}</td>
                            <td className="py-2 px-4 text-center font-bold text-slate-600">{r.revision}</td>
                            <td className="py-2 px-4"><StatusBadge status={r.status} /></td>
                            <td className="py-2 px-4 text-slate-500">{r.issued_at ? new Date(r.issued_at).toLocaleDateString('en-MY') : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {reports.length === 0 && <div className="py-8 text-center text-slate-400 text-sm">No reports yet.</div>}
                  </div>
                </div>
              )}

              {/* DOCUMENTS */}
              {tab === 'documents' && (
                <div>
                  <h1 className="text-xl font-bold text-slate-800 mb-4">Document Registry</h1>
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                      <p className="text-xs text-slate-500 font-semibold">{documents.length} total documents</p>
                      <div className="flex gap-2">
                        {['LTR','QUO','PRJ','SAM','TST','RPT'].map(type => (
                          <span key={type} className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded text-xs font-mono">
                            {type}: {documents.filter(d => d.doc_type === type).length}
                          </span>
                        ))}
                      </div>
                    </div>
                    <table className="w-full text-xs">
                      <thead><tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Doc No.</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Type</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Title</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Company</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Status</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Created</th>
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
                    {documents.length === 0 && <div className="py-8 text-center text-slate-400 text-sm">No documents yet.</div>}
                  </div>
                </div>
              )}

              {/* QUOTATIONS */}
              {tab === 'quotations' && (
                <div>
                  <h1 className="text-xl font-bold text-slate-800 mb-4">Quotation Management</h1>
                  <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
                    <p className="text-4xl mb-3">💰</p>
                    <p className="text-slate-600 font-semibold mb-2">Create & Manage Quotations</p>
                    <p className="text-slate-400 text-sm mb-4">Generate quotations from LTRs under review, set pricing and send to customers</p>
                    <a href="/lab/admin/quotations" className="inline-block px-6 py-2.5 bg-blue-950 text-white rounded-xl text-sm font-bold hover:bg-blue-900">
                      Open Quotation Manager →
                    </a>
                  </div>
                </div>
              )}

              {/* CATALOGUE */}
              {tab === 'catalogue' && (
                <div>
                  <h1 className="text-xl font-bold text-slate-800 mb-4">Test Catalogue</h1>
                  <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
                    <p className="text-4xl mb-3">📚</p>
                    <p className="text-slate-600 font-semibold mb-2">Manage Test Catalogue</p>
                    <p className="text-slate-400 text-sm mb-4">Add tests, set pricing, standards and duration</p>
                    <a href="/lab/admin/catalogue" className="inline-block px-6 py-2.5 bg-blue-950 text-white rounded-xl text-sm font-bold hover:bg-blue-900">
                      Open Test Catalogue →
                    </a>
                  </div>
                </div>
              )}

              {/* USERS */}
              {tab === 'users' && (
                <div>
                  <h1 className="text-xl font-bold text-slate-800 mb-4">User Management</h1>
                  <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
                    <p className="text-4xl mb-3">👥</p>
                    <p className="text-slate-600 font-semibold mb-2">Manage Lab Users</p>
                    <p className="text-slate-400 text-sm mb-4">Add engineers, reviewers, approvers and customer accounts</p>
                    <a href="/lab/admin/users" className="inline-block px-6 py-2.5 bg-blue-950 text-white rounded-xl text-sm font-bold hover:bg-blue-900">
                      Open User Management →
                    </a>
                  </div>
                </div>
              )}
              {/* COMPANIES */}
              {tab === 'companies' && (
                <div>
                  <h1 className="text-xl font-bold text-slate-800 mb-2">Company Management</h1>
                  <div className="mb-4"><a href="/lab/admin/companies" className="inline-block px-4 py-2 bg-blue-950 text-white rounded-xl text-xs font-bold hover:bg-blue-900">Open Company Manager →</a></div>
                </div>
              )}

              {/* AUDIT LOG */}
              {tab === 'audit' && (
                <div>
                  <h1 className="text-xl font-bold text-slate-800 mb-2">Audit Log</h1>
                  <p className="text-xs text-slate-500 mb-4">ISO 17025 compliant append-only audit trail of all system actions</p>
                  <div className="mb-4"><a href="/lab/admin/audit" className="inline-block px-4 py-2 bg-blue-950 text-white rounded-xl text-xs font-bold hover:bg-blue-900">Open Audit Log Viewer →</a></div>
                </div>
              )}

              {/* OUTSOURCED LABS */}
              {tab === 'outsourced' && (
                <div>
                  <h1 className="text-xl font-bold text-slate-800 mb-2">Outsourced Labs Registry</h1>
                  <div className="mb-4"><a href="/lab/admin/outsourced" className="inline-block px-4 py-2 bg-blue-950 text-white rounded-xl text-xs font-bold hover:bg-blue-900">Open Outsourced Labs Registry →</a></div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
