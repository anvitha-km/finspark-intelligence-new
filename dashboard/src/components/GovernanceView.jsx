import API_URL from '../config';
import React, { useEffect, useState } from 'react';

export default function GovernanceView() {
  const [tenants, setTenants] = useState([]);
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(null);

  const load = () => {
    Promise.all([
      fetch(`${API_URL}/api/governance/consent`).then(r => r.json()),
      fetch(`${API_URL}/api/governance/audit-log`).then(r => r.json())
    ]).then(([c, a]) => { setTenants(c.tenants); setLogs(a.logs); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const toggle = async (tenantId, field, value) => {
    setSaving(tenantId);
    await fetch(`${API_URL}/api/governance/consent/${tenantId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value ? 1 : 0, changedBy: 'admin' })
    });
    setSaving(null);
    load();
  };

  if (loading) return <div className="loading-state">Loading governance data…</div>;

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">Governance &amp; Compliance</h2>
        <p className="section-desc">Manage telemetry consent and view audit trail per tenant</p>
      </div>

      {/* Consent controls */}
      <div className="card" style={{ marginBottom: 22 }}>
        <div className="card-title">Tenant Consent Settings</div>
        <div className="card-desc">Toggle telemetry collection and anonymous sync per tenant</div>
        <table className="data-table">
          <thead>
            <tr>
              {['Tenant', 'Telemetry', 'Anon Sync', 'Retention', 'Updated By', 'Status'].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tenants.map(t => (
              <tr key={t.tenant_id}>
                <td style={{ fontWeight: 600, fontSize: '14px' }}>{t.tenant_id}</td>
                <td>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={!!t.telemetry_enabled}
                      onChange={e => toggle(t.tenant_id, 'telemetryEnabled', e.target.checked)}
                      disabled={saving === t.tenant_id}
                    />
                    <span className="toggle-track"></span>
                    <span className={`toggle-label ${t.telemetry_enabled ? 'on' : 'off'}`}>
                      {t.telemetry_enabled ? 'On' : 'Off'}
                    </span>
                  </label>
                </td>
                <td>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={!!t.sync_enabled}
                      onChange={e => toggle(t.tenant_id, 'syncEnabled', e.target.checked)}
                      disabled={saving === t.tenant_id}
                    />
                    <span className="toggle-track"></span>
                    <span className={`toggle-label ${t.sync_enabled ? 'on' : 'off'}`}>
                      {t.sync_enabled ? 'On' : 'Off'}
                    </span>
                  </label>
                </td>
                <td>{t.retention_days} days</td>
                <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{t.updated_by}</td>
                <td>
                  <span className={`badge ${saving === t.tenant_id ? 'saving' : t.telemetry_enabled ? 'active' : 'paused'}`}>
                    {saving === t.tenant_id ? 'Saving…' : t.telemetry_enabled ? 'Active' : 'Paused'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Audit log */}
      <div className="card">
        <div className="card-title">Audit Log</div>
        <div className="card-desc">Immutable record of all consent configuration changes</div>
        {logs.length === 0
          ? <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No changes recorded yet. Toggle a consent setting above to generate an entry.</div>
          : logs.map((log, i) => (
            <div key={i} className="audit-entry">
              <div className="audit-dot"></div>
              <div>
                <div className="audit-text">
                  <span className="highlight-user">{log.changed_by}</span> updated{' '}
                  <span className="highlight-tenant">{log.tenant_id}</span> — {log.action}
                </div>
                <div className="audit-time">{new Date(log.timestamp).toLocaleString()}</div>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}