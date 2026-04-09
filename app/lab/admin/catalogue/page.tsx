'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import type { LabTestCatalogue, LabTestCategory } from '../../../lib/lab-types';

const emptyForm = {
  category_id: '', test_code: '', test_name: '', test_description: '',
  test_standard: '', unit_of_measure: '', typical_duration_days: '',
  base_price: '', currency: 'MYR', can_outsource: false, is_active: true,
};

export default function LabCataloguePage() {
  const [catalogue, setCatalogue] = useState<LabTestCatalogue[]>([]);
  const [categories, setCategories] = useState<LabTestCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: cat }, { data: cats }] = await Promise.all([
      supabase.from('lab_test_catalogue').select('*, lab_test_categories(*)').order('test_code'),
      supabase.from('lab_test_categories').select('*').eq('is_active', true).order('sort_order'),
    ]);
    setCatalogue(cat ?? []);
    setCategories(cats ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function startEdit(t: LabTestCatalogue) {
    setEditingId(t.id);
    setForm({
      category_id: t.category_id, test_code: t.test_code, test_name: t.test_name,
      test_description: t.test_description ?? '', test_standard: t.test_standard ?? '',
      unit_of_measure: t.unit_of_measure ?? '',
      typical_duration_days: t.typical_duration_days?.toString() ?? '',
      base_price: t.base_price?.toString() ?? '',
      currency: t.currency, can_outsource: t.can_outsource, is_active: t.is_active,
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.test_code || !form.test_name || !form.category_id) { alert('Code, name and category required'); return; }
    setSaving(true);
    const payload = {
      category_id: form.category_id, test_code: form.test_code.toUpperCase(),
      test_name: form.test_name, test_description: form.test_description || null,
      test_standard: form.test_standard || null, unit_of_measure: form.unit_of_measure || null,
      typical_duration_days: form.typical_duration_days ? parseInt(form.typical_duration_days) : null,
      base_price: form.base_price ? parseFloat(form.base_price) : null,
      currency: form.currency, can_outsource: form.can_outsource, is_active: form.is_active,
    };
    if (editingId) {
      await supabase.from('lab_test_catalogue').update(payload).eq('id', editingId);
    } else {
      await supabase.from('lab_test_catalogue').insert([payload]);
    }
    setShowForm(false); setEditingId(null); setForm(emptyForm);
    fetchData(); setSaving(false);
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('lab_test_catalogue').update({ is_active: !current }).eq('id', id);
    fetchData();
  }

  const filtered = catalogue.filter(t => {
    const matchSearch = t.test_name.toLowerCase().includes(search.toLowerCase()) ||
      t.test_code.toLowerCase().includes(search.toLowerCase()) ||
      (t.test_standard ?? '').toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === 'all' || t.category_id === filterCat;
    return matchSearch && matchCat;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-blue-950 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/lab/admin" className="text-blue-300 hover:text-white text-xs">← Lab Admin</a>
          <span className="text-blue-700">|</span>
          <span className="text-white font-bold text-sm">📚 Test Catalogue</span>
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }}
          className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold">
          + Add Test
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Category Stats */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          {categories.map(cat => (
            <div key={cat.id} onClick={() => setFilterCat(filterCat === cat.id ? 'all' : cat.id)}
              className={"bg-white rounded-xl border p-3 text-center cursor-pointer transition-colors " +
                (filterCat === cat.id ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-blue-300")}>
              <p className="text-lg font-bold text-blue-950">{catalogue.filter(t => t.category_id === cat.id).length}</p>
              <p className="text-xs text-slate-500 leading-tight mt-0.5">{cat.name}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-4">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search test name, code or standard..."
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-blue-950 text-blue-100">
                <th className="text-left py-3 px-4 font-semibold">Code</th>
                <th className="text-left py-3 px-4 font-semibold">Test Name</th>
                <th className="text-left py-3 px-4 font-semibold">Category</th>
                <th className="text-left py-3 px-4 font-semibold">Standard</th>
                <th className="text-left py-3 px-4 font-semibold">Unit</th>
                <th className="text-right py-3 px-4 font-semibold">Price (MYR)</th>
                <th className="text-center py-3 px-4 font-semibold">Days</th>
                <th className="text-center py-3 px-4 font-semibold">Outsource</th>
                <th className="text-center py-3 px-4 font-semibold">Status</th>
                <th className="text-center py-3 px-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="py-8 text-center text-slate-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={10} className="py-8 text-center text-slate-400">No tests found. Add your first test!</td></tr>
              ) : filtered.map((t, i) => (
                <tr key={t.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  <td className="py-2.5 px-4 font-mono font-bold text-blue-700">{t.test_code}</td>
                  <td className="py-2.5 px-4 max-w-[180px]">
                    <p className="font-semibold text-slate-800 truncate">{t.test_name}</p>
                    {t.test_description && <p className="text-slate-400 truncate">{t.test_description}</p>}
                  </td>
                  <td className="py-2.5 px-4 text-slate-500">{t.lab_test_categories?.name ?? '—'}</td>
                  <td className="py-2.5 px-4 text-slate-500">{t.test_standard ?? '—'}</td>
                  <td className="py-2.5 px-4 text-slate-500">{t.unit_of_measure ?? '—'}</td>
                  <td className="py-2.5 px-4 text-right font-semibold text-slate-700">
                    {t.base_price != null ? `RM ${t.base_price.toFixed(2)}` : '—'}
                  </td>
                  <td className="py-2.5 px-4 text-center text-slate-500">
                    {t.typical_duration_days != null ? `${t.typical_duration_days}d` : '—'}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    {t.can_outsource
                      ? <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">Yes</span>
                      : <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-xs">No</span>}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <button onClick={() => toggleActive(t.id, t.is_active)}
                      className={"px-2 py-0.5 rounded-full text-xs font-semibold " +
                        (t.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600")}>
                      {t.is_active ? '● Active' : '○ Inactive'}
                    </button>
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <button onClick={() => startEdit(t)}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
            <div className="bg-blue-950 px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <h3 className="text-white font-bold">{editingId ? 'Edit Test' : 'Add New Test'}</h3>
              <button onClick={() => { setShowForm(false); setEditingId(null); }}
                className="text-blue-300 hover:text-white text-lg">✕</button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Test Code *</label>
                  <input type="text" value={form.test_code}
                    onChange={e => setForm({ ...form, test_code: e.target.value.toUpperCase() })}
                    placeholder="e.g. MECH-001"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Category *</label>
                  <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— Select category —</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Test Name *</label>
                  <input type="text" value={form.test_name} onChange={e => setForm({ ...form, test_name: e.target.value })}
                    placeholder="e.g. Tensile Strength Test"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                  <textarea value={form.test_description} onChange={e => setForm({ ...form, test_description: e.target.value })}
                    rows={2} placeholder="Brief description..."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Test Standard</label>
                  <input type="text" value={form.test_standard} onChange={e => setForm({ ...form, test_standard: e.target.value })}
                    placeholder="e.g. ISO 6892-1, ASTM E8"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Unit of Measure</label>
                  <input type="text" value={form.unit_of_measure} onChange={e => setForm({ ...form, unit_of_measure: e.target.value })}
                    placeholder="e.g. MPa, N, dB, °C"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Base Price (MYR)</label>
                  <input type="number" step="0.01" value={form.base_price}
                    onChange={e => setForm({ ...form, base_price: e.target.value })}
                    placeholder="0.00"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Typical Duration (days)</label>
                  <input type="number" value={form.typical_duration_days}
                    onChange={e => setForm({ ...form, typical_duration_days: e.target.value })}
                    placeholder="e.g. 5"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-2 flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.can_outsource}
                      onChange={e => setForm({ ...form, can_outsource: e.target.checked })} className="rounded" />
                    <span className="text-xs font-semibold text-slate-600">Can be Outsourced</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.is_active}
                      onChange={e => setForm({ ...form, is_active: e.target.checked })} className="rounded" />
                    <span className="text-xs font-semibold text-slate-600">Active</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-2.5 bg-blue-950 hover:bg-blue-900 text-white rounded-xl text-sm font-bold disabled:opacity-50">
                  {saving ? 'Saving...' : editingId ? '✓ Update Test' : '✓ Add Test'}
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
