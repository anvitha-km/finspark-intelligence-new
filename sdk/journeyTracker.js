/**
 * Journey Tracker — Stitches multi-step user flows by journeyId.
 * 
 * In enterprise workflows (e.g., loan origination), a single user action
 * spans multiple features across multiple sessions. The Journey Tracker
 * assigns a persistent journeyId that links all related events.
 * 
 * Example flow:
 *   Step 1: loan-origination.start       → journeyId: "j_abc123"
 *   Step 2: loan-origination.kyc         → journeyId: "j_abc123"
 *   Step 3: loan-origination.doc-upload  → journeyId: "j_abc123"
 *   Step 4: loan-origination.credit-check → journeyId: "j_abc123"
 *   Step 5: loan-origination.approval    → journeyId: "j_abc123"
 * 
 * This enables funnel analysis: seeing exactly where users drop off.
 */

const activeJourneys = new Map();

/**
 * Generate a short random journey ID.
 * @returns {string} Journey ID in format "j_XXXXXXXX"
 */
function generateJourneyId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return `j_${id}`;
}

/**
 * Start a new journey for a given journey name and session.
 * 
 * @param {string} journeyName - Name of the journey (e.g., "loan-origination")
 * @param {string} sessionId - Current session identifier
 * @returns {string} The assigned journeyId
 */
export function startJourney(journeyName, sessionId) {
  const journeyId = generateJourneyId();
  const key = `${journeyName}:${sessionId}`;

  activeJourneys.set(key, {
    journeyId,
    journeyName,
    sessionId,
    startedAt: new Date().toISOString(),
    steps: [],
    completed: false
  });

  return journeyId;
}

/**
 * Get the active journey ID for a given journey name and session.
 * If no active journey exists, starts a new one automatically.
 * 
 * @param {string} journeyName - Name of the journey
 * @param {string} sessionId - Current session identifier
 * @returns {string} The active journeyId
 */
export function getJourneyId(journeyName, sessionId) {
  const key = `${journeyName}:${sessionId}`;
  const journey = activeJourneys.get(key);

  if (journey && !journey.completed) {
    return journey.journeyId;
  }

  return startJourney(journeyName, sessionId);
}

/**
 * Record a step within an active journey.
 * 
 * @param {string} journeyName - Name of the journey
 * @param {string} sessionId - Current session identifier
 * @param {string} featureId - The feature invoked at this step
 * @param {string} outcome - Result: 'invoked', 'completed', 'abandoned', 'error'
 */
export function recordStep(journeyName, sessionId, featureId, outcome = 'invoked') {
  const key = `${journeyName}:${sessionId}`;
  const journey = activeJourneys.get(key);

  if (!journey) return;

  journey.steps.push({
    featureId,
    outcome,
    timestamp: new Date().toISOString()
  });
}

/**
 * Mark a journey as completed.
 * 
 * @param {string} journeyName 
 * @param {string} sessionId 
 */
export function completeJourney(journeyName, sessionId) {
  const key = `${journeyName}:${sessionId}`;
  const journey = activeJourneys.get(key);
  if (journey) {
    journey.completed = true;
    journey.completedAt = new Date().toISOString();
  }
}

/**
 * Abandon a journey (user dropped off).
 * 
 * @param {string} journeyName 
 * @param {string} sessionId 
 */
export function abandonJourney(journeyName, sessionId) {
  const key = `${journeyName}:${sessionId}`;
  const journey = activeJourneys.get(key);
  if (journey) {
    journey.completed = true;
    journey.abandonedAt = new Date().toISOString();
  }
}

/**
 * Get summary of an active journey (for debugging/logging).
 * 
 * @param {string} journeyName 
 * @param {string} sessionId 
 * @returns {object|null} Journey state
 */
export function getJourneySummary(journeyName, sessionId) {
  const key = `${journeyName}:${sessionId}`;
  return activeJourneys.get(key) || null;
}

/**
 * Clean up stale journeys older than maxAge.
 * 
 * @param {number} maxAgeMs - Maximum age in milliseconds (default: 1 hour)
 */
export function cleanupStaleJourneys(maxAgeMs = 3600000) {
  const now = Date.now();
  for (const [key, journey] of activeJourneys.entries()) {
    if (now - new Date(journey.startedAt).getTime() > maxAgeMs) {
      activeJourneys.delete(key);
    }
  }
}

export default {
  startJourney, getJourneyId, recordStep,
  completeJourney, abandonJourney,
  getJourneySummary, cleanupStaleJourneys
};
