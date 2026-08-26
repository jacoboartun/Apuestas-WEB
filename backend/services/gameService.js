/**
 * AETHERIS CASINO - Backend Service: GameService
 * Handles bet settlement, RTP retrieval, and game-round accounting.
 */

/**
 * Returns the effective RTP multiplier for a given game,
 * combining the global RTP with the game-specific override.
 * @param {string} gameId
 * @returns {number} RTP value (e.g. 0.97 for 97%)
 */
function getEffectiveRtp(gameId) {
    const state = window.StateCore.getState();
    if (!state) return 0.95;

    const globalRtp = state.globalRtp || 0.95;
    const gameConfig = state.gameConfigs[gameId];
    const gameRtp = gameConfig ? gameConfig.rtp : 0.95;

    // Combined: global modifier × game-specific RTP
    return parseFloat((globalRtp * gameRtp).toFixed(4));
}

/**
 * Settles a completed game round: debits the bet, credits any winnings,
 * updates XP, VIP level, and platform-wide statistics, and writes to audit log.
 *
 * @param {string} gameId
 * @param {number} betAmount  - Amount wagered
 * @param {number} winAmount  - Amount won (0 if lost)
 * @param {string} details    - Human-readable round summary
 * @returns {Promise<Object>} { newBalance, vipLevel, xp, net }
 */
async function settleBet(gameId, betAmount, winAmount, details = '') {
    await window.StateCore.ensureLoaded();
    const user = window.AuthService.getCurrentUser();
    if (!user) throw new Error('No hay sesión activa.');

    betAmount = parseFloat(parseFloat(betAmount).toFixed(2));
    winAmount = parseFloat(parseFloat(winAmount).toFixed(2));

    if (user.balance < betAmount) throw new Error('Saldo insuficiente.');

    // Update user financials
    const net = parseFloat((winAmount - betAmount).toFixed(2));
    user.balance = parseFloat((user.balance - betAmount + winAmount).toFixed(2));
    user.totalWagered = parseFloat(((user.totalWagered || 0) + betAmount).toFixed(2));

    if (net > 0) {
        user.winnings = parseFloat(((user.winnings || 0) + net).toFixed(2));
        user.xp += Math.max(1, Math.floor(betAmount * 2));
    } else {
        user.losses = parseFloat(((user.losses || 0) + Math.abs(net)).toFixed(2));
        user.xp += Math.max(1, Math.floor(betAmount * 1.5));
    }

    // Update VIP level
    const newLevel = window.UserModel.calculateVipLevel(user.xp);
    const leveledUp = newLevel > user.vipLevel;
    user.vipLevel = newLevel;
    if (leveledUp) {
        window.StateCore.logEvent('VIP_LEVEL_UP', `${user.email} alcanzó VIP Nivel ${newLevel}`);
    }

    // Push to history
    user.history.unshift({ timestamp: Date.now(), gameId, bet: betAmount, win: winAmount, net, details });
    if (user.history.length > 100) user.history.splice(100);

    // Update platform stats
    const stats = window.StateCore.getState().platformStats;
    stats.totalBets += 1;
    if (winAmount > 0) stats.totalWins += 1;
    stats.totalVolume = parseFloat((stats.totalVolume + betAmount).toFixed(2));
    stats.totalPayouts = parseFloat((stats.totalPayouts + winAmount).toFixed(2));
    stats.houseProfit = parseFloat((stats.totalVolume - stats.totalPayouts).toFixed(2));

    window.StateCore.logEvent(
        net >= 0 ? 'GAME_WIN' : 'GAME_LOSS',
        `${user.email} | ${gameId} | Bet $${betAmount} | Win $${winAmount} | Net ${net >= 0 ? '+' : ''}$${net} | ${details}`
    );

    await window.StateCore.save();

    return {
        newBalance: user.balance,
        vipLevel: user.vipLevel,
        xp: user.xp,
        net,
        leveledUp,
    };
}

/**
 * Returns the game config for a given game.
 * @param {string} gameId
 * @returns {Object|null}
 */
function getGameConfig(gameId) {
    const state = window.StateCore.getState();
    return state ? (state.gameConfigs[gameId] || null) : null;
}

// Export to global scope
window.GameService = { settleBet, getEffectiveRtp, getGameConfig };
