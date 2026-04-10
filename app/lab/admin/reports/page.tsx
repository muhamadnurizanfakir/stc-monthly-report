'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../lib/supabase';

interface Project { id: string; project_number: string; project_name: string; }
interface LabUser { id: string; name: string; role: string; designation: string | null; }
interface TestExecution {
  id: string; test_number: string; test_name: string; status: string;
  lab_test_results?: { id: string; parameter_name: string; measured_value: string | null; result: string }[];
}
interface Report {
  id: string; report_number: string; report_title: string; report_type: string;
  project_id: string; status: string; revision: string; file_url: string | null;
  summary: string | null; conclusion: string | null; issued_at: string | null;
  created_at: string; reviewer_notes: string | null; approver_notes: string | null;
  lab_projects?: { project_name: string; project_number: string };
  prepared_by_user?: { name: string };
  reviewed_by_user?: { name: string };
  approved_by_user?: { name: string };
}

const STATUS_FLOW = ['draft', 'under_review', 'approved', 'issued', 'superseded'];
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:        { bg: '#f1f5f9', text: '#64748b' },
  under_review: { bg: '#ffedd5', text: '#c2410c' },
  approved:     { bg: '#dcfce7', text: '#15803d' },
  issued:       { bg: '#dbeafe', text: '#1d4ed8' },
  superseded:   { bg: '#fce7f3', text: '#9d174d' },
};

const emptyForm = {
  project_id: '', report_title: '', report_type: 'test',
  summary: '', conclusion: '', revision: 'A',
  prepared_by: '', reviewed_by: '', approved_by: '',
};

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<LabUser[]>([]);
  const [tests, setTests] = useState<TestExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewReport, setViewReport] = useState<Report | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [approveNote, setApproveNote] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: rep }, { data: proj }, { data: usr }] = await Promise.all([
      supabase.from('lab_reports')
        .select('*, lab_projects(project_name, project_number), prepared_by_user:lab_users!lab_reports_prepared_by_fkey(name), reviewed_by_user:lab_users!lab_reports_reviewed_by_fkey(name), approved_by_user:lab_users!lab_reports_approved_by_fkey(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lab_projects').select('id, project_number, project_name').order('project_number'),
      supabase.from('lab_users').select('id, name, role, designation').eq('is_active', true).order('name'),
    ]);
    setReports(rep ?? []);
    setProjects(proj ?? []);
    setUsers(usr ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function generatePDF(report: Report) {
    setGeneratingPDF(report.id);
    try {
      // Fetch full report data with all relations
      const { data: fullReport } = await supabase
        .from('lab_reports')
        .select('*, lab_projects(project_number, project_name, lab_companies(company_name)), prepared_by_user:lab_users!lab_reports_prepared_by_fkey(name, designation), reviewed_by_user:lab_users!lab_reports_reviewed_by_fkey(name, designation), approved_by_user:lab_users!lab_reports_approved_by_fkey(name, designation)')
        .eq('id', report.id)
        .single();

      // Fetch tests + results for this project
      const { data: testData } = await supabase
        .from('lab_test_executions')
        .select('*, lab_test_results(*), lab_outsourced_labs(lab_name), lab_samples(sample_number, sample_description)')
        .eq('project_id', report.project_id)
        .in('status', ['completed', 'in_progress'])
        .order('test_number');

      if (fullReport) {
        const { generateLabReportPDF } = await import('./reportGenerator');
        await generateLabReportPDF(fullReport, testData ?? []);
      }
    } catch (e) {
      console.error(e);
      alert('Error generating PDF');
    }
    setGeneratingPDF(null);
  }

  async function loadProjectTests(projectId: string) {
    const { data } = await supabase.from('lab_test_executions')
      .select('id, test_number, test_name, status, lab_test_results(id, parameter_name, measured_value, result)')
      .eq('project_id', projectId).eq('status', 'completed');
    setTests(data ?? []);
  }

  async function handleCreate() {
    if (!form.project_id || !form.report_title) { alert('Project and title required'); return; }
    setSaving(true);
    const { data: rep } = await supabase.from('lab_reports').insert([{
      project_id: form.project_id,
      report_title: form.report_title,
      report_type: form.report_type,
      summary: form.summary || null,
      conclusion: form.conclusion || null,
      revision: form.revision,
      prepared_by: form.prepared_by || null,
      reviewed_by: form.reviewed_by || null,
      approved_by: form.approved_by || null,
      prepared_at: new Date().toISOString(),
      status: 'draft',
    }]).select().single();

    if (rep) {
      await supabase.from('lab_audit_logs').insert([{
        action: 'CREATE_REPORT', entity_type: 'report',
        entity_id: rep.id, entity_number: rep.report_number,
        new_values: { report_title: form.report_title, status: 'draft' },
      }]);
    }
    setShowForm(false); setForm(emptyForm); setTests([]);
    fetchData(); setSaving(false);
  }

  async function uploadReport(reportId: string, file: File) {
    setUploading(true);
    const path = `${reportId}/${file.name}`;
    const { data: uploaded } = await supabase.storage.from('lab-reports').upload(path, file, { upsert: true });
    if (uploaded) {
      const { data: { publicUrl } } = supabase.storage.from('lab-reports').getPublicUrl(path);
      await supabase.from('lab_reports').update({ file_url: publicUrl }).eq('id', reportId);
      await supabase.from('lab_audit_logs').insert([{
        action: 'UPLOAD_REPORT', entity_type: 'report', entity_id: reportId,
        new_values: { file_name: file.name },
      }]);
      fetchData();
      if (viewReport) setViewReport(prev => prev ? { ...prev, file_url: publicUrl } : null);
    }
    setUploading(false);
  }

  async function submitForReview(reportId: string) {
    await supabase.from('lab_reports').update({ status: 'under_review' }).eq('id', reportId);
    await supabase.from('lab_audit_logs').insert([{ action: 'SUBMIT_REVIEW', entity_type: 'report', entity_id: reportId }]);
    fetchData();
    if (viewReport?.id === reportId) setViewReport(prev => prev ? { ...prev, status: 'under_review' } : null);
  }

  async function approveReport(reportId: string) {
    await supabase.from('lab_reports').update({
      status: 'approved', approved_at: new Date().toISOString(),
      approver_notes: approveNote || null,
    }).eq('id', reportId);
    await supabase.from('lab_audit_logs').insert([{ action: 'APPROVE_REPORT', entity_type: 'report', entity_id: reportId, new_values: { notes: approveNote } }]);
    fetchData();
    if (viewReport?.id === reportId) setViewReport(prev => prev ? { ...prev, status: 'approved' } : null);
  }

  async function reviewReport(reportId: string) {
    await supabase.from('lab_reports').update({
      reviewed_at: new Date().toISOString(),
      reviewer_notes: reviewNote || null,
    }).eq('id', reportId);
    await supabase.from('lab_audit_logs').insert([{ action: 'REVIEW_REPORT', entity_type: 'report', entity_id: reportId, new_values: { notes: reviewNote } }]);
    fetchData();
    if (viewReport?.id === reportId) setViewReport(prev => prev ? { ...prev, reviewer_notes: reviewNote } : null);
  }

  async function issueReport(reportId: string) {
    await supabase.from('lab_reports').update({
      status: 'issued', issued_at: new Date().toISOString(),
    }).eq('id', reportId);
    await supabase.from('lab_audit_logs').insert([{ action: 'ISSUE_REPORT', entity_type: 'report', entity_id: reportId }]);
    fetchData();
    if (viewReport?.id === reportId) setViewReport(prev => prev ? { ...prev, status: 'issued' } : null);
  }

  async function rejectToRevision(reportId: string, currentRev: string) {
    const nextRev = String.fromCharCode(currentRev.charCodeAt(0) + 1);
    await supabase.from('lab_reports').update({ status: 'draft', revision: nextRev }).eq('id', reportId);
    await supabase.from('lab_audit_logs').insert([{ action: 'REJECT_REPORT', entity_type: 'report', entity_id: reportId, new_values: { revision: nextRev } }]);
    fetchData();
    if (viewReport?.id === reportId) setViewReport(prev => prev ? { ...prev, status: 'draft', revision: nextRev } : null);
  }

  const reviewers = users.filter(u => ['lab_reviewer', 'lab_admin'].includes(u.role));
  const approvers = users.filter(u => ['lab_approver', 'lab_admin'].includes(u.role));
  const engineers = users.filter(u => ['lab_engineer', 'lab_admin'].includes(u.role));

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-blue-950 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/lab/admin" className="text-blue-300 hover:text-white text-xs">← Lab Admin</a>
          <span className="text-blue-700">|</span>
          <span className="text-white font-bold text-sm">📄 Report Management</span>
        </div>
        <button onClick={() => { setShowForm(true); setForm(emptyForm); setTests([]); }}
          className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold">
          + New Report
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Status Summary */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          {STATUS_FLOW.map(s => {
            const style = STATUS_COLORS[s];
            return (
              <div key={s} className="bg-white rounded-xl border border-slate-200 p-3 text-center">
                <p className="text-xl font-bold" style={{ color: style.text }}>{reports.filter(r => r.status === s).length}</p>
                <p className="text-xs text-slate-500 capitalize mt-0.5">{s.replace('_', ' ')}</p>
              </div>
            );
          })}
        </div>

        {/* Reports Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-blue-950 text-blue-100">
                <th className="text-left py-3 px-4 font-semibold">Report No.</th>
                <th className="text-left py-3 px-4 font-semibold">Title</th>
                <th className="text-left py-3 px-4 font-semibold">Project</th>
                <th className="text-left py-3 px-4 font-semibold">Type</th>
                <th className="text-center py-3 px-4 font-semibold">Rev</th>
                <th className="text-left py-3 px-4 font-semibold">Prepared By</th>
                <th className="text-left py-3 px-4 font-semibold">Status</th>
                <th className="text-left py-3 px-4 font-semibold">Issued</th>
                <th className="text-left py-3 px-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="py-8 text-center text-slate-400">Loading...</td></tr>
              ) : reports.length === 0 ? (
                <tr><td colSpan={9} className="py-8 text-center text-slate-400">No reports yet.</td></tr>
              ) : reports.map((r, i) => {
                const style = STATUS_COLORS[r.status] ?? STATUS_COLORS.draft;
                return (
                  <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="py-2.5 px-4 font-mono font-bold text-purple-700">{r.report_number}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800 max-w-[160px] truncate">{r.report_title}</td>
                    <td className="py-2.5 px-4 text-slate-500">{r.lab_projects?.project_number ?? '—'}</td>
                    <td className="py-2.5 px-4 text-slate-500 capitalize">{r.report_type}</td>
                    <td className="py-2.5 px-4 text-center font-bold text-slate-700">{r.revision}</td>
                    <td className="py-2.5 px-4 text-slate-500">{(r.prepared_by_user as {name?:string}|undefined)?.name ?? '—'}</td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold capitalize"
                        style={{ background: style.bg, color: style.text }}>{r.status.replace('_', ' ')}</span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-500">
                      {r.issued_at ? new Date(r.issued_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                    </td>
                    <td className="py-2.5 px-4 flex gap-1">
                      <button onClick={() => setViewReport(r)}
                        className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100">👁️ View</button>
                      <button onClick={() => generatePDF(r)} disabled={generatingPDF === r.id}
                        className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs hover:bg-purple-100 disabled:opacity-50">
                        {generatingPDF === r.id ? '⏳' : '📄'} PDF
                      </button>
                      {r.file_url && (
                        <a href={r.file_url} target="_blank" rel="noopener noreferrer"
                          className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs hover:bg-green-100">⬇️ Saved</a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Report Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
            <div className="bg-blue-950 px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <h3 className="text-white font-bold">Create New Report</h3>
              <button onClick={() => { setShowForm(false); setTests([]); }}
                className="text-blue-300 hover:text-white text-lg">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Project *</label>
                  <select value={form.project_id} onChange={e => { setForm({ ...form, project_id: e.target.value }); loadProjectTests(e.target.value); }}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— Select project —</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.project_number} — {p.project_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Report Type</label>
                  <select value={form.report_type} onChange={e => setForm({ ...form, report_type: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="test">Test Report</option>
                    <option value="summary">Summary Report</option>
                    <option value="calibration">Calibration Report</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Report Title *</label>
                  <input type="text" value={form.report_title} onChange={e => setForm({ ...form, report_title: e.target.value })}
                    placeholder="e.g. Tensile Strength Test Report — D03B Coil Spring"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                {/* Completed Tests Preview */}
                {tests.length > 0 && (
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Completed Tests in this Project</label>
                    <div className="bg-slate-50 rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                      {tests.map(t => {
                        const passCount = t.lab_test_results?.filter(r => r.result === 'pass').length ?? 0;
                        const failCount = t.lab_test_results?.filter(r => r.result === 'fail').length ?? 0;
                        return (
                          <div key={t.id} className="flex items-center justify-between text-xs">
                            <span className="font-mono text-orange-700">{t.test_number}</span>
                            <span className="text-slate-600 truncate mx-2">{t.test_name}</span>
                            <div className="flex gap-1 shrink-0">
                              {passCount > 0 && <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">{passCount} Pass</span>}
                              {failCount > 0 && <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs">{failCount} Fail</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Summary</label>
                  <textarea value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })}
                    rows={3} placeholder="Summarize the testing scope, methods and samples..."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Conclusion</label>
                  <textarea value={form.conclusion} onChange={e => setForm({ ...form, conclusion: e.target.value })}
                    rows={3} placeholder="State the conclusion based on test results..."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Prepared By</label>
                  <select value={form.prepared_by} onChange={e => setForm({ ...form, prepared_by: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— Select engineer —</option>
                    {engineers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Reviewer</label>
                  <select value={form.reviewed_by} onChange={e => setForm({ ...form, reviewed_by: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— Select reviewer —</option>
                    {reviewers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.designation ?? u.role})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Approver</label>
                  <select value={form.approved_by} onChange={e => setForm({ ...form, approved_by: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— Select approver —</option>
                    {approvers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.designation ?? u.role})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Revision</label>
                  <input type="text" value={form.revision} onChange={e => setForm({ ...form, revision: e.target.value.toUpperCase() })}
                    maxLength={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleCreate} disabled={saving}
                  className="flex-1 py-2.5 bg-blue-950 hover:bg-blue-900 text-white rounded-xl text-sm font-bold disabled:opacity-50">
                  {saving ? 'Creating...' : '✓ Create Report (Draft)'}
                </button>
                <button onClick={() => { setShowForm(false); setTests([]); }}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-200">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View / Workflow Modal */}
      {viewReport && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
            <div className="px-6 py-4 rounded-t-2xl flex items-center justify-between"
              style={{ background: STATUS_COLORS[viewReport.status]?.text ?? '#1e3a8a' }}>
              <div>
                <h3 className="text-white font-bold text-lg">{viewReport.report_number}</h3>
                <p className="text-white/80 text-xs">Rev {viewReport.revision} — {viewReport.status.replace('_', ' ').toUpperCase()}</p>
              </div>
              <button onClick={() => setViewReport(null)} className="text-white/70 hover:text-white text-lg">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Report Title</p>
                <p className="font-bold text-slate-800">{viewReport.report_title}</p>
              </div>
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <p className="text-slate-400 mb-0.5">Project</p>
                  <p className="font-semibold text-slate-700">{viewReport.lab_projects?.project_number ?? '—'}</p>
                </div>
                <div>
                  <p className="text-slate-400 mb-0.5">Prepared By</p>
                  <p className="font-semibold text-slate-700">{(viewReport.prepared_by_user as {name?:string}|undefined)?.name ?? '—'}</p>
                </div>
                <div>
                  <p className="text-slate-400 mb-0.5">Reviewed By</p>
                  <p className="font-semibold text-slate-700">{(viewReport.reviewed_by_user as {name?:string}|undefined)?.name ?? '—'}</p>
                </div>
              </div>
              {viewReport.summary && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">Summary</p>
                  <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">{viewReport.summary}</p>
                </div>
              )}
              {viewReport.conclusion && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">Conclusion</p>
                  <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">{viewReport.conclusion}</p>
                </div>
              )}
              {viewReport.reviewer_notes && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-xs font-bold text-orange-700 mb-1">📋 Reviewer Notes</p>
                  <p className="text-xs text-orange-700">{viewReport.reviewer_notes}</p>
                </div>
              )}
              {viewReport.approver_notes && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-xs font-bold text-green-700 mb-1">✅ Approver Notes</p>
                  <p className="text-xs text-green-700">{viewReport.approver_notes}</p>
                </div>
              )}

              {/* PDF Generate + Upload */}
              <div className="border border-slate-200 rounded-xl p-4">
                <p className="text-xs font-bold text-slate-600 mb-2">📄 Report PDF</p>
                <button onClick={() => generatePDF(viewReport)} disabled={generatingPDF === viewReport.id}
                  className="w-full py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold mb-3 disabled:opacity-50">
                  {generatingPDF === viewReport.id ? '⏳ Generating...' : '📄 Generate PDF Report'}
                </button>
                {viewReport.file_url ? (
                  <div className="flex items-center justify-between">
                    <a href={viewReport.file_url} target="_blank" rel="noopener noreferrer"
                      className="text-blue-600 text-xs hover:underline font-semibold">⬇️ Download Current PDF</a>
                    <button onClick={() => fileRef.current?.click()}
                      className="text-xs text-slate-500 hover:text-slate-700">Replace PDF</button>
                  </div>
                ) : (
                  <button onClick={() => fileRef.current?.click()}
                    className="w-full py-2.5 border-2 border-dashed border-slate-300 rounded-lg text-xs text-slate-500 hover:border-blue-400 hover:text-blue-600">
                    {uploading ? '⏳ Uploading...' : '📎 Upload Report PDF'}
                  </button>
                )}
                <input ref={fileRef} type="file" accept=".pdf" onChange={e => { const f = e.target.files?.[0]; if (f) uploadReport(viewReport.id, f); }} className="hidden" />
              </div>

              {/* Workflow Actions */}
              <div className="border-t border-slate-200 pt-4">
                <p className="text-xs font-bold text-slate-600 mb-3">Workflow Actions</p>
                <div className="space-y-3">
                  {viewReport.status === 'draft' && (
                    <button onClick={() => submitForReview(viewReport.id)}
                      className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold">
                      📤 Submit for Review
                    </button>
                  )}
                  {viewReport.status === 'under_review' && (
                    <div className="space-y-2">
                      <textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)}
                        placeholder="Reviewer notes (optional)..." rows={2}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400" />
                      <div className="flex gap-2">
                        <button onClick={() => reviewReport(viewReport.id)}
                          className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold">
                          📋 Mark Reviewed
                        </button>
                        <button onClick={() => rejectToRevision(viewReport.id, viewReport.revision)}
                          className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold">
                          ↩ Return for Revision
                        </button>
                      </div>
                    </div>
                  )}
                  {viewReport.status === 'under_review' && (
                    <div className="space-y-2">
                      <textarea value={approveNote} onChange={e => setApproveNote(e.target.value)}
                        placeholder="Approver notes (optional)..." rows={2}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-green-400" />
                      <button onClick={() => approveReport(viewReport.id)}
                        className="w-full py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-xl text-sm font-bold">
                        ✅ Approve Report
                      </button>
                    </div>
                  )}
                  {viewReport.status === 'approved' && (
                    <button onClick={() => issueReport(viewReport.id)}
                      className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-sm font-bold">
                      📬 Issue Report to Customer
                    </button>
                  )}
                  {viewReport.status === 'issued' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                      <p className="text-blue-700 font-bold text-sm">✅ Report Issued</p>
                      <p className="text-blue-500 text-xs mt-1">
                        Issued on {viewReport.issued_at ? new Date(viewReport.issued_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
