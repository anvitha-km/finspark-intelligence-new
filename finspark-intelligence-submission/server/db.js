import Database from 'better-sqlite3';

let db;

export function initDB() {
  db = new Database('./finspark.db');

  // Enable WAL mode for better concurrent read/write performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id    TEXT UNIQUE,
      tenant_id   TEXT NOT NULL,
      feature_id  TEXT NOT NULL,
      channel     TEXT,
      user_id     TEXT,
      session_id  TEXT,
      journey_id  TEXT,
      outcome     TEXT DEFAULT 'invoked',
      timestamp   TEXT NOT NULL,
      meta        TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_tenant  ON events(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_feature ON events(feature_id);
    CREATE INDEX IF NOT EXISTS idx_ts      ON events(timestamp);
    CREATE INDEX IF NOT EXISTS idx_journey ON events(journey_id);
    CREATE INDEX IF NOT EXISTS idx_session ON events(session_id);

    CREATE TABLE IF NOT EXISTS consent_config (
      tenant_id          TEXT PRIMARY KEY,
      telemetry_enabled  INTEGER DEFAULT 1,
      sync_enabled       INTEGER DEFAULT 0,
      retention_days     INTEGER DEFAULT 90,
      updated_at         TEXT,
      updated_by         TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id  TEXT,
      action     TEXT,
      changed_by TEXT,
      before     TEXT,
      after      TEXT,
      timestamp  TEXT
    );

    CREATE TABLE IF NOT EXISTS feature_registry (
      feature_id   TEXT PRIMARY KEY,
      feature_name TEXT,
      module       TEXT,
      licensed_to  TEXT
    );

    CREATE TABLE IF NOT EXISTS sync_aggregates (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_hash   TEXT NOT NULL,
      deployment    TEXT DEFAULT 'on-prem',
      payload       TEXT NOT NULL,
      received_at   TEXT NOT NULL,
      feature_count INTEGER DEFAULT 0,
      total_events  INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_sync_tenant ON sync_aggregates(tenant_hash);
  `);

  const features = [
    // Loan Origination — full funnel, all 5 tenants
    ['loan-origination.start',           'Loan Application Start',        'Loan Origination',  'tenant_a,tenant_b,tenant_c,tenant_d,tenant_e'],
    ['loan-origination.kyc',             'KYC Verification',              'Loan Origination',  'tenant_a,tenant_b,tenant_c,tenant_d,tenant_e'],
    ['loan-origination.document-upload', 'Document Upload',               'Loan Origination',  'tenant_a,tenant_b,tenant_c,tenant_d,tenant_e'],
    ['loan-origination.credit-check',    'Credit Bureau Check',           'Loan Origination',  'tenant_a,tenant_b,tenant_c,tenant_d'],
    ['loan-origination.approval',        'Loan Approval Decision',        'Loan Origination',  'tenant_a,tenant_b,tenant_c,tenant_d,tenant_e'],
    ['loan-origination.offer-letter',    'Offer Letter Generation',       'Loan Origination',  'tenant_a,tenant_b,tenant_c'],
    ['loan-origination.esign',           'Digital e-Signing',             'Loan Origination',  'tenant_a,tenant_b'],
    ['loan-origination.disbursement',    'Loan Disbursement',             'Loan Origination',  'tenant_a,tenant_b,tenant_c,tenant_d,tenant_e'],
    // Compliance & KYC
    ['kyc.aadhaar',                      'Aadhaar eKYC',                  'Compliance & KYC',  'tenant_a,tenant_b,tenant_c,tenant_d,tenant_e'],
    ['kyc.pan-verify',                   'PAN Verification',              'Compliance & KYC',  'tenant_a,tenant_b,tenant_c,tenant_d,tenant_e'],
    ['kyc.video-kyc',                    'Video KYC',                     'Compliance & KYC',  'tenant_a,tenant_b,tenant_c'],
    ['kyc.rekyc',                        'Re-KYC Trigger',                'Compliance & KYC',  'tenant_a,tenant_b'],
    ['kyc.fatca',                        'FATCA Declaration',             'Compliance & KYC',  'tenant_a,tenant_c'],
    ['kyc.aml-screen',                   'AML Screening',                 'Compliance & KYC',  'tenant_a,tenant_b,tenant_c,tenant_d'],
    // Payments & EMI
    ['payments.emi-dashboard',           'EMI Dashboard',                 'Payments & EMI',    'tenant_a,tenant_b,tenant_c,tenant_d,tenant_e'],
    ['payments.manual-pay',              'Manual Payment',                'Payments & EMI',    'tenant_a,tenant_b,tenant_c,tenant_d,tenant_e'],
    ['payments.auto-debit',              'Auto-Debit Setup',              'Payments & EMI',    'tenant_a,tenant_b,tenant_c'],
    ['payments.foreclosure',             'Foreclosure Calculator',        'Payments & EMI',    'tenant_a,tenant_b'],
    ['payments.part-prepay',             'Part Prepayment',               'Payments & EMI',    'tenant_a,tenant_b,tenant_c,tenant_d'],
    ['payments.receipt',                 'Payment Receipt Download',      'Payments & EMI',    'tenant_a,tenant_b,tenant_c,tenant_d,tenant_e'],
    // Account Mgmt
    ['account.profile-update',           'Profile Update',                'Account Mgmt',      'tenant_a,tenant_b,tenant_c,tenant_d,tenant_e'],
    ['account.nominee',                  'Nominee Management',            'Account Mgmt',      'tenant_a,tenant_b,tenant_c'],
    ['account.bank-link',                'Bank Account Linking',          'Account Mgmt',      'tenant_a,tenant_b,tenant_c,tenant_d'],
    ['account.emandate',                 'eMandate Setup',                'Account Mgmt',      'tenant_a,tenant_b'],
    ['account.limit-change',             'Credit Limit Change',           'Account Mgmt',      'tenant_a,tenant_c,tenant_d'],
    ['account.closure',                  'Account Closure',               'Account Mgmt',      'tenant_a,tenant_b,tenant_c,tenant_d,tenant_e'],
    // Support & Service
    ['support.service-request',          'Raise Service Request',         'Support & Service', 'tenant_a,tenant_b,tenant_c,tenant_d,tenant_e'],
    ['support.track-ticket',             'Track Ticket',                  'Support & Service', 'tenant_a,tenant_b,tenant_c,tenant_d'],
    ['support.interest-cert',            'Interest Certificate Download', 'Support & Service', 'tenant_a,tenant_b,tenant_c'],
    ['support.noc-request',              'NOC Request',                   'Support & Service', 'tenant_a,tenant_b'],
    ['support.chat',                     'Chat Support',                  'Support & Service', 'tenant_a,tenant_b,tenant_c,tenant_d,tenant_e'],
    // Reporting
    ['report.generate',                  'Report Generator',              'Reporting',         'tenant_a,tenant_b,tenant_c'],
    ['report.export',                    'Report Export',                 'Reporting',         'tenant_a,tenant_b'],
    ['report.schedule',                  'Scheduled Reports',             'Reporting',         'tenant_a'],
    ['report.custom-dashboard',          'Custom Dashboard Builder',      'Reporting',         'tenant_a'],
  ];

  const insert = db.prepare(`INSERT OR IGNORE INTO feature_registry VALUES (?,?,?,?)`);
  features.forEach(f => insert.run(...f));

  const consentInsert = db.prepare(
    `INSERT OR IGNORE INTO consent_config VALUES (?,1,0,90,datetime('now'),'system')`
  );
  ['tenant_a','tenant_b','tenant_c','tenant_d','tenant_e'].forEach(t => consentInsert.run(t));

  console.log('✅ DB initialized (WAL mode, indexes ready)');
  return Promise.resolve(db);
}

export function getDB() { return db; }

/**
 * Get database statistics for health monitoring.
 */
export function getDBStats() {
  const eventCount = db.prepare('SELECT COUNT(*) as count FROM events').get().count;
  const tenantCount = db.prepare('SELECT COUNT(DISTINCT tenant_id) as count FROM events').get().count;
  const featureCount = db.prepare('SELECT COUNT(*) as count FROM feature_registry').get().count;
  const oldestEvent = db.prepare('SELECT MIN(timestamp) as ts FROM events').get().ts;
  const newestEvent = db.prepare('SELECT MAX(timestamp) as ts FROM events').get().ts;
  const dbSizeBytes = db.prepare("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()").get().size;

  return {
    totalEvents: eventCount,
    activeTenants: tenantCount,
    registeredFeatures: featureCount,
    eventRange: { oldest: oldestEvent, newest: newestEvent },
    databaseSizeKB: Math.round(dbSizeBytes / 1024)
  };
}

/**
 * Enforce data retention — delete events older than the configured retention period.
 * Called periodically by the server.
 */
export function enforceRetention() {
  const tenants = db.prepare('SELECT tenant_id, retention_days FROM consent_config').all();
  let totalPurged = 0;

  const deleteStmt = db.prepare(
    `DELETE FROM events WHERE tenant_id = ? AND timestamp < datetime('now', '-' || ? || ' days')`
  );

  for (const t of tenants) {
    const result = deleteStmt.run(t.tenant_id, t.retention_days);
    if (result.changes > 0) {
      totalPurged += result.changes;
      console.log(`🗑️  Retention: purged ${result.changes} events for ${t.tenant_id} (>${t.retention_days} days)`);
    }
  }

  return totalPurged;
}