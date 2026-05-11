import API_URL from '../config';
import React, { useEffect, useState } from 'react';

function getCellClass(count) {
  if (count === 0) return 'level-0';
  if (count < 20)  return 'level-1';
  if (count < 50)  return 'level-2';
  if (count < 100) return 'level-3';
  return 'level-4';
}

export default function HeatmapView({ user }) {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);

  const TENANTS = user?.role === 'tenant' 
    ? [user.tenant] 
    : ['tenant_a', 'tenant_b', 'tenant_c', 'tenant_d', 'tenant_e'];

  useEffect(() => {
    const url = user?.role === 'tenant' 
      ? `${API_URL}/api/analytics/heatmap?tenantId=${user.tenant}`
      : `${API_URL}/api/analytics/heatmap`;
      
    fetch(url)
      .then(r => r.json())
      .then(d => { setData(d.heatmap); setLoading(false); });
  }, [user]);

  // Build feature list and lookup map
  const features = [...new Set(data.map(d => d.feature_id))];
  const lookup = {};
  data.forEach(d => { lookup[d.feature_id + '|' + d.tenant_id] = d; });

  const getFeatureName = (fid) => {
    const row = data.find(d => d.feature_id === fid);
    return row ? row.feature_name : fid;
  };
  const getModule = (fid) => {
    const row = data.find(d => d.feature_id === fid);
    return row ? row.module : '';
  };

  if (loading) return <div className="loading-state">Loading heatmap data…</div>;

  // Stats
  const totalEvents    = data.reduce((s, d) => s + d.count, 0);
  const unusedCount    = data.filter(d => d.count === 0).length;
  const activeFeatures = [...new Set(data.filter(d => d.count > 0).map(d => d.feature_id))].length;

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">Feature Adoption Heatmap</h2>
        <p className="section-desc">Feature invocations across all tenants — last 30 days</p>
      </div>

      {/* Stat cards */}
      <div className="stat-grid stat-grid-3">
        <div className="stat-card" data-color="accent">
          <div className="stat-value accent">{totalEvents.toLocaleString()}</div>
          <div className="stat-label">Total Events</div>
        </div>
        <div className="stat-card" data-color="green">
          <div className="stat-value green">{activeFeatures}</div>
          <div className="stat-label">Active Features</div>
        </div>
        <div className="stat-card" data-color="red">
          <div className="stat-value red">{unusedCount}</div>
          <div className="stat-label">Unused (Licensed)</div>
        </div>
      </div>

      {/* Heatmap grid */}
      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Feature</th>
              <th>Module</th>
              {TENANTS.map(t => (
                <th key={t} style={{ textAlign: 'center' }}>{t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {features.map(fid => (
              <tr key={fid}>
                <td style={{ fontWeight: 500 }}>{getFeatureName(fid)}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{getModule(fid)}</td>
                {TENANTS.map(t => {
                  const cell = lookup[fid + '|' + t];
                  const count = cell ? cell.count : 0;
                  return (
                    <td key={t} style={{ textAlign: 'center' }}>
                      <span className={`heatmap-cell ${getCellClass(count)}`}>
                        {count === 0 ? '—' : count}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Legend */}
        <div className="legend">
          <span className="legend-label">Usage:</span>
          {[
            ['rgba(42,49,80,0.4)', '0'],
            ['#2a3570', '1–19'],
            ['#3730a3', '20–49'],
            ['#4f46e5', '50–99'],
            ['#6366f1', '100+']
          ].map(([c, l]) => (
            <div key={l} className="legend-item">
              <div className="legend-swatch" style={{ background: c }}></div>
              <span className="legend-text">{l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}