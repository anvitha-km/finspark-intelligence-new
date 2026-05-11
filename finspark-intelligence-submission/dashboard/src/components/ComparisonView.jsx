import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';

import API_URL from '../config';
const API = API_URL;

const TENANT_COLORS = {
  tenant_a: '#6366f1',
  tenant_b: '#06b6d4',
  tenant_c: '#10b981',
  tenant_d: '#f59e0b',
  tenant_e: '#ef4444',
};

export default function ComparisonView() {
  const [data,       setData]       = useState(null);
  const [tenants,    setTenants]    = useState([]);
  const [selected,   setSelected]   = useState([]);
  const [metric,     setMetric]     = useState('invocations'); // invocations | adoption | sessions
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  useEffect(() => {
    fetch(`${API}/api/analytics/tenant-comparison`)
      .then(r => r.json())
      .then(d => {
        setData(d);
        const t = d.tenants || [];
        setTenants(t);
        setSelected(t.slice(0, 4)); // default: show first 4
        setLoading(false);
      })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  if (loading) return <div className="loading-state">Loading tenant comparison…</div>;
  if (error)   return <div className="loading-state" style={{ color: 'var(--red)' }}>Error: {error}</div>;

  const toggleTenant = (t) => {
    setSelected(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    );
  };

  // Build chart data — one row per feature, one bar per selected tenant
  const chartData = (data.features || []).map(f => {
    const row = { feature: f.featureName.replace(' ', '\n') };
    selected.forEach(t => {
      const td = f.byTenant.find(x => x.tenantId === t);
      row[t] = metric === 'invocations' ? (td?.invocations || 0)
             : metric === 'adoption'    ? (td?.adoptionRate || 0)
             :                           (td?.sessions || 0);
    });
    return row;
  });

  // Summary comparison table
  const summaryData = (data.tenantSummary || []).filter(s => selected.includes(s.tenantId));

  const metricLabel = metric === 'invocations' ? 'Invocations'
                    : metric === 'adoption'    ? 'Adoption Rate (%)'
                    :                           'Unique Sessions';

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
        <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 6 }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.fill, marginBottom: 2 }}>
            {p.dataKey}: {p.value}{metric === 'adoption' ? '%' : ''}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">Tenant Segmentation Comparison</h2>
        <p className="section-desc">
          Side-by-side feature usage across tenants — identify adoption gaps and upsell opportunities
        </p>
      </div>

      {/* Summary stat cards per tenant */}
      <div className="stat-grid" style={{ gridTemplateColumns: `repeat(${summaryData.length}, 1fr)` }}>
        {summaryData.map(s => (
          <div key={s.tenantId} className="stat-card" style={{ borderTop: `3px solid ${TENANT_COLORS[s.tenantId] || '#6366f1'}` }}>
            <div className="stat-value" style={{ color: TENANT_COLORS[s.tenantId] || '#6366f1' }}>
              {s.overallAdoption}%
            </div>
            <div className="stat-label">{s.tenantId}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              {s.totalInvocations.toLocaleString()} events · {s.activeFeatures} features
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>

          {/* Tenant toggles */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 4 }}>Tenants:</span>
            {tenants.map(t => (
              <button key={t} onClick={() => toggleTenant(t)}
                style={{
                  padding: '4px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                  border: `1px solid ${TENANT_COLORS[t] || '#6366f1'}`,
                  background: selected.includes(t) ? (TENANT_COLORS[t] || '#6366f1') : 'transparent',
                  color: selected.includes(t) ? '#fff' : (TENANT_COLORS[t] || '#6366f1'),
                  transition: 'all 0.2s'
                }}>
                {t}
              </button>
            ))}
          </div>

          {/* Metric selector */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 'auto' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Metric:</span>
            {['invocations', 'adoption', 'sessions'].map(m => (
              <button key={m} onClick={() => setMetric(m)}
                style={{
                  padding: '4px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                  border: '1px solid var(--border-color)',
                  background: metric === m ? 'var(--accent)' : 'transparent',
                  color: metric === m ? '#fff' : 'var(--text-muted)',
                  transition: 'all 0.2s', textTransform: 'capitalize'
                }}>
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bar chart */}
      <div className="card chart-wrapper">
        <div className="card-title">Feature Usage by Tenant — {metricLabel}</div>
        <div className="card-desc">Each group = one feature. Each bar = one tenant. Toggle tenants and metrics above.</div>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
            <XAxis dataKey="feature" tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
              angle={-35} textAnchor="end" interval={0} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
              tickFormatter={v => metric === 'adoption' ? `${v}%` : v} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ color: 'var(--text-muted)', fontSize: 12, paddingTop: 8 }} />
            {selected.map(t => (
              <Bar key={t} dataKey={t} fill={TENANT_COLORS[t] || '#6366f1'} radius={[3, 3, 0, 0]} maxBarSize={28} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed comparison table */}
      <div className="card">
        <div className="card-title">Feature-level Breakdown</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Feature</th>
              <th>Module</th>
              {selected.map(t => (
                <th key={t} style={{ textAlign: 'center', color: TENANT_COLORS[t] || '#6366f1' }}>{t}</th>
              ))}
              <th style={{ textAlign: 'center' }}>Gap</th>
            </tr>
          </thead>
          <tbody>
            {(data.features || []).map(f => {
              const vals = selected.map(t => {
                const td = f.byTenant.find(x => x.tenantId === t);
                return td?.adoptionRate || 0;
              });
              const gap = vals.length > 1 ? Math.round((Math.max(...vals) - Math.min(...vals)) * 10) / 10 : 0;
              return (
                <tr key={f.featureId}>
                  <td style={{ fontWeight: 500 }}>{f.featureName}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{f.module}</td>
                  {selected.map(t => {
                    const td = f.byTenant.find(x => x.tenantId === t);
                    const rate = td?.adoptionRate || 0;
                    return (
                      <td key={t} style={{ textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block', padding: '2px 10px', borderRadius: 12,
                          fontSize: 12, fontWeight: 600,
                          background: rate >= 80 ? 'rgba(16,185,129,0.15)' : rate >= 50 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                          color: rate >= 80 ? 'var(--green)' : rate >= 50 ? 'var(--amber)' : 'var(--red)'
                        }}>
                          {rate}%
                        </span>
                      </td>
                    );
                  })}
                  <td style={{ textAlign: 'center' }}>
                    <span style={{
                      fontSize: 12, fontWeight: 600,
                      color: gap > 40 ? 'var(--red)' : gap > 20 ? 'var(--amber)' : 'var(--green)'
                    }}>
                      {gap > 0 ? `${gap}pp` : '—'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '12px 0 4px' }}>
          Gap = difference in adoption rate between highest and lowest tenant. Large gap = upsell or training opportunity.
        </div>
      </div>
    </div>
  );
}
