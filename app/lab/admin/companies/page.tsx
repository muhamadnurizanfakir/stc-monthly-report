'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import type { LabCompany } from '../../../lib/lab-types';

const emptyForm = {
  company_code: '', company_name: '', company_type: 'external',
  address: '', phone: '', email: '', contact_person: '', is_active: true,
};

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<LabCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('lab_companies').select('*').order('company_type').order('company_name');
    setCompanies(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function startEdit(c: LabCompany) {
    setEditingId(c.id);
    setForm({
      company_code: c.company_code, company_name: c.company_name,
      company_type: c.company_type, address: c.address ?? '',
      phone: c.phone ?? '', email: c.email ?? '',
      contact_person: c.contact_person ?? '', is_active: c.is_active,
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.company_code || !form.company_name) { alert('Code and name required'); return; }
    setSaving(true);
    const payload = {
      company_code: form.company_code.toUpperCase(),
      company_name: form.company_name,
      company_type: form.company_type,
      address: form.address || null,
      phone: form.phone || null,
      email: form.email || null,
      contact_person: form.contact_person || null,
      is_active: form.is_active,
    };
    if (editingId) {
      await supabase.from('lab_companies').update(payload).eq('id', editingId);
    } else {
      await supabase.from('lab_companies').insert([payload]);
    }
    setShowForm(false); setEditingId(null); setForm(emptyForm);
    fetchData(); setSaving(false);
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('lab_companies').update({ is_active: !current }).eq('id', id);
    fetchData();
  }

  const filtered = companies.filter(c => {
    const matchSearch = c.company_name.toLowerCase().includes(search.toLowerCase()) ||
      c.company_code.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || c.company_type === filterType;
    return matchSearch && matchType;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-blue-950 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/lab/admin" className="text-blue-300 hover:text-white text-xs">← Lab Admin</a>
          <span className="text-blue-700">|</span>
          <span className="text-white font-bold text-sm">🏢 Company Management</span>
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }}
          className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold">
          + Add Company
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Internal Companies', value: companies.filter(c => c.company_type === 'internal').length, color: '#1d4ed8' },
            { label: 'External Customers', value: companies.filter(c => c.company_type === 'external').length, color: '#7c3aed' },
            { label: 'Total Active', value: companies.filter(c => c.is_active).length, color: '#16a34a' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-4">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search company name or code..."
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">All Types</option>
            <option value="internal">Internal</option>
            <option value="external">External</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-blue-950 text-blue-100">
                <th className="text-left py-3 px-4 font-semibold">Code</th>
                <th className="text-left py-3 px-4 font-semibold">Company Name</th>
                <th className="text-left py-3 px-4 font-semibold">Type</th>
                <th className="text-left py-3 px-4 font-semibold">Contact Person</th>
                <th className="text-left py-3 px-4 font-semibold">Phone</th>
                <th className="text-left py-3 px-4 font-semibold">Email</th>
                <th className="text-center py-3 px-4 font-semibold">Status</th>
                <th className="text-center py-3 px-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="py-8 text-center text-slate-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="py-8 text-center text-slate-400">No companies found.</td></tr>
              ) : filtered.map((c, i) => (
                <tr key={c.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  <td className="py-2.5 px-4 font-mono font-bold text-blue-700">{c.company_code}</td>
                  <td className="py-2.5 px-4 font-semibold text-slate-800">{c.company_name}</td>
                  <td className="py-2.5 px-4">
                    <span className={"px-2 py-0.5 rounded-full text-xs font-semibold " +
                      (c.company_type === 'internal' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700')}>
                      {c.company_type}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-500">{c.contact_person ?? '—'}</td>
                  <td className="py-2.5 px-4 text-slate-500">{c.phone ?? '—'}</td>
                  <td className="py-2.5 px-4 text-slate-500">{c.email ?? '—'}</td>
                  <td className="py-2.5 px-4 text-center">
                    <button onClick={() => toggleActive(c.id, c.is_active)}
                      className={"px-2 py-0.5 rounded-full text-xs font-semibold " +
                        (c.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600")}>
                      {c.is_active ? '● Active' : '○ Inactive'}
                    </button>
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <button onClick={() => startEdit(c)}
                      className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100">✏️ Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="bg-blue-950 px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <h3 className="text-white font-bold">{editingId ? 'Edit Company' : 'Add Company'}</h3>
              <button onClick={() => { setShowForm(false); setEditingId(null); }}
                className="text-blue-300 hover:text-white text-lg">✕</button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Company Code *</label>
                  <input type="text" value={form.company_code}
                    onChange={e => setForm({ ...form, company_code: e.target.value.toUpperCase() })}
                    placeholder="e.g. AASSB" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Type *</label>
                  <select value={form.company_type} onChange={e => setForm({ ...form, company_type: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="internal">Internal (Sapura Group)</option>
                    <option value="external">External Customer</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Company Name *</label>
                  <input type="text" value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Contact Person</label>
                  <input type="text" value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
                  <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Address</label>
                  <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                    rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="active" checked={form.is_active}
                    onChange={e => setForm({ ...form, is_active: e.target.checked })} className="rounded" />
                  <label htmlFor="active" className="text-xs font-semibold text-slate-600">Active</label>
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-2.5 bg-blue-950 hover:bg-blue-900 text-white rounded-xl text-sm font-bold disabled:opacity-50">
                  {saving ? 'Saving...' : editingId ? '✓ Update' : '✓ Add Company'}
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
