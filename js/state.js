// Aetheris Casino - State and Security Manager
const STATE_KEY = 'aetheris_casino_state';
const STATE_SECRET = 'aetheris_crypto_salt_2026_x97b';

// Helper: Hashing SHA-256 using Web Crypto API
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Calculate integrity checksum for user accounts
async function generateUserChecksum(user, secret) {
    const payload = `${user.email}:${Number(user.balance).toFixed(2)}:${user.role}:${Number(user.winnings).toFixed(2)}:${Number(user.losses).toFixed(2)}`;
    return await sha256(payload + secret);
}

// Initialize Default State
async function getDefaultState() {
    const userPassHash = await sha256('user123');
    const adminPassHash = await sha256('admin123');

    const defaultUsers = [
        {
            email: 'user@aetheris.com',
            passwordHash: userPassHash,
            role: 'user',
            balance: 0.00,
            winnings: 0.00,
            losses: 0.00,
            vipLevel: 1,
            xp: 0,
            history: [],
            checksum: ''
        },
        {
            email: 'admin@aetheris.com',
            passwordHash: adminPassHash,
            role: 'admin',
            balance: 0.00,
            winnings: 0.00,
            losses: 0.00,
            vipLevel: 10,
            xp: 999999,
            history: [],
            checksum: ''
        },
        {
            email: 'jacobocastelblanco@gmail.com',
            passwordHash: await sha256('admin1234'),
            role: 'admin',
            balance: 0.00,
            winnings: 0.00,
            losses: 0.00,
            vipLevel: 10,
            xp: 999999,
            history: [],
            checksum: ''
        }
    ];

    // Compute checksums for default users
    for (let u of defaultUsers) {
        u.checksum = await generateUserChecksum(u, STATE_SECRET);
    }

    return {
        users: defaultUsers,
        currentUser: null,
        rtpSettings: {
            globalRtp: 0.95, // 95% Return to Player by default
            gameRtps: {
                slots: 0.96,
                crash: 0.97,
                plinko: 0.98,
                mines: 0.96,
                roulette: 0.973, // European single zero
                blackjack: 0.99,
                poker: 0.95,
                baccarat: 0.989,
                craps: 0.986,
                videopoker: 0.995,
                sicbo: 0.972,
                scratch: 0.85,
                coinflip: 0.98,
                bingo: 0.90,
                lottery: 0.70,
                keno: 0.80,
                quinielas: 0.75,
                sports: 0.92,
                wheel: 0.94,
                livedealer: 0.97
            }
        },
        platformStats: {
            totalBets: 0,
            totalWins: 0,
            totalVolume: 0.00,
            totalPayouts: 0.00,
            houseProfit: 0.00
        },
        gameVisibility: {}, // Keyed by gameId. If false, the game is hidden.
        mercadoPagoConfig: {
            publicKey: '',
            accessToken: ''
        },
        auditLogs: [
            { timestamp: Date.now(), action: 'SYSTEM_INITIALIZATION', details: 'Aetheris State Engine Started Securely' }
        ]
    };
}

// URL de tu aplicación web de Google Apps Script (Sigue las instrucciones en backend/drive_script.js)
const DRIVE_APP_URL = 'https://script.google.com/macros/s/AKfycbwYOjIEpIczN8SDmHgH9oBlXcEVpzrVfoNaebBOuxSxa43FNPeQMm9yIgQ-V-XldCwm/exec';

class StateManager {
    constructor() {
        this.state = null;
        this.isLoaded = false;
        this.securityAlertTriggered = false;
    }

    async init() {
        try {
            if (DRIVE_APP_URL === 'REEMPLAZAR_CON_TU_URL_DE_APPS_SCRIPT') {
                console.warn('⚠️ Google Drive App Script URL no configurada. Por favor, revisa backend/drive_script.js');
                throw new Error("URL no configurada");
            }

            const response = await fetch(DRIVE_APP_URL);
            const doc = await response.json();

            if (!doc || Object.keys(doc).length === 0 || doc.error) {
                this.state = await getDefaultState();
                await this.save();
            } else {
                this.state = doc;
                this.state.currentUser = sessionStorage.getItem('aetheris_current_user') || null;

                // Ensure new fields exist for old saves
                if (!this.state.mercadoPagoConfig) {
                    this.state.mercadoPagoConfig = { publicKey: '', accessToken: '' };
                }
                if (!this.state.gameVisibility) {
                    this.state.gameVisibility = {};
                }

                // Ensure jacobocastelblanco is an admin in existing states
                if (!this.state.users.find(u => u.email === 'jacobocastelblanco@gmail.com')) {
                    const jacobo = {
                        email: 'jacobocastelblanco@gmail.com',
                        passwordHash: await sha256('admin1234'),
                        role: 'admin',
                        balance: 0.00,
                        winnings: 0.00,
                        losses: 0.00,
                        vipLevel: 10,
                        xp: 999999,
                        history: [],
                        checksum: ''
                    };
                    jacobo.checksum = await generateUserChecksum(jacobo, STATE_SECRET);
                    this.state.users.push(jacobo);
                    await this.save();
                }

                // Validate state integrity on load
                const integrityCheck = await this.verifyStateIntegrity();
                if (!integrityCheck) {
                    this.securityAlertTriggered = true;
                    console.error("SECURITY BREACH DETECTED: Google Drive state tampering.");
                    if (window.onSecurityBreach) window.onSecurityBreach();
                }
            }
            this.isLoaded = true;

        } catch (e) {
            console.error("Error initializing StateManager from Google Drive, using defaults:", e);
            this.state = await getDefaultState();
            this.isLoaded = true;
        }
    }

    async save() {
        if (this.state && !this.securityAlertTriggered && DRIVE_APP_URL !== 'REEMPLAZAR_CON_TU_URL_DE_APPS_SCRIPT') {
            // Update checksums for all users before saving
            for (let user of this.state.users) {
                user.checksum = await generateUserChecksum(user, STATE_SECRET);
            }
            
            // Save to Google Drive but do not persist currentUser globally
            const stateToSave = { ...this.state };
            delete stateToSave.currentUser;
            
            try {
                // Usamos text/plain para evitar un preflight CORS extra en Apps Script
                await fetch(DRIVE_APP_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(stateToSave)
                });
            } catch (err) {
                console.error("Error guardando en Google Drive:", err);
            }
        }
    }

    async verifyStateIntegrity() {
        if (!this.state || !this.state.users) return false;
        for (let user of this.state.users) {
            const currentHash = user.checksum;
            const expectedHash = await generateUserChecksum(user, STATE_SECRET);
            if (currentHash !== expectedHash) {
                return false;
            }
        }
        return true;
    }

    async register(email, password, role = 'user') {
        if (!this.isLoaded) await this.init();
        
        email = email.trim().toLowerCase();
        if (this.state.users.some(u => u.email === email)) {
            throw new Error('Email already registered.');
        }

        const passwordHash = await sha256(password);
        const newUser = {
            email,
            passwordHash,
            role,
            balance: 0.00,
            winnings: 0.00,
            losses: 0.00,
            vipLevel: 1,
            xp: 0,
            history: [],
            checksum: ''
        };
        newUser.checksum = await generateUserChecksum(newUser, STATE_SECRET);
        this.state.users.push(newUser);
        
        this.logEvent('USER_REGISTERED', `New account created: ${email} (${role})`);
        await this.save();
        return newUser;
    }

    async login(email, password) {
        if (!this.isLoaded) await this.init();

        email = email.trim().toLowerCase();
        const passwordHash = await sha256(password);
        
        const user = this.state.users.find(u => u.email === email && u.passwordHash === passwordHash);
        if (!user) {
            this.logEvent('LOGIN_FAILED', `Attempted email: ${email}`);
            throw new Error('Invalid email or password.');
        }

        // Verify account integrity specifically
        const computedChecksum = await generateUserChecksum(user, STATE_SECRET);
        if (user.checksum !== computedChecksum) {
            this.securityAlertTriggered = true;
            this.logEvent('SECURITY_TAMPERING_BLOCKED', `Account ${email} failed state validation checksum`);
            if (window.onSecurityBreach) window.onSecurityBreach();
            throw new Error('Account security validation failed.');
        }

        this.state.currentUser = user.email;
        sessionStorage.setItem('aetheris_current_user', user.email);
        this.logEvent('USER_LOGIN', `Logged in successfully: ${email}`);
        await this.save();
        return user;
    }

    logout() {
        if (this.state.currentUser) {
            this.logEvent('USER_LOGOUT', `Logged out: ${this.state.currentUser}`);
            this.state.currentUser = null;
            sessionStorage.removeItem('aetheris_current_user');
            this.save();
        }
    }

    getCurrentUser() {
        if (!this.state.currentUser) return null;
        return this.state.users.find(u => u.email === this.state.currentUser);
    }

    logEvent(action, details) {
        if (!this.state.auditLogs) this.state.auditLogs = [];
        this.state.auditLogs.unshift({
            timestamp: Date.now(),
            action,
            details
        });
        // Limit logs size to 200 items
        if (this.state.auditLogs.length > 200) {
            this.state.auditLogs.pop();
        }
    }

    // Process Bet outcome
    async settleBet(gameId, betAmount, winAmount, winDetails = '') {
        const user = this.getCurrentUser();
        if (!user) throw new Error('No user is logged in.');
        if (user.balance < betAmount) throw new Error('Insufficient balance.');

        betAmount = Number(betAmount);
        winAmount = Number(winAmount);

        // Update user state
        user.balance = Number((user.balance - betAmount + winAmount).toFixed(2));
        if (winAmount > betAmount) {
            user.winnings = Number((user.winnings + (winAmount - betAmount)).toFixed(2));
            user.xp += Math.floor(betAmount * 2);
        } else {
            user.losses = Number((user.losses + (betAmount - winAmount)).toFixed(2));
            user.xp += Math.floor(betAmount * 1.5);
        }

        // Update VIP levels (1000 XP per level threshold)
        const newLevel = Math.min(10, Math.floor(user.xp / 1000) + 1);
        if (newLevel > user.vipLevel) {
            user.vipLevel = newLevel;
            this.logEvent('VIP_LEVEL_UP', `User ${user.email} reached VIP Level ${newLevel}`);
        }

        // Push game history
        user.history.unshift({
            timestamp: Date.now(),
            gameId,
            bet: betAmount,
            win: winAmount,
            net: Number((winAmount - betAmount).toFixed(2)),
            details: winDetails
        });
        if (user.history.length > 50) user.history.pop();

        // Update platform-wide stats
        this.state.platformStats.totalBets += 1;
        if (winAmount > 0) this.state.platformStats.totalWins += 1;
        this.state.platformStats.totalVolume = Number((this.state.platformStats.totalVolume + betAmount).toFixed(2));
        this.state.platformStats.totalPayouts = Number((this.state.platformStats.totalPayouts + winAmount).toFixed(2));
        this.state.platformStats.houseProfit = Number((this.state.platformStats.totalVolume - this.state.platformStats.totalPayouts).toFixed(2));

        this.logEvent('GAME_SETTLED', `${user.email} bet $${betAmount} on ${gameId}, won $${winAmount}. ${winDetails}`);

        await this.save();
        return {
            newBalance: user.balance,
            vipLevel: user.vipLevel,
            xp: user.xp
        };
    }

    async updateWallet(amount, isDeposit = true) {
        const user = this.getCurrentUser();
        if (!user) throw new Error('No user is logged in.');
        
        amount = Number(amount);
        if (amount <= 0) throw new Error('Invalid wallet amount.');

        if (isDeposit) {
            user.balance = Number((user.balance + amount).toFixed(2));
            this.logEvent('WALLET_DEPOSIT', `${user.email} deposited $${amount.toFixed(2)}`);
        } else {
            if (user.balance < amount) throw new Error('Insufficient funds to withdraw.');
            user.balance = Number((user.balance - amount).toFixed(2));
            this.logEvent('WALLET_WITHDRAWAL', `${user.email} withdrew $${amount.toFixed(2)}`);
        }

        await this.save();
        return user.balance;
    }

    // Admin commands
    setRtpSettings(globalRtp, gameRtps = {}) {
        const admin = this.getCurrentUser();
        if (!admin || admin.role !== 'admin') throw new Error('Unauthorized.');

        this.state.rtpSettings.globalRtp = Number(globalRtp);
        for (let gameId in gameRtps) {
            if (this.state.rtpSettings.gameRtps.hasOwnProperty(gameId)) {
                this.state.rtpSettings.gameRtps[gameId] = Number(gameRtps[gameId]);
            }
        }

        this.logEvent('ADMIN_RTP_UPDATE', `Global RTP set to ${(globalRtp * 100).toFixed(0)}%`);
        this.save();
    }

    adjustUserBalance(email, amount) {
        const admin = this.getCurrentUser();
        if (!admin || admin.role !== 'admin') throw new Error('Unauthorized.');

        const targetUser = this.state.users.find(u => u.email === email.trim().toLowerCase());
        if (!targetUser) throw new Error('Target user not found.');

        targetUser.balance = Number(Number(amount).toFixed(2));
        this.logEvent('ADMIN_BALANCE_ADJUSTMENT', `Set balance for ${email} to $${targetUser.balance.toFixed(2)}`);
        this.save();
    }

    setGameVisibility(gameId, isVisible) {
        const admin = this.getCurrentUser();
        if (!admin || admin.role !== 'admin') throw new Error('Unauthorized.');

        if (!this.state.gameVisibility) this.state.gameVisibility = {};
        this.state.gameVisibility[gameId] = !!isVisible;

        this.logEvent('ADMIN_GAME_VISIBILITY', `Juego ${gameId} ${isVisible ? 'habilitado' : 'deshabilitado'}`);
        this.save();
    }

    setMercadoPagoConfig(publicKey, accessToken) {
        const admin = this.getCurrentUser();
        if (!admin || admin.role !== 'admin') throw new Error('Unauthorized.');

        this.state.mercadoPagoConfig = {
            publicKey: publicKey.trim(),
            accessToken: accessToken.trim()
        };
        this.logEvent('ADMIN_MP_CONFIG_UPDATE', 'Mercado Pago credentials updated');
        this.save();
    }

    async resetPlatformState() {
        const defaultS = await getDefaultState();
        // Keep registration data but reset statistics and settings
        this.state.rtpSettings = defaultS.rtpSettings;
        this.state.platformStats = defaultS.platformStats;
        this.state.auditLogs = [
            { timestamp: Date.now(), action: 'ADMIN_RESET', details: 'Platform statistics and RTP reset by administrator' }
        ];

        // Reset balances for users
        for (let user of this.state.users) {
            user.balance = 0.00;
            user.winnings = 0.00;
            user.losses = 0.00;
            user.history = [];
            user.xp = 0;
            user.vipLevel = 1;
            user.checksum = await generateUserChecksum(user, STATE_SECRET);
        }

        this.securityAlertTriggered = false;
        await this.save();
    }

    // Check if security error triggered, return lock status
    isSecurityAlertActive() {
        return this.securityAlertTriggered;
    }
}

// Instantiate state manager globally
window.stateManager = new StateManager();
// Initialize as early as possible
window.stateManager.init();
