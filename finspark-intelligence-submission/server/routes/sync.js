/**
 * Sync Routes — Receives and persists anonymized aggregate payloads
 * from on-prem federated aggregators.
 * 
 * Data is stored in SQLite (sync_aggregates table) so it survives
 * server restarts. In production, this would be Redis or ClickHouse.
 */
import { Router } from 'express';
import { getDB } from '../db.js';

const router = Router();

/**
 * POST /aggregate — Receive an anonymized aggregate payload from an on-prem agent.
 * 
 * Validates the payload structure before persisting.
 */
router.post('/aggregate', (req, res) => {
  const payload = req.body;

  // ─── Validation ───
  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ error: 'Invalid payload' });
  }
  if (!payload.tenantHash) {
    return res.status(400).json({ error: 'Missing tenantHash — required for aggregate identification' });
  }

  const db = getDB();
  const receivedAt = new Date().toISOString();
  const featureCount = payload.featureSummary?.length || 0;
  const totalEvents = payload.featureSummary?.reduce((s, f) => s + (f.totalInvocations || 0), 0) || 0;

  try {
    db.prepare(`
      INSERT INTO sync_aggregates (tenant_hash, deployment, payload, received_at, feature_count, total_events)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      payload.tenantHash,
      payload.deploymentType || 'on-prem',
      JSON.stringify(payload),
      receivedAt,
      featureCount,
      totalEvents
    );

    console.log(`📥 Received on-prem aggregate: tenant=${payload.tenantHash}, features=${featureCount}, events=${totalEvents}`);

    res.json({
      success: true,
      message: 'Aggregate received and persisted',
      summary: { tenantHash: payload.tenantHash, featureCount, totalEvents, receivedAt }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to persist aggregate', message: err.message });
  }
});

/**
 * GET /aggregates — List all received on-prem aggregate payloads.
 * 
 * Supports optional filters:
 *   ?tenantHash=xxx — filter by tenant
 *   ?limit=N        — limit results (default: 50)
 */
router.get('/aggregates', (req, res) => {
  const db = getDB();
  const { tenantHash, limit = 50 } = req.query;

  let query = 'SELECT * FROM sync_aggregates';
  const params = [];

  if (tenantHash) {
    query += ' WHERE tenant_hash = ?';
    params.push(tenantHash);
  }

  query += ' ORDER BY received_at DESC LIMIT ?';
  params.push(Math.min(parseInt(limit) || 50, 200));

  try {
    const rows = db.prepare(query).all(...params);

    // Parse the stored JSON payloads
    const aggregates = rows.map(row => ({
      id: row.id,
      tenantHash: row.tenant_hash,
      deployment: row.deployment,
      featureCount: row.feature_count,
      totalEvents: row.total_events,
      receivedAt: row.received_at,
      payload: JSON.parse(row.payload)
    }));

    res.json({
      aggregates,
      total: aggregates.length,
      hint: tenantHash ? `Filtered by tenant: ${tenantHash}` : 'All tenants'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve aggregates', message: err.message });
  }
});

/**
 * GET /aggregates/summary — High-level summary of all on-prem sync activity.
 */
router.get('/aggregates/summary', (req, res) => {
  const db = getDB();

  try {
    const summary = db.prepare(`
      SELECT
        tenant_hash,
        COUNT(*) as sync_count,
        SUM(total_events) as total_events_synced,
        MAX(received_at) as last_sync,
        MIN(received_at) as first_sync
      FROM sync_aggregates
      GROUP BY tenant_hash
      ORDER BY last_sync DESC
    `).all();

    const totalSyncs = db.prepare('SELECT COUNT(*) as count FROM sync_aggregates').get().count;

    res.json({
      totalSyncs,
      tenants: summary
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate summary', message: err.message });
  }
});

export default router;