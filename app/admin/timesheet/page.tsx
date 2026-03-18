'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface TsUser {
  id: string;
  name: string;
  employee_id: string | null;
  pin: string;
  designation: string | null;
  hourly_rate: number | null;
  default_factory: string | null;
  is_active: boolean;
}
interface Factory {
  id: string;
  code: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

const emptyForm = { name: '', employee_id: '', pin: '', designation: '', hourly_rate: '', default_factory: '', is_active: true };

export default function AdminTimesheet() {
  const [users, setUsers] = useState<TsUser[]>([]);
  const [factories, setFactories] = useState<Factory[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'users'|'factories'>('users');
  const [factoryForm, setFactoryForm] = useState({ code: '', name: '', sort_order: '' });
  const [editingFactoryId, setEditingFactoryId] = useState<string | null>(null);
  const [showFactoryForm, setShowFactoryForm] = useState(false);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const [{ data: u }, { data: f }] = await Promise.all([
      supabase.from('ts_users').select('*').order('name'),
      supabase.from('ts_factories').select('*').order('sort_order'),
    ]);
    setUsers(u ?? []);
    setFactories(f ?? []);
  }

  async function handleSaveUser() {
    if (!form.name || form.pin.length !== 4) { alert('Name and 4-digit PIN required'); return; }
    setSaving(true);
    const payload = { name: form.name, employee_id: form.employee_id || null, pin: form.pin, designation: form.designation || null, hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : null, default_factory: form.default_factory || null, is_active: form.is_active };
    if (editingId) {
      await supabase.from('ts_users').update(payload).eq('id', editingId);
    } else {
      await supabase.from('ts_users').insert([payload]);
    }
    setShowForm(false); setEditingId(null); setForm(emptyForm);
    fetchData(); setSaving(false);
  }

  async function handleSaveFactory() {
    if (!factoryForm.code || !factoryForm.name) { alert('Code and name required'); return; }
    setSaving(true);
    const payload = { code: factoryForm.code.toUpperCase(), name: factoryForm.name, sort_order: parseInt(factoryForm.sort_order) || 0 };
    if (editingFactoryId) {
      await supabase.from('ts_factories').update(payload).eq('id', editingFactoryId);
    } else {
      await supabase.from('ts_factories').insert([payload]);
    }
    setShowFactoryForm(false); setEditingFactoryId(null); setFactoryForm({ code: '', name: '', sort_order: '' });
    fetchData(); setSaving(false);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-blue-950 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/timesheet" className="text-blue-300 hover:text-white text-xs">← Timesheet</a>
          <span className="text-blue-700">|</span>
          <p className="text-white font-bold text-sm">⚙️ Timesheet Admin</p>
        </div>
        <a href="/admin" className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold">Main Admin</a>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setActiveTab('users')} className={"px-4 py-2 rounded-lg text-sm font-semibold " + (activeTab === 'users' ? "bg-blue-950 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50")}>👥 Users</button>
          <button onClick={() => setActiveTab('factories')} className={"px-4 py-2 rounded-lg text-sm font-semibold " + (activeTab === 'factories' ? "bg-blue-950 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50")}>🏭 Factories</button>
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-slate-800">Users ({users.length})</h2>
              <button onClick={() => { setEditingId(null); setForm(emptyForm); setShowForm(true); }}
                className="px-3 py-1.5 bg-blue-950 text-white rounded-lg text-xs font-semibold hover:bg-blue-900">+ Add User</button>
            </div>

            {showForm && (
              <div className="bg-white rounded-xl border border-blue-200 p-5 mb-4">
                <h3 className="font-bold text-slate-800 mb-4">{editingId ? 'Edit User' : 'New User'}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name *</label>
                    <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Employee ID</label>
                    <input type="text" value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })}
                      placeholder="e.g. STC001" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">PIN (4 digits) *</label>
                    <input type="text" maxLength={4} value={form.pin} onChange={e => setForm({ ...form, pin: e.target.value.replace(/\D/g,'').slice(0,4) })}
                      placeholder="e.g. 1234" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-widest" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Designation</label>
                    <input type="text" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })}
                      placeholder="e.g. Senior Engineer" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Hourly Rate (RM)</label>
                    <input type="number" step="0.01" min="0" value={form.hourly_rate} onChange={e => setForm({ ...form, hourly_rate: e.target.value })}
                      placeholder="e.g. 150.00" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Default Factory</label>
                    <select value={form.default_factory} onChange={e => setForm({ ...form, default_factory: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">— None —</option>
                      {factories.map(f => <option key={f.id} value={f.code}>{f.code} — {f.name}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 accent-blue-600" />
                    <label htmlFor="is_active" className="text-xs font-semibold text-slate-600">Active User</label>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={handleSaveUser} disabled={saving} className="px-4 py-2 bg-blue-950 text-white rounded-lg text-sm font-semibold hover:bg-blue-900 disabled:opacity-50">{saving ? 'Saving...' : editingId ? 'Update' : 'Add User'}</button>
                  <button onClick={() => { setShowForm(false); setEditingId(null); }} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-200">Cancel</button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left py-2 px-4 font-semibold text-slate-500">Name</th>
                    <th className="text-left py-2 px-4 font-semibold text-slate-500">ID</th>
                    <th className="text-left py-2 px-4 font-semibold text-slate-500">PIN</th>
                    <th className="text-left py-2 px-4 font-semibold text-slate-500">Designation</th>
                    <th className="text-right py-2 px-4 font-semibold text-slate-500">Rate (RM/hr)</th>
                    <th className="text-left py-2 px-4 font-semibold text-slate-500">Default Factory</th>
                    <th className="text-left py-2 px-4 font-semibold text-slate-500">Status</th>
                    <th className="py-2 px-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={u.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="py-2 px-4 font-semibold text-slate-800">{u.name}</td>
                      <td className="py-2 px-4 text-slate-500">{u.employee_id ?? '—'}</td>
                      <td className="py-2 px-4 font-mono text-slate-400">••••</td>
                      <td className="py-2 px-4 text-slate-500">{u.designation ?? '—'}</td>
                      <td className="py-2 px-4 text-right font-mono text-slate-600">{u.hourly_rate ? `RM ${u.hourly_rate.toFixed(2)}` : '—'}</td>
                      <td className="py-2 px-4 text-slate-600">{u.default_factory ?? '—'}</td>
                      <td className="py-2 px-4"><span className={"px-2 py-0.5 rounded text-xs font-semibold " + (u.is_active ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500")}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                      <td className="py-2 px-4">
                        <div className="flex gap-1">
                          <button onClick={() => { setEditingId(u.id); setForm({ name: u.name, employee_id: u.employee_id ?? '', pin: u.pin, designation: u.designation ?? '', hourly_rate: u.hourly_rate?.toString() ?? '', default_factory: u.default_factory ?? '', is_active: u.is_active }); setShowForm(true); }}
                            className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100">✏️</button>
                          <button onClick={async () => { if (!confirm('Delete ' + u.name + '?')) return; await supabase.from('ts_users').delete().eq('id', u.id); fetchData(); }}
                            className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Factories Tab */}
        {activeTab === 'factories' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-slate-800">Factories ({factories.length})</h2>
              <button onClick={() => { setEditingFactoryId(null); setFactoryForm({ code: '', name: '', sort_order: '' }); setShowFactoryForm(true); }}
                className="px-3 py-1.5 bg-blue-950 text-white rounded-lg text-xs font-semibold hover:bg-blue-900">+ Add Factory</button>
            </div>

            {showFactoryForm && (
              <div className="bg-white rounded-xl border border-blue-200 p-5 mb-4">
                <h3 className="font-bold text-slate-800 mb-4">{editingFactoryId ? 'Edit Factory' : 'New Factory'}</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Code *</label>
                    <input type="text" value={factoryForm.code} onChange={e => setFactoryForm({ ...factoryForm, code: e.target.value.toUpperCase() })}
                      placeholder="e.g. STCSB" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Name *</label>
                    <input type="text" value={factoryForm.name} onChange={e => setFactoryForm({ ...factoryForm, name: e.target.value })}
                      placeholder="Factory name" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Sort Order</label>
                    <input type="number" value={factoryForm.sort_order} onChange={e => setFactoryForm({ ...factoryForm, sort_order: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={handleSaveFactory} disabled={saving} className="px-4 py-2 bg-blue-950 text-white rounded-lg text-sm font-semibold hover:bg-blue-900 disabled:opacity-50">{saving ? 'Saving...' : editingFactoryId ? 'Update' : 'Add Factory'}</button>
                  <button onClick={() => { setShowFactoryForm(false); setEditingFactoryId(null); }} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-200">Cancel</button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left py-2 px-4 font-semibold text-slate-500">Code</th>
                    <th className="text-left py-2 px-4 font-semibold text-slate-500">Name</th>
                    <th className="text-left py-2 px-4 font-semibold text-slate-500">Order</th>
                    <th className="text-left py-2 px-4 font-semibold text-slate-500">Status</th>
                    <th className="py-2 px-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {factories.map((f, i) => (
                    <tr key={f.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="py-2 px-4 font-mono font-bold text-slate-800">{f.code}</td>
                      <td className="py-2 px-4 text-slate-600">{f.name}</td>
                      <td className="py-2 px-4 text-slate-500">{f.sort_order}</td>
                      <td className="py-2 px-4"><span className={"px-2 py-0.5 rounded text-xs font-semibold " + (f.is_active ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500")}>{f.is_active ? 'Active' : 'Inactive'}</span></td>
                      <td className="py-2 px-4">
                        <div className="flex gap-1">
                          <button onClick={() => { setEditingFactoryId(f.id); setFactoryForm({ code: f.code, name: f.name, sort_order: f.sort_order.toString() }); setShowFactoryForm(true); }}
                            className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100">✏️</button>
                          <button onClick={async () => { await supabase.from('ts_factories').update({ is_active: !f.is_active }).eq('id', f.id); fetchData(); }}
                            className={"px-2 py-1 rounded text-xs " + (f.is_active ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-green-50 text-green-700 hover:bg-green-100")}>
                            {f.is_active ? 'Disable' : 'Enable'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
