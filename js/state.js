// Aetheris Casino - State Manager (cliente de la API con sesiones del backend)
//
// A partir de esta versión, el backend (backend/drive_script.js) es quien
// valida contraseñas, roles de administrador y calcula saldos. Este archivo
// ya NO guarda la base de datos completa en el navegador ni hace "checksums"
// locales: eso era seguridad cosmética, porque cualquiera podía leer el
// secreto en este mismo archivo. Ahora la identidad de cada usuario se
// demuestra con un token de sesión que emite el servidor.
//
// Mantiene la misma interfaz pública (métodos y forma de `state`) que ya
// usan router.js, gameEngine.js y los 20 módulos de js/games/, para no tener
// que tocar esos archivos.

const SESSION_TOKEN_KEY = 'aetheris_session_token';

// URL de la API: detecta si corre localmente en un servidor HTTP y usa '/api'
const API_URL = (window.location.protocol.startsWith('http'))
    ? `${window.location.origin}/api`
    : 'https://script.google.com/macros/s/AKfycbwYOjIEpIczN8SDmHgH9oBlXcEVpzrVfoNaebBOuxSxa43FNPeQMm9yIgQ-V-XldCwm/exec';
const DRIVE_APP_URL = API_URL;

class StateManager {
    constructor() {
        // `state` conserva la misma forma que antes para que el resto del
        // frontend (RTP, visibilidad de juegos, panel admin) siga funcionando
        // sin cambios. Se llena con datos públicos al iniciar, y con datos de
        // administración solo cuando se abre el panel de admin.
        this.state = {
            rtpSettings: { globalRtp: 0.95, gameRtps: {} },
            gameVisibility: {},
            mercadoPagoConfig: { publicKey: '', hasAccessToken: false },
            platformStats: { totalBets: 0, totalWins: 0, totalVolume: 0, totalPayouts: 0, houseProfit: 0 },
            auditLogs: [],
            adminUsers: []
        };
        this.currentUser = null; // usuario autenticado (vista pública, sin hashes)
        this.token = null;
        this.isLoaded = false;
        this.securityAlertTriggered = false;
    }

    async init() {
        this.token = sessionStorage.getItem(SESSION_TOKEN_KEY) || null;

        try {
            const response = await fetch(DRIVE_APP_URL);
            const publicConfig = await response.json();
            if (publicConfig && !publicConfig.error) {
                this.state.rtpSettings = publicConfig.rtpSettings || this.state.rtpSettings;
                this.state.gameVisibility = publicConfig.gameVisibility || {};
                this.state.mercadoPagoConfig = publicConfig.mercadoPagoConfig || { publicKey: '' };
            }
        } catch (e) {
            console.error('No se pudo cargar la configuración pública desde el backend:', e);
        }

        if (this.token) {
            try {
                const me = await this._call('getMe', {});
                this.currentUser = me.user;
            } catch (e) {
                // Token inválido o vencido: se descarta la sesión local.
                this.token = null;
                sessionStorage.removeItem(SESSION_TOKEN_KEY);
            }
        }

        this.isLoaded = true;
        if (typeof window.handleRoute === 'function') {
            window.handleRoute();
        }
    }

    // Llama a una acción del backend. Usa text/plain para que el navegador no
    // dispare un preflight CORS (igual que en la versión original).
    async _call(action, payload) {
        const body = Object.assign({ action, token: this.token }, payload);
        const response = await fetch(DRIVE_APP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(body)
        });
        const result = await response.json();
        if (!result || result.success === false) {
            throw new Error((result && result.error) || 'Ocurrió un error al comunicarse con el servidor.');
        }
        return result;
    }

    _setSession(token, user) {
        this.token = token;
        this.currentUser = user;
        sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    }

    // ------------------------- Autenticación -------------------------

    async requestRegistrationCode(email, password) {
        return this._call('requestCode', { email, password, role: 'user', type: 'register' });
    }

    async completeRegistration(email, code) {
        const result = await this._call('completeRegistration', { email, code });
        this._setSession(result.token, result.user);
        return result.user;
    }

    async requestPasswordResetCode(email) {
        return this._call('requestCode', { email, type: 'reset' });
    }

    async completePasswordReset(email, code, newPassword) {
        const result = await this._call('completePasswordReset', { email, code, newPassword });
        this._setSession(result.token, result.user);
        return result.user;
    }

    async changePassword(oldPassword, newPassword) {
        return this._call('changePassword', { oldPassword, newPassword });
    }

    async login(email, password) {
        const result = await this._call('login', { email, password });
        this._setSession(result.token, result.user);
        return result.user;
    }

    async logout() {
        // Limpia la sesión local de inmediato (síncrono, antes del primer
        // `await`) para que la UI reaccione al instante; el aviso al servidor
        // se hace en segundo plano y no bloquea el cierre de sesión visible.
        const token = this.token;
        this.token = null;
        this.currentUser = null;
        sessionStorage.removeItem(SESSION_TOKEN_KEY);

        if (token) {
            try {
                await fetch(DRIVE_APP_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ action: 'logout', token })
                });
            } catch (e) { /* best-effort */ }
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    // ------------------------- Juego y billetera -------------------------

    async settleBet(gameId, betAmount, winAmount, winDetails = '') {
        if (!this.currentUser) throw new Error('No user is logged in.');
        const result = await this._call('settleBet', { gameId, betAmount, winAmount, details: winDetails });
        this.currentUser = result.user;
        return {
            newBalance: result.user.balance,
            vipLevel: result.user.vipLevel,
            xp: result.user.xp
        };
    }

    async updateWallet(amount, isDeposit = true) {
        if (!this.currentUser) throw new Error('No user is logged in.');
        const result = await this._call('wallet', { amount, isDeposit });
        this.currentUser = result.user;
        return result.user.balance;
    }

    async createMercadoPagoPreference(amount) {
        const result = await this._call('createMpPreference', { amount, returnUrl: window.location.href });
        if (result.user) {
            this.currentUser = result.user;
        }
        return result;
    }

    async processPseDeposit(pseData) {
        const result = await this._call('processPseDeposit', pseData);
        if (result.user) {
            this.currentUser = result.user;
        }
        return result;
    }

    async confirmPaymentGateway(paymentId) {
        const result = await this._call('confirmPaymentGateway', { paymentId });
        if (result.user) {
            this.currentUser = result.user;
        }
        return result;
    }

    async cancelPaymentGateway(paymentId) {
        return await this._call('cancelPaymentGateway', { paymentId });
    }

    // ------------------------- Administración -------------------------

    async fetchAdminDashboard() {
        const result = await this._call('adminGetDashboard', {});
        this.state.platformStats = result.platformStats;
        this.state.rtpSettings = result.rtpSettings;
        this.state.gameVisibility = result.gameVisibility;
        this.state.mercadoPagoConfig = result.mercadoPagoConfig;
        this.state.auditLogs = result.auditLogs;
        this.state.adminUsers = result.users;
        return result;
    }

    async setRtpSettings(globalRtp, gameRtps = {}) {
        await this._call('adminSetRtp', { globalRtp, gameRtps });
        this.state.rtpSettings.globalRtp = Number(globalRtp);
        Object.assign(this.state.rtpSettings.gameRtps, gameRtps);
    }

    async adjustUserBalance(email, amount) {
        await this._call('adminAdjustBalance', { targetEmail: email, amount });
    }

    async setGameVisibility(gameId, isVisible) {
        await this._call('adminSetVisibility', { gameId, isVisible });
        this.state.gameVisibility[gameId] = !!isVisible;
    }

    async setMercadoPagoConfig(publicKey, accessToken) {
        await this._call('adminSetMpConfig', { publicKey, accessToken });
    }

    async setSmtpConfig(server, port, username, password, alertEmail) {
        await this._call('adminSetSmtpConfig', { server, port, username, password, alertEmail });
    }

    async testSmtpAlert() {
        await this._call('adminTestSmtp', {});
    }

    async savePayoutAccount(bankData) {
        const result = await this._call('savePayoutAccount', bankData);
        this.currentUser = result.user;
        return result.user;
    }

    async submitPqr(pqrData) {
        return await this._call('submitPqr', pqrData);
    }

    async adminGetPqrs() {
        return await this._call('adminGetPqrs', {});
    }

    async adminResolvePqr(pqrId, status, response) {
        return await this._call('adminResolvePqr', { pqrId, status, response });
    }

    async resetPlatformState() {
        await this._call('adminResetPlatform', {});
    }

    // Mantenido por compatibilidad con el resto del frontend. La integridad
    // del saldo ahora la garantiza el servidor en cada acción; si el servidor
    // rechaza el token (sesión adulterada o vencida) se refleja como alerta.
    isSecurityAlertActive() {
        return this.securityAlertTriggered;
    }
}

// Instantiate state manager globally
window.stateManager = new StateManager();
// Initialize as early as possible
window.stateManager.init();
