/**
 * FinSpark Feature SDK — Core telemetry tracker.
 * 
 * Zero-dependency, lightweight JavaScript SDK for capturing feature usage
 * events across Web, Mobile, API, and Batch channels.
 * 
 * Key design decisions:
 *   - PII masking happens BEFORE the event object is created in memory
 *   - Consent is checked BEFORE any event enters the queue
 *   - Events are batched and flushed periodically to reduce network overhead
 *   - The SDK is domain-agnostic — works with any application
 * 
 * Usage:
 *   import FinSpark from './featureSdk.js';
 * 
 *   const tracker = FinSpark.init({
 *     tenantId: 'tenant_a',
 *     endpoint: 'http://localhost:4000/api/events',
 *     channel: 'web'
 *   });
 * 
 *   tracker.track('loan-origination.kyc', {
 *     userId: 'user@company.com',   // ← automatically hashed before queuing
 *     outcome: 'completed',
 *     meta: { source: 'mobile-app' }
 *   });
 */

import { ensureMasked } from './piiMasker.js';
import { isTrackingAllowed, refreshConsent } from './consentGate.js';
import { getJourneyId, recordStep } from './journeyTracker.js';

const DEFAULT_CONFIG = {
  tenantId: null,
  endpoint: 'http://localhost:4000/api/events',
  channel: 'web',
  batchSize: 20,
  flushIntervalMs: 5000,     // Flush every 5 seconds
  maxQueueSize: 500,         // Drop oldest events if queue overflows
  debug: false
};

/**
 * Generate a unique event ID.
 * @returns {string}
 */
function generateEventId() {
  return 'evt_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

/**
 * Generate a session ID.
 * @returns {string}
 */
function generateSessionId() {
  return 'sess_' + Math.random().toString(36).slice(2, 10);
}

/**
 * Create a FinSpark tracker instance.
 * 
 * @param {object} userConfig - Configuration overrides
 * @returns {object} Tracker instance with track(), flush(), destroy() methods
 */
export function init(userConfig = {}) {
  const config = { ...DEFAULT_CONFIG, ...userConfig };

  if (!config.tenantId) {
    throw new Error('[FinSpark] tenantId is required. Call init({ tenantId: "your_tenant" })');
  }

  const eventQueue = [];
  const sessionId = generateSessionId();
  let flushTimer = null;
  let destroyed = false;

  // Initialize consent check
  refreshConsent(config.tenantId, config.endpoint.replace('/api/events', ''));

  // Start periodic flush
  flushTimer = setInterval(() => {
    if (eventQueue.length > 0) flush();
  }, config.flushIntervalMs);

  /**
   * Track a feature invocation.
   * 
   * @param {string} featureId - Dot-notation feature identifier (e.g., "loan-origination.kyc")
   * @param {object} options - Additional event data
   * @param {string} [options.userId] - Raw user ID (will be hashed automatically)
   * @param {string} [options.outcome] - Event outcome: 'invoked', 'completed', 'abandoned', 'error'
   * @param {string} [options.journeyName] - Journey name for multi-step flow correlation
   * @param {object} [options.meta] - Arbitrary metadata
   */
  function track(featureId, options = {}) {
    if (destroyed) return;

    // ═══ CONSENT GATE (Layer 1) ═══
    if (!isTrackingAllowed(config.tenantId)) {
      if (config.debug) console.log(`[FinSpark] Tracking blocked by consent gate for ${config.tenantId}`);
      return;
    }

    // ═══ PII MASKING (before event creation) ═══
    const maskedUserId = ensureMasked(options.userId || 'anonymous');

    // ═══ JOURNEY CORRELATION ═══
    let journeyId = null;
    if (options.journeyName) {
      journeyId = getJourneyId(options.journeyName, sessionId);
      recordStep(options.journeyName, sessionId, featureId, options.outcome || 'invoked');
    }

    // ═══ BUILD EVENT ═══
    const event = {
      eventId: generateEventId(),
      tenantId: config.tenantId,
      featureId: featureId,
      channel: options.channel || config.channel,
      userId: maskedUserId,                       // ← already hashed, raw NEVER stored
      sessionId: sessionId,
      journeyId: journeyId,
      outcome: options.outcome || 'invoked',
      timestamp: new Date().toISOString(),
      meta: options.meta || {}
    };

    // ═══ QUEUE EVENT ═══
    if (eventQueue.length >= config.maxQueueSize) {
      eventQueue.shift(); // Drop oldest if queue overflows
      if (config.debug) console.warn('[FinSpark] Queue overflow — dropped oldest event');
    }

    eventQueue.push(event);

    if (config.debug) {
      console.log(`[FinSpark] Queued: ${featureId} (queue: ${eventQueue.length})`);
    }

    // Auto-flush if batch size reached
    if (eventQueue.length >= config.batchSize) {
      flush();
    }
  }

  /**
   * Flush all queued events to the server.
   * @returns {Promise<object>} Server response
   */
  async function flush() {
    if (eventQueue.length === 0) return { accepted: 0, rejected: 0 };

    const batch = eventQueue.splice(0, eventQueue.length); // Take all

    try {
      const res = await fetch(`${config.endpoint}/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: batch })
      });

      const result = await res.json();

      if (config.debug) {
        console.log(`[FinSpark] Flushed ${batch.length} events — accepted: ${result.accepted}, rejected: ${result.rejected}`);
      }

      return result;
    } catch (err) {
      // On network failure, push events back to queue for retry
      eventQueue.unshift(...batch);
      if (config.debug) console.error('[FinSpark] Flush failed, events re-queued:', err.message);
      return { accepted: 0, rejected: 0, error: err.message };
    }
  }

  /**
   * Destroy the tracker — stop timers, flush remaining events.
   */
  async function destroy() {
    destroyed = true;
    if (flushTimer) clearInterval(flushTimer);
    if (eventQueue.length > 0) await flush();
  }

  /**
   * Get current queue size (for monitoring/debugging).
   * @returns {number}
   */
  function getQueueSize() {
    return eventQueue.length;
  }

  return {
    track,
    flush,
    destroy,
    getQueueSize,
    sessionId,
    tenantId: config.tenantId
  };
}

export default { init };
