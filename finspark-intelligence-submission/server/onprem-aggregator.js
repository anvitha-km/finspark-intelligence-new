/**
 * ON-PREM FEDERATED AGGREGATOR
 * 
 * This simulates the lightweight agent that runs INSIDE a customer's
 * own infrastructure. It reads from the local DB, computes anonymized
 * aggregate statistics, and (optionally) syncs only those aggregates
 * to the central cloud endpoint — raw events NEVER leave the network.
 * 
 * In production: this would be a Docker container deployed on-premise.
 * For the demo: run this alongside the main server to show the federated model.
 */

import Database from 'better-sqlite3';
import { writeFileSync, readFileSync, existsSync } from 'fs';

const TENANT_ID      = process.argv[2] || 'tenant_a';
const SYNC_ENDPOINT  = 'http://localhost:4000/api/sync/aggregate';
const OUTPUT_FILE    = `./onprem-aggregate-${TENANT_ID}.json`;

console.log(`\n🏢 On-Prem Federated Aggregator`);
console.log(`   Tenant:   ${TENANT_ID}`);
console.log(`   Mode:     Local-only (no raw events transmitted)`);
console.log(`   Sync:     Anonymized aggregates only\n`);

// Connect to the SAME local database (simulating on-prem data store)
const db = new Database('./finspark.db');

function computeLocalAggregates() {
  console.log('📊 Computing local feature aggregates...');

  // Feature invocation counts per feature (tenant-scoped)
  const featureCounts = db.prepare(`
    SELECT 
      feature_id,
      COUNT(*)                    as total_invocations,
      COUNT(DISTINCT user_id)     as unique_users,
      COUNT(DISTINCT session_id)  as unique_sessions,
      MIN(timestamp)              as first_seen,
      MAX(timestamp)              as last_seen,
      SUM(CASE WHEN outcome = 'completed' THEN 1 ELSE 0 END) as completions,
      SUM(CASE WHEN outcome = 'abandoned' THEN 1 ELSE 0 END) as abandonments
    FROM events
    WHERE tenant_id = ?
    GROUP BY feature_id
    ORDER BY total_invocations DESC
  `).all(TENANT_ID);

  // Journey completion rates
  const journeyStats = db.prepare(`
    SELECT
      journey_id,
      COUNT(DISTINCT session_id) as sessions,
      COUNT(DISTINCT feature_id) as steps_touched
    FROM events
    WHERE tenant_id = ? AND journey_id IS NOT NULL
    GROUP BY journey_id
  `).all(TENANT_ID);

  // Daily trend (last 7 days) — for churn/growth detection
  const dailyTrend = db.prepare(`
    SELECT
      DATE(timestamp) as date,
      COUNT(*)        as events,
      COUNT(DISTINCT user_id) as active_users
    FROM events
    WHERE tenant_id = ?
      AND timestamp >= datetime('now', '-7 days')
    GROUP BY DATE(timestamp)
    ORDER BY date ASC
  `).all(TENANT_ID);

  // Channel breakdown
  const channelBreakdown = db.prepare(`
    SELECT channel, COUNT(*) as count
    FROM events
    WHERE tenant_id = ?
    GROUP BY channel
  `).all(TENANT_ID);

  return { featureCounts, journeyStats, dailyTrend, channelBreakdown };
}

function anonymizeAndPackage(aggregates) {
  console.log('🔒 Anonymizing — stripping all user/session identifiers...');

  // Only aggregate numbers go out — NO user IDs, NO session IDs, NO raw events
  return {
    tenantHash:   hashTenantId(TENANT_ID),   // tenant identity is also hashed
    computedAt:   new Date().toISOString(),
    deploymentType: 'on-prem',
    featureSummary: aggregates.featureCounts.map(f => ({
      featureId:        f.feature_id,
      totalInvocations: f.total_invocations,
      uniqueUserCount:  f.unique_users,       // count only — no actual IDs
      sessionCount:     f.unique_sessions,
      completionRate:   f.total_invocations > 0
        ? Math.round((f.completions / f.total_invocations) * 100) : 0,
      abandonmentRate:  f.total_invocations > 0
        ? Math.round((f.abandonments / f.total_invocations) * 100) : 0,
      firstSeen:        f.first_seen,
      lastSeen:         f.last_seen,
      isActive:         f.last_seen > new Date(Date.now() - 7*86400000).toISOString()
    })),
    dailyTrend: aggregates.dailyTrend,        // just counts per day
    channelBreakdown: aggregates.channelBreakdown,
    journeyCount: aggregates.journeyStats.length
  };
}

function hashTenantId(tenantId) {
  // One-way hash — central server gets a consistent ID but not the real name
  let h = 0;
  for (let i = 0; i < tenantId.length; i++) {
    h = Math.imul(31, h) + tenantId.charCodeAt(i) | 0;
  }
  return 'tenant_' + Math.abs(h).toString(16);
}

async function syncToCloud(payload) {
  console.log('☁️  Syncing anonymized aggregates to cloud endpoint...');
  try {
    const res = await fetch(SYNC_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      console.log('✅ Sync successful — only aggregate stats transmitted');
    } else {
      console.log('⚠️  Sync endpoint not available — saving locally only');
    }
  } catch {
    console.log('⚠️  Cloud sync skipped (offline mode) — data stays on-prem');
  }
}

// MAIN EXECUTION
async function run() {
  const aggregates = computeLocalAggregates();
  const payload    = anonymizeAndPackage(aggregates);

  // Save locally (always — this is the on-prem copy)
  writeFileSync(OUTPUT_FILE, JSON.stringify(payload, null, 2));
  console.log(`💾 Local aggregate saved → ${OUTPUT_FILE}`);

  // Print summary
  console.log(`\n📈 AGGREGATE SUMMARY FOR ${TENANT_ID.toUpperCase()}`);
  console.log(`   Features tracked: ${payload.featureSummary.length}`);
  console.log(`   Active features:  ${payload.featureSummary.filter(f => f.isActive).length}`);
  console.log(`   Total events:     ${payload.featureSummary.reduce((s, f) => s + f.totalInvocations, 0)}`);
  console.log(`   Days in trend:    ${payload.dailyTrend.length}`);

  console.log('\n🔐 PRIVACY GUARANTEE:');
  console.log('   ✓ No raw events transmitted');
  console.log('   ✓ No user IDs in payload');
  console.log('   ✓ No session IDs in payload');
  console.log('   ✓ Tenant identity hashed');
  console.log('   ✓ Only statistical aggregates synced\n');

  // Attempt cloud sync (will gracefully fail if no sync endpoint)
  await syncToCloud(payload);

  console.log('\n✅ On-prem aggregation complete.');
  console.log(`   Open ${OUTPUT_FILE} to inspect the anonymized payload.\n`);
}

run();