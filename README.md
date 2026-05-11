# FinSpark Intelligence
### Enterprise Feature Intelligence & Usage Analytics Framework

> **FinSpark Hackathon 2026 — Problem Statement 1**
> *Theme: Turn Enterprise Product Usage into Strategic Intelligence*

[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=black)](https://reactjs.org)
[![SQLite](https://img.shields.io/badge/Database-SQLite_WAL-003B57?style=flat&logo=sqlite&logoColor=white)](https://sqlite.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat&logo=docker&logoColor=white)](https://docker.com)
[![JWT](https://img.shields.io/badge/Security-JWT_Auth-000000?style=flat&logo=jsonwebtokens&logoColor=white)](https://jwt.io)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat)](LICENSE)

---

## Table of Contents

1. [The Problem](#1-the-problem)
2. [Solution Overview](#2-solution-overview)
3. [Repository Structure](#3-repository-structure)
4. [Layer 1 — Telemetry Instrumentation (SDK)](#4-layer-1--telemetry-instrumentation-sdk)
5. [Layer 2 — Deployment-Aware Aggregation (Backend)](#5-layer-2--deployment-aware-aggregation-backend)
6. [Layer 3 — Enterprise Dashboard (Frontend)](#6-layer-3--enterprise-dashboard-frontend)
7. [Layer 4 — Governance & Compliance](#7-layer-4--governance--compliance)
8. [Database Schema](#8-database-schema)
9. [API Reference](#9-api-reference)
10. [Security Model](#10-security-model)
11. [Demo Data & Tenant Personas](#11-demo-data--tenant-personas)
12. [Production Scalability Path](#12-production-scalability-path)
13. [Quick Start](#13-quick-start)
14. [Environment Configuration](#14-environment-configuration)
15. [Hackathon Evaluation Matrix](#15-hackathon-evaluation-matrix)

---

## 1. The Problem

Enterprise lending platforms operate across multiple tenants, geographies, and deployment models (On-Premise and Cloud). Because of strict data privacy requirements and network isolation, product leadership has historically operated in the dark — unable to answer the most basic strategic questions:

- Which features are licensed but **never used**?
- Where do user journeys **drop off**, and what is the exact revenue lost?
- How does On-Premise customer usage **differ from Cloud** customers?
- Which features drive **renewals**, and which drive **churn**?

Without this intelligence, roadmap decisions are made on gut feel, renewal conversations lack data, and engineering resources are wasted building features nobody uses.

**FinSpark Intelligence** solves this by building a complete, end-to-end telemetry pipeline that respects the hard constraints of enterprise deployments — strict tenant isolation, on-prem network boundaries, PII regulations, and zero-performance-impact requirements.

---

## 2. Solution Overview

FinSpark Intelligence is a **four-layer architecture** where each layer has a distinct responsibility and can be understood and deployed independently.

```
┌─────────────────────────────────────────────────────────────────────┐
│                      LAYER 4: GOVERNANCE                            │
│         RBAC · Consent Management · PII Masking · Audit Logs        │
├───────────────────────────────────┬─────────────────────────────────┤
│       LAYER 3: DASHBOARD          │     Strategic Intelligence       │
│  Heatmap · Funnel · License ·     │  Churn Signals · ROI · Trends   │
│  Comparison · Predictive Insights │  (React SPA, role-gated views)  │
├───────────────────────────────────┴─────────────────────────────────┤
│                LAYER 2: AGGREGATION ENGINE (Node.js)                │
│   Cloud Path: Real-time events → SQLite → Analytics API             │
│   On-Prem Path: Local aggregate → Anonymized JSON → Sync endpoint   │
├─────────────────────────────────────────────────────────────────────┤
│              LAYER 1: TELEMETRY SDK (Multi-Channel)                 │
│    Web JS SDK · Python API Interceptor · iOS Swift Tracker          │
│    Consent gate → PII masking → Journey tagging → Batch flush       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Repository Structure

```
finspark-intelligence/
│
├── sdk/                          # Client-side telemetry SDK (JavaScript)
│   ├── featureSdk.js             # Core tracker: consent, PII, batching, flush
│   ├── piiMasker.js              # One-way djb2 hash for userId anonymization
│   ├── consentGate.js            # Per-tenant on/off switch (client-side)
│   └── journeyTracker.js         # Multi-step flow correlation by journeyId
│
├── mock-sdks/                    # Reference implementations for other channels
│   ├── python_api_interceptor.py # Backend service interceptor (Django/FastAPI)
│   └── ios_tracker.swift         # iOS mobile SDK (SHA-256 PII masking, batching)
│
├── server/                       # Node.js Express backend
│   ├── index.js                  # Entry point: middleware, rate limiters, routes
│   ├── db.js                     # SQLite init, schema, indexes, retention enforcement
│   ├── env.example               # All environment variables documented
│   ├── onprem-aggregator.js      # Federated aggregation agent (runs on-prem)
│   ├── finspark.db               # Pre-seeded SQLite database (demo data included)
│   ├── onprem-aggregate-*.json   # Sample anonymized on-prem payloads (3 tenants)
│   ├── middleware/
│   │   └── auth.js               # JWT authentication middleware
│   └── routes/
│       ├── events.js             # Event ingestion: batch ingest, consent check
│       ├── analytics.js          # Heatmap, funnel, license, comparison, trend, seed
│       ├── governance.js         # Consent CRUD, immutable audit log
│       └── sync.js               # On-prem aggregate reception and storage
│
├── dashboard/                    # React 18 frontend (Create React App)
│   └── src/
│       ├── App.js                # Router, RBAC tab gating, login state
│       ├── config.js             # API_URL configuration
│       └── components/
│           ├── LoginView.jsx     # Role-based login (admin/viewer/tenant)
│           ├── HeatmapView.jsx   # Feature adoption heatmap across tenants
│           ├── FunnelView.jsx    # Journey drop-off funnel analysis
│           ├── LicenseView.jsx   # License vs actual usage comparison
│           ├── ComparisonView.jsx # Cross-tenant behavioral comparison
│           ├── InsightsView.jsx  # Predictive intelligence + ROI engine
│           ├── GovernanceView.jsx # Consent management panel (admin-only)
│           └── SystemStatusView.jsx # On-prem sync status & node map
│
├── Dockerfile                    # Production container for the backend
├── start.bat                     # Windows one-click start script
└── README.md                     # This document
```

---

## 4. Layer 1 — Telemetry Instrumentation (SDK)

The SDK layer is responsible for **capturing feature invocation events** at the point of use, across every channel, without impacting application performance. It operates through four composable modules.

### 4.1 Core SDK (`sdk/featureSdk.js`)

The main entry point. Applications initialize a tracker instance once and call `track()` at feature boundaries.

**Initialization:**
```javascript
import FinSpark from './sdk/featureSdk.js';

const tracker = FinSpark.init({
  tenantId: 'tenant_a',
  endpoint: 'http://localhost:4000/api/events',
  channel: 'web',      // 'web' | 'mobile' | 'api' | 'batch'
  batchSize: 20,        // flush when queue reaches this count
  flushIntervalMs: 5000 // also flush every 5 seconds
});
```

**Tracking a feature:**
```javascript
tracker.track('loan-origination.kyc', {
  userId: 'user@company.com', // raw PII — hashed automatically before queuing
  outcome: 'completed',       // 'invoked' | 'completed' | 'abandoned' | 'error'
  journeyName: 'loan-origination', // links this event to a multi-step journey
  meta: { source: 'web-app', version: '2.1' }
});
```

**Event lifecycle inside `track()`:**

```
track() called
    │
    ├── [1] Consent Gate check (isTrackingAllowed)
    │       └── If disabled → return immediately, nothing created
    │
    ├── [2] PII Masking (ensureMasked)
    │       └── userId hashed via djb2 → "u_3f7a2b" (raw PII never touches memory)
    │
    ├── [3] Journey Correlation (getJourneyId)
    │       └── Assigns persistent journeyId linking all steps of a flow
    │
    ├── [4] Event object constructed (eventId, tenantId, featureId, channel, ...)
    │
    ├── [5] Pushed to in-memory queue
    │       └── If queue > maxQueueSize → oldest event dropped (backpressure)
    │
    └── [6] Auto-flush if batchSize reached, or next periodic flush fires
```

**Flush mechanism:**

Events are batched and sent in a single `POST /api/events/batch` request. On network failure, events are pushed back to the front of the queue and retried on the next flush cycle — no data is silently dropped.

**Available methods:**

| Method | Description |
|--------|-------------|
| `tracker.track(featureId, options)` | Queue a feature invocation event |
| `tracker.flush()` | Immediately send all queued events |
| `tracker.destroy()` | Stop timers, flush remaining events, clean up |
| `tracker.getQueueSize()` | Returns current queue depth (for monitoring) |

---

### 4.2 PII Masker (`sdk/piiMasker.js`)

Uses the **djb2 rolling hash algorithm** to transform raw user identifiers into deterministic, anonymous tokens. The same raw input always produces the same output, so analytics remain consistent (e.g., you can count unique users) without ever storing PII.

```
"user@company.com"  →  "u_3f7a2b"
"admin@bank.co.in"  →  "u_e0c91a"
"user@company.com"  →  "u_3f7a2b"  ← same input = same output (deterministic)
```

**Key property:** The masking is **one-way and irreversible** — you cannot recover the original email from the hash. This satisfies DPDP Act and GDPR requirements for analytics data.

**Functions:**

| Function | Description |
|----------|-------------|
| `maskUserId(rawUserId)` | Hash a raw user ID to "u_XXXXXX" format |
| `isMasked(userId)` | Check if a value is already in masked format |
| `ensureMasked(userId)` | Idempotent — masks if raw, passes through if already masked |

The SDK always calls `ensureMasked()` before building any event object, so raw PII never enters the event queue, the network, or the database.

---

### 4.3 Consent Gate (`sdk/consentGate.js`)

Implements the **client-side consent layer** (the server enforces it independently as a second layer). Before any event is created in memory, the consent gate checks whether the tenant has enabled telemetry.

**Behavior:**
- Consent status is fetched from `GET /api/events/consent/:tenantId` on SDK init
- The result is cached in memory for 5 minutes to avoid blocking `track()` on network I/O
- **Fail-closed:** if consent cannot be verified (network error, no cache), tracking is disabled
- If telemetry is disabled, `track()` returns in one line — no event, no allocation, no network

```javascript
// What happens when consent is disabled:
tracker.track('loan-origination.kyc', { userId: 'user@company.com' });
// → isTrackingAllowed() returns false → immediate return
// → No event object created, no memory allocated, no queue touched
```

---

### 4.4 Journey Tracker (`sdk/journeyTracker.js`)

Enterprise workflows like loan origination span **multiple steps across a single session**. The Journey Tracker assigns a persistent `journeyId` that ties all related events together, enabling funnel analysis.

**How it works:**
- When `track()` is called with a `journeyName`, `getJourneyId()` is called
- If no active journey exists for `(journeyName, sessionId)`, a new one is started and a `journeyId` like `j_abc12345` is generated
- Every subsequent step in the same session uses the same `journeyId`
- The backend can then query all events by `journeyId` to reconstruct the full path

**Example — Loan Origination flow:**
```
Session: sess_xyz789

Step 1: track('loan-origination.start', { journeyName: 'loan-origination' })
         → journeyId: "j_abc12345" (new journey started)

Step 2: track('loan-origination.kyc', { journeyName: 'loan-origination' })
         → journeyId: "j_abc12345" (same journey, same session)

Step 3: track('loan-origination.document-upload', { journeyName: 'loan-origination' })
         → journeyId: "j_abc12345"

[User drops off — never completes credit-check step]

→ Backend funnel query sees 3 events with journeyId "j_abc12345",
  identifies the drop-off point as "document-upload → credit-check"
```

**Stale journey cleanup:** `cleanupStaleJourneys(maxAgeMs)` purges in-memory journey state older than the specified threshold (default: 1 hour) to prevent memory leaks in long-running applications.

---

### 4.5 Multi-Channel SDKs

The same event schema works across all four channels. Platform-specific SDK implementations in `mock-sdks/` demonstrate integration patterns:

**Python API Interceptor (`mock-sdks/python_api_interceptor.py`):**
Designed for Django or FastAPI backend services. Intercepts API calls, applies SHA-256 PII masking (different hash function from the JS SDK — equally irreversible), and batches events to the ingestion endpoint. The `channel` field is set to `"api"` automatically.

```python
tracker = FinSparkInterceptor()
tracker.track("loan-origination.credit-check", "user_9942@bank.com", outcome="completed")
tracker.flush()
```

**iOS Swift Tracker (`mock-sdks/ios_tracker.swift`):**
Designed for native iOS mobile applications. Uses Apple's `CryptoKit.SHA256` for on-device PII hashing — the raw user identity never leaves the device. The `channel` field is set to `"mobile"`. Events are batched and flushed when the queue reaches 20 events or on app backgrounding.

---

## 5. Layer 2 — Deployment-Aware Aggregation (Backend)

The backend is a **Node.js/Express server** that serves as the central analytics engine. Its critical architectural feature is handling two fundamentally different deployment models with different privacy guarantees.

### 5.1 Cloud Path (Real-Time)

Cloud tenants stream events directly to the ingestion endpoint with no intermediate aggregation. Events land in SQLite and are immediately queryable via the analytics API.

```
Cloud Tenant App
    │
    └── POST /api/events/batch  (up to 1000 events per request)
            │
            ├── Consent check (server-side, layer 2)
            ├── Field validation
            └── SQLite INSERT (WAL mode, indexed)
                    │
                    └── Instantly queryable via /api/analytics/*
```

### 5.2 On-Premises Path (Federated)

On-prem tenants operate behind corporate firewalls where raw telemetry cannot leave the customer's network. The **federated aggregator** (`server/onprem-aggregator.js`) runs as a local agent inside the customer's infrastructure.

**What the aggregator does:**

1. **Reads** the local SQLite database (the same DB the platform writes to)
2. **Computes** mathematical summaries: invocation counts, unique user counts, completion rates, abandonment rates, daily trends, channel breakdown — all per feature
3. **Strips** all identifiers: no user IDs, no session IDs, no journey IDs leave the payload
4. **Hashes** the tenant identity itself (so the central server gets a consistent `tenantHash` without knowing the real tenant name)
5. **Writes** the anonymized JSON payload to a local file (`onprem-aggregate-{tenant}.json`)
6. **Optionally** syncs the anonymized payload to `POST /api/sync/aggregate`

**Privacy guarantee — what the cloud endpoint receives vs. what it never sees:**

| Transmitted (Aggregates Only) | Never Transmitted |
|-------------------------------|-------------------|
| Feature invocation count | Raw events |
| Unique user **count** | User IDs |
| Session **count** | Session IDs |
| Completion rate (%) | Journey IDs |
| Abandonment rate (%) | Raw timestamps |
| Daily trend (event counts per day) | IP addresses |
| Channel breakdown (web/mobile/api counts) | Any PII |

**Running the aggregator:**
```bash
# From the /server directory:
node onprem-aggregator.js tenant_a
# → Reads DB, computes aggregates, saves onprem-aggregate-tenant_a.json
# → Attempts sync to http://localhost:4000/api/sync/aggregate
# → Gracefully falls back to local-only if cloud is unavailable
```

The three sample aggregate files (`onprem-aggregate-tenant_a/b/c.json`) in the repository show exactly what an anonymized payload looks like.

### 5.3 Server Entry Point (`server/index.js`)

**Rate limiting — two separate policies:**

The server applies different rate limits to the two API categories because they have different abuse profiles:

| Route Group | Limit | Rationale |
|-------------|-------|-----------|
| `POST /api/events` | 60 req/min/IP | SDKs batch events; 60 is generous for legitimate use. Strict to prevent fake-event flooding |
| `GET /api/analytics`, `/api/governance`, `/api/sync` | 300 req/min/IP | Dashboards poll frequently; blocking them degrades UX |

**Request logging:** Every request logs `METHOD path → STATUS (duration ms)` to stdout. Health check requests (`GET /health`) are suppressed to reduce noise.

**Startup sequence:**
1. `initDB()` — create tables, indexes, seed feature registry and consent defaults
2. `enforceRetention()` — purge any events older than each tenant's configured retention window
3. Start server on `PORT` (default 4000)
4. Schedule retention enforcement every 6 hours

---

## 6. Layer 3 — Enterprise Dashboard (Frontend)

The dashboard is a **React 18 single-page application** served at `http://localhost:3000`. All data is fetched live from the backend API on mount.

### 6.1 Authentication & RBAC (`LoginView.jsx`, `App.js`)

The login screen supports three role personas that reflect real enterprise access patterns:

| Role | Credentials | Accessible Tabs | Data Scope |
|------|-------------|-----------------|------------|
| **Admin** | admin / admin123 | All 7 tabs | All tenants |
| **Viewer** | viewer / view123 | All tabs except Governance | All tenants |
| **Tenant Manager** | manager / tenant123 | Heatmap, Funnel, Insights only | Own tenant only |

Tab visibility is enforced in `getTabsForRole()`. When a Tenant Manager is logged in, every API call automatically appends `?tenantId={their tenant}` to all analytics queries — the backend then adds a SQL `WHERE tenant_id = ?` clause, mathematically preventing cross-tenant data access.

---

### 6.2 Heatmap Tab (`HeatmapView.jsx`)

**What it shows:** A grid of every licensed feature against every tenant, colored by invocation count. Dead features (zero usage in the selected time window) appear in red.

**How it works:**
- Calls `GET /api/analytics/heatmap?days=30`
- Backend joins the `events` table with `feature_registry`
- Features with zero usage in the window are calculated by computing the cross-product of `(all licensed features × all licensed tenants)` and subtracting those that appear in the results — ensuring zero-usage features are always explicitly represented, not silently absent
- Filter controls allow drilling by specific tenant or time window (7/30/90 days)

**Business value:** Immediately identifies features that are licensed but unused — the strongest leading indicator of non-renewal.

---

### 6.3 Funnel Tab (`FunnelView.jsx`)

**What it shows:** A step-by-step funnel for a selected journey (Loan Origination, KYC, Payments), showing the number of unique sessions that reached each step, the drop-off rate between steps, and the overall conversion rate from entry to completion.

**How it works:**
- Calls `GET /api/analytics/funnel/loan-origination?tenantId=xxx`
- Backend iterates the ordered steps for the named journey
- For each step, counts `DISTINCT session_id` values where that `feature_id` was invoked
- Calculates `dropOffRate` (% lost from previous step) and `conversionFromTop` (% of original entrants remaining)

**Supported journeys:**

| Journey | Steps |
|---------|-------|
| `loan-origination` | start → kyc → document-upload → credit-check → approval → offer-letter → esign → disbursement |
| `kyc` | aadhaar → pan-verify → video-kyc → aml-screen → fatca |
| `payments` | emi-dashboard → manual-pay → auto-debit → part-prepay → receipt |

---

### 6.4 License Usage Tab (`LicenseView.jsx`)

**What it shows:** For each feature, how many of its licensed tenants actually used it in the selected window — expressed as an adoption rate percentage. Features below a threshold are flagged as at-risk.

**How it works:**
- Calls `GET /api/analytics/license-usage?days=30`
- Backend reads `feature_registry.licensed_to` (comma-separated tenant list) for each feature
- Compares against actual event counts in the window
- Returns `adoptionRate = (tenantsWhoUsedIt / tenantsWhoLicensedIt) * 100`

---

### 6.5 Comparison Tab (`ComparisonView.jsx`)

**What it shows:** A side-by-side comparison of any two tenants — total invocations, active features, feature-level adoption rates, channel distribution (web vs mobile vs API).

**How it works:**
- Calls `GET /api/analytics/comparison`
- Backend groups events by `(tenant_id, feature_id)` and pivots into per-tenant summaries
- Returns both individual feature-level data and a `tenantSummary` object with aggregate stats per tenant

**Business value:** Allows customer success teams to benchmark struggling tenants against power users, identify adoption gaps, and create targeted enablement plans.

---

### 6.6 Predictive Insights Tab (`InsightsView.jsx`)

This is the **strategic intelligence layer** — it transforms raw event data into actionable business conclusions.

**What it shows:**

**1. Weekly Trend Chart with Linear Regression Forecast**

- Fetches `GET /api/analytics/weekly-trend?weeks=8`
- Backend groups events by ISO week and counts unique sessions per week (real data)
- Applies **Least Squares Linear Regression** to the historical data points:
  ```
  slope m = (n·ΣXY - ΣX·ΣY) / (n·ΣX² - (ΣX)²)
  intercept b = (ΣY - m·ΣX) / n
  ```
- Projects 4 future weeks using the fitted line `y = mx + b`
- Classifies the trend as `growing` (slope > 0.5), `declining` (slope < -0.5), or `stable`
- The chart renders actual weekly sessions as solid bars and predicted values as a dotted line, with future weeks clearly distinguished

**2. Automated Insight Cards**

Five insight cards are generated programmatically from live data:

| Card | Logic |
|------|-------|
| **Churn Risk** | Count features with `adoptionRate < 60%` across licensed tenants |
| **Lost Revenue (ROI)** | Identifies the funnel step with the largest absolute session drop. Calculates: `droppedSessions × $2,500 avg loan value × 4% approval rate = $ revenue lost per cycle` |
| **High-Performing Features** | Count features with `adoptionRate ≥ 80%` — upsell candidates |
| **Funnel Conversion Rate** | `disbursement sessions / start sessions × 100%`, benchmarked against 35% industry average |
| **Trend Direction** | Uses regression slope and direction to classify the platform trajectory |

**Why this matters:** Product leadership sees not just "drop-off at document upload" but "fixing the document upload UX recovers $120,000 in lost revenue per cycle" — a number a CFO understands.

---

### 6.7 Governance Tab (`GovernanceView.jsx`) — Admin Only

**What it shows:** Per-tenant telemetry consent settings, and an immutable audit trail of every configuration change.

**Controls per tenant:**
- Toggle telemetry on/off
- Toggle on-prem sync on/off
- Set data retention window (1 to 3650 days)

Every change writes an audit log entry with the full before/after state, the identity of who made the change, and a precise timestamp. The audit log cannot be modified or deleted — it is append-only.

---

### 6.8 System Status Tab (`SystemStatusView.jsx`)

**What it shows:** A live node map of the federated topology — which tenants are Cloud (real-time stream) vs On-Premise (federated aggregate), the last sync time for each on-prem node, and total events synced.

**How it works:**
- Calls `GET /api/sync/aggregates/summary`
- Backend groups `sync_aggregates` by `tenant_hash` and returns sync counts, total events, and last/first sync timestamps
- Tenants not appearing in the sync table are inferred to be Cloud tenants

---

## 7. Layer 4 — Governance & Compliance

Compliance controls are not a single module but are woven into every layer of the system.

### 7.1 PII Masking — At Source

Raw user identities are hashed **before the event object is created in memory**, inside the SDK's `track()` method. The raw string is passed to `ensureMasked()` and immediately discarded. The hashed token (`u_3f7a2b`) is what enters the queue, the network, and the database. This is not optional — it cannot be bypassed by passing a pre-built event object.

### 7.2 Dual-Layer Consent Enforcement

| Layer | Where | What Happens |
|-------|-------|--------------|
| **Layer 1 (Client)** | SDK `consentGate.js` | If disabled, `track()` returns in one line. No event, no memory, no network. |
| **Layer 2 (Server)** | `POST /api/events/batch` | Checks `consent_config.telemetry_enabled` for each event's `tenant_id` before insert. Rejects silently if disabled. |

Both layers must be satisfied for an event to reach the database. The server-side layer protects against SDK bypass (e.g., a direct API call without the SDK).

### 7.3 Tenant Isolation via SQL-Level Row Filtering

When a user with the `tenant` role is authenticated, the frontend appends `?tenantId={their tenant}` to all analytics API calls. The backend adds this as a `WHERE tenant_id = ?` SQL parameter. There is no application-level filtering after the query — the database simply never returns other tenants' rows.

### 7.4 Configurable Data Retention

Each tenant has a `retention_days` setting (default: 90 days). The server calls `enforceRetention()` on startup and every 6 hours. This function executes:
```sql
DELETE FROM events
WHERE tenant_id = ? AND timestamp < datetime('now', '-N days')
```
...for each tenant using their individual retention window. This supports regulatory requirements where different customers may have different data retention obligations.

### 7.5 Immutable Audit Log

Every change to consent configuration writes to `audit_log` with:
- `tenant_id` — whose settings were changed
- `action` — what was changed (`consent_update`)
- `changed_by` — identity of the operator
- `before` — full JSON snapshot of previous state
- `after` — full JSON snapshot of new state
- `timestamp` — precise UTC timestamp

The audit log is insert-only. There is no `DELETE` or `UPDATE` route for audit records.

### 7.6 On-Prem Privacy Guarantee

The federated aggregator enforces a strict data boundary: **only statistical aggregates leave the customer's network**. The payload structure is defined in code (`anonymizeAndPackage()`) and explicitly excludes all identifiers. Even the tenant's own identity is hashed before sync, so the central server cannot infer which customer a payload belongs to from the payload alone.

---

## 8. Database Schema

The database is SQLite 3 running in **WAL (Write-Ahead Logging) mode**, which allows concurrent readers and a single writer without locking — appropriate for analytics workloads.

### Table: `events`

The core telemetry store. Every feature invocation is a row.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PK | Auto-increment internal ID |
| `event_id` | TEXT UNIQUE | Client-generated UUID (deduplication key) |
| `tenant_id` | TEXT NOT NULL | Tenant identifier (e.g., `tenant_a`) |
| `feature_id` | TEXT NOT NULL | Dot-notation feature key (e.g., `loan-origination.kyc`) |
| `channel` | TEXT | Ingestion channel: `web`, `mobile`, `api`, `batch` |
| `user_id` | TEXT | Hashed user identifier (e.g., `u_3f7a2b`) — never raw PII |
| `session_id` | TEXT | Session grouping key |
| `journey_id` | TEXT | Multi-step flow correlation key (e.g., `j_abc12345`) |
| `outcome` | TEXT | `invoked` \| `completed` \| `abandoned` \| `error` |
| `timestamp` | TEXT | ISO 8601 UTC timestamp |
| `meta` | TEXT | JSON blob for arbitrary metadata |

**Indexes:** `tenant_id`, `feature_id`, `timestamp`, `journey_id`, `session_id` — all indexed for sub-millisecond analytics queries.

### Table: `consent_config`

One row per tenant. Controls all telemetry behavior.

| Column | Type | Description |
|--------|------|-------------|
| `tenant_id` | TEXT PK | Tenant identifier |
| `telemetry_enabled` | INTEGER | 1 = tracking on, 0 = all events blocked |
| `sync_enabled` | INTEGER | 1 = on-prem sync active |
| `retention_days` | INTEGER | Events older than this are purged (default: 90) |
| `updated_at` | TEXT | Last modification timestamp |
| `updated_by` | TEXT | Identity of last modifier |

### Table: `audit_log`

Append-only record of every consent configuration change.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PK | Auto-increment |
| `tenant_id` | TEXT | Which tenant was modified |
| `action` | TEXT | Action type (e.g., `consent_update`) |
| `changed_by` | TEXT | Operator identity |
| `before` | TEXT | JSON snapshot of state before change |
| `after` | TEXT | JSON snapshot of state after change |
| `timestamp` | TEXT | UTC timestamp of change |

### Table: `feature_registry`

The canonical catalog of all features and which tenants have licensed them.

| Column | Type | Description |
|--------|------|-------------|
| `feature_id` | TEXT PK | Dot-notation key (e.g., `loan-origination.kyc`) |
| `feature_name` | TEXT | Human-readable label |
| `module` | TEXT | Product module (e.g., `Loan Origination`, `Compliance & KYC`) |
| `licensed_to` | TEXT | Comma-separated list of tenant IDs that have licensed this feature |

**Pre-seeded features (35 total across 6 modules):**

| Module | Features |
|--------|----------|
| Loan Origination | start, kyc, document-upload, credit-check, approval, offer-letter, esign, disbursement |
| Compliance & KYC | aadhaar, pan-verify, video-kyc, rekyc, fatca, aml-screen |
| Payments & EMI | emi-dashboard, manual-pay, auto-debit, foreclosure, part-prepay, receipt |
| Account Mgmt | profile-update, nominee, bank-link, emandate, limit-change, closure |
| Support & Service | service-request, track-ticket, interest-cert, noc-request, chat |
| Reporting | generate, export, schedule, custom-dashboard |

### Table: `sync_aggregates`

Stores anonymized payloads received from on-prem aggregators.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PK | Auto-increment |
| `tenant_hash` | TEXT | Hashed tenant identity (the real name is unknown) |
| `deployment` | TEXT | Deployment type (default: `on-prem`) |
| `payload` | TEXT | Full anonymized aggregate JSON |
| `received_at` | TEXT | Server receive timestamp |
| `feature_count` | INTEGER | Number of features in payload |
| `total_events` | INTEGER | Sum of invocations across all features |

---

## 9. API Reference

### Event Ingestion — `POST /api/events/batch`

Ingest a batch of telemetry events. Consent is checked server-side for each event.

**Request body:**
```json
{
  "events": [
    {
      "eventId": "evt_lk3m2n_a1b2c3",
      "tenantId": "tenant_a",
      "featureId": "loan-origination.kyc",
      "channel": "web",
      "userId": "u_3f7a2b",
      "sessionId": "sess_abc12345",
      "journeyId": "j_xyz98765",
      "outcome": "completed",
      "timestamp": "2026-05-10T09:30:00.000Z",
      "meta": { "source": "web-app" }
    }
  ]
}
```

**Constraints:** Max 1000 events per batch. `tenantId` and `featureId` are required.

**Response:**
```json
{
  "success": true,
  "total": 1,
  "accepted": 1,
  "rejected": 0,
  "invalid": 0
}
```

---

### `GET /api/events/consent/:tenantId`

Check if telemetry is enabled for a tenant. Called by the SDK on initialization.

**Response:** `{ "telemetryEnabled": true }`

---

### `GET /api/analytics/heatmap`

Feature adoption heatmap across tenants.

**Query params:** `?days=30` (default 30) · `?tenantId=tenant_a` (optional filter)

**Response:** Array of `{ feature_id, tenant_id, count, last_used, feature_name, module, licensed_to }` — includes zero-count rows for unused features.

---

### `GET /api/analytics/funnel/:journeyName`

Journey funnel with drop-off analysis.

**Supported journeys:** `loan-origination`, `kyc`, `payments`

**Query params:** `?tenantId=tenant_a` (optional filter)

**Response:**
```json
{
  "journey": "loan-origination",
  "totalEntries": 500,
  "totalCompletions": 140,
  "overallConversion": 28,
  "funnel": [
    { "step": 1, "featureId": "loan-origination.start", "label": "start", "sessions": 500, "dropOffRate": 0, "conversionFromTop": 100 },
    { "step": 2, "featureId": "loan-origination.kyc", "label": "kyc", "sessions": 420, "dropOffRate": 16, "conversionFromTop": 84 }
  ]
}
```

---

### `GET /api/analytics/license-usage`

License vs actual usage comparison.

**Query params:** `?days=30` (default 30)

**Response:** Array of features with `licensedTenants`, `activeTenants`, `adoptionRate`.

---

### `GET /api/analytics/comparison`

Cross-tenant behavioral comparison.

**Response:** `{ tenants: [...], tenantSummary: [...], features: [...] }` — per-tenant invocation counts and adoption rates per feature.

---

### `GET /api/analytics/weekly-trend`

Weekly session counts with linear regression forecast.

**Query params:** `?weeks=8` (default 12) · `?tenantId=tenant_a` (optional filter)

**Response:**
```json
{
  "trend": [
    { "week": "2026-W01", "actual": 342, "predicted": 310, "isFuture": false },
    { "week": "Forecast W+1", "actual": null, "predicted": 398, "isFuture": true }
  ],
  "regression": {
    "slope": 8.4,
    "intercept": 271.2,
    "direction": "growing",
    "weeklyGrowth": "+8 sessions/week"
  }
}
```

---

### `POST /api/analytics/seed-demo`

Seed the database with realistic synthetic events across all 5 tenants, 35 features, and 10 weeks of history. Safe to call multiple times (uses `INSERT OR IGNORE`).

**Response:** `{ "success": true, "seeded": 14382, "breakdown": { ... } }`

---

### `GET /api/governance/consent`

List all tenant consent configurations with event counts.

---

### `PATCH /api/governance/consent/:tenantId`

Update consent settings for a tenant. Writes an immutable audit log entry.

**Body:** `{ "telemetryEnabled": true, "syncEnabled": false, "retentionDays": 90, "changedBy": "admin" }`

---

### `GET /api/governance/audit-log`

Retrieve the immutable audit trail.

**Query params:** `?tenantId=tenant_a` (optional filter) · `?limit=100` (max 500)

---

### `POST /api/sync/aggregate`

Receive an anonymized aggregate payload from an on-prem federated aggregator.

**Body:** Anonymized payload JSON from `onprem-aggregator.js`.

---

### `GET /api/sync/aggregates/summary`

High-level summary of all on-prem sync activity — tenant hashes, sync counts, total events synced, last sync time.

---

### `GET /health`

Server health check. Returns DB statistics, uptime, and server time.

```json
{
  "status": "ok",
  "uptime": 1823,
  "database": {
    "totalEvents": 14382,
    "activeTenants": 5,
    "registeredFeatures": 35,
    "databaseSizeKB": 4096
  }
}
```

---

## 10. Security Model

### JWT Authentication (`server/middleware/auth.js`)

The `requireAuth` middleware validates a `Bearer` token on all `/api/*` routes. In the hackathon demo, authentication is bypassed by default (`REQUIRE_AUTH` env var not set) so the React dashboard works without a full auth flow. In production, set `REQUIRE_AUTH=true` and issue tokens containing `{ tenantId, role }` claims.

The JWT secret defaults to a hardcoded dev value and must be overridden in production via `JWT_SECRET` environment variable.

### Rate Limiting

Two separate `express-rate-limit` instances protect different route groups:

- **Event ingestion:** 60 requests/minute/IP. Returns HTTP 429 with `Retry-After` header on violation.
- **Analytics reads:** 300 requests/minute/IP. More generous for dashboard polling.

Rate limit violations are logged to stdout with the offending IP address.

### Input Validation

- `POST /api/events/batch`: validates that `events` is a non-empty array, max 1000 items, each item has a string `tenantId` and `featureId`
- `PATCH /api/governance/consent/:tenantId`: validates `tenantId` length ≤ 100, `retentionDays` in range 1–3650
- `GET /api/events/consent/:tenantId`: validates `tenantId` length ≤ 100
- All query parameters are sanitized and cast to expected types before SQL binding

All SQL queries use parameterized statements — no string concatenation, no SQL injection surface.

### CORS Configuration

The server accepts requests from any origin (`*`) in development. For production, set `ALLOWED_ORIGINS` in the environment file to restrict to known dashboard domains.

---

## 11. Demo Data & Tenant Personas

The `POST /api/analytics/seed-demo` endpoint populates the database with synthetic but **behaviorally realistic** data. The seed design encodes deliberate patterns that the dashboard surfaces as actionable intelligence.

### Tenant Personas

| Tenant | Profile | Channel Mix | Event Multiplier |
|--------|---------|-------------|-----------------|
| `tenant_a` | Power user — uses nearly everything | Web, Mobile, API | 1.0× (baseline) |
| `tenant_b` | Average user — solid core usage | Web, Mobile | 0.75× |
| `tenant_c` | API-heavy — backend-driven integration | API, Web | 0.45× |
| `tenant_d` | New / low-adoption — onboarding phase | Web, Mobile | 0.20× |
| `tenant_e` | Churning — very low engagement | Web only | 0.08× |

### Feature ROI Tiers

| Tier | Examples | Behavior |
|------|----------|----------|
| **High ROI** | loan-origination.start, payments.emi-dashboard | High base counts, predominantly `completed` outcomes |
| **Medium ROI** | kyc.video-kyc, payments.auto-debit | Moderate counts, mixed completion/abandonment |
| **Low ROI** | loan-origination.esign, kyc.fatca, account.emandate | Rare invocations, high abandonment rate |
| **Dead** | account.limit-change, report.custom-dashboard | Near-zero counts — licensed but essentially unused (strongest churn signal) |

Events are spread across **10 weeks of history** with random intra-week and intra-day distribution, enabling the weekly trend chart and linear regression to produce meaningful results.

---

## 12. Production Scalability Path

The hackathon MVP uses SQLite for zero-dependency local deployment. The architecture is designed so that the ingestion and storage layers can be swapped without touching business logic.

### Event Bus: SQLite → Apache Kafka

The `POST /api/events/batch` handler currently writes directly to SQLite. In production, this route would instead push each event to a Kafka topic (`finspark.events`). Downstream consumers would handle persistence, real-time alerting, and stream analytics.

### Analytics Store: SQLite → ClickHouse

SQLite is replaced with ClickHouse or Apache Pinot for the analytics queries. The `events` table schema maps directly — ClickHouse's columnar storage enables sub-second aggregations over billions of rows.

### Containerization

The backend is fully Dockerized:
```bash
docker build -t finspark-intelligence .
docker run -p 4000:4000 \
  -e JWT_SECRET=your-production-secret \
  -e REQUIRE_AUTH=true \
  -e NODE_ENV=production \
  finspark-intelligence
```

In production, the container is orchestrated via Kubernetes with:
- Horizontal Pod Autoscaler on the ingestion deployment
- Separate deployments for ingestion vs analytics (different scaling profiles)
- ClickHouse cluster for the analytics store
- Redis for rate limit state sharing across pods

### Multi-Tenant Scaling

The SQL-level `WHERE tenant_id = ?` isolation pattern scales directly to thousands of tenants with no architectural change. ClickHouse's partition-by-tenant capability enables tenant-level data locality for compliance requirements.

---

## 13. Quick Start

**Prerequisites:** Node.js v18 or higher.

### Option A: Run Locally (Under 2 Minutes)

**Step 1 — Start the backend:**
```bash
git clone https://github.com/anvitha-km/finspark-intelligence.git
cd finspark-intelligence/server
npm install
npm start
# Server starts at http://localhost:4000
# Health check: http://localhost:4000/health
```

The database ships pre-seeded with demo data. If you want a fresh seed:
```bash
curl -X POST http://localhost:4000/api/analytics/seed-demo
```

**Step 2 — Start the dashboard:**
```bash
# In a new terminal
cd ../dashboard
npm install
npm start
# Dashboard opens at http://localhost:3000
```

**Step 3 — Log in:**

Use any of the three demo accounts:
- **Admin:** `admin` / `admin123` — full access to all tabs and governance controls
- **Viewer:** `viewer` / `view123` — read-only, all tabs except Governance
- **Tenant Manager:** `manager` / `tenant123` — filtered to own tenant data only

**Step 4 — Simulate On-Prem Federated Sync (optional):**
```bash
# From the /server directory:
node onprem-aggregator.js tenant_a
# Computes local aggregates, saves onprem-aggregate-tenant_a.json
# Attempts sync to the running server

node onprem-aggregator.js tenant_b
node onprem-aggregator.js tenant_c
# Run for each tenant to populate the System Status tab
```

### Option B: Docker

```bash
git clone https://github.com/anvitha-km/finspark-intelligence.git
cd finspark-intelligence
docker build -t finspark-intelligence .
docker run -p 4000:4000 finspark-intelligence
# Then start the dashboard with npm start in /dashboard
```

### Option C: Windows One-Click

```
Double-click start.bat
```

### Live Demo

- **Frontend:** [https://finspark-dash.vercel.app](https://finspark-dash.vercel.app)
- **Backend API:** Hosted on Railway (auto-connected to the Vercel frontend)

---

## 14. Environment Configuration

Copy `server/env.example` to `server/.env` and configure:

```bash
# Server
PORT=4000
NODE_ENV=production

# Security
JWT_SECRET=your-very-long-random-secret-here
REQUIRE_AUTH=true    # Set to 'true' to enforce JWT in production

# CORS — comma-separated allowed dashboard origins
ALLOWED_ORIGINS=https://your-dashboard.vercel.app

# Data retention — global default (per-tenant overrides this)
RETENTION_DAYS=90

# Rate limiting
EVENT_RATE_LIMIT=60      # requests per minute for event ingestion
ANALYTICS_RATE_LIMIT=300 # requests per minute for analytics reads
```

---

## 15. Hackathon Evaluation Matrix

| Criterion | Weight | How This Project Delivers |
|-----------|--------|---------------------------|
| **Enterprise Realism & Architectural Soundness** | 20% | Four-layer architecture with clean separation of concerns. Multi-channel SDK (Web JS, Python, iOS Swift). Standardized event schema with dot-notation taxonomy. Docker containerization. WAL-mode SQLite with proper indexing. Dual rate limiting with separate policies for ingestion vs reads. |
| **Deployment Awareness (On-Prem + Cloud)** | 15% | Distinct code paths for each model: Cloud tenants stream events in real-time; On-Prem tenants run the local federated aggregator which computes and transmits only anonymized statistics. Raw events never leave the on-prem network. The System Status tab visualizes both deployment types. |
| **Security & Compliance Design** | 15% | PII masking at source via one-way hash (pre-event-object-creation). Dual-layer consent enforcement (SDK client-side + server-side). SQL-level row filtering for tenant isolation. JWT middleware (production-ready). Immutable append-only audit log with full before/after state. Configurable per-tenant data retention with scheduled enforcement. |
| **Scalability & Multi-Tenant Readiness** | 15% | Five isolated tenants in the demo. SQL isolation pattern scales to thousands. Documented upgrade path from SQLite → ClickHouse and direct-write → Kafka. Batch ingestion endpoint supports 1000 events per request. All analytics queries are indexed. |
| **Business Impact Clarity** | 15% | Lost revenue calculated in dollars from funnel drop-off data (`sessions × $2,500 × 4% approval rate`). Churn risk scored by feature adoption rate. Renewal and upsell candidates identified by 80%+ adoption. Trend direction classified and labelled for executive communication. |
| **Innovation & Practicality** | 10% | Least Squares Linear Regression implemented directly on live SQLite data for 4-week forward forecasts — no external ML library. Federated aggregation model designed for real on-prem network constraints. Tenant persona simulation in seed data produces visually distinct, analytically meaningful patterns. |
| **Ease of Deployability** | 10% | Zero complex dependencies. Single `npm install && npm start` in each directory. Pre-seeded database included. Vercel + Railway deployment pre-configured. Docker image available. Windows `start.bat` for non-technical evaluators. |

---

*Built for FinSpark Hackathon 2026 · Problem Statement 1: Enterprise Feature Intelligence & Usage Analytics Framework*
