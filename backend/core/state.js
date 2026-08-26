/**
 * AETHERIS CASINO - Backend Core: State
 * Central state persistence layer using localStorage.
 * Provides load, save, reset, logging, and breach handling.
 * Zero DOM dependencies — pure data operations.
 */

const STATE_STORAGE_KEY = 'aetheris_v2_state';

let _state = null;
let _loaded = false;
let _securityBreached = false;

/**
 * Builds the default initial platform state.
 */
async function buildDefaultState() {
    const { createUser } = window.UserModel;
    const { sha256, stampUserChecksum } = window.SecurityCore;
    const { createAllGameConfigs } = window.GameConfigModel;
    const { THEME_PRESETS } = window.ThemeConfigModel;

    const userPassHash = await sha256('user123');
    const adminPassHash = await sha256('admin123');

    const defaultUser = createUser('user@aetheris.com', userPassHash, 'user');
    const defaultAdmin = createUser('admin@aetheris.com', adminPassHash, 'admin');

    await stampUserChecksum(defaultUser);
    await stampUserChecksum(defaultAdmin);

    return {
        version: 2,
        users: [defaultUser, defaultAdmin],
        session: null,
        gameConfigs: createAllGameConfigs(),
        globalRtp: 0.95,
        platformStats: {
            totalBets: 0,
            totalWins: 0,
            totalVolume: 0.00,
            totalPayouts: 0.00,
            houseProfit: 0.00,
        },
        activeTheme: THEME_PRESETS.default,
        mercadoPagoConfig: {
            publicKey: '',
            accessToken: ''
        },
        auditLogs: [
            { timestamp: Date.now(), action: 'SYSTEM_INIT', details: 'Aetheris v2 inicializado' }
        ],
    };
}

/**
 * Initializes the state: loads from localStorage or creates default.
 */
async function init() {
    if (_loaded) return;
    try {
        const raw = localStorage.getItem(STATE_STORAGE_KEY);
        if (!raw) {
            _state = await buildDefaultState();
            await save();
        } else {
            _state = JSON.parse(raw);

            // Validate integrity
            const valid = await window.SecurityCore.verifyStateIntegrity(_state);
            if (!valid) {
                triggerSecurityBreach();
                return;
            }

            // Migrate older state versions if needed
            if (!_state.gameConfigs) _state.gameConfigs = window.GameConfigModel.createAllGameConfigs();
            if (!_state.activeTheme) _state.activeTheme = window.ThemeConfigModel.THEME_PRESETS.default;
            if (!_state.globalRtp) _state.globalRtp = 0.95;
            if (!_state.mercadoPagoConfig) _state.mercadoPagoConfig = { publicKey: '', accessToken: '' };
        }
        _loaded = true;
    } catch (err) {
        console.error('[StateCore] Init error, resetting to default:', err);
        _state = await buildDefaultState();
        await save();
        _loaded = true;
    }
}

/**
 * Ensures state is loaded; call this before any state access.
 */
async function ensureLoaded() {
    if (!_loaded) await init();
}

/**
 * Saves the current state to localStorage after refreshing all checksums.
 */
async function save() {
    if (_securityBreached) return;
    if (!_state) return;

    // Refresh checksums on all users before persisting
    for (const user of _state.users) {
        await window.SecurityCore.stampUserChecksum(user);
    }

    localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(_state));
}

/**
 * Returns the raw state object. Always call ensureLoaded() first.
 */
function getState() {
    return _state;
}

/**
 * Appends an entry to the audit log.
 * @param {string} action
 * @param {string} details
 */
function logEvent(action, details) {
    if (!_state) return;
    if (!_state.auditLogs) _state.auditLogs = [];
    _state.auditLogs.unshift({ timestamp: Date.now(), action, details });
    if (_state.auditLogs.length > 500) _state.auditLogs.splice(500);
}

/**
 * Triggers a security breach: locks state writes and notifies UI.
 */
function triggerSecurityBreach() {
    _securityBreached = true;
    logEvent('SECURITY_BREACH', 'Estado adulterado detectado. Sesión bloqueada.');
    if (typeof window.onSecurityBreach === 'function') {
        window.onSecurityBreach();
    }
}

/**
 * Returns true if a security breach has been detected.
 */
function isBreached() {
    return _securityBreached;
}

/**
 * Resets platform to factory defaults (admin action after breach).
 */
async function hardReset() {
    localStorage.removeItem(STATE_STORAGE_KEY);
    _state = null;
    _loaded = false;
    _securityBreached = false;
    await init();
}

// Export to global scope
window.StateCore = {
    init,
    ensureLoaded,
    save,
    getState,
    logEvent,
    triggerSecurityBreach,
    isBreached,
    hardReset,
};
