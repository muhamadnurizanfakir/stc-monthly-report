'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

interface LTR {
  id: string;
  rfq_number: string;
  project_name: string;
  contact_name: string;
  contact_email: string;
  company_id: string | null;
  lab_companies?: { company_name: string } | null;
  lab_rfq_items?: { id: string; test_catalogue_id: string | null; custom_test_name: string | null; sample_description: string | null; quantity: number; test_type: string; lab_test_catalogue?: { test_name: string; base_price: number | null } | null }[];
}

interface QuotItem {
  rfq_item_id: string;
  description: string;
  test_type: string;
  quantity: number;
  unit_price: number;
  estimated_days: number;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:    { bg: '#f1f5f9', text: '#64748b' },
  sent:     { bg: '#dbeafe', text: '#1d4ed8' },
  approved: { bg: '#dcfce7', text: '#15803d' },
  rejected: { bg: '#fee2e2', text: '#b91c1c' },
  expired:  { bg: '#fef9c3', text: '#854d0e' },
};

export default function QuotationsPage() {
  const [ltrs, setLtrs] = useState<LTR[]>([]);
  const [quotations, setQuotations] = useState<{id:string;quotation_number:string;rfq_id:string;status:string;total_amount:number;created_at:string;lab_rfq?:{project_name:string};lab_companies?:{company_name:string}}[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedLTR, setSelectedLTR] = useState<LTR | null>(null);
  const [quotItems, setQuotItems] = useState<QuotItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    valid_until: '', payment_terms: '30 days', tax_pct: '0', discount_pct: '0', notes: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: ltrData }, { data: quotData }] = await Promise.all([
      supabase.from('lab_rfq').select('*, lab_companies(*), lab_rfq_items(*, lab_test_catalogue(test_name, base_price))').eq('status', 'under_review').order('created_at', { ascending: false }),
      supabase.from('lab_quotations').select('*, lab_rfq(project_name), lab_companies(company_name)').order('created_at', { ascending: false }),
    ]);
    setLtrs(ltrData ?? []);
    setQuotations(quotData ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function startQuotation(ltr: LTR) {
    setSelectedLTR(ltr);
    // Pre-fill items from LTR
    const items = (ltr.lab_rfq_items ?? []).map(item => ({
      rfq_item_id: item.id,
      description: item.lab_test_catalogue?.test_name ?? item.custom_test_name ?? 'Custom Test',
      test_type: item.test_type,
      quantity: item.quantity,
      unit_price: item.lab_test_catalogue?.base_price ?? 0,
      estimated_days: 5,
    }));
    setQuotItems(items.length > 0 ? items : [{ rfq_item_id: '', description: '', test_type: 'inhouse', quantity: 1, unit_price: 0, estimated_days: 5 }]);
    setForm({ valid_until: '', payment_terms: '30 days', tax_pct: '0', discount_pct: '0', notes: '' });
    setShowForm(true);
  }

  function updateItem(idx: number, field: keyof QuotItem, value: string | number) {
    const updated = [...quotItems];
    updated[idx] = { ...updated[idx], [field]: value };
    setQuotItems(updated);
  }

  const subtotal = quotItems.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const discountAmt = subtotal * (parseFloat(form.discount_pct) / 100);
  const taxAmt = (subtotal - discountAmt) * (parseFloat(form.tax_pct) / 100);
  const total = subtotal - discountAmt + taxAmt;

  async function handleSaveQuotation(sendNow: boolean) {
    if (!selectedLTR) return;
    setSaving(true);
    const { data: quot, error } = await supabase.from('lab_quotations').insert([{
      rfq_id: selectedLTR.id,
      company_id: selectedLTR.company_id,
      valid_until: form.valid_until || null,
      payment_terms: form.payment_terms,
      currency: 'MYR',
      subtotal, discount_pct: parseFloat(form.discount_pct),
      discount_amount: discountAmt,
      tax_pct: parseFloat(form.tax_pct),
      tax_amount: taxAmt,
      total_amount: total,
      status: sendNow ? 'sent' : 'draft',
      notes: form.notes || null,
    }]).select().single();

    if (!error && quot) {
      // Insert quotation items
      await supabase.from('lab_quotation_items').insert(
        quotItems.map((item, idx) => ({
          quotation_id: quot.id,
          rfq_item_id: item.rfq_item_id || null,
          description: item.description,
          test_type: item.test_type,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.quantity * item.unit_price,
          estimated_days: item.estimated_days,
          sort_order: idx,
        }))
      );
      // Update LTR status to quoted
      await supabase.from('lab_rfq').update({ status: 'quoted' }).eq('id', selectedLTR.id);
      // Audit log
      await supabase.from('lab_audit_logs').insert([{
        action: sendNow ? 'SEND_QUOTATION' : 'CREATE_QUOTATION',
        entity_type: 'quotation', entity_id: quot.id,
        entity_number: quot.quotation_number,
        new_values: { total_amount: total, status: quot.status },
      }]);
    }
    setShowForm(false); setSelectedLTR(null);
    fetchData(); setSaving(false);
  }

  async function updateQuotStatus(id: string, status: string) {
    await supabase.from('lab_quotations').update({ status, ...(status === 'approved' ? { approved_at: new Date().toISOString() } : {}) }).eq('id', id);
    fetchData();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-blue-950 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/lab/admin" className="text-blue-300 hover:text-white text-xs">← Lab Admin</a>
          <span className="text-blue-700">|</span>
          <span className="text-white font-bold text-sm">💰 Quotation Management</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* LTRs awaiting quotation */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-800 mb-3">
            🧪 LTRs Awaiting Quotation
            <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">{ltrs.length}</span>
          </h2>
          {ltrs.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 py-8 text-center text-slate-400 text-sm">
              No LTRs under review. Change LTR status to &quot;Under Review&quot; in LTR Management.
            </div>
          ) : (
            <div className="grid gap-3">
              {ltrs.map(ltr => (
                <div key={ltr.id} className="bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-blue-700 text-sm">{ltr.rfq_number}</span>
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">Under Review</span>
                    </div>
                    <p className="font-semibold text-slate-800">{ltr.project_name}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {ltr.lab_companies?.company_name ?? '—'} · {ltr.contact_name} · {ltr.lab_rfq_items?.length ?? 0} test item(s)
                    </p>
                  </div>
                  <button onClick={() => startQuotation(ltr)}
                    className="px-4 py-2 bg-blue-950 hover:bg-blue-900 text-white rounded-xl text-sm font-bold whitespace-nowrap">
                    💰 Create Quotation
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Existing Quotations */}
        <div>
          <h2 className="text-lg font-bold text-slate-800 mb-3">All Quotations</h2>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-blue-950 text-blue-100">
                  <th className="text-left py-3 px-4 font-semibold">Quot. No.</th>
                  <th className="text-left py-3 px-4 font-semibold">LTR</th>
                  <th className="text-left py-3 px-4 font-semibold">Project</th>
                  <th className="text-left py-3 px-4 font-semibold">Company</th>
                  <th className="text-right py-3 px-4 font-semibold">Amount (MYR)</th>
                  <th className="text-left py-3 px-4 font-semibold">Status</th>
                  <th className="text-left py-3 px-4 font-semibold">Created</th>
                  <th className="text-left py-3 px-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="py-8 text-center text-slate-400">Loading...</td></tr>
                ) : quotations.length === 0 ? (
                  <tr><td colSpan={8} className="py-8 text-center text-slate-400">No quotations yet.</td></tr>
                ) : quotations.map((q, i) => {
                  const style = STATUS_COLORS[q.status] ?? STATUS_COLORS.draft;
                  return (
                    <tr key={q.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="py-2.5 px-4 font-mono font-bold text-purple-700">{q.quotation_number}</td>
                      <td className="py-2.5 px-4 text-blue-600 font-mono text-xs">{(q.lab_rfq as {rfq_number?:string}|undefined)?.rfq_number ?? '—'}</td>
                      <td className="py-2.5 px-4 text-slate-700 max-w-[140px] truncate">{(q.lab_rfq as {project_name?:string}|undefined)?.project_name ?? '—'}</td>
                      <td className="py-2.5 px-4 text-slate-500">{q.lab_companies?.company_name ?? '—'}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-800">RM {q.total_amount.toFixed(2)}</td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold capitalize"
                          style={{ background: style.bg, color: style.text }}>
                          {q.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-500">{new Date(q.created_at).toLocaleDateString('en-MY')}</td>
                      <td className="py-2.5 px-4">
                        <select value={q.status} onChange={e => updateQuotStatus(q.id, e.target.value)}
                          className="border border-slate-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500">
                          {['draft','sent','approved','rejected','expired'].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Quotation Builder Modal */}
      {showForm && selectedLTR && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-4">
            <div className="bg-blue-950 px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold">Create Quotation</h3>
                <p className="text-blue-300 text-xs">{selectedLTR.rfq_number} — {selectedLTR.project_name}</p>
              </div>
              <button onClick={() => { setShowForm(false); setSelectedLTR(null); }}
                className="text-blue-300 hover:text-white text-lg">✕</button>
            </div>
            <div className="p-6">
              {/* Quotation Terms */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Valid Until</label>
                  <input type="date" value={form.valid_until} onChange={e => setForm({ ...form, valid_until: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Terms</label>
                  <select value={form.payment_terms} onChange={e => setForm({ ...form, payment_terms: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {['30 days','45 days','60 days','Upfront','Upon completion'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Discount (%)</label>
                  <input type="number" min="0" max="100" step="0.5" value={form.discount_pct}
                    onChange={e => setForm({ ...form, discount_pct: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tax/SST (%)</label>
                  <input type="number" min="0" max="20" step="0.5" value={form.tax_pct}
                    onChange={e => setForm({ ...form, tax_pct: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* Line Items */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-700 text-sm">Test Items</h4>
                  <button onClick={() => setQuotItems([...quotItems, { rfq_item_id: '', description: '', test_type: 'inhouse', quantity: 1, unit_price: 0, estimated_days: 5 }])}
                    className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100">+ Add Item</button>
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left py-2 px-3 font-semibold text-slate-500">Description</th>
                        <th className="text-left py-2 px-3 font-semibold text-slate-500">Type</th>
                        <th className="text-center py-2 px-3 font-semibold text-slate-500">Qty</th>
                        <th className="text-right py-2 px-3 font-semibold text-slate-500">Unit Price (RM)</th>
                        <th className="text-center py-2 px-3 font-semibold text-slate-500">Days</th>
                        <th className="text-right py-2 px-3 font-semibold text-slate-500">Total (RM)</th>
                        <th className="py-2 px-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {quotItems.map((item, idx) => (
                        <tr key={idx} className="border-b border-slate-100">
                          <td className="py-2 px-3">
                            <input type="text" value={item.description}
                              onChange={e => updateItem(idx, 'description', e.target.value)}
                              className="w-full border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                          </td>
                          <td className="py-2 px-3">
                            <select value={item.test_type} onChange={e => updateItem(idx, 'test_type', e.target.value)}
                              className="border border-slate-200 rounded px-1 py-1 text-xs focus:outline-none">
                              <option value="inhouse">In-House</option>
                              <option value="outsourced">Outsourced</option>
                            </select>
                          </td>
                          <td className="py-2 px-3">
                            <input type="number" min="1" value={item.quantity}
                              onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value))}
                              className="w-16 border border-slate-200 rounded px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500" />
                          </td>
                          <td className="py-2 px-3">
                            <input type="number" step="0.01" value={item.unit_price}
                              onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value))}
                              className="w-24 border border-slate-200 rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500" />
                          </td>
                          <td className="py-2 px-3">
                            <input type="number" min="1" value={item.estimated_days}
                              onChange={e => updateItem(idx, 'estimated_days', parseInt(e.target.value))}
                              className="w-14 border border-slate-200 rounded px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500" />
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-slate-700">
                            {(item.quantity * item.unit_price).toFixed(2)}
                          </td>
                          <td className="py-2 px-3">
                            {quotItems.length > 1 && (
                              <button onClick={() => setQuotItems(quotItems.filter((_, i) => i !== idx))}
                                className="text-red-400 hover:text-red-600 text-xs">✕</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="flex justify-end mb-4">
                <div className="w-64 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold">RM {subtotal.toFixed(2)}</span>
                  </div>
                  {parseFloat(form.discount_pct) > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount ({form.discount_pct}%):</span>
                      <span>- RM {discountAmt.toFixed(2)}</span>
                    </div>
                  )}
                  {parseFloat(form.tax_pct) > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Tax/SST ({form.tax_pct}%):</span>
                      <span>RM {taxAmt.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-blue-950 font-bold text-sm border-t border-slate-200 pt-1.5">
                    <span>TOTAL:</span>
                    <span>RM {total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Notes / Terms</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={2} placeholder="Additional notes or terms..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button onClick={() => handleSaveQuotation(false)} disabled={saving}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-200 disabled:opacity-50">
                  💾 Save Draft
                </button>
                <button onClick={() => handleSaveQuotation(true)} disabled={saving}
                  className="flex-1 py-2.5 bg-blue-950 hover:bg-blue-900 text-white rounded-xl text-sm font-bold disabled:opacity-50">
                  {saving ? 'Saving...' : '📤 Save & Send to Customer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
