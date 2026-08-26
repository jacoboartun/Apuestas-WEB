/**
 * AETHERIS CASINO - Backend Service: AdminService
 * Administrative operations: RTP control, balance adjustment,
 * user management, theme customization, and platform reset.
 * All methods enforce admin role.
 */

/** Guard: throws if current session is not admin. */
function requireAdmin() {
    if (!window.AuthService.isAdmin()) throw new Error('Acceso denegado: se requiere rol Administrador.');
}

// ─────────────────────────────────────────────
//  RTP MANAGEMENT
// ─────────────────────────────────────────────

/**
 * Sets the global RTP multiplier (applies on top of per-game RTP).
 * @param {number} rtp  - Value between 0.5 and 1.5
 */
async function setGlobalRtp(rtp) {
    requireAdmin();
    rtp = Math.min(1.5, Math.max(0.5, parseFloat(rtp)));
    window.StateCore.getState().globalRtp = rtp;
    window.StateCore.logEvent('ADMIN_GLOBAL_RTP', `RTP Global → ${(rtp * 100).toFixed(0)}%`);
    await window.StateCore.save();
}

/**
 * Sets the RTP for a specific game.
 * @param {string} gameId
 * @param {number} rtp  - Value between 0.5 and 1.5
 */
async function setGameRtp(gameId, rtp) {
    requireAdmin();
    const state = window.StateCore.getState();
    rtp = Math.min(1.5, Math.max(0.5, parseFloat(rtp)));
    if (!state.gameConfigs[gameId]) throw new Error(`Juego desconocido: ${gameId}`);
    state.gameConfigs[gameId].rtp = rtp;
    window.StateCore.logEvent('ADMIN_GAME_RTP', `${gameId} RTP → ${(rtp * 100).toFixed(0)}%`);
    await window.StateCore.save();
}

/**
 * Enables or disables a game for all users.
 * @param {string} gameId
 * @param {boolean} enabled
 */
async function setGameEnabled(gameId, enabled) {
    requireAdmin();
    const state = window.StateCore.getState();
    if (!state.gameConfigs[gameId]) throw new Error(`Juego desconocido: ${gameId}`);
    state.gameConfigs[gameId].enabled = !!enabled;
    window.StateCore.logEvent('ADMIN_GAME_STATUS', `${gameId} ${enabled ? 'habilitado' : 'deshabilitado'}`);
    await window.StateCore.save();
}

// ─────────────────────────────────────────────
//  USER MANAGEMENT
// ─────────────────────────────────────────────

/**
 * Sets the balance of a target user directly.
 * @param {string} email
 * @param {number} amount
 */
async function setUserBalance(email, amount) {
    requireAdmin();
    const state = window.StateCore.getState();
    const user = state.users.find(u => u.email === email.toLowerCase().trim());
    if (!user) throw new Error(`Usuario no encontrado: ${email}`);
    user.balance = parseFloat(parseFloat(amount).toFixed(2));
    window.StateCore.logEvent('ADMIN_BALANCE_SET', `Balance de ${email} → $${user.balance.toFixed(2)}`);
    await window.StateCore.save();
}

/**
 * Returns a list of all users (public view).
 * @returns {Array}
 */
function getAllUsers() {
    requireAdmin();
    const state = window.StateCore.getState();
    return state.users.map(window.UserModel.toPublicUser);
}

// ─────────────────────────────────────────────
//  THEME / STYLE MANAGEMENT
// ─────────────────────────────────────────────

/**
 * Applies a preset theme by ID. Persists it in state.
 * @param {string} themeId - One of: default, neon, gold, midnight, crimson
 */
async function applyPresetTheme(themeId) {
    requireAdmin();
    const preset = window.ThemeConfigModel.THEME_PRESETS[themeId];
    if (!preset) throw new Error(`Tema desconocido: ${themeId}`);
    window.StateCore.getState().activeTheme = { ...preset };
    window.StateCore.logEvent('ADMIN_THEME_CHANGE', `Tema cambiado a: ${preset.name}`);
    await window.StateCore.save();
    window.ThemeManager.applyTheme(preset);
}

/**
 * Applies a fully custom theme config object. Persists it.
 * @param {Object} themeConfig - Partial ThemeConfig properties to override
 */
async function applyCustomTheme(themeConfig) {
    requireAdmin();
    const current = window.StateCore.getState().activeTheme || window.ThemeConfigModel.THEME_PRESETS.default;
    const merged = { ...current, ...themeConfig, id: 'custom', name: 'Personalizado' };
    window.StateCore.getState().activeTheme = merged;
    window.StateCore.logEvent('ADMIN_THEME_CUSTOM', 'Tema personalizado aplicado');
    await window.StateCore.save();
    window.ThemeManager.applyTheme(merged);
}

/**
 * Returns the currently active theme.
 * @returns {Object}
 */
function getActiveTheme() {
    const state = window.StateCore.getState();
    return state ? (state.activeTheme || window.ThemeConfigModel.THEME_PRESETS.default) : window.ThemeConfigModel.THEME_PRESETS.default;
}

// ─────────────────────────────────────────────
//  PLATFORM STATS & RESET
// ─────────────────────────────────────────────

/**
 * Returns current platform statistics.
 * @returns {Object}
 */
function getPlatformStats() {
    requireAdmin();
    return window.StateCore.getState().platformStats;
}

/**
 * Returns all audit logs.
 * @returns {Array}
 */
function getAuditLogs() {
    requireAdmin();
    return window.StateCore.getState().auditLogs;
}

/**
 * Resets platform stats, RTPs, and user balances to factory defaults.
 */
async function resetPlatform() {
    requireAdmin();
    await window.StateCore.hardReset();
    window.StateCore.logEvent('ADMIN_PLATFORM_RESET', 'Plataforma restablecida a valores de fábrica.');
}

// ─────────────────────────────────────────────
//  MERCADO PAGO CONFIG
// ─────────────────────────────────────────────

/**
 * Gets the current Mercado Pago configuration.
 * @returns {Object} { publicKey, accessToken }
 */
function getMercadoPagoConfig() {
    requireAdmin();
    return window.StateCore.getState().mercadoPagoConfig || { publicKey: '', accessToken: '' };
}

/**
 * Sets the Mercado Pago configuration.
 * @param {string} publicKey 
 * @param {string} accessToken 
 */
async function setMercadoPagoConfig(publicKey, accessToken) {
    requireAdmin();
    const state = window.StateCore.getState();
    state.mercadoPagoConfig = {
        publicKey: publicKey.trim(),
        accessToken: accessToken.trim()
    };
    window.StateCore.logEvent('ADMIN_MP_CONFIG', 'Configuración de Mercado Pago actualizada');
    await window.StateCore.save();
}

// Export to global scope
window.AdminService = {
    setGlobalRtp,
    setGameRtp,
    setGameEnabled,
    setUserBalance,
    getAllUsers,
    applyPresetTheme,
    applyCustomTheme,
    getActiveTheme,
    getPlatformStats,
    getAuditLogs,
    resetPlatform,
    getMercadoPagoConfig,
    setMercadoPagoConfig
};
