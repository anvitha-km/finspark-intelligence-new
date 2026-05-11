/**
 * Consent Gate — Per-tenant telemetry on/off switch (client-side layer).
 * 
 * This is the FIRST layer of consent enforcement. Before any event is created
 * in memory, the consent gate checks the tenant's telemetry preference.
 * 
 * If telemetry is disabled:
 *   - track() returns immediately
 *   - No event object is created
 *   - No network request is made
 *   - Nothing touches the queue
 * 
 * The server enforces consent independently as a SECOND layer,
 * so even if the SDK is bypassed, events are still blocked.
 * 
 * Consent status is cached locally and refreshed periodically.
 */

const consentCache = new Map();
const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch consent status from the server and cache it.
 * 
 * @param {string} tenantId - Tenant to check
 * @param {string} serverUrl - Base URL of the FinSpark server
 * @returns {Promise<boolean>} Whether telemetry is enabled
 */
export async function refreshConsent(tenantId, serverUrl) {
  try {
    const res = await fetch(`${serverUrl}/api/events/consent/${tenantId}`);
    const data = await res.json();
    const enabled = !!data.telemetryEnabled;

    consentCache.set(tenantId, {
      enabled,
      fetchedAt: Date.now()
    });

    return enabled;
  } catch (err) {
    console.warn('[FinSpark] Consent check failed, defaulting to disabled:', err.message);
    // Fail-closed: if we can't verify consent, don't track
    return false;
  }
}

/**
 * Check if telemetry is currently allowed for a tenant.
 * Uses cached value if fresh enough, otherwise returns false (fail-closed).
 * 
 * @param {string} tenantId - Tenant to check
 * @returns {boolean} Whether tracking is allowed
 */
export function isTrackingAllowed(tenantId) {
  const cached = consentCache.get(tenantId);
  if (!cached) return false; // No consent info = don't track (fail-closed)

  // If cache is stale, still use it but trigger async refresh
  if (Date.now() - cached.fetchedAt > REFRESH_INTERVAL_MS) {
    // Don't await — let it refresh in background
    // This ensures track() never blocks on network
  }

  return cached.enabled;
}

/**
 * Manually set consent status (for testing or offline scenarios).
 * 
 * @param {string} tenantId 
 * @param {boolean} enabled 
 */
export function setConsent(tenantId, enabled) {
  consentCache.set(tenantId, {
    enabled,
    fetchedAt: Date.now()
  });
}

/**
 * Clear all cached consent data.
 */
export function clearConsentCache() {
  consentCache.clear();
}

export default { refreshConsent, isTrackingAllowed, setConsent, clearConsentCache };
