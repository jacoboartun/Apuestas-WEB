// Aetheris Casino - Application Router and UI Coordinator

// Definitions of the 20 games
const GAMES_LIST = [
    { id: 'slots', name: 'Tragamonedas (Slots)', icon: '🎰', category: 'popular', description: 'Gira los rodillos y combina símbolos de la fortuna para ganar multiplicadores masivos.', rtp: 96 },
    { id: 'crash', name: 'Juegos Crash', icon: '🚀', category: 'popular', description: 'El cohete despega y el multiplicador sube. ¿Retirarás a tiempo antes del Crash?', rtp: 97 },
    { id: 'plinko', name: 'Plinko Drop', icon: '🔺', category: 'popular', description: 'Suelta bolas desde el triángulo de clavos y acumula multiplicadores en las canastas.', rtp: 98 },
    { id: 'mines', name: 'Minas', icon: '💣', category: 'popular', description: 'Encuentra gemas brillantes ocultas en el tablero. ¡Cuidado con detonar una mina!', rtp: 96 },
    { id: 'roulette', name: 'Ruleta Europea', icon: '🎡', category: 'dice', description: 'Coloca tus fichas en números, colores o sectores. ¡Mira girar la rueda!', rtp: 97.3 },
    { id: 'blackjack', name: 'Blackjack 21', icon: '🃏', category: 'cards', description: 'Pide carta o plántate para ganarle al crupier sin pasarte de 21.', rtp: 99 },
    { id: 'poker', name: 'Póker Online', icon: '👑', category: 'cards', description: 'Simulador Texas Hold\'em contra oponentes virtuales. Arma la mejor mano.', rtp: 95 },
    { id: 'baccarat', name: 'Baccarat', icon: '🎴', category: 'cards', description: 'Apuesta al Jugador, a la Banca o al Empate en este juego de mesa tradicional.', rtp: 98.9 },
    { id: 'craps', name: 'Dados (Craps)', icon: '🎲', category: 'dice', description: 'Lanza los dados y realiza complejas apuestas sobre la línea de pase.', rtp: 98.6 },
    { id: 'videopoker', name: 'Video Póker', icon: '👾', category: 'cards', description: 'Jacks or Better draw poker. Quédate con las mejores cartas y gana.', rtp: 99.5 },
    { id: 'sicbo', name: 'Sic Bo', icon: '🏮', category: 'dice', description: 'El juego asiático de predicción de la suma de 3 dados vibrantes.', rtp: 97.2 },
    { id: 'scratch', name: 'Rasca y Gana Digital', icon: '🎫', category: 'instant', description: 'Rasca la superficie dorada y alinea 3 símbolos idénticos.', rtp: 85 },
    { id: 'coinflip', name: 'Cara o Cruz', icon: '🪙', category: 'instant', description: 'Una apuesta rápida al 50%. Dobla tu saldo al adivinar la moneda.', rtp: 98 },
    { id: 'bingo', name: 'Bingo Online', icon: '🎱', category: 'lottery', description: 'Compra tus cartones y marca números al ritmo del llamado de las balotas.', rtp: 90 },
    { id: 'lottery', name: 'Loterías Internacionales', icon: '🎟️', category: 'lottery', description: 'Elige tus números de la suerte para participar en los sorteos mundiales rápidos.', rtp: 70 },
    { id: 'keno', name: 'Keno Rápido', icon: '🔢', category: 'lottery', description: 'Selecciona hasta 10 números en la cuadrícula de 80 y acierta las balotas.', rtp: 80 },
    { id: 'quinielas', name: 'Quinielas de Fútbol', icon: '⚽', category: 'sports', description: 'Pronostica el resultado de 5 partidos para llevarte la bolsa acumulada.', rtp: 75 },
    { id: 'sports', name: 'Apuestas Deportivas', icon: '📈', category: 'sports', description: 'Sportsbook en vivo. Apuesta a eventos dinámicos en fútbol, tenis y más.', rtp: 92 },
    { id: 'wheel', name: 'Rueda de la Fortuna', icon: '🎡', category: 'instant', description: 'Gira el gran disco segmentado para enganchar fantásticos multiplicadores de apuesta.', rtp: 94 },
    { id: 'livedealer', name: 'Casino en Vivo', icon: '🎥', category: 'live', description: 'Mesas en vivo simuladas con transmisión en tiempo real y chat interactivo.', rtp: 97 }
];

let activeFilter = 'all';

// Main Router Function
function handleRoute() {
    const hash = window.location.hash || '';
    
    // Hide all view views
    document.getElementById('dashboard-view').style.display = 'none';
    document.getElementById('game-view').style.display = 'none';
    document.getElementById('admin-view').style.display = 'none';

    // Check Security Lock first
    if (window.stateManager.isSecurityAlertActive()) {
        triggerSecurityLockoutUI();
        return;
    }

    if (hash === '#admin') {
        const user = window.stateManager.getCurrentUser();
        if (user && user.role === 'admin') {
            document.getElementById('admin-view').style.display = 'block';
            updateAdminDashboard();
        } else {
            window.location.hash = '';
            showToast('Acceso Denegado: Se requiere rol Administrador.', 'danger');
        }
    } else if (hash.startsWith('#game-')) {
        const gameId = hash.replace('#game-', '');
        const game = GAMES_LIST.find(g => g.id === gameId);
        if (game) {
            loadGameConsole(game);
        } else {
            window.location.hash = '';
        }
    } else {
        // Default Dashboard
        document.getElementById('dashboard-view').style.display = 'block';
        renderGamesGrid();
    }

    updateNavLinks();
    updateUserHud();
}

// Render games grid based on filter
function renderGamesGrid() {
    const container = document.getElementById('games-grid-container');
    container.innerHTML = '';

    const filtered = GAMES_LIST.filter(g => {
        if (window.stateManager.state.gameVisibility && window.stateManager.state.gameVisibility[g.id] === false) return false;

        if (activeFilter === 'all') return true;
        if (activeFilter === 'sports') return g.category === 'sports';
        if (activeFilter === 'live') return g.category === 'live';
        return g.category === activeFilter;
    });

    filtered.forEach((game, index) => {
        const card = document.createElement('div');
        card.className = 'game-card glass';
        card.style.animationDelay = `${index * 0.05}s`;
        card.onclick = () => {
            const user = window.stateManager.getCurrentUser();
            if (!user) {
                openAuthModal('login');
                showToast('Inicia sesión para poder apostar.', 'info');
            } else {
                window.location.hash = `#game-${game.id}`;
            }
        };

        const currentRtpSetting = window.stateManager.state.rtpSettings.gameRtps[game.id] || (game.rtp / 100);

        card.innerHTML = `
            <div class="game-card-img">
                <div class="game-card-icon">${game.icon}</div>
            </div>
            <div class="game-card-info">
                <h3 class="game-card-title">${game.name}</h3>
                <p style="font-size:0.75rem; color:var(--text-muted); margin-bottom:8px; line-height:1.3; height:34px; overflow:hidden;">${game.description}</p>
                <div class="game-card-tag">
                    <span>${game.category.toUpperCase()}</span>
                    <span class="rtp-indicator">RTP: ${(currentRtpSetting * 100).toFixed(1)}%</span>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function filterGames(category, element) {
    // Toggle active tab style
    const tabs = document.querySelectorAll('#dashboard-categories .category-tab');
    tabs.forEach(t => t.classList.remove('active'));
    if (element) element.classList.add('active');

    activeFilter = category;
    renderGamesGrid();
}

function setCategoryFilter(cat) {
    activeFilter = cat;
    const headerLinks = document.querySelectorAll('.header-center .nav-link');
    headerLinks.forEach(link => {
        if (link.getAttribute('href') === `#${cat}` || (cat === 'all' && link.getAttribute('href') === '#')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    if (window.location.hash !== '') {
        window.location.hash = '';
    } else {
        renderGamesGrid();
    }
}

function updateNavLinks() {
    const hash = window.location.hash;
    const headerLinks = document.querySelectorAll('.header-center .nav-link');
    headerLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (hash === '' && href === '#') {
            link.classList.add('active');
        } else if (hash !== '' && href === hash) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// Balance and User Info updates
function updateUserHud() {
    const user = window.stateManager.getCurrentUser();
    const loggedInHud = document.getElementById('logged-in-hud');
    const loggedOutHud = document.getElementById('logged-out-hud');

    if (user) {
        loggedInHud.style.display = 'flex';
        loggedOutHud.style.display = 'none';

        document.getElementById('hud-balance').innerText = `$${user.balance.toFixed(2)}`;
        document.getElementById('hud-email').innerText = user.email;
        document.getElementById('hud-vip').innerText = `VIP Lvl ${user.vipLevel}`;
        document.getElementById('hud-vip').className = `user-badge badge-${user.role}`;

        if (user.role === 'admin') {
            document.getElementById('admin-panel-btn').style.display = 'inline-flex';
        } else {
            document.getElementById('admin-panel-btn').style.display = 'none';
        }
    } else {
        loggedInHud.style.display = 'none';
        loggedOutHud.style.display = 'flex';
    }
}

// Authentication Modal controls
let authMode = 'login';
function openAuthModal(mode) {
    document.getElementById('auth-modal').classList.add('active');
    toggleAuthMode(mode);
}

function closeAuthModal() {
    document.getElementById('auth-modal').classList.remove('active');
    if (typeof cancelVerification === 'function') cancelVerification();
}

function toggleAuthMode(mode) {
    authMode = mode;
    const title = document.getElementById('auth-modal-title');
    const submitBtn = document.getElementById('auth-submit-btn');
    const toggleMsg = document.getElementById('auth-toggle-msg');
    const regFields = document.getElementById('register-only-fields');

    if (mode === 'register') {
        title.innerText = 'Crear Cuenta';
        submitBtn.innerText = 'Registrarse';
        regFields.style.display = 'block';
        toggleMsg.innerHTML = '¿Ya tienes una cuenta? <a href="#" style="color:var(--primary-hover);" onclick="toggleAuthMode(\'login\')">Ingresa aquí</a>';
    } else {
        title.innerText = 'Iniciar Sesión';
        submitBtn.innerText = 'Ingresar';
        regFields.style.display = 'none';
        toggleMsg.innerHTML = '¿No tienes cuenta? <a href="#" style="color:var(--primary-hover);" onclick="toggleAuthMode(\'register\')">Regístrate aquí</a>';
    }
}

// El código de verificación (registro / recuperación) ya no vive en el
// navegador: lo genera y valida el backend. Aquí solo recordamos en qué
// paso del flujo estamos.
window.authProcess = { mode: null, email: null };

async function handleAuthSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const role = document.getElementById('auth-role').value;

    try {
        if (authMode === 'register') {
            window.authProcess = { mode: 'register', email };

            showToast('Enviando código de verificación al correo...', 'info');
            await window.stateManager.requestRegistrationCode(email, password, role);

            document.getElementById('auth-main-step').style.display = 'none';
            document.getElementById('auth-verify-step').style.display = 'block';
            document.getElementById('verify-email-display').innerText = email;
            document.getElementById('reset-pw-fields').style.display = 'none';
        } else {
            await window.stateManager.login(email, password);
            closeAuthModal();
            updateUserHud();
            showToast('¡Bienvenido a Aetheris!', 'success');
            handleRoute();
        }
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

async function startForgotPassword() {
    const email = document.getElementById('auth-email').value;
    if (!email) {
        showToast('Ingresa tu correo electrónico primero.', 'danger');
        return;
    }

    try {
        window.authProcess = { mode: 'reset', email };

        showToast('Enviando código de recuperación al correo...', 'info');
        await window.stateManager.requestPasswordResetCode(email);

        document.getElementById('auth-main-step').style.display = 'none';
        document.getElementById('auth-verify-step').style.display = 'block';
        document.getElementById('verify-email-display').innerText = email;
        document.getElementById('reset-pw-fields').style.display = 'block';
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

function cancelVerification() {
    window.authProcess = { mode: null, email: null };
    const mainStep = document.getElementById('auth-main-step');
    const verifyStep = document.getElementById('auth-verify-step');
    if (mainStep) mainStep.style.display = 'block';
    if (verifyStep) verifyStep.style.display = 'none';
    const verifyCode = document.getElementById('verify-code-input');
    if (verifyCode) verifyCode.value = '';
}

async function submitVerificationCode() {
    const inputCode = document.getElementById('verify-code-input').value;

    try {
        if (window.authProcess.mode === 'register') {
            await window.stateManager.completeRegistration(window.authProcess.email, inputCode);
            showToast('Cuenta verificada y creada con éxito.', 'success');
        } else if (window.authProcess.mode === 'reset') {
            const newPassword = document.getElementById('verify-new-password').value;
            if (!newPassword || newPassword.length < 6) {
                showToast('La nueva contraseña debe tener al menos 6 caracteres.', 'danger');
                return;
            }
            await window.stateManager.completePasswordReset(window.authProcess.email, inputCode, newPassword);
            showToast('Contraseña restablecida con éxito.', 'success');
        }

        cancelVerification();
        closeAuthModal();
        updateUserHud();
        handleRoute();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

function handleLogout() {
    window.stateManager.logout();
    updateUserHud();
    window.location.hash = '';
    showToast('Sesión cerrada correctamente.', 'info');
}

// Wallet Modal
function openWalletModal() {
    const user = window.stateManager.getCurrentUser();
    if (!user) {
        openAuthModal('login');
        return;
    }
    document.getElementById('wallet-balance-val').innerText = `$${user.balance.toFixed(2)}`;
    document.getElementById('wallet-modal').classList.add('active');
}

function closeWalletModal() {
    document.getElementById('wallet-modal').classList.remove('active');
}

async function handleWalletTransaction(isDeposit) {
    const amount = parseFloat(document.getElementById('wallet-amount').value);
    try {
        const newBalance = await window.stateManager.updateWallet(amount, isDeposit);
        document.getElementById('wallet-balance-val').innerText = `$${newBalance.toFixed(2)}`;
        updateUserHud();
        showToast(isDeposit ? `Depósito de $${amount.toFixed(2)} exitoso.` : `Retiro de $${amount.toFixed(2)} exitoso.`, 'success');
        closeWalletModal();
        
        // Refresh active game balance view or admin panel if open
        if (window.location.hash === '#admin') updateAdminDashboard();
        updateUserHud();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

async function handleMercadoPagoDeposit() {
    const amountStr = document.getElementById('wallet-amount').value;
    const amount = parseFloat(amountStr);

    if (isNaN(amount) || amount <= 0) {
        showToast('Monto inválido.', 'danger');
        return;
    }

    try {
        // La preferencia se crea en el servidor (backend/drive_script.js), que es
        // el único lugar donde vive el Access Token de Mercado Pago. El saldo se
        // acredita solo cuando Mercado Pago confirma el pago vía webhook, nunca
        // al simplemente abrir el checkout.
        const initPoint = await window.stateManager.createMercadoPagoPreference(amount);

        showToast('Redirigiendo a Mercado Pago. Tu saldo se acreditará al confirmarse el pago.', 'success');
        closeWalletModal();
        window.open(initPoint, '_blank');

    } catch (err) {
        showToast(err.message, 'danger');
    }
}

// Admin Panel HUD Controls
async function updateAdminDashboard() {
    try {
        await window.stateManager.fetchAdminDashboard();
    } catch (err) {
        showToast(err.message, 'danger');
        return;
    }

    const stats = window.stateManager.state.platformStats;
    const rtp = window.stateManager.state.rtpSettings;

    document.getElementById('admin-total-volume').innerText = `$${stats.totalVolume.toFixed(2)}`;
    document.getElementById('admin-total-payouts').innerText = `$${stats.totalPayouts.toFixed(2)}`;
    
    const profitEl = document.getElementById('admin-house-profit');
    profitEl.innerText = `$${stats.houseProfit.toFixed(2)}`;
    profitEl.style.color = stats.houseProfit >= 0 ? 'var(--success)' : 'var(--danger)';
    
    document.getElementById('admin-total-bets').innerText = stats.totalBets;

    // Sliders
    document.getElementById('slider-global-rtp').value = rtp.globalRtp;
    document.getElementById('val-global-rtp').innerText = `${(rtp.globalRtp * 100).toFixed(0)}%`;

    document.getElementById('slider-slots-rtp').value = rtp.gameRtps.slots;
    document.getElementById('val-slots-rtp').innerText = `${(rtp.gameRtps.slots * 100).toFixed(0)}%`;

    document.getElementById('slider-crash-rtp').value = rtp.gameRtps.crash;
    document.getElementById('val-crash-rtp').innerText = `${(rtp.gameRtps.crash * 100).toFixed(0)}%`;

    document.getElementById('slider-plinko-rtp').value = rtp.gameRtps.plinko;
    document.getElementById('val-plinko-rtp').innerText = `${(rtp.gameRtps.plinko * 100).toFixed(0)}%`;

    // Mercado Pago: el Access Token nunca se envía de vuelta al navegador por
    // seguridad. El campo queda vacío; si ya hay uno guardado se indica con un
    // placeholder, y solo se sobrescribe si el admin escribe uno nuevo.
    const mpConfig = window.stateManager.state.mercadoPagoConfig;
    if (mpConfig) {
        document.getElementById('admin-mp-public-key').value = mpConfig.publicKey || '';
        const tokenInput = document.getElementById('admin-mp-access-token');
        tokenInput.value = '';
        tokenInput.placeholder = mpConfig.hasAccessToken ? 'Ya configurado (oculto por seguridad)' : 'TEST-xxxx...';
    }

    // Admin Game Visibility
    const visibilityGrid = document.getElementById('admin-game-visibility-grid');
    if (visibilityGrid) {
        visibilityGrid.innerHTML = '';
        GAMES_LIST.forEach(game => {
            const isVisible = window.stateManager.state.gameVisibility ? window.stateManager.state.gameVisibility[game.id] !== false : true;
            
            const item = document.createElement('div');
            item.className = 'admin-card glass';
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.justifyContent = 'space-between';
            item.style.padding = '12px 16px';
            item.innerHTML = `
                <div style="display:flex; align-items:center; gap:8px;">
                    <span>${game.icon}</span>
                    <span style="font-weight:600; font-size:0.9rem;">${game.name}</span>
                </div>
                <label style="display:flex; align-items:center; cursor:pointer;">
                    <input type="checkbox" ${isVisible ? 'checked' : ''} onchange="toggleGameVisibility('${game.id}', this)" style="width:18px; height:18px; accent-color:var(--primary);">
                </label>
            `;
            visibilityGrid.appendChild(item);
        });
    }

    // Audit logs loading
    const logBox = document.getElementById('admin-audit-logs');
    logBox.innerHTML = '';
    window.stateManager.state.auditLogs.forEach(log => {
        const item = document.createElement('div');
        item.className = 'log-entry';
        item.innerHTML = `
            <span class="log-timestamp">[${new Date(log.timestamp).toLocaleTimeString()}]</span>
            <span class="log-action">${log.action}</span>: ${log.details}
        `;
        logBox.appendChild(item);
    });
}

async function updateRtpDisplay(slider, type) {
    const val = parseFloat(slider.value);
    document.getElementById(`val-${type}-rtp`).innerText = `${(val * 100).toFixed(0)}%`;

    try {
        // Apply updates directly
        if (type === 'global') {
            await window.stateManager.setRtpSettings(val);
        } else {
            const updates = {};
            updates[type] = val;
            await window.stateManager.setRtpSettings(window.stateManager.state.rtpSettings.globalRtp, updates);
        }
    } catch (e) {
        showToast(e.message, 'danger');
    }
}

async function toggleGameVisibility(gameId, checkbox) {
    try {
        await window.stateManager.setGameVisibility(gameId, checkbox.checked);
        showToast(`Juego ${checkbox.checked ? 'habilitado' : 'oculto'} correctamente.`, 'success');
        // Do not update the full dashboard because it re-renders checkboxes, losing focus, just refresh games grid in background
        if (document.getElementById('dashboard-view').style.display !== 'none') {
            renderGamesGrid();
        }
    } catch (e) {
        showToast(e.message, 'danger');
        checkbox.checked = !checkbox.checked; // revert
    }
}

async function adminAdjustUserBalance() {
    const email = document.getElementById('admin-user-email').value;
    const amount = parseFloat(document.getElementById('admin-user-amount').value);

    try {
        await window.stateManager.adjustUserBalance(email, amount);
        showToast(`Saldo de ${email} actualizado a $${amount.toFixed(2)}`, 'success');
        updateAdminDashboard();
        updateUserHud();
    } catch (e) {
        showToast(e.message, 'danger');
    }
}

async function adminSaveMercadoPagoConfig() {
    const publicKey = document.getElementById('admin-mp-public-key').value;
    const accessToken = document.getElementById('admin-mp-access-token').value;

    try {
        await window.stateManager.setMercadoPagoConfig(publicKey, accessToken);
        showToast('Credenciales de Mercado Pago guardadas correctamente.', 'success');
        updateAdminDashboard();
    } catch (e) {
        showToast(e.message, 'danger');
    }
}

async function confirmResetPlatform() {
    if (confirm('¿Está seguro de reiniciar todas las estadísticas, saldos y configurar el RTP de fábrica?')) {
        await window.stateManager.resetPlatformState();
        showToast('Plataforma restablecida correctamente.', 'success');
        updateAdminDashboard();
        updateUserHud();
    }
}

// Security Breach lockout UI
function triggerSecurityLockoutUI() {
    document.getElementById('security-lock-screen').style.display = 'flex';
    document.getElementById('app-container').style.display = 'none';
}

async function resetStateAfterBreach() {
    localStorage.clear();
    location.reload();
}

window.onSecurityBreach = function() {
    triggerSecurityLockoutUI();
};

// UI Toast Message Alerts
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.style.position = 'fixed';
    toast.style.bottom = '24px';
    toast.style.right = '24px';
    toast.style.padding = '12px 24px';
    toast.style.borderRadius = '10px';
    toast.style.zIndex = '99999';
    toast.style.fontWeight = '600';
    toast.style.fontSize = '0.9rem';
    toast.style.color = '#fff';
    toast.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
    toast.style.transition = 'all 0.3s ease';
    toast.style.transform = 'translateY(100px)';
    toast.style.opacity = '0';
    
    if (type === 'success') {
        toast.style.background = 'var(--success)';
    } else if (type === 'danger') {
        toast.style.background = 'var(--danger)';
    } else {
        toast.style.background = 'var(--primary)';
    }
    
    toast.innerText = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.transform = 'translateY(0)';
        toast.style.opacity = '1';
    }, 100);

    setTimeout(() => {
        toast.style.transform = 'translateY(-20px)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Multi-player Live Chat simulation
const CHAT_PHRASES = [
    "¡Increíble la ronda de tragamonedas! Saqué 40x.",
    "¿Alguien ha probado Sic Bo hoy? Está pagando bien.",
    "Maldición, el cohete explotó a 1.05x 🚀",
    "¡Retiré en 5.5x en Crash! Vamos!",
    "Acabo de meter un Blackjack contra el dealer 🃏",
    "¿Qué opinan de las apuestas deportivas para el partido de la noche?",
    "Alguien me explica Plinko? ¿Conviene jugar en Riesgo Alto?",
    "¡Gané $250 en la Raspa de Oro! ✨",
    "Powerball simulado acumulado está picante.",
    "El crupier de la mesa en vivo me saludó haha 🎥",
    "¡Qué buena racha llevo!",
    "Ojalá metan más apuestas en vivo.",
    "No se olviden de reclamar su nivel VIP.",
    "El RTP está alto hoy!"
];

const CHAT_USERS = [
    { name: "MegaGambler", vip: 3 },
    { name: "LucySpin", vip: 1 },
    { name: "DiceMaster", vip: 5 },
    { name: "PokerFace99", vip: 2 },
    { name: "CrashKing", vip: 8 },
    { name: "PlinkoLover", vip: 1 },
    { name: "CryptoBet", vip: 4 }
];

function simulateChatActivity() {
    const container = document.getElementById('chat-messages-container');
    if (!container) return;

    const user = CHAT_USERS[Math.floor(Math.random() * CHAT_USERS.length)];
    const phrase = CHAT_PHRASES[Math.floor(Math.random() * CHAT_PHRASES.length)];

    const msg = document.createElement('div');
    msg.className = 'chat-msg';
    msg.innerHTML = `
        <div class="chat-username">
            ${user.name} 
            <span class="chat-vip-badge">VIP ${user.vip}</span>
        </div>
        <div>${phrase}</div>
    `;

    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;

    // Remove older messages to avoid DOM bloat
    if (container.children.length > 50) {
        container.children[0].remove();
    }
}

function sendChatMessage() {
    const input = document.getElementById('chat-text-input');
    const val = input.value.trim();
    if (!val) return;

    const user = window.stateManager.getCurrentUser();
    if (!user) {
        openAuthModal('login');
        return;
    }

    const container = document.getElementById('chat-messages-container');
    const msg = document.createElement('div');
    msg.className = 'chat-msg';
    msg.style.borderColor = 'var(--primary)';
    msg.innerHTML = `
        <div class="chat-username" style="color: var(--primary-hover)">
            Tú <span class="chat-vip-badge" style="background:var(--primary); color:white;">VIP ${user.vipLevel}</span>
        </div>
        <div>${val}</div>
    `;

    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
    input.value = '';
}

// Window Event Listeners
window.addEventListener('hashchange', handleRoute);
window.addEventListener('DOMContentLoaded', () => {
    initTheme();
    handleRoute();
    // Simulate chat activity every 4-8 seconds
    setInterval(simulateChatActivity, 6000);
});

// Scroll helper
function scrollToGames() {
    document.getElementById('dashboard-categories').scrollIntoView({ behavior: 'smooth' });
}

// Betting inputs helper
function halveBet() {
    const el = document.getElementById('game-bet-input');
    el.value = Math.max(1, Math.floor(parseFloat(el.value) / 2));
}

function doubleBet() {
    const el = document.getElementById('game-bet-input');
    const user = window.stateManager.getCurrentUser();
    const maxVal = user ? user.balance : 5000;
    el.value = Math.min(maxVal, parseFloat(el.value) * 2);
}

// Theme Manager
function changeTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('aetheris_theme', theme);
}

function initTheme() {
    const savedTheme = localStorage.getItem('aetheris_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const select = document.getElementById('theme-select');
    if (select) select.value = savedTheme;
}
