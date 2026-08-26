/**
 * AETHERIS CASINO - Backend Core: Security
 * HMAC-style checksum generation and state integrity verification.
 * This module is purely computational — zero DOM dependencies.
 */

const SECURITY_SALT = 'aetheris_hmac_salt_v2_2026_x97b';

/**
 * Generates a SHA-256 hash using the Web Crypto API.
 * @param {string} message
 * @returns {Promise<string>} Hex digest
 */
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates an integrity checksum for a given user account.
 * The payload includes all financially-sensitive fields.
 * @param {Object} user
 * @returns {Promise<string>} Checksum hex string
 */
async function generateUserChecksum(user) {
    const payload = [
        user.email,
        Number(user.balance).toFixed(2),
        user.role,
        Number(user.winnings).toFixed(2),
        Number(user.losses).toFixed(2),
        Number(user.totalWagered || 0).toFixed(2),
    ].join(':');
    return await sha256(payload + SECURITY_SALT);
}

/**
 * Verifies that a user's current state matches its stored checksum.
 * @param {Object} user - User object including `.checksum`
 * @returns {Promise<boolean>}
 */
async function verifyUserIntegrity(user) {
    if (!user || !user.checksum) return false;
    const expected = await generateUserChecksum(user);
    return expected === user.checksum;
}

/**
 * Verifies all users in a state object.
 * @param {Object} state - Full platform state
 * @returns {Promise<boolean>} true if all users pass
 */
async function verifyStateIntegrity(state) {
    if (!state || !Array.isArray(state.users)) return false;
    for (const user of state.users) {
        const valid = await verifyUserIntegrity(user);
        if (!valid) return false;
    }
    return true;
}

/**
 * Updates the checksum on a user object (mutates in place).
 * @param {Object} user
 * @returns {Promise<Object>} The same user with updated checksum
 */
async function stampUserChecksum(user) {
    user.checksum = await generateUserChecksum(user);
    return user;
}

// Export to global scope
window.SecurityCore = {
    sha256,
    generateUserChecksum,
    verifyUserIntegrity,
    verifyStateIntegrity,
    stampUserChecksum,
};
