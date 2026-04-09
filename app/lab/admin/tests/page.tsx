'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../lib/supabase';

interface Project { id: string; project_number: string; project_name: string; }
interface Sample { id: string; sample_number: string; sample_description: string; project_id: string; }
interface OutsourcedLab { id: string; lab_code: string; lab_name: string; }
interface LabUser { id: string; name: string; designation: string | null; }
interface TestCatalogue { id: string; test_code: string; test_name: string; }
interface TestResult { id: string; parameter_name: string; unit: string | null; measured_value: string | null; specification: string | null; result: string; remarks: string | null; }
interface TestExecution {
  id: string; test_number: string; test_name: string; test_type: string;
  status: string; planned_start: string | null; planned_end: string | null;
  actual_start: string | null; actual_end: string | null;
  equipment_used: string | null; test_conditions: string | null;
  outsourced_cost: number | null; outsourced_ref: string | null;
  project_id: string; sample_id: string | null;
  lab_projects?: { project_name: string; project_number: string };
  lab_samples?: { sample_number: string; sample_description: string };
  lab_outsourced_labs?: { lab_name: string };
  lab_users?: { name: string };
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending:     { bg: '#f1f5f9', text: '#64748b' },
  in_progress: { bg: '#ffedd5', text: '#c2410c' },
  completed:   { bg: '#dcfce7', text: '#15803d' },
  failed:      { bg: '#fee2e2', text: '#b91c1c' },
  cancelled:   { bg: '#f1f5f9', text: '#6b7280' },
};

const emptyForm = {
  project_id: '', sample_id: '', test_catalogue_id: '', test_name: '',
  test_type: 'inhouse', outsourced_lab_id: '', outsourced_cost: '',
  outsourced_ref: '', assigned_engineer: '', planned_start: '',
  planned_end: '', equipment_used: '', test_conditions: '',
};

const emptyResult = {
  parameter_name: '', unit: '', measured_value: '', specification: '', result: 'pending', remarks: '',
};

export default function TestsPage() {
  const [tests, setTests] = useState<TestExecution[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [outsourcedLabs, setOutsourcedLabs] = useState<OutsourcedLab[]>([]);
  const [engineers, setEngineers] = useState<LabUser[]>([]);
  const [catalogue, setCatalogue] = useState<TestCatalogue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showResults, setShowResults] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [newResults, setNewResults] = useState([{ ...emptyResult }]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<{id:string;file_name:string;file_url:string;file_type:string|null}[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: t }, { data: p }, { data: s }, { data: ol }, { data: eng }, { data: cat }] = await Promise.all([
      supabase.from('lab_test_executions').select('*, lab_projects(project_name, project_number), lab_samples(sample_number, sample_description), lab_outsourced_labs(lab_name), lab_users(name)').order('created_at', { ascending: false }),
      supabase.from('lab_projects').select('id, project_number, project_name').eq('status', 'active'),
      supabase.from('lab_samples').select('id, sample_number, sample_description, project_id').eq('status', 'in_test').order('sample_number'),
      supabase.from('lab_outsourced_labs').select('id, lab_code, lab_name').eq('is_active', true),
      supabase.from('lab_users').select('id, name, designation').in('role', ['lab_engineer', 'lab_admin']).eq('is_active', true),
      supabase.from('lab_test_catalogue').select('id, test_code, test_name').eq('is_active', true).order('test_code'),
    ]);
    setTests(t ?? []);
    setProjects(p ?? []);
    setSamples(s ?? []);
    setOutsourcedLabs(ol ?? []);
    setEngineers(eng ?? []);
    setCatalogue(cat ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleSave() {
    if (!form.project_id || !form.test_name) { alert('Project and test name required'); return; }
    setSaving(true);
    const payload: Record<string, unknown> = {
      project_id: form.project_id,
      sample_id: form.sample_id || null,
      test_catalogue_id: form.test_catalogue_id || null,
      test_name: form.test_name,
      test_type: form.test_type,
      outsourced_lab_id: form.outsourced_lab_id || null,
      outsourced_cost: form.outsourced_cost ? parseFloat(form.outsourced_cost) : null,
      outsourced_ref: form.outsourced_ref || null,
      assigned_engineer: form.assigned_engineer || null,
      planned_start: form.planned_start || null,
      planned_end: form.planned_end || null,
      equipment_used: form.equipment_used || null,
      test_conditions: form.test_conditions || null,
      status: 'pending',
    };
    const { data: test } = await supabase.from('lab_test_executions').insert([payload]).select().single();
    if (test) {
      // Update sample status to in_test
      if (form.sample_id) await supabase.from('lab_samples').update({ status: 'in_test' }).eq('id', form.sample_id);
      await supabase.from('lab_audit_logs').insert([{
        action: 'CREATE_TEST', entity_type: 'test',
        entity_id: test.id, entity_number: test.test_number,
        new_values: { test_name: form.test_name, test_type: form.test_type },
      }]);
    }
    setShowForm(false); setForm(emptyForm);
    fetchData(); setSaving(false);
  }

  async function updateStatus(id: string, status: string) {
    const update: Record<string, unknown> = { status };
    if (status === 'in_progress') update.actual_start = new Date().toISOString().split('T')[0];
    if (status === 'completed' || status === 'failed') update.actual_end = new Date().toISOString().split('T')[0];
    await supabase.from('lab_test_executions').update(update).eq('id', id);
    fetchData();
  }

  async function openResults(testId: string) {
    setShowResults(testId);
    setNewResults([{ ...emptyResult }]);
    const [{ data: results }, { data: attach }] = await Promise.all([
      supabase.from('lab_test_results').select('*').eq('test_execution_id', testId).order('created_at'),
      supabase.from('lab_result_attachments').select('id, file_name, file_url, file_type').eq('test_execution_id', testId),
    ]);
    setTestResults(results ?? []);
    setAttachments(attach ?? []);
  }

  async function saveResults() {
    if (!showResults) return;
    setSaving(true);
    const valid = newResults.filter(r => r.parameter_name);
    if (valid.length > 0) {
      await supabase.from('lab_test_results').insert(
        valid.map(r => ({
          test_execution_id: showResults,
          parameter_name: r.parameter_name,
          unit: r.unit || null,
          measured_value: r.measured_value || null,
          specification: r.specification || null,
          result: r.result,
          remarks: r.remarks || null,
        }))
      );
    }
    await openResults(showResults);
    setNewResults([{ ...emptyResult }]);
    setSaving(false);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!showResults) return;
    const files = Array.from(e.target.files ?? []);
    setUploadingFor(showResults);
    for (const file of files) {
      const path = `${showResults}/${Date.now()}_${file.name}`;
      const { data: uploaded } = await supabase.storage.from('lab-raw-data').upload(path, file);
      if (uploaded) {
        const { data: { publicUrl } } = supabase.storage.from('lab-raw-data').getPublicUrl(path);
        await supabase.from('lab_result_attachments').insert([{
          test_execution_id: showResults,
          file_name: file.name, file_url: publicUrl,
          file_type: file.type, file_size: file.size,
        }]);
      }
    }
    await openResults(showResults);
    setUploadingFor(null);
  }

  async function deleteResult(id: string) {
    if (!confirm('Delete this result?')) return;
    await supabase.from('lab_test_results').delete().eq('id', id);
    if (showResults) await openResults(showResults);
  }

  const filteredSamples = form.project_id ? samples.filter(s => s.project_id === form.project_id) : samples;

  const RESULT_COLORS: Record<string, string> = { pass: '#16a34a', fail: '#dc2626', pending: '#94a3b8' };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-blue-950 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/lab/admin" className="text-blue-300 hover:text-white text-xs">← Lab Admin</a>
          <span className="text-blue-700">|</span>
          <span className="text-white font-bold text-sm">🔬 Test Execution</span>
        </div>
        <button onClick={() => { setShowForm(true); setForm(emptyForm); }}
          className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold">
          + New Test
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Summary */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          {Object.entries(STATUS_COLORS).map(([status, style]) => (
            <div key={status} className="bg-white rounded-xl border border-slate-200 p-3 text-center">
              <p className="text-xl font-bold" style={{ color: style.text }}>
                {tests.filter(t => t.status === status).length}
              </p>
              <p className="text-xs text-slate-500 capitalize mt-0.5">{status.replace('_', ' ')}</p>
            </div>
          ))}
        </div>

        {/* Tests Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-blue-950 text-blue-100">
                <th className="text-left py-3 px-4 font-semibold">Test No.</th>
                <th className="text-left py-3 px-4 font-semibold">Test Name</th>
                <th className="text-left py-3 px-4 font-semibold">Project</th>
                <th className="text-left py-3 px-4 font-semibold">Sample</th>
                <th className="text-left py-3 px-4 font-semibold">Type</th>
                <th className="text-left py-3 px-4 font-semibold">Engineer</th>
                <th className="text-left py-3 px-4 font-semibold">Planned</th>
                <th className="text-left py-3 px-4 font-semibold">Status</th>
                <th className="text-left py-3 px-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="py-8 text-center text-slate-400">Loading...</td></tr>
              ) : tests.length === 0 ? (
                <tr><td colSpan={9} className="py-8 text-center text-slate-400">No tests yet. Create your first test execution.</td></tr>
              ) : tests.map((t, i) => {
                const style = STATUS_COLORS[t.status] ?? STATUS_COLORS.pending;
                return (
                  <tr key={t.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="py-2.5 px-4 font-mono font-bold text-orange-700">{t.test_number}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800 max-w-[140px] truncate">{t.test_name}</td>
                    <td className="py-2.5 px-4 text-slate-500">{t.lab_projects?.project_number ?? '—'}</td>
                    <td className="py-2.5 px-4 text-slate-500 font-mono">{t.lab_samples?.sample_number ?? '—'}</td>
                    <td className="py-2.5 px-4">
                      <span className={"px-2 py-0.5 rounded text-xs font-semibold " +
                        (t.test_type === 'inhouse' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700')}>
                        {t.test_type === 'inhouse' ? 'In-House' : 'Outsourced'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-500">{t.lab_users?.name ?? '—'}</td>
                    <td className="py-2.5 px-4 text-slate-500">
                      {t.planned_start ? new Date(t.planned_start).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' }) : '—'}
                      {t.planned_end ? ` → ${new Date(t.planned_end).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}` : ''}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold capitalize"
                        style={{ background: style.bg, color: style.text }}>{t.status.replace('_', ' ')}</span>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-1">
                        <select value={t.status} onChange={e => updateStatus(t.id, e.target.value)}
                          className="border border-slate-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500">
                          {['pending','in_progress','completed','failed','cancelled'].map(s => (
                            <option key={s} value={s}>{s.replace('_', ' ')}</option>
                          ))}
                        </select>
                        <button onClick={() => openResults(t.id)}
                          className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs hover:bg-green-100 whitespace-nowrap">
                          📊 Results
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Test Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
            <div className="bg-blue-950 px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <h3 className="text-white font-bold">Create Test Execution</h3>
              <button onClick={() => setShowForm(false)} className="text-blue-300 hover:text-white text-lg">✕</button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Project *</label>
                  <select value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value, sample_id: '' })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— Select project —</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.project_number} — {p.project_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Sample</label>
                  <select value={form.sample_id} onChange={e => setForm({ ...form, sample_id: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— Select sample —</option>
                    {filteredSamples.map(s => <option key={s.id} value={s.id}>{s.sample_number} — {s.sample_description}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">From Catalogue</label>
                  <select value={form.test_catalogue_id} onChange={e => {
                    const cat = catalogue.find(c => c.id === e.target.value);
                    setForm({ ...form, test_catalogue_id: e.target.value, test_name: cat?.test_name ?? form.test_name });
                  }} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— Select or enter custom —</option>
                    {catalogue.map(c => <option key={c.id} value={c.id}>{c.test_code} — {c.test_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Test Name *</label>
                  <input type="text" value={form.test_name} onChange={e => setForm({ ...form, test_name: e.target.value })}
                    placeholder="e.g. Tensile Strength Test"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Test Type *</label>
                  <select value={form.test_type} onChange={e => setForm({ ...form, test_type: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="inhouse">In-House</option>
                    <option value="outsourced">Outsourced</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Assigned Engineer</label>
                  <select value={form.assigned_engineer} onChange={e => setForm({ ...form, assigned_engineer: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— Select —</option>
                    {engineers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
                {form.test_type === 'outsourced' && (<>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Outsourced Lab</label>
                    <select value={form.outsourced_lab_id} onChange={e => setForm({ ...form, outsourced_lab_id: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">— Select lab —</option>
                      {outsourcedLabs.map(l => <option key={l.id} value={l.id}>{l.lab_code} — {l.lab_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Outsourced Cost (MYR)</label>
                    <input type="number" step="0.01" value={form.outsourced_cost}
                      onChange={e => setForm({ ...form, outsourced_cost: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Outsourced Lab Reference No.</label>
                    <input type="text" value={form.outsourced_ref}
                      onChange={e => setForm({ ...form, outsourced_ref: e.target.value })}
                      placeholder="Their job/PO reference number"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </>)}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Planned Start</label>
                  <input type="date" value={form.planned_start} onChange={e => setForm({ ...form, planned_start: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Planned End</label>
                  <input type="date" value={form.planned_end} onChange={e => setForm({ ...form, planned_end: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Equipment Used</label>
                  <input type="text" value={form.equipment_used} onChange={e => setForm({ ...form, equipment_used: e.target.value })}
                    placeholder="e.g. UTM-50kN, Hardness Tester HT-01"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Test Conditions</label>
                  <input type="text" value={form.test_conditions} onChange={e => setForm({ ...form, test_conditions: e.target.value })}
                    placeholder="e.g. 23°C ± 2°C, 50% RH"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-2.5 bg-blue-950 hover:bg-blue-900 text-white rounded-xl text-sm font-bold disabled:opacity-50">
                  {saving ? 'Creating...' : '✓ Create Test'}
                </button>
                <button onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-200">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Modal */}
      {showResults && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-4">
            <div className="bg-green-700 px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold">📊 Test Results</h3>
                <p className="text-green-200 text-xs">{tests.find(t => t.id === showResults)?.test_number} — {tests.find(t => t.id === showResults)?.test_name}</p>
              </div>
              <button onClick={() => { setShowResults(null); setTestResults([]); setAttachments([]); }}
                className="text-green-200 hover:text-white text-lg">✕</button>
            </div>
            <div className="p-6">
              {/* Existing Results */}
              {testResults.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-bold text-slate-700 text-sm mb-2">Recorded Results</h4>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                      <thead><tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Parameter</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Unit</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Measured</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Spec</th>
                        <th className="text-center py-2 px-4 font-semibold text-slate-500">Result</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-500">Remarks</th>
                        <th className="py-2 px-4"></th>
                      </tr></thead>
                      <tbody>
                        {testResults.map((r, i) => (
                          <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                            <td className="py-2 px-4 font-semibold text-slate-700">{r.parameter_name}</td>
                            <td className="py-2 px-4 text-slate-500">{r.unit ?? '—'}</td>
                            <td className="py-2 px-4 font-mono text-slate-800">{r.measured_value ?? '—'}</td>
                            <td className="py-2 px-4 text-slate-500">{r.specification ?? '—'}</td>
                            <td className="py-2 px-4 text-center">
                              <span className="px-2 py-0.5 rounded-full text-xs font-bold capitalize"
                                style={{ background: RESULT_COLORS[r.result] + '22', color: RESULT_COLORS[r.result] }}>
                                {r.result}
                              </span>
                            </td>
                            <td className="py-2 px-4 text-slate-500">{r.remarks ?? '—'}</td>
                            <td className="py-2 px-4">
                              <button onClick={() => deleteResult(r.id)} className="text-red-400 hover:text-red-600 text-xs">🗑️</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Add New Results */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-700 text-sm">Add Results</h4>
                  <button onClick={() => setNewResults([...newResults, { ...emptyResult }])}
                    className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100">+ Add Row</button>
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left py-2 px-3 font-semibold text-slate-500">Parameter *</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-500">Unit</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-500">Measured Value</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-500">Specification</th>
                      <th className="text-center py-2 px-3 font-semibold text-slate-500">Result</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-500">Remarks</th>
                      <th className="py-2 px-3"></th>
                    </tr></thead>
                    <tbody>
                      {newResults.map((r, idx) => (
                        <tr key={idx} className="border-b border-slate-100">
                          <td className="py-1.5 px-3">
                            <input type="text" value={r.parameter_name}
                              onChange={e => { const nr = [...newResults]; nr[idx].parameter_name = e.target.value; setNewResults(nr); }}
                              placeholder="e.g. Tensile Strength"
                              className="w-full border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                          </td>
                          <td className="py-1.5 px-3">
                            <input type="text" value={r.unit}
                              onChange={e => { const nr = [...newResults]; nr[idx].unit = e.target.value; setNewResults(nr); }}
                              placeholder="MPa"
                              className="w-16 border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                          </td>
                          <td className="py-1.5 px-3">
                            <input type="text" value={r.measured_value}
                              onChange={e => { const nr = [...newResults]; nr[idx].measured_value = e.target.value; setNewResults(nr); }}
                              placeholder="450.5"
                              className="w-24 border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                          </td>
                          <td className="py-1.5 px-3">
                            <input type="text" value={r.specification}
                              onChange={e => { const nr = [...newResults]; nr[idx].specification = e.target.value; setNewResults(nr); }}
                              placeholder="≥ 400 MPa"
                              className="w-28 border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                          </td>
                          <td className="py-1.5 px-3">
                            <select value={r.result}
                              onChange={e => { const nr = [...newResults]; nr[idx].result = e.target.value; setNewResults(nr); }}
                              className="border border-slate-200 rounded px-1 py-1 text-xs focus:outline-none"
                              style={{ color: RESULT_COLORS[r.result] }}>
                              <option value="pending">Pending</option>
                              <option value="pass">Pass ✅</option>
                              <option value="fail">Fail ❌</option>
                            </select>
                          </td>
                          <td className="py-1.5 px-3">
                            <input type="text" value={r.remarks}
                              onChange={e => { const nr = [...newResults]; nr[idx].remarks = e.target.value; setNewResults(nr); }}
                              placeholder="Optional"
                              className="w-full border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                          </td>
                          <td className="py-1.5 px-3">
                            {newResults.length > 1 && (
                              <button onClick={() => setNewResults(newResults.filter((_, i) => i !== idx))}
                                className="text-red-400 hover:text-red-600 text-xs">✕</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button onClick={saveResults} disabled={saving}
                  className="mt-3 px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg text-xs font-bold disabled:opacity-50">
                  {saving ? 'Saving...' : '✓ Save Results'}
                </button>
              </div>

              {/* Raw Data Attachments */}
              <div>
                <h4 className="font-bold text-slate-700 text-sm mb-2">Raw Data Files</h4>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors mb-3"
                  onClick={() => fileRef.current?.click()}>
                  <p className="text-xs text-slate-500">
                    {uploadingFor ? '⏳ Uploading...' : '📎 Click to upload raw data files (CSV, XLSX, PDF, images)'}
                  </p>
                  <input ref={fileRef} type="file" multiple onChange={handleFileUpload} className="hidden" />
                </div>
                {attachments.length > 0 && (
                  <div className="space-y-2">
                    {attachments.map(a => (
                      <div key={a.id} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="text-base">📄</span>
                          <span className="text-xs font-semibold text-slate-700">{a.file_name}</span>
                        </div>
                        <a href={a.file_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 font-semibold">⬇️ Download</a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
