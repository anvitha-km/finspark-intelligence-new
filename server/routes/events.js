import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../db.js';

const router = Router();

/**
 * POST /batch — Ingest a batch of telemetry events.
 * 
 * Consent is checked per tenant BEFORE every insert (server-side enforcement).
 * This is the second layer of consent — the SDK enforces it client-side too.
 * 
 * Validates:
 *   - events array is non-empty
 *   - each event has required fields (tenantId, featureId)
 *   - batch size is within limits
 */
router.post('/batch', (req, res) => {
  const { events } = req.body;

  // ─── Validation ───
  if (!Array.isArray(events) || events.length === 0) {
    return res.status(400).json({ error: 'events must be a non-empty array' });
  }

  if (events.length > 1000) {
    return res.status(413).json({
      error: 'Batch too large',
      maxBatchSize: 1000,
      received: events.length
    });
  }

  const db = getDB();
  const consentCheck = db.prepare(
    'SELECT telemetry_enabled FROM consent_config WHERE tenant_id = ?'
  );
  const insert = db.prepare(`
    INSERT OR IGNORE INTO events
      (event_id, tenant_id, feature_id, channel, user_id,
       session_id, journey_id, outcome, timestamp, meta)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `);

  const insertMany = db.transaction((evts) => {
    let accepted = 0, rejected = 0, invalid = 0;
    const errors = [];

    for (const e of evts) {
      // Validate required fields
      if (!e.tenantId || typeof e.tenantId !== 'string') {
        invalid++;
        errors.push(`Missing or invalid tenantId`);
        continue;
      }
      if (!e.featureId || typeof e.featureId !== 'string') {
        invalid++;
        errors.push(`Missing or invalid featureId for tenant ${e.tenantId}`);
        continue;
      }

      // ─── Consent Check (Server-Side Layer) ───
      const consent = consentCheck.get(e.tenantId);
      if (!consent || !consent.telemetry_enabled) {
        rejected++;
        continue;
      }

      // Insert with defaults for optional fields
      insert.run(
        e.eventId || uuidv4(),
        e.tenantId,
        e.featureId,
        e.channel || 'unknown',
        e.userId || 'u_anonymous',
        e.sessionId || null,
        e.journeyId || null,
        e.outcome || 'invoked',
        e.timestamp || new Date().toISOString(),
        JSON.stringify(e.meta || {})
      );
      accepted++;
    }
    return { accepted, rejected, invalid, errors: errors.slice(0, 5) }; // cap error messages
  });

  try {
    const result = insertMany(events);
    res.json({
      success: true,
      total: events.length,
      ...result
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process events', message: err.message });
  }
});

/**
 * GET /consent/:tenantId — Check if telemetry is enabled for a tenant.
 * Called by the SDK on initialization.
 */
router.get('/consent/:tenantId', (req, res) => {
  const { tenantId } = req.params;

  if (!tenantId || tenantId.length > 100) {
    return res.status(400).json({ error: 'Invalid tenantId' });
  }

  const db = getDB();
  const row = db.prepare(
    'SELECT telemetry_enabled FROM consent_config WHERE tenant_id = ?'
  ).get(tenantId);
  
  res.json({ telemetryEnabled: row ? row.telemetry_enabled === 1 : false });
});

/**
 * GET /stats — Event statistics per tenant (for monitoring).
 */
router.get('/stats', (req, res) => {
  const db = getDB();
  const stats = db.prepare(`
    SELECT
      tenant_id,
      COUNT(*) as total_events,
      COUNT(DISTINCT feature_id) as features_used,
      COUNT(DISTINCT session_id) as unique_sessions,
      MIN(timestamp) as first_event,
      MAX(timestamp) as last_event
    FROM events
    GROUP BY tenant_id
    ORDER BY total_events DESC
  `).all();

  res.json({ tenants: stats });
});

export default router;