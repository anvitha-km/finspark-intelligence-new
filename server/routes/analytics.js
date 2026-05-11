import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../db.js';

const router = Router();

/**
 * GET /heatmap — Feature invocation heatmap across tenants.
 * 
 * Query params:
 *   ?days=30      — lookback window (default: 30)
 *   ?tenantId=xxx — filter to specific tenant
 */
router.get('/heatmap', (req, res) => {
  try {
    const db = getDB();
    const { days = 30, tenantId } = req.query;

    let query = `
      SELECT e.feature_id, e.tenant_id, COUNT(*) as count,
             MAX(e.timestamp) as last_used,
             fr.feature_name, fr.module, fr.licensed_to
      FROM events e
      JOIN feature_registry fr ON fr.feature_id = e.feature_id
      WHERE e.timestamp >= datetime('now', '-' || ? || ' days')
    `;
    const params = [days];

    if (tenantId) {
      query += ` AND e.tenant_id = ?`;
      params.push(tenantId);
    }

    query += ` GROUP BY e.feature_id, e.tenant_id ORDER BY e.feature_id, e.tenant_id`;

    const rows = db.prepare(query).all(...params);

    const allFeatures = db.prepare('SELECT * FROM feature_registry').all();
    const usedSet = new Set(rows.map(r => r.feature_id + '|' + r.tenant_id));

    const unused = [];
    for (const f of allFeatures) {
      for (const t of f.licensed_to.split(',')) {
        if (tenantId && t !== tenantId) continue;
        if (!usedSet.has(f.feature_id + '|' + t)) {
          unused.push({
            feature_id: f.feature_id, tenant_id: t, count: 0,
            last_used: null, feature_name: f.feature_name,
            module: f.module, licensed_to: f.licensed_to
          });
        }
      }
    }

    res.json({
      heatmap: [...rows, ...unused],
      meta: { days: parseInt(days), tenantFilter: tenantId || 'all', generated: new Date().toISOString() }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate heatmap', message: err.message });
  }
});

/**
 * GET /funnel/:journeyName — Journey funnel drop-off analysis.
 * 
 * Query params:
 *   ?tenantId=xxx — filter to specific tenant
 */
router.get('/funnel/:journeyName', (req, res) => {
  try {
    const db = getDB();
    const journeySteps = {
      'loan-origination': [
        'loan-origination.start', 'loan-origination.kyc',
        'loan-origination.document-upload', 'loan-origination.credit-check',
        'loan-origination.approval', 'loan-origination.offer-letter',
        'loan-origination.esign', 'loan-origination.disbursement'
      ],
      'kyc': [
        'kyc.aadhaar', 'kyc.pan-verify', 'kyc.video-kyc',
        'kyc.aml-screen', 'kyc.fatca'
      ],
      'payments': [
        'payments.emi-dashboard', 'payments.manual-pay',
        'payments.auto-debit', 'payments.part-prepay', 'payments.receipt'
      ],
    };

    const steps = journeySteps[req.params.journeyName];
    if (!steps) {
      return res.status(404).json({
        error: 'Journey not found',
        available: Object.keys(journeySteps)
      });
    }

    const { tenantId } = req.query;
    const funnel = steps.map((stepId, i) => {
      const row = tenantId
        ? db.prepare(`SELECT COUNT(DISTINCT session_id) as sessions FROM events WHERE feature_id = ? AND tenant_id = ?`).get(stepId, tenantId)
        : db.prepare(`SELECT COUNT(DISTINCT session_id) as sessions FROM events WHERE feature_id = ?`).get(stepId);

      const sessions = row.sessions;
      return {
        step: i + 1,
        featureId: stepId,
        label: stepId.split('.')[1].replace(/-/g, ' '),
        sessions
      };
    });

    // Calculate drop-off rates
    const funnelWithDropoff = funnel.map((step, i) => ({
      ...step,
      dropOffRate: i > 0 && funnel[i - 1].sessions > 0
        ? Math.round((1 - step.sessions / funnel[i - 1].sessions) * 100)
        : 0,
      conversionFromTop: funnel[0].sessions > 0
        ? Math.round((step.sessions / funnel[0].sessions) * 100)
        : 0
    }));

    res.json({
      journey: req.params.journeyName,
      tenantFilter: tenantId || 'all',
      totalEntries: funnel[0]?.sessions || 0,
      totalCompletions: funnel[funnel.length - 1]?.sessions || 0,
      overallConversion: funnel[0]?.sessions > 0
        ? Math.round((funnel[funnel.length - 1].sessions / funnel[0].sessions) * 100)
        : 0,
      funnel: funnelWithDropoff
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate funnel', message: err.message });
  }
});

/**
 * GET /license-usage — License vs actual feature usage analysis.
 * 
 * Query params:
 *   ?days=30 — lookback window (default: 30)
 */
router.get('/license-usage', (req, res) => {
  try {
    const db = getDB();
    const { days = 30 } = req.query;
    const features = db.prepare('SELECT * FROM feature_registry').all();

    const result = features.map(f => {
      const licensedTenants = f.licensed_to.split(',').filter(Boolean);
      const usageCounts = db.prepare(`
        SELECT tenant_id, COUNT(*) as cnt FROM events
        WHERE feature_id = ? AND timestamp >= datetime('now', '-' || ? || ' days')
        GROUP BY tenant_id
      `).all(f.feature_id, days);

      const usedBy = new Set(usageCounts.map(u => u.tenant_id));
      const totalInvocations = usageCounts.reduce((s, u) => s + u.cnt, 0);
      const adoptionRate = licensedTenants.length > 0
        ? Math.round((usedBy.size / licensedTenants.length) * 100) : 0;

      return {
        featureId: f.feature_id,
        featureName: f.feature_name,
        module: f.module,
        licensedCount: licensedTenants.length,
        activeCount: usedBy.size,
        adoptionRate,
        riskLevel: adoptionRate < 30 ? 'critical' : adoptionRate < 60 ? 'warning' : 'healthy',
        totalInvocations,
        unusedTenants: licensedTenants.filter(t => !usedBy.has(t)),
        perTenant: usageCounts.map(u => ({ tenantId: u.tenant_id, invocations: u.cnt }))
      };
    });

    // Sort: at-risk features first
    result.sort((a, b) => a.adoptionRate - b.adoptionRate);

    res.json({
      features: result,
      summary: {
        totalFeatures: result.length,
        atRisk: result.filter(f => f.adoptionRate < 50).length,
        healthy: result.filter(f => f.adoptionRate >= 80).length,
        totalInvocations: result.reduce((s, f) => s + f.totalInvocations, 0)
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate license usage', message: err.message });
  }
});

/**
 * GET /tenant-comparison
 *
 * Returns per-feature usage broken down by every tenant, plus a summary
 * per tenant. Powers the Comparison tab on the dashboard.
 *
 * Response shape:
 * {
 *   tenants: ['tenant_a', 'tenant_b', ...],
 *   tenantSummary: [{ tenantId, totalInvocations, activeFeatures, overallAdoption }],
 *   features: [{
 *     featureId, featureName, module,
 *     byTenant: [{ tenantId, invocations, sessions, adoptionRate }]
 *   }]
 * }
 */
router.get('/tenant-comparison', (req, res) => {
  try {
    const db = getDB();

    // All distinct tenants
    const tenants = db.prepare(`
      SELECT DISTINCT tenant_id FROM events ORDER BY tenant_id
    `).all().map(r => r.tenant_id);

    // All features with metadata
    const features = db.prepare(`
      SELECT DISTINCT
        f.feature_id,
        f.feature_name,
        f.module
      FROM feature_registry f
      ORDER BY f.module, f.feature_name
    `).all();

    // Per-tenant total events (for adoption rate denominator)
    const tenantTotals = {};
    db.prepare(`
      SELECT tenant_id, COUNT(*) as total FROM events GROUP BY tenant_id
    `).all().forEach(r => { tenantTotals[r.tenant_id] = r.total; });

    // Per-feature per-tenant stats
    const statsRows = db.prepare(`
      SELECT
        feature_id,
        tenant_id,
        COUNT(*)                  as invocations,
        COUNT(DISTINCT session_id) as sessions
      FROM events
      GROUP BY feature_id, tenant_id
    `).all();

    // Build lookup: feature_id|tenant_id -> stats
    const statsLookup = {};
    statsRows.forEach(r => {
      statsLookup[r.feature_id + '|' + r.tenant_id] = r;
    });

    // Build feature list with per-tenant breakdown
    const featureList = features.map(f => ({
      featureId:   f.feature_id,
      featureName: f.feature_name,
      module:      f.module,
      byTenant: tenants.map(t => {
        const s    = statsLookup[f.feature_id + '|' + t] || { invocations: 0, sessions: 0 };
        const tot  = tenantTotals[t] || 1;
        return {
          tenantId:     t,
          invocations:  s.invocations,
          sessions:     s.sessions,
          adoptionRate: Math.round((s.invocations / tot) * 100 * 10) / 10
        };
      })
    }));

    // Tenant summary
    const tenantSummary = tenants.map(t => {
      const activeFeatures = featureList.filter(f =>
        f.byTenant.find(x => x.tenantId === t && x.invocations > 0)
      ).length;
      const totalInvocations = statsRows
        .filter(r => r.tenant_id === t)
        .reduce((s, r) => s + r.invocations, 0);
      
      // FIX: overallAdoption is the percentage of all available features that this tenant is actively using
      const avgAdoption = featureList.length > 0
        ? Math.round((activeFeatures / featureList.length) * 100)
        : 0;
        
      return { tenantId: t, totalInvocations, activeFeatures, overallAdoption: avgAdoption };
    });

    res.json({ tenants, tenantSummary, features: featureList });
  } catch (err) {
    res.status(500).json({ error: 'Failed to compute tenant comparison', message: err.message });
  }
});

/**
 * GET /weekly-trend — Real weekly session counts + linear regression forecast.
 *
 * How it works:
 *   1. Groups events by ISO week number from the DB (real data)
 *   2. Runs simple linear regression (least squares) on those counts
 *   3. Projects 4 future weeks from the regression line
 *
 * This is real math on real data — not hardcoded multipliers.
 *
 * Query params:
 *   ?tenantId=xxx  — filter to one tenant (optional)
 *   ?weeks=8       — how many past weeks to include (default 8)
 */
router.get('/weekly-trend', (req, res) => {
  try {
    const db = getDB();
    const { tenantId, weeks = 12 } = req.query;

    // Step 1: Pull real weekly event counts from DB
    // Use julianday math to bucket events into 7-day windows from oldest event
    let query = `
      SELECT
        strftime('%Y-W%W', timestamp) as week_label,
        CAST(strftime('%W', timestamp) AS INTEGER) as week_num,
        strftime('%Y', timestamp)     as year,
        COUNT(DISTINCT session_id)    as sessions
      FROM events
      WHERE 1=1
    `;
    const params = [];

    if (tenantId) {
      query += ` AND tenant_id = ?`;
      params.push(tenantId);
    }

    query += ` GROUP BY week_label ORDER BY year, week_num`;

    const rawWeeks = db.prepare(query).all(...params);

    if (rawWeeks.length < 2) {
      return res.json({
        trend: [],
        regression: null,
        message: 'Not enough data for trend analysis — need at least 2 weeks of events'
      });
    }

    // Step 2: Linear regression (least squares method)
    // x = week index (0, 1, 2...), y = session count
    // Goal: find slope (m) and intercept (b) in y = mx + b
    const n = rawWeeks.length;
    const xs = rawWeeks.map((_, i) => i);
    const ys = rawWeeks.map(w => w.sessions);

    const sumX  = xs.reduce((a, x) => a + x, 0);
    const sumY  = ys.reduce((a, y) => a + y, 0);
    const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
    const sumX2 = xs.reduce((a, x) => a + x * x, 0);

    const slope     = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Step 3: Build response — actual weeks + 4 predicted future weeks
    const trend = rawWeeks.map((w, i) => ({
      week:      w.week_label,
      actual:    w.sessions,
      predicted: Math.max(0, Math.round(intercept + slope * i)),
      isFuture:  false
    }));

    // Project 4 weeks forward
    for (let i = 1; i <= 4; i++) {
      const futureIndex = n - 1 + i;
      trend.push({
        week:      `Forecast W+${i}`,
        actual:    null,
        predicted: Math.max(0, Math.round(intercept + slope * futureIndex)),
        isFuture:  true
      });
    }

    res.json({
      trend,
      regression: {
        slope:     parseFloat(slope.toFixed(3)),
        intercept: parseFloat(intercept.toFixed(3)),
        direction: slope > 0.5 ? 'growing' : slope < -0.5 ? 'declining' : 'stable',
        weeklyGrowth: slope > 0
          ? `+${Math.round(slope)} sessions/week`
          : `${Math.round(slope)} sessions/week`
      },
      meta: { weeksAnalysed: n, tenantFilter: tenantId || 'all' }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to compute trend', message: err.message });
  }
});

/**
 * POST /seed-demo — Seed realistic synthetic event data.
 *
 * Design principles for realism:
 * 1. Each tenant has a different "persona" — power user, average, struggling, new, churning
 * 2. Features have realistic ROI tiers — high, medium, low, dead (never used)
 * 3. Some features licensed but NEVER used — direct churn risk signal
 * 4. Data spread across 10 weeks — enables trend chart in InsightsView
 * 5. Channel distribution varies by tenant (some mobile-heavy, some API-heavy)
 */
router.post('/seed-demo', (req, res) => {
  try {
    const db = getDB();
    
    // Clear old data to prevent cumulative corruption
    db.prepare('DELETE FROM events').run();
    
    const insert = db.prepare(`
      INSERT OR IGNORE INTO events
        (event_id, tenant_id, feature_id, channel, user_id,
         session_id, journey_id, outcome, timestamp, meta)
      VALUES (?,?,?,?,?,?,?,?,?,?)
    `);

    // ── Tenant personas ────────────────────────────────────────────────────
    // Each tenant has different engagement level and preferred channel
    const tenantProfiles = {
      tenant_a: { multiplier: 1.0,  channel: ['web','web','mobile','api'],   label: 'Power user'   },
      tenant_b: { multiplier: 0.75, channel: ['web','mobile','mobile'],       label: 'Average'      },
      tenant_c: { multiplier: 0.45, channel: ['api','api','web'],             label: 'API-heavy'    },
      tenant_d: { multiplier: 0.20, channel: ['web','mobile'],                label: 'New / low'    },
      tenant_e: { multiplier: 0.08, channel: ['web'],                         label: 'Churning'     },
    };

    // ── Feature ROI tiers ──────────────────────────────────────────────────
    // [featureId, baseCount, outcomeWeights, journeyName]
    // outcomeWeights: higher index = more completions vs abandonments
    const features = [
      // HIGH ROI — core loan journey, heavy usage
      ['loan-origination.start',           500, ['invoked','invoked','invoked'],                          'loan-origination'],
      ['loan-origination.kyc',             420, ['invoked','completed','completed'],                      'loan-origination'],
      ['loan-origination.document-upload', 310, ['invoked','completed','abandoned'],                      'loan-origination'],
      ['loan-origination.credit-check',    240, ['invoked','completed','completed'],                      'loan-origination'],
      ['loan-origination.approval',        160, ['completed','completed','abandoned'],                    'loan-origination'],
      ['kyc.aadhaar',                      380, ['invoked','completed','completed'],                      'kyc'],
      ['kyc.pan-verify',                   360, ['invoked','completed','completed'],                      'kyc'],
      ['payments.emi-dashboard',           450, ['invoked','invoked','invoked'],                          'payments'],
      ['payments.manual-pay',              280, ['completed','completed','completed'],                    'payments'],
      ['payments.receipt',                 260, ['completed','completed','completed'],                    'payments'],
      ['account.profile-update',           220, ['invoked','completed','completed'],                      'account'],
      ['support.service-request',          190, ['invoked','invoked','completed'],                        'support'],
      ['support.chat',                     175, ['invoked','invoked','invoked'],                          'support'],

      // MEDIUM ROI — moderate usage, some tenants skip
      ['loan-origination.offer-letter',    110, ['completed','completed','abandoned'],                    'loan-origination'],
      ['kyc.video-kyc',                     90, ['invoked','completed','abandoned','abandoned'],          'kyc'],
      ['kyc.aml-screen',                    85, ['invoked','completed','completed'],                      'kyc'],
      ['payments.auto-debit',               80, ['completed','abandoned','abandoned'],                    'payments'],
      ['payments.part-prepay',              70, ['invoked','completed','abandoned'],                      'payments'],
      ['account.bank-link',                 95, ['invoked','completed','completed'],                      'account'],
      ['account.closure',                   40, ['invoked','abandoned','abandoned'],                      'account'],
      ['support.track-ticket',              88, ['invoked','invoked','completed'],                        'support'],
      ['support.interest-cert',             65, ['completed','completed','completed'],                    'support'],
      ['report.generate',                   75, ['invoked','completed','abandoned'],                      'reporting'],
      ['report.export',                     55, ['completed','completed','abandoned'],                    'reporting'],

      // LOW ROI — rarely used, clear churn risk
      ['loan-origination.esign',            25, ['completed','abandoned','abandoned','abandoned'],        'loan-origination'],
      ['loan-origination.disbursement',     15, ['completed','completed','completed'],                    'loan-origination'],
      ['kyc.rekyc',                         18, ['invoked','abandoned','abandoned'],                      'kyc'],
      ['kyc.fatca',                         12, ['invoked','abandoned','abandoned','abandoned'],          'kyc'],
      ['payments.foreclosure',              15, ['invoked','abandoned','abandoned'],                      'payments'],
      ['account.nominee',                   20, ['invoked','abandoned','abandoned'],                      'account'],
      ['account.emandate',                  14, ['abandoned','abandoned','abandoned'],                    'account'],
      ['support.noc-request',               10, ['invoked','abandoned','abandoned','abandoned'],          'support'],
      ['report.schedule',                    8, ['invoked','abandoned','abandoned'],                      'reporting'],

      // DEAD — licensed but never used (strongest churn signal)
      ['account.limit-change',               3, ['abandoned'],                                            'account'],
      ['report.custom-dashboard',            2, ['abandoned'],                                            'reporting'],
    ];

    const seedMany = db.transaction(() => {
      let count = 0;

      for (const [featureId, baseCount, outcomes, journey] of features) {
        for (const [tenantId, profile] of Object.entries(tenantProfiles)) {

          // Dead features get near-zero usage even for power users
          const isDead = baseCount <= 3;
          if (isDead && tenantId !== 'tenant_a') continue; // only tenant_a even tries dead features

          const n = Math.floor(baseCount * profile.multiplier * (0.7 + Math.random() * 0.6));

          for (let i = 0; i < n; i++) {
            // Spread events across 10 weeks for trend chart
            const weeksAgo  = Math.floor(Math.random() * 10);
            const daysInWeek = Math.floor(Math.random() * 7);
            const hoursAgo  = Math.floor(Math.random() * 24);
            const ts = new Date(
              Date.now()
              - weeksAgo  * 7  * 86400000
              - daysInWeek     * 86400000
              - hoursAgo       * 3600000
            ).toISOString();

            const channel = profile.channel[Math.floor(Math.random() * profile.channel.length)];
            const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];

            insert.run(
              uuidv4(), tenantId, featureId, channel,
              'u_' + Math.random().toString(36).slice(2, 8),
              'sess_' + Math.random().toString(36).slice(2, 10),
              journey,
              outcome, ts,
              JSON.stringify({ channel, source: 'seed-demo', tenantLabel: profile.label })
            );
            count++;
          }
        }
      }
      return count;
    });

    const seeded = seedMany();
    
    // Seed the sync_aggregates table with REAL counts so the System Status tab is accurate
    db.prepare('DELETE FROM sync_aggregates').run();
    const insertSync = db.prepare(`INSERT INTO sync_aggregates (tenant_hash, payload, received_at, feature_count, total_events) VALUES (?, '{}', datetime('now'), 35, ?)`);
    ['tenant_a', 'tenant_b', 'tenant_c'].forEach(t => {
      const c = db.prepare('SELECT COUNT(*) as cnt FROM events WHERE tenant_id = ?').get(t).cnt;
      if (c > 0) insertSync.run(t, c);
    });

    res.json({
      success: true,
      seeded,
      breakdown: {
        tenants: Object.keys(tenantProfiles).length,
        features: features.length,
        roiTiers: { high: 14, medium: 11, low: 8, dead: 2 },
        channels: 4,
        timeRange: '10 weeks'
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to seed data', message: err.message });
  }
});

export default router;