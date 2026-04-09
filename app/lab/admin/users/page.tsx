'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import type { LabUser, LabCompany } from '../../../lib/lab-types';

const ROLE_OPTIONS = [
  { value: 'lab_admin', label: '⚙️ Lab Administrator', color: '#dc2626' },
  { value: 'lab_engineer', label: '🔬 Lab Engineer', color: '#16a34a' },
  { value: 'lab_reviewer', label: '📋 Lab Reviewer', color: '#2563eb' },
  { value: 'lab_approver', label: '✅ Lab Approver', color: '#7c3aed' },
  { value: 'lab_customer', label: '👤 Customer', color: '#64748b' },
];

const TYPE_OPTIONS = [
  { value: 'staff', label: 'Lab Staff' },
  { value: 'internal', label: 'Internal (Sapura)' },
  { value: 'external', label: 'External Customer' },
];

const emptyForm = {
  name: '', email: '', role: 'lab_engineer', user_type: 'staff',
  designation: '', employee_id: '', company_id: '', password: '', is_active: true,
};

export default function LabUsersPage() {
  const [users, setUsers] = useState<LabUser[]>([]);
  const [companies, setCompanies] = useState<LabCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: u }, { data: c }] = await Promise.all([
      supabase.from('lab_users').select('*, lab_companies(company_name)').order('role').order('name'),
      supabase.from('lab_companies').select('*').eq('is_active', true).order('company_name'),
    ]);
    setUsers(u ?? []);
    setCompanies(c ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function startEdit(u: LabUser) {
    setEditingId(u.id);
    setForm({
      name: u.name, email: u.email, role: u.role,
      user_type: (u as {user_type?:string}).user_type ?? 'staff',
      designation: (u as {designation?:string}).designation ?? '',
      employee_id: u.employee_id ?? '', company_id: u.company_id ?? '',
      password: '', is_active: u.is_active,
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name || !form.email) { alert('Name and email required'); return; }
    setSaving(true);
    const payload: Record<string, unknown> = {
      name: form.name, email: form.email, role: form.role,
      user_type: form.user_type, designation: form.designation || null,
      employee_id: form.employee_id || null,
      company_id: form.company_id || null, is_active: form.is_active,
    };
    if (form.password) payload.password_hash = form.password;

    if (editingId) {
      await supabase.from('lab_users').update(payload).eq('id', editingId);
      await supabase.from('lab_audit_logs').insert([{
        action: 'UPDATE_USER', entity_type: 'user', entity_id: editingId,
        new_values: { name: form.name, role: form.role },
      }]);
    } else {
      const { data } = await supabase.from('lab_users').insert([payload]).select().single();
      await supabase.from('lab_audit_logs').insert([{
        action: 'CREATE_USER', entity_type: 'user', entity_id: data?.id,
        new_values: { name: form.name, role: form.role, email: form.email },
      }]);
    }
    setShowForm(false); setEditingId(null); setForm(emptyForm);
    fetchData();
    setSaving(false);
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('lab_users').update({ is_active: !current }).eq('id', id);
    fetchData();
  }

  const filtered = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'all' || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const roleColor = (role: string) => ROLE_OPTIONS.find(r => r.value === role)?.color ?? '#64748b';
  const roleLabel = (role: string) => ROLE_OPTIONS.find(r => r.value === role)?.label ?? role;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-blue-950 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/lab/admin" className="text-blue-300 hover:text-white text-xs">← Lab Admin</a>
          <span className="text-blue-700">|</span>
          <span className="text-white font-bold text-sm">👥 User Management</span>
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }}
          className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold">
          + Add User
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          {ROLE_OPTIONS.map(r => (
            <div key={r.value} className="bg-white rounded-xl border border-slate-200 p-3 text-center">
              <p className="text-xl font-bold" style={{ color: r.color }}>
                {users.filter(u => u.role === r.value).length}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{r.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-4">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name or email..." className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">All Roles</option>
            {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>

        {/* User Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-blue-950 text-blue-100">
                <th className="text-left py-3 px-4 font-semibold">Name</th>
                <th className="text-left py-3 px-4 font-semibold">Email</th>
                <th className="text-left py-3 px-4 font-semibold">Role</th>
                <th className="text-left py-3 px-4 font-semibold">Type</th>
                <th className="text-left py-3 px-4 font-semibold">Designation</th>
                <th className="text-left py-3 px-4 font-semibold">Company</th>
                <th className="text-center py-3 px-4 font-semibold">Status</th>
                <th className="text-center py-3 px-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="py-8 text-center text-slate-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="py-8 text-center text-slate-400">No users found.</td></tr>
              ) : filtered.map((u, i) => (
                <tr key={u.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  <td className="py-2.5 px-4 font-semibold text-slate-800">{u.name}</td>
                  <td className="py-2.5 px-4 text-slate-500">{u.email}</td>
                  <td className="py-2.5 px-4">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold text-white"
                      style={{ background: roleColor(u.role) }}>
                      {roleLabel(u.role)}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-500 capitalize">
                    {(u as {user_type?:string}).user_type ?? '—'}
                  </td>
                  <td className="py-2.5 px-4 text-slate-500">
                    {(u as {designation?:string}).designation ?? '—'}
                  </td>
                  <td className="py-2.5 px-4 text-slate-500">
                    {(u.lab_companies as {company_name?:string}|undefined)?.company_name ?? '—'}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <button onClick={() => toggleActive(u.id, u.is_active)}
                      className={"px-2 py-0.5 rounded-full text-xs font-semibold " +
                        (u.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600")}>
                      {u.is_active ? '● Active' : '○ Inactive'}
                    </button>
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <button onClick={() => startEdit(u)}
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
              <h3 className="text-white font-bold">{editingId ? 'Edit User' : 'Add New User'}</h3>
              <button onClick={() => { setShowForm(false); setEditingId(null); }}
                className="text-blue-300 hover:text-white text-lg leading-none">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name *</label>
                  <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Email *</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Role *</label>
                  <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">User Type *</label>
                  <select value={form.user_type} onChange={e => setForm({ ...form, user_type: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Designation</label>
                  <input type="text" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })}
                    placeholder="e.g. Test Engineer" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Employee ID</label>
                  <input type="text" value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Company</label>
                  <select value={form.company_id} onChange={e => setForm({ ...form, company_id: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— None —</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {editingId ? 'New Password (leave blank to keep)' : 'Password *'}
                  </label>
                  <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder={editingId ? "Leave blank to keep current" : "Set password"}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_active" checked={form.is_active}
                  onChange={e => setForm({ ...form, is_active: e.target.checked })}
                  className="rounded" />
                <label htmlFor="is_active" className="text-xs font-semibold text-slate-600">Active Account</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-2.5 bg-blue-950 hover:bg-blue-900 text-white rounded-xl text-sm font-bold disabled:opacity-50">
                  {saving ? 'Saving...' : editingId ? '✓ Update User' : '✓ Create User'}
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
