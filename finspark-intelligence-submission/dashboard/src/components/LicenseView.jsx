import API_URL from '../config';
import React, { useEffect, useState } from 'react';

export default function LicenseView() {
  const [features, setFeatures] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/analytics/license-usage`)
      .then(r => r.json())
      .then(d => { setFeatures(d.features); setLoading(false); });
  }, []);

  if (loading) return <div className="loading-state">Loading license data…</div>;

  const atRisk = features.filter(f => f.adoptionRate < 50);

  const getColor = (rate) => {
    if (rate >= 75) return 'green';
    if (rate >= 50) return 'yellow';
    return 'red';
  };

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">License vs Usage</h2>
        <p className="section-desc">Which licensed features are actually being used?</p>
      </div>

      {/* Risk alert */}
      {atRisk.length > 0 && (
        <div className="alert-banner danger">
          <span className="alert-icon">⚠️</span>
          <div>
            <div className="alert-title danger">{atRisk.length} features have under 50% adoption</div>
            <div className="alert-desc">Renewal risk — {atRisk.map(f => f.featureName).join(', ')}</div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              {['Feature', 'Module', 'Licensed', 'Active', 'Adoption', 'Invocations', 'Unused Tenants'].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {features.map((f, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 500 }}>{f.featureName}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{f.module}</td>
                <td style={{ textAlign: 'center' }}>{f.licensedCount}</td>
                <td style={{ textAlign: 'center', color: 'var(--green)', fontWeight: 600 }}>{f.activeCount}</td>
                <td style={{ minWidth: 140 }}>
                  <div className="progress-bar">
                    <div className="progress-track">
                      <div className={`progress-fill ${getColor(f.adoptionRate)}`} style={{ width: `${f.adoptionRate}%` }}></div>
                    </div>
                    <span className={`progress-value`} style={{ color: `var(--${getColor(f.adoptionRate)})` }}>{f.adoptionRate}%</span>
                  </div>
                </td>
                <td style={{ textAlign: 'center', color: 'var(--accent-secondary)', fontWeight: 600 }}>{f.totalInvocations}</td>
                <td style={{ fontSize: '12px', color: 'var(--red)' }}>
                  {f.unusedTenants.join(', ') || <span style={{ color: 'var(--green)' }}>All active</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}