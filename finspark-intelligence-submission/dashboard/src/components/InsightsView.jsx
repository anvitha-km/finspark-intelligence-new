import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';

import API_URL from '../config';
const API = API_URL;

export default function InsightsView({ user }) {
  const [licenseData, setLicenseData]   = useState([]);
  const [funnelData,  setFunnelData]    = useState([]);
  const [trendData,   setTrendData]     = useState([]);
  const [regression,  setRegression]    = useState(null);
  const [loading,     setLoading]       = useState(true);
  const [error,       setError]         = useState(null);

  useEffect(() => {
    const tenantParam = user?.role === 'tenant' ? `?tenantId=${user.tenant}` : '';
    const trendParam  = user?.role === 'tenant' ? `&tenantId=${user.tenant}` : '';

    Promise.all([
      fetch(`${API}/api/analytics/license-usage`).then(r => r.json()),
      fetch(`${API}/api/analytics/funnel/loan-origination${tenantParam}`).then(r => r.json()),
      fetch(`${API}/api/analytics/weekly-trend?weeks=8${trendParam}`).then(r => r.json()),
    ])
      .then(([l, f, t]) => {
        setLicenseData(l.features || []);
        setFunnelData(f.funnel   || []);
        setTrendData(t.trend     || []);
        setRegression(t.regression || null);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [user]);

  if (loading) return <div className="loading-state">Generating insights from live data…</div>;
  if (error)   return <div className="loading-state" style={{ color: 'var(--red)' }}>Error: {error}</div>;

  const atRisk  = licenseData.filter(f => f.adoptionRate < 60);
  const healthy = licenseData.filter(f => f.adoptionRate >= 80);
  const funnelTop = funnelData[0]?.sessions || 1;
  const funnelBot = funnelData[funnelData.length - 1]?.sessions || 0;
  const convRate  = Math.round((funnelBot / funnelTop) * 100);

  const biggestDrop = funnelData.reduce((worst, step, i) => {
    if (i === 0) return worst;
    const drop = funnelData[i - 1].sessions - step.sessions;
    return drop > worst.drop ? { drop, label: step.label } : worst;
  }, { drop: 0, label: '' });

  const insights = [
    {
      type: 'danger', icon: '🔴',
      title: 'Churn risk detected',
      description: `${atRisk.length} features have below 60% adoption across licensed tenants. Customers paying for unused features are unlikely to renew.`,
      action: 'Review in License Usage'
    },
    {
      type: 'danger', icon: '💸',
      title: 'Lost Revenue (ROI Impact)',
      description: `Biggest drop in loan origination is at "${biggestDrop.label}" (${biggestDrop.drop} sessions lost). Assuming a $2,500 average loan value and a 4% final approval rate, fixing this UX friction recovers ~$${(biggestDrop.drop * 2500 * 0.04).toLocaleString()} in lost revenue per cycle.`,
      action: 'Prioritise UX improvement'
    },
    {
      type: 'success', icon: '🟢',
      title: 'High-performing features',
      description: `${healthy.length} features maintain 80%+ adoption. These are strong upsell candidates — proven value makes renewal conversations easier.`,
      action: 'Include in renewal pitch'
    },
    {
      type: 'info', icon: '🔵',
      title: 'Funnel conversion rate',
      description: `Overall loan origination conversion is ${convRate}%. Industry benchmark is ~35%. ${convRate < 35 ? 'Below benchmark — immediate attention needed.' : 'Above benchmark — strong performance.'}`,
      action: 'Compare across segments'
    },
    ...(regression ? [{
      type: regression.direction === 'growing' ? 'success' : regression.direction === 'declining' ? 'danger' : 'warning',
      icon: regression.direction === 'growing' ? '📈' : regression.direction === 'declining' ? '📉' : '➡️',
      title: `Usage trend is ${regression.direction}`,
      description: `Linear regression on ${trendData.filter(d => !d.isFuture).length} weeks of real data shows ${regression.weeklyGrowth}. ${regression.direction === 'growing' ? 'Good momentum — right time to expand to new tenants.' : regression.direction === 'declining' ? 'Declining trend — investigate feature abandonment.' : 'Stable usage — platform is mature.'}`,
      action: 'See trend chart above'
    }] : [])
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:8, padding:'8px 14px', fontSize:13 }}>
        <div style={{ color:'var(--text-primary)', fontWeight:600, marginBottom:4 }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color }}>{p.name}: {p.value ?? '—'}</div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">Predictive Adoption Insights</h2>
        <p className="section-desc">
          Computed from live event data using linear regression on real weekly session counts.
          {regression && (
            <span style={{ marginLeft:8, color:'var(--accent-secondary)', fontWeight:600 }}>
              Trend: {regression.weeklyGrowth} · {regression.direction}
            </span>
          )}
        </p>
      </div>

      <div className="stat-grid stat-grid-4">
        <div className="stat-card" data-color="green">
          <div className={`stat-value ${convRate >= 35 ? 'green' : 'red'}`}>{convRate}%</div>
          <div className="stat-label">Conversion Rate</div>
        </div>
        <div className="stat-card" data-color="red">
          <div className="stat-value red">{atRisk.length}</div>
          <div className="stat-label">At-risk Features</div>
        </div>
        <div className="stat-card" data-color="green">
          <div className="stat-value green">{healthy.length}</div>
          <div className="stat-label">Healthy Features</div>
        </div>
        <div className="stat-card" data-color="accent">
          <div className="stat-value accent">{funnelTop}</div>
          <div className="stat-label">Sessions Analysed</div>
        </div>
      </div>

      <div className="card chart-wrapper">
        <div className="card-title">Session Trend — Actual vs Predicted</div>
        <div className="card-desc">
          {regression
            ? `Linear regression on ${trendData.filter(d => !d.isFuture).length} weeks of real DB data · slope: ${regression.slope} sessions/week · dashed line = forecast`
            : 'Need at least 2 weeks of events to compute trend'}
        </div>
        {trendData.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="week" tick={{ fill:'var(--text-muted)', fontSize:11 }} angle={-25} textAnchor="end" height={48} />
              <YAxis tick={{ fill:'var(--text-muted)', fontSize:12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color:'var(--text-muted)', fontSize:12 }} />
              {trendData.find(d => d.isFuture) && (
                <ReferenceLine x={trendData.find(d => d.isFuture).week} stroke="var(--text-muted)" strokeDasharray="4 4"
                  label={{ value:'Forecast →', fill:'var(--text-muted)', fontSize:11 }} />
              )}
              <Line type="monotone" dataKey="actual" name="Actual sessions"
                stroke="var(--accent-secondary)" strokeWidth={2}
                dot={{ fill:'var(--accent-secondary)', r:4 }} connectNulls={false} />
              <Line type="monotone" dataKey="predicted" name="Regression / Forecast"
                stroke="var(--green)" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ padding:'32px', textAlign:'center', color:'var(--text-muted)' }}>
            Seed data or collect real events to see the trend chart
          </div>
        )}
      </div>

      <div className="insight-list">
        {insights.map((ins, i) => (
          <div key={i} className={`insight-card ${ins.type}`}>
            <span className="insight-icon">{ins.icon}</span>
            <div className="insight-body">
              <div className="insight-title">{ins.title}</div>
              <div className="insight-desc">{ins.description}</div>
            </div>
            <div className={`insight-action ${ins.type}`}>{ins.action}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
