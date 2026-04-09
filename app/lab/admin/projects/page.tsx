'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

interface Quotation {
  id: string;
  quotation_number: string;
  rfq_id: string;
  company_id: string | null;
  total_amount: number;
  status: string;
  lab_rfq?: { rfq_number: string; project_name: string; contact_name: string };
  lab_companies?: { company_name: string };
}

interface Project {
  id: string;
  project_number: string;
  project_name: string;
  status: string;
  priority: string;
  start_date: string | null;
  target_completion: string | null;
  actual_completion: string | null;
  notes: string | null;
  created_at: string;
  lab_companies?: { company_name: string };
  lab_quotations?: { quotation_number: string };
}

interface LabUser {
  id: string;
  name: string;
  role: string;
  designation: string | null;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active:    { bg: '#dcfce7', text: '#15803d' },
  on_hold:   { bg: '#fef9c3', text: '#854d0e' },
  completed: { bg: '#dbeafe', text: '#1d4ed8' },
  cancelled: { bg: '#fee2e2', text: '#b91c1c' },
};

const emptyForm = {
  project_name: '', project_description: '', start_date: '',
  target_completion: '', priority: 'normal', notes: '',
  assigned_engineer: '', quotation_id: '', company_id: '',
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [approvedQuots, setApprovedQuots] = useState<Quotation[]>([]);
  const [engineers, setEngineers] = useState<LabUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: proj }, { data: quots }, { data: eng }] = await Promise.all([
      supabase.from('lab_projects').select('*, lab_companies(company_name), lab_quotations(quotation_number)')
        .order('created_at', { ascending: false }),
      supabase.from('lab_quotations').select('*, lab_rfq(rfq_number, project_name, contact_name), lab_companies(company_name)')
        .eq('status', 'approved'),
      supabase.from('lab_users').select('id, name, role, designation')
        .in('role', ['lab_engineer', 'lab_admin']).eq('is_active', true).order('name'),
    ]);
    setProjects(proj ?? []);
    setApprovedQuots(quots ?? []);
    setEngineers(eng ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function startEdit(p: Project) {
    setEditingId(p.id);
    setForm({
      project_name: p.project_name,
      project_description: '',
      start_date: p.start_date ?? '',
      target_completion: p.target_completion ?? '',
      priority: p.priority,
      notes: p.notes ?? '',
      assigned_engineer: '',
      quotation_id: '',
      company_id: '',
    });
    setShowForm(true);
  }

  function startFromQuotation(q: Quotation) {
    setEditingId(null);
    setForm({
      project_name: q.lab_rfq?.project_name ?? '',
      project_description: '',
      start_date: new Date().toISOString().split('T')[0],
      target_completion: '',
      priority: 'normal',
      notes: '',
      assigned_engineer: '',
      quotation_id: q.id,
      company_id: q.company_id ?? '',
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.project_name) { alert('Project name required'); return; }
    setSaving(true);
    const payload: Record<string, unknown> = {
      project_name: form.project_name,
      project_description: form.project_description || null,
      start_date: form.start_date || null,
      target_completion: form.target_completion || null,
      priority: form.priority,
      notes: form.notes || null,
      assigned_engineer: form.assigned_engineer || null,
      company_id: form.company_id || null,
    };

    if (editingId) {
      await supabase.from('lab_projects').update(payload).eq('id', editingId);
    } else {
      if (form.quotation_id) payload.quotation_id = form.quotation_id;
      // Get rfq_id from quotation
      if (form.quotation_id) {
        const { data: q } = await supabase.from('lab_quotations').select('rfq_id').eq('id', form.quotation_id).single();
        if (q) payload.rfq_id = q.rfq_id;
      }
      const { data: proj } = await supabase.from('lab_projects').insert([payload]).select().single();
      if (proj) {
        // Update quotation LTR status to approved/in-progress
        if (form.quotation_id) {
          const { data: q } = await supabase.from('lab_quotations').select('rfq_id').eq('id', form.quotation_id).single();
          if (q?.rfq_id) await supabase.from('lab_rfq').update({ status: 'approved' }).eq('id', q.rfq_id);
        }
        await supabase.from('lab_audit_logs').insert([{
          action: 'CREATE_PROJECT', entity_type: 'project',
          entity_id: proj.id, entity_number: proj.project_number,
          new_values: { project_name: form.project_name },
        }]);
      }
    }
    setShowForm(false); setEditingId(null); setForm(emptyForm);
    fetchData(); setSaving(false);
  }

  async function updateStatus(id: string, status: string) {
    const update: Record<string, unknown> = { status };
    if (status === 'completed') update.actual_completion = new Date().toISOString().split('T')[0];
    await supabase.from('lab_projects').update(update).eq('id', id);
    fetchData();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-blue-950 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/lab/admin" className="text-blue-300 hover:text-white text-xs">← Lab Admin</a>
          <span className="text-blue-700">|</span>
          <span className="text-white font-bold text-sm">🗂️ Project Management</span>
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }}
          className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold">
          + New Project
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Approved Quotations ready for project creation */}
        {approvedQuots.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              ✅ Approved Quotations — Ready to Create Project
              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">{approvedQuots.length}</span>
            </h2>
            <div className="grid gap-3">
              {approvedQuots.map(q => (
                <div key={q.id} className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-purple-700">{q.quotation_number}</span>
                      <span className="text-xs text-slate-500">→</span>
                      <span className="font-mono text-xs text-blue-700">{q.lab_rfq?.rfq_number}</span>
                    </div>
                    <p className="font-semibold text-slate-800 text-sm">{q.lab_rfq?.project_name}</p>
                    <p className="text-xs text-slate-500">{q.lab_companies?.company_name ?? '—'} · RM {q.total_amount.toFixed(2)}</p>
                  </div>
                  <button onClick={() => startFromQuotation(q)}
                    className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-xl text-xs font-bold whitespace-nowrap">
                    🗂️ Create Project
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Projects Table */}
        <div>
          <h2 className="text-lg font-bold text-slate-800 mb-3">All Projects</h2>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-blue-950 text-blue-100">
                  <th className="text-left py-3 px-4 font-semibold">Project No.</th>
                  <th className="text-left py-3 px-4 font-semibold">Project Name</th>
                  <th className="text-left py-3 px-4 font-semibold">Company</th>
                  <th className="text-left py-3 px-4 font-semibold">Quotation</th>
                  <th className="text-center py-3 px-4 font-semibold">Priority</th>
                  <th className="text-left py-3 px-4 font-semibold">Start</th>
                  <th className="text-left py-3 px-4 font-semibold">Target</th>
                  <th className="text-left py-3 px-4 font-semibold">Status</th>
                  <th className="text-left py-3 px-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="py-8 text-center text-slate-400">Loading...</td></tr>
                ) : projects.length === 0 ? (
                  <tr><td colSpan={9} className="py-8 text-center text-slate-400">No projects yet. Create from approved quotations above.</td></tr>
                ) : projects.map((p, i) => {
                  const style = STATUS_COLORS[p.status] ?? STATUS_COLORS.active;
                  return (
                    <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="py-2.5 px-4 font-mono font-bold text-green-700">{p.project_number}</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-800 max-w-[160px] truncate">{p.project_name}</td>
                      <td className="py-2.5 px-4 text-slate-500">{p.lab_companies?.company_name ?? '—'}</td>
                      <td className="py-2.5 px-4 font-mono text-purple-600 text-xs">{(p.lab_quotations as {quotation_number?:string}|undefined)?.quotation_number ?? '—'}</td>
                      <td className="py-2.5 px-4 text-center">
                        {p.priority === 'urgent' && <span className="text-red-500 font-semibold">🔥</span>}
                        {p.priority === 'normal' && <span className="text-slate-400">Normal</span>}
                        {p.priority === 'low' && <span className="text-slate-300">Low</span>}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500">{p.start_date ? new Date(p.start_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' }) : '—'}</td>
                      <td className="py-2.5 px-4 text-slate-500">{p.target_completion ? new Date(p.target_completion).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}</td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold capitalize"
                          style={{ background: style.bg, color: style.text }}>{p.status.replace('_', ' ')}</span>
                      </td>
                      <td className="py-2.5 px-4 flex items-center gap-1">
                        <select value={p.status} onChange={e => updateStatus(p.id, e.target.value)}
                          className="border border-slate-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500">
                          {['active','on_hold','completed','cancelled'].map(s => (
                            <option key={s} value={s}>{s.replace('_',' ')}</option>
                          ))}
                        </select>
                        <button onClick={() => startEdit(p)}
                          className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100">✏️</button>
                        <a href={`/lab/admin/samples?project=${p.id}&name=${encodeURIComponent(p.project_name)}`}
                          className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs hover:bg-purple-100">📦 Samples</a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="bg-blue-950 px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <h3 className="text-white font-bold">{editingId ? 'Edit Project' : 'Create New Project'}</h3>
              <button onClick={() => { setShowForm(false); setEditingId(null); }}
                className="text-blue-300 hover:text-white text-lg">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Project Name *</label>
                  <input type="text" value={form.project_name} onChange={e => setForm({ ...form, project_name: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                  <textarea value={form.project_description} onChange={e => setForm({ ...form, project_description: e.target.value })}
                    rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Start Date</label>
                  <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Target Completion</label>
                  <input type="date" value={form.target_completion} onChange={e => setForm({ ...form, target_completion: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Priority</label>
                  <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="urgent">🔥 Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Assigned Engineer</label>
                  <select value={form.assigned_engineer} onChange={e => setForm({ ...form, assigned_engineer: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— Select engineer —</option>
                    {engineers.map(e => <option key={e.id} value={e.id}>{e.name} ({e.designation ?? e.role})</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
                  <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                    rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-2.5 bg-blue-950 hover:bg-blue-900 text-white rounded-xl text-sm font-bold disabled:opacity-50">
                  {saving ? 'Saving...' : editingId ? '✓ Update Project' : '✓ Create Project'}
                </button>
                <button onClick={() => { setShowForm(false); setEditingId(null); }}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-200">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
