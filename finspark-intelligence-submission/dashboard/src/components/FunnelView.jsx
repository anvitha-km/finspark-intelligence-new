import API_URL from '../config';
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const STEP_LABELS = {
  'start': 'App Start', 'kyc': 'KYC Check',
  'document-upload': 'Doc Upload', 'credit-check': 'Credit Check', 'approval': 'Approval'
};

export default function FunnelView({ user }) {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = user?.role === 'tenant'
      ? `${API_URL}/api/analytics/funnel/loan-origination?tenantId=${user.tenant}`
      : `${API_URL}/api/analytics/funnel/loan-origination`;
      
    fetch(url)
      .then(r => r.json())
      .then(d => { setData(d.funnel); setLoading(false); });
  }, [user]);

  if (loading) return <div className="loading-state">Loading funnel data…</div>;

  const top = data[0]?.sessions || 1;
  const chartData = data.map(d => ({
    ...d,
    label: STEP_LABELS[d.label] || d.label,
    dropOff: d.step > 1 ? Math.round((1 - d.sessions / (data[d.step - 2]?.sessions || 1)) * 100) : 0
  }));

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">Journey Funnel — Loan Origination</h2>
        <p className="section-desc">Session drop-off at each step across all tenants</p>
      </div>

      {/* Funnel bars */}
      <div className="card chart-wrapper">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
            <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
            <Tooltip
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8 }}
              labelStyle={{ color: 'var(--text-primary)' }}
              itemStyle={{ color: 'var(--accent-secondary)' }}
            />
            <Bar dataKey="sessions" radius={[6, 6, 0, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={`hsl(${245 + i * 12}, 75%, ${65 - i * 7}%)`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Step cards */}
      <div className="step-grid">
        {chartData.map((step, i) => (
          <div key={i} className="step-card">
            <div className="step-number">Step {step.step}</div>
            <div className="step-label">{step.label}</div>
            <div className="step-value">{step.sessions}</div>
            <div className="step-sessions">sessions</div>
            {step.dropOff > 0 && (
              <div className="step-drop">↓ {step.dropOff}% drop</div>
            )}
            <div className="step-bar-track">
              <div className="step-bar-fill" style={{ width: `${(step.sessions / top) * 100}%` }}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}