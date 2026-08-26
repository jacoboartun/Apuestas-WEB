/**
 * AETHERIS CASINO - Backend Model: User
 * Defines the User schema, roles, and factory methods.
 */

const USER_ROLES = {
    USER: 'user',
    ADMIN: 'admin'
};

const VIP_THRESHOLDS = [0, 1000, 3000, 7000, 15000, 30000, 60000, 120000, 250000, 500000];

/**
 * Creates a new User object with default values.
 * @param {string} email
 * @param {string} passwordHash - Pre-hashed password
 * @param {string} role - 'user' or 'admin'
 * @returns {Object} User model
 */
function createUser(email, passwordHash, role = USER_ROLES.USER) {
    return {
        email: email.toLowerCase().trim(),
        passwordHash,
        role,
        balance: role === USER_ROLES.ADMIN ? 1_000_000.00 : 5_000.00,
        winnings: 0.00,
        losses: 0.00,
        totalWagered: 0.00,
        vipLevel: 1,
        xp: 0,
        history: [],       // Array of { timestamp, gameId, bet, win, net, details }
        createdAt: Date.now(),
        lastLoginAt: Date.now(),
        checksum: ''       // Will be filled by security module
    };
}

/**
 * Calculates the VIP level based on XP points.
 * @param {number} xp
 * @returns {number} Level 1-10
 */
function calculateVipLevel(xp) {
    for (let i = VIP_THRESHOLDS.length - 1; i >= 0; i--) {
        if (xp >= VIP_THRESHOLDS[i]) return i + 1;
    }
    return 1;
}

/**
 * Returns the XP needed for the next VIP level.
 * @param {number} currentLevel
 * @returns {number}
 */
function xpToNextLevel(currentLevel) {
    if (currentLevel >= VIP_THRESHOLDS.length) return Infinity;
    return VIP_THRESHOLDS[currentLevel];
}

/**
 * Returns a safe public-facing representation of the user (no passwordHash).
 * @param {Object} user
 * @returns {Object}
 */
function toPublicUser(user) {
    const { passwordHash, checksum, ...publicUser } = user;
    return publicUser;
}

// Export to global scope for browser use
window.UserModel = { createUser, calculateVipLevel, xpToNextLevel, toPublicUser, USER_ROLES };
