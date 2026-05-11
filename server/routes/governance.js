import { Router } from 'express';
import { getDB } from '../db.js';

const router = Router();

/**
 * GET /consent — List all tenant consent configurations.
 */
router.get('/consent', (req, res) => {
  try {
    const db = getDB();
    const tenants = db.prepare('SELECT * FROM consent_config ORDER BY tenant_id').all();

    // Enrich with event counts
    const enriched = tenants.map(t => {
      const eventCount = db.prepare(
        'SELECT COUNT(*) as count FROM events WHERE tenant_id = ?'
      ).get(t.tenant_id).count;

      return { ...t, totalEvents: eventCount };
    });

    res.json({ tenants: enriched });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch consent config', message: err.message });
  }
});

/**
 * PATCH /consent/:tenantId — Update consent settings for a tenant.
 * 
 * Writes an immutable audit log entry with full before/after state.
 * This is the governance backbone — every change is permanently recorded.
 */
router.patch('/consent/:tenantId', (req, res) => {
  try {
    const db = getDB();
    const { tenantId } = req.params;
    const { telemetryEnabled, syncEnabled, retentionDays, changedBy } = req.body;

    // Validate tenantId
    if (!tenantId || tenantId.length > 100) {
      return res.status(400).json({ error: 'Invalid tenantId' });
    }

    const current = db.prepare(
      'SELECT * FROM consent_config WHERE tenant_id = ?'
    ).get(tenantId);

    if (!current) {
      return res.status(404).json({
        error: 'Tenant not found',
        available: db.prepare('SELECT tenant_id FROM consent_config').all().map(t => t.tenant_id)
      });
    }

    // Validate retention_days if provided
    if (retentionDays !== undefined && (retentionDays < 1 || retentionDays > 3650)) {
      return res.status(400).json({ error: 'retentionDays must be between 1 and 3650' });
    }

    const newValues = {
      telemetry_enabled: telemetryEnabled ?? current.telemetry_enabled,
      sync_enabled: syncEnabled ?? current.sync_enabled,
      retention_days: retentionDays ?? current.retention_days
    };

    // Apply update
    db.prepare(`
      UPDATE consent_config SET
        telemetry_enabled = ?, sync_enabled = ?,
        retention_days = ?, updated_at = datetime('now'), updated_by = ?
      WHERE tenant_id = ?
    `).run(
      newValues.telemetry_enabled,
      newValues.sync_enabled,
      newValues.retention_days,
      changedBy || 'admin',
      tenantId
    );

    // Write immutable audit log entry
    db.prepare(`
      INSERT INTO audit_log (tenant_id, action, changed_by, before, after, timestamp)
      VALUES (?, 'consent_update', ?, ?, ?, datetime('now'))
    `).run(
      tenantId,
      changedBy || 'admin',
      JSON.stringify(current),
      JSON.stringify(newValues)
    );

    // Fetch the updated row to return
    const updated = db.prepare('SELECT * FROM consent_config WHERE tenant_id = ?').get(tenantId);

    res.json({
      success: true,
      previous: current,
      current: updated
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update consent', message: err.message });
  }
});

/**
 * GET /audit-log — Immutable audit trail of all consent changes.
 * 
 * Query params:
 *   ?tenantId=xxx — filter by tenant
 *   ?limit=100    — max results (default: 100)
 */
router.get('/audit-log', (req, res) => {
  try {
    const db = getDB();
    const { tenantId, limit = 100 } = req.query;

    let query = 'SELECT * FROM audit_log';
    const params = [];

    if (tenantId) {
      query += ' WHERE tenant_id = ?';
      params.push(tenantId);
    }

    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(Math.min(parseInt(limit) || 100, 500));

    const logs = db.prepare(query).all(...params);

    res.json({
      logs,
      total: logs.length,
      filter: tenantId || 'all'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit log', message: err.message });
  }
});

export default router;