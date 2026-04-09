'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import type { LabOutsourcedLab } from '../../../lib/lab-types';

const emptyForm = {
  lab_code: '', lab_name: '', accreditation: '', accreditation_no: '',
  accreditation_expiry: '', address: '', contact_person: '',
  phone: '', email: '', is_active: true,
};

export default function OutsourcedLabsPage() {
  const [labs, setLabs] = useState<LabOutsourcedLab[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('lab_outsourced_labs').select('*').order('lab_name');
    setLabs(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function startEdit(l: LabOutsourcedLab) {
    setEditingId(l.id);
    setForm({
      lab_code: l.lab_code, lab_name: l.lab_name,
      accreditation: l.accreditation ?? '',
      accreditation_no: l.accreditation_no ?? '',
      accreditation_expiry: l.accreditation_expiry ?? '',
      address: (l as {address?:string}).address ?? '',
      contact_person: l.contact_person ?? '',
      phone: l.phone ?? '', email: l.email ?? '',
      is_active: l.is_active,
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.lab_code || !form.lab_name) { alert('Lab code and name required'); return; }
    setSaving(true);
    const payload = {
      lab_code: form.lab_code.toUpperCase(),
      lab_name: form.lab_name,
      accreditation: form.accreditation || null,
      accreditation_no: form.accreditation_no || null,
      accreditation_expiry: form.accreditation_expiry || null,
      address: form.address || null,
      contact_person: form.contact_person || null,
      phone: form.phone || null,
      email: form.email || null,
      is_active: form.is_active,
    };
    if (editingId) {
      await supabase.from('lab_outsourced_labs').update(payload).eq('id', editingId);
    } else {
      await supabase.from('lab_outsourced_labs').insert([payload]);
    }
    setShowForm(false); setEditingId(null); setForm(emptyForm);
    fetchData(); setSaving(false);
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('lab_outsourced_labs').update({ is_active: !current }).eq('id', id);
    fetchData();
  }

  // Check accreditation expiry
  function expiryStatus(expiry: string | null) {
    if (!expiry) return null;
    const days = Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000);
    if (days < 0) return { label: 'Expired', color: '#dc2626', bg: '#fee2e2' };
    if (days < 90) return { label: `Expiring in ${days}d`, color: '#d97706', bg: '#fef9c3' };
    return { label: `Valid (${days}d)`, color: '#16a34a', bg: '#dcfce7' };
  }

  const filtered = labs.filter(l =>
    l.lab_name.toLowerCase().includes(search.toLowerCase()) ||
    l.lab_code.toLowerCase().includes(search.toLowerCase()) ||
    (l.accreditation ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-blue-950 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/lab/admin" className="text-blue-300 hover:text-white text-xs">← Lab Admin</a>
          <span className="text-blue-700">|</span>
          <span className="text-white font-bold text-sm">🏭 Outsourced Labs Registry</span>
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }}
          className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold">
          + Add Lab
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-2xl font-bold text-blue-950">{labs.length}</p>
            <p className="text-xs text-slate-500">Total Labs</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{labs.filter(l => l.is_active).length}</p>
            <p className="text-xs text-slate-500">Active Labs</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-2xl font-bold text-red-500">
              {labs.filter(l => l.accreditation_expiry && new Date(l.accreditation_expiry) < new Date()).length}
            </p>
            <p className="text-xs text-slate-500">Expired Accreditation</p>
          </div>
        </div>

        {/* Search */}
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search lab name, code or accreditation..."
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />

        {/* Labs Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-blue-950 text-blue-100">
                <th className="text-left py-3 px-4 font-semibold">Code</th>
                <th className="text-left py-3 px-4 font-semibold">Lab Name</th>
                <th className="text-left py-3 px-4 font-semibold">Accreditation</th>
                <th className="text-left py-3 px-4 font-semibold">Accred. No.</th>
                <th className="text-left py-3 px-4 font-semibold">Expiry Status</th>
                <th className="text-left py-3 px-4 font-semibold">Contact</th>
                <th className="text-center py-3 px-4 font-semibold">Status</th>
                <th className="text-center py-3 px-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="py-8 text-center text-slate-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="py-8 text-center text-slate-400">No outsourced labs registered yet.</td></tr>
              ) : filtered.map((l, i) => {
                const expiry = expiryStatus(l.accreditation_expiry);
                return (
                  <tr key={l.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="py-2.5 px-4 font-mono font-bold text-blue-700">{l.lab_code}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800 max-w-[180px]">
                      <p className="truncate">{l.lab_name}</p>
                      {l.contact_person && <p className="text-slate-400 font-normal">{l.contact_person}</p>}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500">{l.accreditation ?? '—'}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-500">{l.accreditation_no ?? '—'}</td>
                    <td className="py-2.5 px-4">
                      {expiry ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ background: expiry.bg, color: expiry.color }}>{expiry.label}</span>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="py-2.5 px-4">
                      <p className="text-slate-600">{l.phone ?? '—'}</p>
                      <p className="text-slate-400">{l.email ?? '—'}</p>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <button onClick={() => toggleActive(l.id, l.is_active)}
                        className={"px-2 py-0.5 rounded-full text-xs font-semibold " +
                          (l.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600")}>
                        {l.is_active ? '● Active' : '○ Inactive'}
                      </button>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <button onClick={() => startEdit(l)}
                        className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100">✏️ Edit</button>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4">
            <div className="bg-blue-950 px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <h3 className="text-white font-bold">{editingId ? 'Edit Lab' : 'Register Outsourced Lab'}</h3>
              <button onClick={() => { setShowForm(false); setEditingId(null); }}
                className="text-blue-300 hover:text-white text-lg">✕</button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Lab Code *</label>
                  <input type="text" value={form.lab_code}
                    onChange={e => setForm({ ...form, lab_code: e.target.value.toUpperCase() })}
                    placeholder="e.g. SIRIM-KL" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Lab Name *</label>
                  <input type="text" value={form.lab_name} onChange={e => setForm({ ...form, lab_name: e.target.value })}
                    placeholder="e.g. SIRIM QAS International" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Accreditation Type</label>
                  <select value={form.accreditation} onChange={e => setForm({ ...form, accreditation: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— Select —</option>
                    <option value="ISO/IEC 17025">ISO/IEC 17025</option>
                    <option value="ISO 9001">ISO 9001</option>
                    <option value="ILAC">ILAC</option>
                    <option value="DAkkS">DAkkS</option>
                    <option value="UKAS">UKAS</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Accreditation No.</label>
                  <input type="text" value={form.accreditation_no}
                    onChange={e => setForm({ ...form, accreditation_no: e.target.value })}
                    placeholder="e.g. MY-17025-0123" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Accreditation Expiry</label>
                  <input type="date" value={form.accreditation_expiry}
                    onChange={e => setForm({ ...form, accreditation_expiry: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Contact Person</label>
                  <input type="text" value={form.contact_person}
                    onChange={e => setForm({ ...form, contact_person: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
                  <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
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
                  {saving ? 'Saving...' : editingId ? '✓ Update Lab' : '✓ Register Lab'}
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
