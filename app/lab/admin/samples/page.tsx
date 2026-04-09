'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import type { LabSample } from '../../../lib/lab-types';

interface Project {
  id: string;
  project_number: string;
  project_name: string;
}

interface LabUser {
  id: string;
  name: string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  received:   { bg: '#dbeafe', text: '#1d4ed8' },
  in_test:    { bg: '#ffedd5', text: '#c2410c' },
  completed:  { bg: '#dcfce7', text: '#15803d' },
  disposed:   { bg: '#f1f5f9', text: '#6b7280' },
};

const emptyForm = {
  project_id: '', sample_description: '', sample_condition: '',
  quantity_received: '1', quantity_unit: 'pcs',
  received_date: new Date().toISOString().split('T')[0],
  storage_location: '', disposal_method: 'return', remarks: '', received_by: '',
};

export default function SamplesPage() {
  const searchParams = useSearchParams();
  const preProjectId = searchParams.get('project') ?? '';
  const preProjectName = searchParams.get('name') ?? '';

  const [samples, setSamples] = useState<LabSample[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<LabUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm, project_id: preProjectId });
  const [saving, setSaving] = useState(false);
  const [filterProject, setFilterProject] = useState(preProjectId);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: sam }, { data: proj }, { data: usr }] = await Promise.all([
      supabase.from('lab_samples').select('*, lab_projects(project_name, project_number)').order('created_at', { ascending: false }),
      supabase.from('lab_projects').select('id, project_number, project_name').eq('status', 'active').order('project_number'),
      supabase.from('lab_users').select('id, name').eq('is_active', true).in('role', ['lab_engineer', 'lab_admin']),
    ]);
    setSamples(sam ?? []);
    setProjects(proj ?? []);
    setUsers(usr ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function startEdit(s: LabSample) {
    setEditingId(s.id);
    setForm({
      project_id: s.project_id, sample_description: s.sample_description,
      sample_condition: s.sample_condition ?? '',
      quantity_received: s.quantity_received.toString(), quantity_unit: s.quantity_unit,
      received_date: s.received_date, storage_location: s.storage_location ?? '',
      disposal_method: s.disposal_method ?? 'return', remarks: s.remarks ?? '', received_by: '',
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.project_id || !form.sample_description) { alert('Project and description required'); return; }
    setSaving(true);
    const payload = {
      project_id: form.project_id,
      sample_description: form.sample_description,
      sample_condition: form.sample_condition || null,
      quantity_received: parseInt(form.quantity_received),
      quantity_unit: form.quantity_unit,
      received_date: form.received_date,
      storage_location: form.storage_location || null,
      disposal_method: form.disposal_method || null,
      remarks: form.remarks || null,
      received_by: form.received_by || null,
      status: 'received',
    };
    if (editingId) {
      await supabase.from('lab_samples').update(payload).eq('id', editingId);
    } else {
      const { data: sam } = await supabase.from('lab_samples').insert([payload]).select().single();
      if (sam) {
        await supabase.from('lab_audit_logs').insert([{
          action: 'REGISTER_SAMPLE', entity_type: 'sample',
          entity_id: sam.id, entity_number: sam.sample_number,
          new_values: { sample_description: form.sample_description, project_id: form.project_id },
        }]);
      }
    }
    setShowForm(false); setEditingId(null); setForm({ ...emptyForm, project_id: preProjectId });
    fetchData(); setSaving(false);
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('lab_samples').update({ status }).eq('id', id);
    fetchData();
  }

  const filtered = filterProject ? samples.filter(s => s.project_id === filterProject) : samples;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-blue-950 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/lab/admin/projects" className="text-blue-300 hover:text-white text-xs">← Projects</a>
          <span className="text-blue-700">|</span>
          <span className="text-white font-bold text-sm">📦 Sample Registration</span>
          {preProjectName && <span className="text-blue-300 text-xs">— {preProjectName}</span>}
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ ...emptyForm, project_id: preProjectId }); }}
          className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold">
          + Register Sample
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Filter */}
        <div className="flex gap-3 mb-4">
          <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.project_number} — {p.project_name}</option>)}
          </select>
          <div className="flex-1" />
          <div className="flex gap-2 text-xs text-slate-500 items-center">
            {Object.entries(STATUS_COLORS).map(([s, style]) => (
              <span key={s} className="px-2 py-1 rounded-full font-semibold"
                style={{ background: style.bg, color: style.text }}>{s.replace('_', ' ')}: {samples.filter(sam => sam.status === s).length}</span>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-blue-950 text-blue-100">
                <th className="text-left py-3 px-4 font-semibold">Sample No.</th>
                <th className="text-left py-3 px-4 font-semibold">Description</th>
                <th className="text-left py-3 px-4 font-semibold">Project</th>
                <th className="text-center py-3 px-4 font-semibold">Qty</th>
                <th className="text-left py-3 px-4 font-semibold">Condition</th>
                <th className="text-left py-3 px-4 font-semibold">Received</th>
                <th className="text-left py-3 px-4 font-semibold">Location</th>
                <th className="text-left py-3 px-4 font-semibold">Disposal</th>
                <th className="text-left py-3 px-4 font-semibold">Status</th>
                <th className="text-left py-3 px-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="py-8 text-center text-slate-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={10} className="py-8 text-center text-slate-400">No samples registered yet.</td></tr>
              ) : filtered.map((s, i) => {
                const style = STATUS_COLORS[s.status] ?? STATUS_COLORS.received;
                return (
                  <tr key={s.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="py-2.5 px-4 font-mono font-bold text-purple-700">{s.sample_number}</td>
                    <td className="py-2.5 px-4 text-slate-700 max-w-[160px] truncate">{s.sample_description}</td>
                    <td className="py-2.5 px-4 text-slate-500">
                      {(s.lab_projects as {project_number?:string;project_name?:string}|undefined)?.project_number ?? '—'}
                    </td>
                    <td className="py-2.5 px-4 text-center text-slate-600">{s.quantity_received} {s.quantity_unit}</td>
                    <td className="py-2.5 px-4 text-slate-500">{s.sample_condition ?? '—'}</td>
                    <td className="py-2.5 px-4 text-slate-500">{new Date(s.received_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: '2-digit' })}</td>
                    <td className="py-2.5 px-4 text-slate-500">{s.storage_location ?? '—'}</td>
                    <td className="py-2.5 px-4 text-slate-500 capitalize">{s.disposal_method ?? '—'}</td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold capitalize"
                        style={{ background: style.bg, color: style.text }}>{s.status.replace('_', ' ')}</span>
                    </td>
                    <td className="py-2.5 px-4 flex items-center gap-1">
                      <select value={s.status} onChange={e => updateStatus(s.id, e.target.value)}
                        className="border border-slate-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500">
                        {['received','in_test','completed','disposed'].map(st => (
                          <option key={st} value={st}>{st.replace('_', ' ')}</option>
                        ))}
                      </select>
                      <button onClick={() => startEdit(s)}
                        className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100">✏️</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="bg-blue-950 px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <h3 className="text-white font-bold">{editingId ? 'Edit Sample' : 'Register Sample'}</h3>
              <button onClick={() => { setShowForm(false); setEditingId(null); }}
                className="text-blue-300 hover:text-white text-lg">✕</button>
            </div>
            <div className="p-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Project *</label>
                  <select value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— Select project —</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.project_number} — {p.project_name}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Sample Description *</label>
                  <input type="text" value={form.sample_description} onChange={e => setForm({ ...form, sample_description: e.target.value })}
                    placeholder="e.g. Coil Spring D03B Rear, Heat No. H2024-001"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Sample Condition</label>
                  <input type="text" value={form.sample_condition} onChange={e => setForm({ ...form, sample_condition: e.target.value })}
                    placeholder="e.g. As-manufactured, Clean"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Received Date *</label>
                  <input type="date" value={form.received_date} onChange={e => setForm({ ...form, received_date: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Quantity</label>
                  <input type="number" min="1" value={form.quantity_received} onChange={e => setForm({ ...form, quantity_received: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Unit</label>
                  <select value={form.quantity_unit} onChange={e => setForm({ ...form, quantity_unit: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {['pcs','sets','kg','m','rolls','sheets'].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Storage Location</label>
                  <input type="text" value={form.storage_location} onChange={e => setForm({ ...form, storage_location: e.target.value })}
                    placeholder="e.g. Rack A-3, Cabinet 2"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Disposal Method</label>
                  <select value={form.disposal_method} onChange={e => setForm({ ...form, disposal_method: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="return">Return to Customer</option>
                    <option value="destroy">Destroy</option>
                    <option value="retain">Retain for 1 Year</option>
                    <option value="customer_instruction">Per Customer Instruction</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Received By</label>
                  <select value={form.received_by} onChange={e => setForm({ ...form, received_by: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— Select —</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Remarks</label>
                  <textarea value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })}
                    rows={2} placeholder="Any additional notes..."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-2.5 bg-blue-950 hover:bg-blue-900 text-white rounded-xl text-sm font-bold disabled:opacity-50">
                  {saving ? 'Saving...' : editingId ? '✓ Update Sample' : '✓ Register Sample'}
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
