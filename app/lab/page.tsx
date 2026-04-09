'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const TEST_CATEGORIES = [
  { code: 'MECH', name: 'Mechanical / Durability', icon: '⚙️', desc: 'Tensile, fatigue, hardness, impact testing' },
  { code: 'ENV', name: 'Environmental', icon: '🌡️', desc: 'Temperature cycling, humidity, corrosion' },
  { code: 'NVH', name: 'Noise, Vibration & Harshness', icon: '🔊', desc: 'Vibration analysis, noise measurement' },
  { code: 'BRAKE', name: 'Brake / Safety Systems', icon: '🛑', desc: 'Brake performance, safety validation' },
  { code: 'MAT', name: 'Material / Chemical', icon: '🧪', desc: 'Chemical analysis, material characterization' },
  { code: 'OTHER', name: 'Other / General', icon: '🔬', desc: 'Custom and specialized testing' },
];

export default function LabPage() {
  const [stats, setStats] = useState({ rfq: 0, projects: 0, tests: 0, reports: 0 });

  useEffect(() => {
    async function fetchStats() {
      const [{ count: rfq }, { count: projects }, { count: tests }, { count: reports }] = await Promise.all([
        supabase.from('lab_rfq').select('*', { count: 'exact', head: true }),
        supabase.from('lab_projects').select('*', { count: 'exact', head: true }),
        supabase.from('lab_test_executions').select('*', { count: 'exact', head: true }),
        supabase.from('lab_reports').select('*', { count: 'exact', head: true }),
      ]);
      setStats({ rfq: rfq ?? 0, projects: projects ?? 0, tests: tests ?? 0, reports: reports ?? 0 });
    }
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-blue-950 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/" className="text-blue-300 hover:text-white text-xs transition-colors">← Home</a>
          <span className="text-blue-700">|</span>
          <div className="flex items-center gap-2">
            <span className="text-xl">🔬</span>
            <div>
              <p className="text-white font-bold text-sm">Laboratory Testing Services</p>
              <p className="text-blue-300 text-xs">ISO/IEC 17025 Aligned</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href="/lab/rfq" className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold transition-colors">📋 Submit RFQ</a>
          <a href="/lab/dashboard" className="px-3 py-1.5 bg-blue-800 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors">📊 Dashboard</a>
          <a href="/lab/admin" className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-xs font-semibold transition-colors">⚙️ Admin</a>
        </div>
      </div>

      {/* Hero */}
      <div className="bg-blue-950 px-8 pb-12 pt-8 text-center border-t border-blue-900">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 border border-blue-400/30 rounded-full text-blue-300 text-xs font-semibold mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block"></span>
          Accredited Testing Laboratory
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">Sapura Technical Centre</h1>
        <p className="text-blue-200 text-sm max-w-2xl mx-auto leading-relaxed">
          Professional automotive component testing services. Submit your RFQ and track your tests from sample receipt to final report — all in one platform.
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'RFQ Received', value: stats.rfq, icon: '📋', color: '#3b82f6' },
            { label: 'Active Projects', value: stats.projects, icon: '🗂️', color: '#16a34a' },
            { label: 'Tests Conducted', value: stats.tests, icon: '🔬', color: '#f97316' },
            { label: 'Reports Issued', value: stats.reports, icon: '📄', color: '#8b5cf6' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Test Categories */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Our Testing Services</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {TEST_CATEGORIES.map(cat => (
              <div key={cat.code} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
                <div className="text-3xl mb-3">{cat.icon}</div>
                <h3 className="font-bold text-slate-800 text-sm mb-1">{cat.name}</h3>
                <p className="text-xs text-slate-500">{cat.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Workflow */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
          <h2 className="text-lg font-bold text-slate-800 mb-4">How It Works</h2>
          <div className="flex items-start gap-2 overflow-x-auto pb-2">
            {[
              { step: '01', label: 'Submit RFQ', icon: '📋' },
              { step: '02', label: 'Technical Review', icon: '🔍' },
              { step: '03', label: 'Quotation', icon: '💰' },
              { step: '04', label: 'Approval', icon: '✅' },
              { step: '05', label: 'Sample Receipt', icon: '📦' },
              { step: '06', label: 'Testing', icon: '🔬' },
              { step: '07', label: 'Validation', icon: '✔️' },
              { step: '08', label: 'Report', icon: '📄' },
            ].map((s, i) => (
              <div key={s.step} className="flex items-center gap-2 shrink-0">
                <div className="text-center">
                  <div className="w-10 h-10 rounded-full bg-blue-950 flex items-center justify-center text-lg mb-1">{s.icon}</div>
                  <p className="text-xs font-bold text-blue-950">{s.step}</p>
                  <p className="text-xs text-slate-500 w-16 text-center">{s.label}</p>
                </div>
                {i < 7 && <div className="w-6 h-0.5 bg-slate-200 mt-[-16px]"></div>}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-blue-950 rounded-xl p-6 text-center">
          <h2 className="text-white font-bold text-lg mb-2">Ready to Submit a Test Request?</h2>
          <p className="text-blue-300 text-sm mb-4">Fill in our RFQ form and our engineers will get back to you within 2 working days.</p>
          <a href="/lab/rfq" className="inline-block px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-sm transition-colors">
            📋 Submit RFQ Now
          </a>
        </div>
      </div>
    </div>
  );
}
