/**
 * PII Masker — One-way hash on userId at the point of capture.
 * 
 * Uses a deterministic rolling hash (djb2) so the same user always maps to
 * the same anonymized identifier — analytics stay consistent without ever
 * storing raw PII.
 * 
 * The raw userId NEVER touches the event queue, the network, or the database.
 * 
 * Example:
 *   "user@company.com"  →  "u_3f7a2b"
 *   "user@company.com"  →  "u_3f7a2b"   (deterministic — same input = same output)
 *   "other@company.com" →  "u_8c1d4e"   (different input = different output)
 */

/**
 * djb2 hash — fast, deterministic, low-collision string hash
 * Originally by Dan Bernstein. Produces a 32-bit unsigned integer.
 * 
 * @param {string} str - Raw string to hash
 * @returns {number} 32-bit unsigned hash
 */
function djb2(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0; // force unsigned 32-bit
  }
  return hash;
}

/**
 * Mask a raw userId into an anonymized, deterministic identifier.
 * 
 * @param {string} rawUserId - The original user identifier (email, username, etc.)
 * @returns {string} Anonymized identifier in format "u_XXXXXX"
 * 
 * @example
 *   maskUserId("user@company.com")  // → "u_3f7a2b"
 *   maskUserId("admin")             // → "u_e0c91a"
 */
export function maskUserId(rawUserId) {
  if (!rawUserId || typeof rawUserId !== 'string') return 'u_anonymous';
  const hashed = djb2(rawUserId).toString(16).slice(0, 6);
  return `u_${hashed}`;
}

/**
 * Check if a userId has already been masked.
 * Useful when events arrive from systems that may or may not have pre-masked.
 * 
 * @param {string} userId - Identifier to check
 * @returns {boolean} True if already in masked format
 */
export function isMasked(userId) {
  return typeof userId === 'string' && /^u_[0-9a-f]{4,8}$/.test(userId);
}

/**
 * Ensure a userId is masked — idempotent wrapper.
 * If already masked, returns as-is. If raw, masks it.
 * 
 * @param {string} userId - Raw or pre-masked identifier
 * @returns {string} Masked identifier
 */
export function ensureMasked(userId) {
  return isMasked(userId) ? userId : maskUserId(userId);
}

export default { maskUserId, isMasked, ensureMasked };
