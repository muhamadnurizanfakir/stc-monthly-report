'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface TimesheetEntry {
  id: string;
  employee_name: string;
  employee_id: string | null;
  entry_date: string;
  clock_in: string | null;
  clock_out: string | null;
  hours_worked: number | null;
  project_task: string | null;
  notes: string | null;
}

const emptyForm = {
  employee_name: '',
  employee_id: '',
  entry_date: new Date().toISOString().split('T')[0],
  clock_in: '',
  clock_out: '',
  hours_worked: '',
  project_task: '',
  notes: '',
};

export default function TimesheetClient() {
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [filterName, setFilterName] = useState('');

  useEffect(() => { fetchEntries(); }, []);

  async function fetchEntries() {
    setLoading(true);
    const { data } = await supabase
      .from('timesheet_entries')
      .select('*')
      .order('entry_date', { ascending: false })
      .order('clock_in', { ascending: true });
    setEntries(data ?? []);
    setLoading(false);
  }

  function calcHours(clockIn: string, clockOut: string) {
    if (!clockIn || !clockOut) return '';
    const [ih, im] = clockIn.split(':').map(Number);
    const [oh, om] = clockOut.split(':').map(Number);
    const diff = ((oh * 60 + om) - (ih * 60 + im)) / 60;
    return diff > 0 ? diff.toFixed(2) : '';
  }

  function handleTimeChange(field: 'clock_in' | 'clock_out', val: string) {
    const updated = { ...form, [field]: val };
    const hrs = calcHours(
      field === 'clock_in' ? val : form.clock_in,
      field === 'clock_out' ? val : form.clock_out
    );
    setForm({ ...updated, hours_worked: hrs });
  }

  function openNew() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(e: TimesheetEntry) {
    setEditingId(e.id);
    setForm({
      employee_name: e.employee_name,
      employee_id: e.employee_id ?? '',
      entry_date: e.entry_date,
      clock_in: e.clock_in ?? '',
      clock_out: e.clock_out ?? '',
      hours_worked: e.hours_worked?.toString() ?? '',
      project_task: e.project_task ?? '',
      notes: e.notes ?? '',
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.employee_name || !form.entry_date) { alert('Employee name and date required'); return; }
    setSaving(true);
    const payload = {
      employee_name: form.employee_name,
      employee_id: form.employee_id || null,
      entry_date: form.entry_date,
      clock_in: form.clock_in || null,
      clock_out: form.clock_out || null,
      hours_worked: form.hours_worked ? parseFloat(form.hours_worked) : null,
      project_task: form.project_task || null,
      notes: form.notes || null,
    };
    if (editingId) {
      await supabase.from('timesheet_entries').update(payload).eq('id', editingId);
    } else {
      await supabase.from('timesheet_entries').insert([payload]);
    }
    setShowForm(false);
    setEditingId(null);
    fetchEntries();
    setSaving(false);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete entry for ${name}?`)) return;
    await supabase.from('timesheet_entries').delete().eq('id', id);
    fetchEntries();
  }

  const filtered = entries.filter(e => {
    if (filterDate && e.entry_date !== filterDate) return false;
    if (filterName && !e.employee_name.toLowerCase().includes(filterName.toLowerCase())) return false;
    return true;
  });

  const totalHours = filtered.reduce((s, e) => s + (e.hours_worked ?? 0), 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-blue-950 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/" className="text-blue-300 hover:text-white text-xs">← Home</a>
          <span className="text-blue-600">|</span>
          <div className="flex items-center gap-2">
            <span className="text-xl">🕐</span>
            <div>
              <p className="text-white font-bold text-sm">Timesheet</p>
              <p className="text-blue-300 text-xs">Employee Time Tracking</p>
            </div>
          </div>
        </div>
        <button onClick={openNew} className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold">+ New Entry</button>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">Total Entries</p>
            <p className="text-2xl font-bold text-blue-950">{filtered.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">Total Hours</p>
            <p className="text-2xl font-bold text-blue-950">{totalHours.toFixed(1)}h</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">Employees</p>
            <p className="text-2xl font-bold text-blue-950">{new Set(filtered.map(e => e.employee_name)).size}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 flex gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Filter by Date</label>
            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Filter by Employee</label>
            <input type="text" value={filterName} onChange={e => setFilterName(e.target.value)}
              placeholder="Employee name..." className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {(filterDate || filterName) && (
            <button onClick={() => { setFilterDate(''); setFilterName(''); }}
              className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200">Clear</button>
          )}
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-6 mb-4">
            <h2 className="font-bold text-slate-800 mb-4">{editingId ? 'Edit Entry' : 'New Timesheet Entry'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Employee Name *</label>
                <input type="text" value={form.employee_name} onChange={e => setForm({ ...form, employee_name: e.target.value })}
                  placeholder="Full name" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Employee ID</label>
                <input type="text" value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })}
                  placeholder="e.g. STC001" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Date *</label>
                <input type="date" value={form.entry_date} onChange={e => setForm({ ...form, entry_date: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Clock In</label>
                <input type="time" value={form.clock_in} onChange={e => handleTimeChange('clock_in', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Clock Out</label>
                <input type="time" value={form.clock_out} onChange={e => handleTimeChange('clock_out', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Hours Worked</label>
                <input type="number" step="0.25" min="0" max="24" value={form.hours_worked} onChange={e => setForm({ ...form, hours_worked: e.target.value })}
                  placeholder="Auto-calculated" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Project / Task</label>
                <input type="text" value={form.project_task} onChange={e => setForm({ ...form, project_task: e.target.value })}
                  placeholder="e.g. D03B Spring - CAE Validation" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Notes / Remarks</label>
                <input type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Optional remarks" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 bg-blue-950 text-white rounded-lg text-sm font-semibold hover:bg-blue-900 disabled:opacity-50">
                {saving ? 'Saving...' : editingId ? 'Update' : 'Save Entry'}
              </button>
              <button onClick={() => { setShowForm(false); setEditingId(null); }}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-200">Cancel</button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-700">Timesheet Entries</h3>
            <span className="text-xs text-slate-400">{filtered.length} entries</span>
          </div>
          {loading ? (
            <div className="py-8 text-center text-slate-400 text-sm">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">No entries yet. Click &quot;+ New Entry&quot; to add one.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left py-2 px-4 font-semibold text-slate-500">Date</th>
                    <th className="text-left py-2 px-4 font-semibold text-slate-500">Employee</th>
                    <th className="text-left py-2 px-4 font-semibold text-slate-500">ID</th>
                    <th className="text-left py-2 px-4 font-semibold text-slate-500">Clock In</th>
                    <th className="text-left py-2 px-4 font-semibold text-slate-500">Clock Out</th>
                    <th className="text-left py-2 px-4 font-semibold text-slate-500">Hours</th>
                    <th className="text-left py-2 px-4 font-semibold text-slate-500">Project / Task</th>
                    <th className="text-left py-2 px-4 font-semibold text-slate-500">Notes</th>
                    <th className="py-2 px-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e, i) => (
                    <tr key={e.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="py-2 px-4 font-mono text-slate-600">
                        {new Date(e.entry_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </td>
                      <td className="py-2 px-4 font-semibold text-slate-800">{e.employee_name}</td>
                      <td className="py-2 px-4 text-slate-500">{e.employee_id ?? '—'}</td>
                      <td className="py-2 px-4 font-mono text-slate-600">{e.clock_in ?? '—'}</td>
                      <td className="py-2 px-4 font-mono text-slate-600">{e.clock_out ?? '—'}</td>
                      <td className="py-2 px-4">
                        {e.hours_worked != null ? (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-semibold">{e.hours_worked}h</span>
                        ) : '—'}
                      </td>
                      <td className="py-2 px-4 text-slate-600 max-w-[200px] truncate">{e.project_task ?? '—'}</td>
                      <td className="py-2 px-4 text-slate-500 max-w-[150px] truncate">{e.notes ?? '—'}</td>
                      <td className="py-2 px-4">
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(e)} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100">✏️</button>
                          <button onClick={() => handleDelete(e.id, e.employee_name)} className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
