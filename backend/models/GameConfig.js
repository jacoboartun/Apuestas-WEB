/**
 * AETHERIS CASINO - Backend Model: GameConfig
 * Defines per-game configuration schema and default values.
 */

/**
 * All game IDs recognized by the platform.
 */
const GAME_IDS = [
    'slots', 'crash', 'plinko', 'mines', 'roulette', 'blackjack',
    'poker', 'baccarat', 'craps', 'videopoker', 'sicbo', 'scratch',
    'coinflip', 'bingo', 'lottery', 'keno', 'quinielas', 'sports',
    'wheel', 'livedealer'
];

/**
 * Creates a default game configuration.
 */
function createGameConfig(gameId, rtpOverride = null) {
    const defaults = {
        slots:      { rtp: 0.96, maxBet: 5000, minBet: 1, enabled: true },
        crash:      { rtp: 0.97, maxBet: 5000, minBet: 1, enabled: true },
        plinko:     { rtp: 0.98, maxBet: 5000, minBet: 1, enabled: true },
        mines:      { rtp: 0.96, maxBet: 5000, minBet: 1, enabled: true },
        roulette:   { rtp: 0.973, maxBet: 5000, minBet: 1, enabled: true },
        blackjack:  { rtp: 0.99, maxBet: 5000, minBet: 1, enabled: true },
        poker:      { rtp: 0.95, maxBet: 5000, minBet: 1, enabled: true },
        baccarat:   { rtp: 0.989, maxBet: 5000, minBet: 1, enabled: true },
        craps:      { rtp: 0.986, maxBet: 5000, minBet: 1, enabled: true },
        videopoker: { rtp: 0.995, maxBet: 5000, minBet: 1, enabled: true },
        sicbo:      { rtp: 0.972, maxBet: 5000, minBet: 1, enabled: true },
        scratch:    { rtp: 0.85,  maxBet: 100,  minBet: 10, enabled: true },
        coinflip:   { rtp: 0.98,  maxBet: 5000, minBet: 1, enabled: true },
        bingo:      { rtp: 0.90,  maxBet: 40,   minBet: 10, enabled: true },
        lottery:    { rtp: 0.70,  maxBet: 10,   minBet: 10, enabled: true },
        keno:       { rtp: 0.80,  maxBet: 5000, minBet: 1, enabled: true },
        quinielas:  { rtp: 0.75,  maxBet: 10,   minBet: 10, enabled: true },
        sports:     { rtp: 0.92,  maxBet: 5000, minBet: 1, enabled: true },
        wheel:      { rtp: 0.94,  maxBet: 5000, minBet: 1, enabled: true },
        livedealer: { rtp: 0.97,  maxBet: 5000, minBet: 1, enabled: true },
    };

    const base = defaults[gameId] || { rtp: 0.95, maxBet: 5000, minBet: 1, enabled: true };
    if (rtpOverride !== null) base.rtp = rtpOverride;
    return { gameId, ...base };
}

/**
 * Returns all game configs with their defaults.
 * @returns {Object} Map of gameId -> GameConfig
 */
function createAllGameConfigs() {
    const configs = {};
    GAME_IDS.forEach(id => { configs[id] = createGameConfig(id); });
    return configs;
}

// Export to global scope
window.GameConfigModel = { createGameConfig, createAllGameConfigs, GAME_IDS };
