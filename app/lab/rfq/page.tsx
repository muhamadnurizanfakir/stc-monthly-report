'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { LabTestCatalogue, LabTestCategory, LabCompany } from '../../lib/lab-types';

interface RFQItem {
  test_catalogue_id: string;
  custom_test_name: string;
  test_description: string;
  sample_description: string;
  quantity: number;
  test_type: 'inhouse' | 'outsourced';
  special_requirements: string;
}

const emptyItem: RFQItem = {
  test_catalogue_id: '', custom_test_name: '', test_description: '',
  sample_description: '', quantity: 1, test_type: 'inhouse', special_requirements: '',
};

export default function RFQPage() {
  const [categories, setCategories] = useState<LabTestCategory[]>([]);
  const [catalogue, setCatalogue] = useState<LabTestCatalogue[]>([]);
  const [companies, setCompanies] = useState<LabCompany[]>([]);
  const [items, setItems] = useState<RFQItem[]>([{ ...emptyItem }]);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [form, setForm] = useState({
    company_id: '', contact_name: '', contact_email: '', contact_phone: '',
    project_name: '', project_description: '', required_date: '', priority: 'normal',
  });

  useEffect(() => {
    async function fetchData() {
      const [{ data: cats }, { data: cat }, { data: comp }] = await Promise.all([
        supabase.from('lab_test_categories').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('lab_test_catalogue').select('*, lab_test_categories(*)').eq('is_active', true),
        supabase.from('lab_companies').select('*').eq('is_active', true).order('company_name'),
      ]);
      setCategories(cats ?? []);
      setCatalogue(cat ?? []);
      setCompanies(comp ?? []);
    }
    fetchData();
  }, []);

  function updateItem(idx: number, field: keyof RFQItem, value: string | number) {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value };
    setItems(updated);
  }

  function addItem() { setItems([...items, { ...emptyItem }]); }
  function removeItem(idx: number) { if (items.length > 1) setItems(items.filter((_, i) => i !== idx)); }

  async function handleSubmit(asDraft: boolean) {
    if (!form.contact_name || !form.contact_email || !form.project_name) {
      alert('Please fill in all required fields'); return;
    }
    setSaving(true);
    try {
      // Create RFQ
      const { data: rfq, error } = await supabase.from('lab_rfq').insert([{
        company_id: form.company_id || null,
        contact_name: form.contact_name,
        contact_email: form.contact_email,
        contact_phone: form.contact_phone || null,
        project_name: form.project_name,
        project_description: form.project_description || null,
        required_date: form.required_date || null,
        priority: form.priority,
        status: asDraft ? 'draft' : 'submitted',
        submitted_at: asDraft ? null : new Date().toISOString(),
      }]).select().single();

      if (error) throw error;

      // Insert RFQ items
      if (items.some(i => i.test_catalogue_id || i.custom_test_name)) {
        await supabase.from('lab_rfq_items').insert(
          items.filter(i => i.test_catalogue_id || i.custom_test_name).map((item, idx) => ({
            rfq_id: rfq.id,
            test_catalogue_id: item.test_catalogue_id || null,
            custom_test_name: item.custom_test_name || null,
            test_description: item.test_description || null,
            sample_description: item.sample_description || null,
            quantity: item.quantity,
            test_type: item.test_type,
            special_requirements: item.special_requirements || null,
            sort_order: idx,
          }))
        );
      }

      // Audit log
      await supabase.from('lab_audit_logs').insert([{
        user_name: form.contact_name,
        action: asDraft ? 'CREATE_DRAFT' : 'SUBMIT',
        entity_type: 'rfq',
        entity_id: rfq.id,
        entity_number: rfq.rfq_number,
        new_values: { status: rfq.status, project_name: rfq.project_name },
      }]);

      setSubmitted(rfq.rfq_number);
    } catch {
      alert('Error submitting RFQ. Please try again.');
    }
    setSaving(false);
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">RFQ Submitted!</h2>
          <p className="text-slate-500 text-sm mb-4">Your RFQ reference number is:</p>
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-6 py-3 mb-6">
            <p className="text-xl font-bold text-blue-800 font-mono">{submitted}</p>
          </div>
          <p className="text-xs text-slate-400 mb-6">Our engineers will review your request within 2 working days. Please save your reference number for tracking.</p>
          <div className="flex gap-2">
            <a href="/lab" className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-200 text-center">← Back to Lab</a>
            <a href="/lab/dashboard" className="flex-1 py-2 bg-blue-950 text-white rounded-lg text-sm font-semibold hover:bg-blue-900 text-center">Track Status</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-blue-950 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/lab" className="text-blue-300 hover:text-white text-xs">← Lab Services</a>
          <span className="text-blue-700">|</span>
          <p className="text-white font-bold text-sm">📋 Submit RFQ</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Request for Quotation</h1>
          <p className="text-slate-500 text-sm mt-1">Fill in the form below. A unique RFQ number will be assigned upon submission.</p>
        </div>

        {/* Company & Contact */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
          <h2 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-blue-950 text-white text-xs flex items-center justify-center">1</span> Company & Contact Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Company</label>
              <select value={form.company_id} onChange={e => setForm({ ...form, company_id: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— Select or leave blank —</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.company_name} ({c.company_type})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Contact Name *</label>
              <input type="text" value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })}
                placeholder="Your full name" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Email *</label>
              <input type="email" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })}
                placeholder="your@email.com" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
              <input type="text" value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })}
                placeholder="+60 12-345 6789" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        {/* Project Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
          <h2 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-blue-950 text-white text-xs flex items-center justify-center">2</span> Project Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Project Name *</label>
              <input type="text" value={form.project_name} onChange={e => setForm({ ...form, project_name: e.target.value })}
                placeholder="e.g. D03B Spring Fatigue Testing" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Project Description</label>
              <textarea value={form.project_description} onChange={e => setForm({ ...form, project_description: e.target.value })}
                rows={3} placeholder="Describe your testing requirements..." className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Required By Date</label>
              <input type="date" value={form.required_date} onChange={e => setForm({ ...form, required_date: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Priority</label>
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
        </div>

        {/* Test Items */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-700 flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-blue-950 text-white text-xs flex items-center justify-center">3</span> Test Items</h2>
            <button onClick={addItem} className="px-3 py-1.5 bg-blue-950 text-white rounded-lg text-xs font-semibold hover:bg-blue-900">+ Add Test Item</button>
          </div>
          <div className="space-y-4">
            {items.map((item, idx) => (
              <div key={idx} className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-600 uppercase">Test Item {idx + 1}</span>
                  {items.length > 1 && (
                    <button onClick={() => removeItem(idx)} className="text-xs text-red-500 hover:text-red-700">✕ Remove</button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Select from Catalogue</label>
                    <select value={item.test_catalogue_id} onChange={e => updateItem(idx, 'test_catalogue_id', e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                      <option value="">— Select test or enter custom —</option>
                      {categories.map(cat => (
                        <optgroup key={cat.id} label={cat.name}>
                          {catalogue.filter(c => c.category_id === cat.id).map(c => (
                            <option key={c.id} value={c.id}>{c.test_code} — {c.test_name}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Custom Test Name (if not in catalogue)</label>
                    <input type="text" value={item.custom_test_name} onChange={e => updateItem(idx, 'custom_test_name', e.target.value)}
                      placeholder="e.g. Custom fatigue test" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Sample Description</label>
                    <input type="text" value={item.sample_description} onChange={e => updateItem(idx, 'sample_description', e.target.value)}
                      placeholder="Describe the sample to be tested" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Quantity</label>
                    <input type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Test Type</label>
                    <select value={item.test_type} onChange={e => updateItem(idx, 'test_type', e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                      <option value="inhouse">In-House</option>
                      <option value="outsourced">Outsourced</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Special Requirements</label>
                    <input type="text" value={item.special_requirements} onChange={e => updateItem(idx, 'special_requirements', e.target.value)}
                      placeholder="Any special requirements or standards" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3 justify-end">
          <button onClick={() => handleSubmit(true)} disabled={saving}
            className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-200 disabled:opacity-50">
            💾 Save as Draft
          </button>
          <button onClick={() => handleSubmit(false)} disabled={saving}
            className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
            {saving ? 'Submitting...' : '📋 Submit RFQ'}
          </button>
        </div>
      </div>
    </div>
  );
}
