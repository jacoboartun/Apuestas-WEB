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

        const balanceEl = document.getElementById('hud-balance');
        if (balanceEl) balanceEl.innerText = `$${user.balance.toFixed(2)}`;

        // Set circle avatar initial letter
        const initialEl = document.getElementById('hud-avatar-initial');
        if (initialEl) {
            const initial = (user.fullName || user.email || 'U').charAt(0).toUpperCase();
            initialEl.innerText = initial;
        }

        // Update User Profile Modal contents if elements exist
        const profileEmail = document.getElementById('profile-modal-email');
        if (profileEmail) profileEmail.innerText = user.email;

        const profileName = document.getElementById('profile-modal-name');
        if (profileName) profileName.innerText = user.fullName || user.email.split('@')[0];

        const profileBalance = document.getElementById('profile-modal-balance');
        if (profileBalance) profileBalance.innerText = `$${user.balance.toFixed(2)} COP`;

        const profileVip = document.getElementById('profile-modal-vip');
        if (profileVip) profileVip.innerText = `VIP Lvl ${user.vipLevel}`;

        const profileAvatar = document.getElementById('profile-modal-avatar');
        if (profileAvatar) profileAvatar.innerText = (user.fullName || user.email || 'U').charAt(0).toUpperCase();

        const headerAdminBtn = document.getElementById('admin-panel-btn');
        if (headerAdminBtn) {
            headerAdminBtn.style.display = (user.role === 'admin') ? 'inline-flex' : 'none';
        }

        const profileRole = document.getElementById('profile-modal-role');
        if (profileRole) {
            profileRole.innerText = user.role === 'admin' ? '🛡️ Administrador' : 'Cuenta Verificada';
            profileRole.className = `user-badge badge-${user.role}`;
        }

        const adminBtn = document.getElementById('profile-modal-admin-btn');
        if (adminBtn) {
            adminBtn.style.display = (user.role === 'admin') ? 'flex' : 'none';
        }

        // Sync payout account details across both user profile modal and wallet modal
        syncUserPayoutAccountInputs(user);
    } else {
        loggedInHud.style.display = 'none';
        loggedOutHud.style.display = 'flex';
    }
}

function syncUserPayoutAccountInputs(user) {
    if (!user) return;
    const payout = user.payoutAccount || {};
    const bankVal = payout.bank || '';
    const typeVal = payout.accountType || 'Billetera Digital';
    const numVal = payout.accountNumber || '';
    const holderVal = (payout.holderName && payout.docNumber) ? `${payout.holderName} - C.C. ${payout.docNumber}` : (payout.holderName || '');

    // Wallet modal inputs
    const b1 = document.getElementById('payout-bank');
    const t1 = document.getElementById('payout-account-type');
    const n1 = document.getElementById('payout-account-number');
    const h1 = document.getElementById('payout-holder-info');

    if (b1) b1.value = bankVal;
    if (t1) t1.value = typeVal;
    if (n1) n1.value = numVal;
    if (h1) h1.value = holderVal;

    // Profile modal inputs
    const b2 = document.getElementById('profile-payout-bank');
    const t2 = document.getElementById('profile-payout-account-type');
    const n2 = document.getElementById('profile-payout-account-number');
    const h2 = document.getElementById('profile-payout-holder-info');

    if (b2) b2.value = bankVal;
    if (t2) t2.value = typeVal;
    if (n2) n2.value = numVal;
    if (h2) h2.value = holderVal;
}

function switchProfileTab(tabName) {
    const tabs = ['summary', 'deposits', 'withdrawals', 'history', 'bank', 'security'];
    tabs.forEach(t => {
        const btn = document.getElementById(`profile-tab-btn-${t}`);
        const content = document.getElementById(`profile-tab-content-${t}`);
        if (btn) {
            if (t === tabName) {
                btn.style.background = 'var(--primary)';
                btn.style.color = 'white';
                btn.style.borderColor = 'var(--primary)';
            } else {
                btn.style.background = 'rgba(255, 255, 255, 0.05)';
                btn.style.color = 'var(--text-muted)';
                btn.style.borderColor = 'var(--border-color)';
            }
        }
        if (content) {
            content.style.display = (t === tabName) ? 'block' : 'none';
        }
    });
}

function renderProfileAccountDetails(user) {
    if (!user) return;

    // Bonus & Stats Summary
    const bonusVal = document.getElementById('profile-modal-bonus-val');
    if (bonusVal) bonusVal.innerText = `$${(user.bonusBalance || 5000).toFixed(2)} COP`;

    const depositsTotalEl = document.getElementById('profile-stat-deposits-total');
    const withdrawalsTotalEl = document.getElementById('profile-stat-withdrawals-total');
    const winningsTotalEl = document.getElementById('profile-stat-winnings-total');
    const vipLevelEl = document.getElementById('profile-stat-vip-level');

    if (winningsTotalEl) winningsTotalEl.innerText = `$${(user.winnings || 0).toFixed(2)} COP`;
    if (vipLevelEl) vipLevelEl.innerText = `VIP ${user.vipLevel || 1} (${user.xp || 0} XP)`;

    const transactions = user.transactions || [];
    const depositsList = transactions.filter(t => t.type === 'RECARGA');
    const withdrawalsList = transactions.filter(t => t.type === 'RETIRO');

    const totalDeposits = depositsList.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const totalWithdrawals = withdrawalsList.reduce((acc, curr) => acc + (curr.amount || 0), 0);

    if (depositsTotalEl) depositsTotalEl.innerText = `$${totalDeposits.toFixed(2)} COP`;
    if (withdrawalsTotalEl) withdrawalsTotalEl.innerText = `$${totalWithdrawals.toFixed(2)} COP`;

    // Render Deposits Table
    const depositsTbody = document.getElementById('profile-deposits-tbody');
    if (depositsTbody) {
        if (depositsList.length === 0) {
            depositsTbody.innerHTML = `<tr><td colspan="4" style="padding: 12px; text-align: center; color: var(--text-muted);">Sin recargas registradas aún.</td></tr>`;
        } else {
            depositsTbody.innerHTML = depositsList.map(d => `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
                    <td style="padding: 8px; color: var(--text-muted);">${d.timestamp ? new Date(d.timestamp).toLocaleString() : 'Reciente'}</td>
                    <td style="padding: 8px; font-weight: 600; color: #009ee3;">${d.method || 'Mercado Pago'}<br><span style="font-size:0.7rem; color:var(--text-muted); font-family:monospace;">${d.paymentId || ''}</span></td>
                    <td style="padding: 8px; font-weight: bold; color: #4ade80;">+$${(d.amount || 0).toFixed(2)}</td>
                    <td style="padding: 8px;"><span style="background: rgba(0, 200, 83, 0.2); color: #4ade80; border: 1px solid #00c853; font-weight: bold; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px;">${d.status || 'APROBADA'}</span></td>
                </tr>
            `).join('');
        }
    }

    // Render Withdrawals Table
    const withdrawalsTbody = document.getElementById('profile-withdrawals-tbody');
    if (withdrawalsTbody) {
        if (withdrawalsList.length === 0) {
            withdrawalsTbody.innerHTML = `<tr><td colspan="4" style="padding: 12px; text-align: center; color: var(--text-muted);">Sin retiros solicitados aún.</td></tr>`;
        } else {
            withdrawalsTbody.innerHTML = withdrawalsList.map(w => `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
                    <td style="padding: 8px; color: var(--text-muted);">${w.timestamp ? new Date(w.timestamp).toLocaleString() : 'Reciente'}</td>
                    <td style="padding: 8px; font-weight: 600;">${w.method || 'Nequi / Banco'}<br><span style="font-size:0.7rem; color:var(--secondary);">${w.account || ''}</span></td>
                    <td style="padding: 8px; font-weight: bold; color: #a78bfa;">-$${(w.amount || 0).toFixed(2)}</td>
                    <td style="padding: 8px;"><span style="background: rgba(167, 139, 250, 0.2); color: #a78bfa; border: 1px solid #a78bfa; font-weight: bold; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px;">${w.status || 'PROCESANDO'}</span></td>
                </tr>
            `).join('');
        }
    }

    // Render Bets & Winnings History Table
    const historyTbody = document.getElementById('profile-history-tbody');
    if (historyTbody) {
        const history = user.history || [];
        if (history.length === 0) {
            historyTbody.innerHTML = `<tr><td colspan="5" style="padding: 12px; text-align: center; color: var(--text-muted);">Sin apuestas registradas aún.</td></tr>`;
        } else {
            historyTbody.innerHTML = history.slice(0, 30).map(h => {
                const dateStr = h.timestamp ? new Date(h.timestamp).toLocaleTimeString() : 'N/A';
                const netColor = (h.net >= 0) ? '#4ade80' : '#f87171';
                const netSign = (h.net >= 0) ? '+' : '';
                return `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
                        <td style="padding: 8px; color: var(--text-muted);">${dateStr}</td>
                        <td style="padding: 8px; font-weight: 600;">${h.gameId || 'Juego'}</td>
                        <td style="padding: 8px;">$${(h.bet || 0).toFixed(2)}</td>
                        <td style="padding: 8px;">$${(h.win || 0).toFixed(2)}</td>
                        <td style="padding: 8px; color: ${netColor}; font-weight: 700;">${netSign}$${(h.net || 0).toFixed(2)}</td>
                    </tr>
                `;
            }).join('');
        }
    }
}

function openUserProfileModal(defaultTab = 'summary') {
    const user = window.stateManager.getCurrentUser();
    if (!user) {
        openAuthModal('login');
        return;
    }
    updateUserHud();
    renderProfileAccountDetails(user);
    switchProfileTab(defaultTab);
    const modal = document.getElementById('user-profile-modal');
    if (modal) modal.classList.add('active');
}

function closeUserProfileModal() {
    const modal = document.getElementById('user-profile-modal');
    if (modal) modal.classList.remove('active');
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
    const termsContainer = document.getElementById('auth-terms-container');

    if (mode === 'register') {
        title.innerText = 'Crear Cuenta';
        submitBtn.innerText = 'Registrarse';
        if (termsContainer) termsContainer.style.display = 'block';
        toggleMsg.innerHTML = '¿Ya tienes una cuenta? <a href="#" style="color:var(--primary-hover);" onclick="toggleAuthMode(\'login\')">Ingresa aquí</a>';
    } else {
        title.innerText = 'Iniciar Sesión';
        submitBtn.innerText = 'Ingresar';
        if (termsContainer) termsContainer.style.display = 'none';
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

    try {
        if (authMode === 'register') {
            const termsCheck = document.getElementById('auth-terms-check');
            if (termsCheck && !termsCheck.checked) {
                throw new Error('Debes aceptar los Términos, Condiciones y Políticas de Privacidad para registrarte.');
            }

            window.authProcess = { mode: 'register', email };

            showToast('Procesando solicitud de código...', 'info');
            const res = await window.stateManager.requestRegistrationCode(email, password);

            document.getElementById('auth-main-step').style.display = 'none';
            document.getElementById('auth-verify-step').style.display = 'block';
            document.getElementById('verify-email-display').innerText = email;
            document.getElementById('reset-pw-fields').style.display = 'none';

            const hintEl = document.getElementById('verify-code-hint');
            if (hintEl) {
                hintEl.style.display = 'block';
                if (res && res.smtpSent) {
                    hintEl.innerText = '📩 Hemos enviado el código a tu correo. (Revisa bandeja de entrada o Spam)';
                    hintEl.style.borderColor = 'var(--secondary)';
                    hintEl.style.color = 'var(--secondary)';
                } else if (res && res.code) {
                    hintEl.innerText = `🔑 Tu código de verificación es: ${res.code}`;
                    hintEl.style.borderColor = 'var(--success)';
                    hintEl.style.color = 'var(--success)';
                }
            }
        } else {
            await window.stateManager.login(email, password);
            closeAuthModal();
            updateUserHud();
            showToast('¡Bienvenido a Coolbet!', 'success');
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

        showToast('Procesando solicitud de recuperación...', 'info');
        const res = await window.stateManager.requestPasswordResetCode(email);

        document.getElementById('auth-main-step').style.display = 'none';
        document.getElementById('auth-verify-step').style.display = 'block';
        document.getElementById('verify-email-display').innerText = email;
        document.getElementById('reset-pw-fields').style.display = 'block';

        const hintEl = document.getElementById('verify-code-hint');
        if (hintEl) {
            hintEl.style.display = 'block';
            if (res && res.smtpSent) {
                hintEl.innerText = '📩 Hemos enviado el código a tu correo. (Revisa bandeja de entrada o Spam)';
                hintEl.style.borderColor = 'var(--secondary)';
                hintEl.style.color = 'var(--secondary)';
            } else if (res && res.code) {
                hintEl.innerText = `🔑 Tu código de recuperación es: ${res.code}`;
                hintEl.style.borderColor = 'var(--success)';
                hintEl.style.color = 'var(--success)';
            }
        }
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
            showToast('🎁 ¡Felicidades! Se acreditó tu Bono de Bienvenida de $5,000 COP. Redimible únicamente en juegos (no retirable directamente).', 'success');
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

    // Auto-fill Payout Bank Account details if user has saved them
    syncUserPayoutAccountInputs(user);

    document.getElementById('wallet-modal').classList.add('active');
}

function closeWalletModal() {
    document.getElementById('wallet-modal').classList.remove('active');
}

async function handleSavePayoutAccount(source = 'wallet') {
    let bankEl, typeEl, numEl, holderEl;
    if (source === 'profile') {
        bankEl = document.getElementById('profile-payout-bank');
        typeEl = document.getElementById('profile-payout-account-type');
        numEl = document.getElementById('profile-payout-account-number');
        holderEl = document.getElementById('profile-payout-holder-info');
    } else {
        bankEl = document.getElementById('payout-bank');
        typeEl = document.getElementById('payout-account-type');
        numEl = document.getElementById('payout-account-number');
        holderEl = document.getElementById('payout-holder-info');
    }

    const bank = bankEl ? bankEl.value.trim() : '';
    const accountType = typeEl ? typeEl.value : 'Billetera Digital';
    const accountNumber = numEl ? numEl.value.trim() : '';
    const holderInfo = holderEl ? holderEl.value.trim() : '';

    if (!bank || !accountNumber || !holderInfo) {
        showToast('Por favor completa todos los campos bancarios para retiros.', 'danger');
        return;
    }

    let holderName = holderInfo;
    let docNumber = 'N/A';
    if (holderInfo.includes('-')) {
        const parts = holderInfo.split('-');
        holderName = parts[0].trim();
        docNumber = parts[1].replace(/C\.C\./i, '').trim();
    }

    try {
        await window.stateManager.savePayoutAccount({ bank, accountType, accountNumber, holderName, docNumber });
        showToast('✅ Datos bancarios para consignación de retiros guardados exitosamente.', 'success');
        updateUserHud();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

// Terms & Conditions Modal handlers
function openTermsModal(e) {
    if (e) e.preventDefault();
    document.getElementById('terms-modal').classList.add('active');
}

function closeTermsModal() {
    document.getElementById('terms-modal').classList.remove('active');
}

// PQR Complaints & Claims Modal handlers
function openPqrModal() {
    const user = window.stateManager.getCurrentUser();
    if (!user) {
        showToast('🔒 Solo los usuarios reales registrados pueden radicar quejas y reclamos (PQR). Por favor inicia sesión.', 'warning');
        openAuthModal('login');
        return;
    }
    const emailEl = document.getElementById('pqr-email');
    if (emailEl) {
        emailEl.value = user.email;
        emailEl.readOnly = true;
    }
    const nameEl = document.getElementById('pqr-name');
    if (nameEl && !nameEl.value) {
        nameEl.value = user.fullName || user.email.split('@')[0];
    }
    document.getElementById('pqr-modal').classList.add('active');
}

function closePqrModal() {
    document.getElementById('pqr-modal').classList.remove('active');
}

async function handlePqrSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('pqr-name').value.trim();
    const email = document.getElementById('pqr-email').value.trim();
    const category = document.getElementById('pqr-category').value;
    const subject = document.getElementById('pqr-subject').value.trim();
    const message = document.getElementById('pqr-message').value.trim();

    try {
        const res = await window.stateManager.submitPqr({ name, email, category, subject, message });
        showToast(`✅ PQR registrado con éxito. Ticket: ${res.ticketId}`, 'success');
        closePqrModal();
        document.getElementById('pqr-name').value = '';
        document.getElementById('pqr-subject').value = '';
        document.getElementById('pqr-message').value = '';
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

async function handleWalletTransaction(isDeposit) {
    const amount = parseFloat(document.getElementById('wallet-amount').value);
    if (isNaN(amount) || amount <= 0) {
        showToast('Monto de transacción inválido.', 'danger');
        return;
    }

    if (!isDeposit) {
        const user = window.stateManager.currentUser;
        if (!user || !user.payoutAccount || !user.payoutAccount.accountNumber) {
            showToast('Por favor registra tus datos bancarios para retiros antes de solicitar un retiro.', 'danger');
            return;
        }
    }

    try {
        const newBalance = await window.stateManager.updateWallet(amount, isDeposit);
        document.getElementById('wallet-balance-val').innerText = `$${newBalance.toFixed(2)}`;
        updateUserHud();
        showToast(isDeposit ? `¡Depósito de $${amount.toFixed(2)} exitoso!` : `¡Solicitud de retiro por $${amount.toFixed(2)} enviada con éxito!`, 'success');
        closeWalletModal();
        
        if (window.location.hash === '#admin') updateAdminDashboard();
        updateUserHud();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

async function handleMercadoPagoDeposit() {
    const amountStr = document.getElementById('wallet-amount').value;
    const amount = parseFloat(amountStr);

    if (isNaN(amount) || amount < 1000) {
        showToast('El monto mínimo de recarga es $1,000 COP.', 'danger');
        return;
    }

    const officialMpLink = 'https://link.mercadopago.com.co/casinobet';

    try {
        const res = await window.stateManager.createMercadoPagoPreference(amount);

        showToast('Redirigiendo al link de pago oficial de Mercado Pago...', 'success');
        closeWalletModal();
        
        const targetUrl = (res && res.initPoint) ? res.initPoint : officialMpLink;
        window.open(targetUrl, '_blank');

        if (res && res.requiresGateway) {
            openPaymentGatewayModal(res);
        }
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

// PSE & Sandbox Payment Gateway Controls
window.activePaymentGatewayOrder = null;

function openPaymentGatewayModal(order) {
    window.activePaymentGatewayOrder = order;
    closeWalletModal();
    closePseModal();

    const badgeEl = document.getElementById('gateway-badge-bank');
    if (badgeEl) badgeEl.innerText = order.method === 'PSE' ? `🏦 PASARELA PSE - ${(order.bank || '').toUpperCase()}` : `💳 MERCADO PAGO COLOMBIA`;
    
    const titleEl = document.getElementById('gateway-portal-title');
    if (titleEl) titleEl.innerText = `Portal Bancario de Débito - ${order.bank}`;
    
    const amtEl = document.getElementById('gateway-amount-display');
    if (amtEl) amtEl.innerText = `$${order.amount.toLocaleString('es-CO')} COP`;

    const bankEl = document.getElementById('gateway-bank-display');
    if (bankEl) bankEl.innerText = order.bank;

    const refEl = document.getElementById('gateway-ref-display');
    if (refEl) refEl.innerText = order.paymentId || order.cus || 'PAY-REF-OK';

    const authStep = document.getElementById('gateway-step-auth');
    const procStep = document.getElementById('gateway-step-processing');
    if (authStep) authStep.style.display = 'block';
    if (procStep) procStep.style.display = 'none';

    const inputUser = document.getElementById('gateway-input-user');
    const inputPass = document.getElementById('gateway-input-pass');
    if (inputUser) inputUser.value = order.docNumber || '';
    if (inputPass) inputPass.value = '';

    const modal = document.getElementById('payment-gateway-modal');
    if (modal) modal.classList.add('active');
}

async function cancelPaymentGateway() {
    if (window.activePaymentGatewayOrder) {
        try {
            await window.stateManager.cancelPaymentGateway(window.activePaymentGatewayOrder.paymentId);
        } catch (e) {}
    }
    window.activePaymentGatewayOrder = null;
    const modal = document.getElementById('payment-gateway-modal');
    if (modal) modal.classList.remove('active');
    showToast('Transacción de recarga cancelada.', 'info');
}

async function handleConfirmPaymentGatewaySubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!window.activePaymentGatewayOrder) return;

    const authStep = document.getElementById('gateway-step-auth');
    const procStep = document.getElementById('gateway-step-processing');
    if (authStep) authStep.style.display = 'none';
    if (procStep) procStep.style.display = 'block';

    setTimeout(async () => {
        try {
            const res = await window.stateManager.confirmPaymentGateway(window.activePaymentGatewayOrder.paymentId);
            
            const modal = document.getElementById('payment-gateway-modal');
            if (modal) modal.classList.remove('active');

            updateUserHud();

            const order = res.order || window.activePaymentGatewayOrder;
            if (order.method === 'PSE' || order.cus) {
                document.getElementById('receipt-cus').innerText = order.cus || order.paymentId;
                document.getElementById('receipt-bank').innerText = order.bank;
                document.getElementById('receipt-amount').innerText = `$${order.amount.toLocaleString('es-CO')} COP`;
                document.getElementById('receipt-new-balance').innerText = `$${res.user.balance.toLocaleString('es-CO')} COP`;

                const receiptModal = document.getElementById('pse-receipt-modal');
                if (receiptModal) receiptModal.classList.add('active');
            }

            showToast(`¡Pago de $${order.amount.toLocaleString('es-CO')} COP verificado y acreditado con éxito!`, 'success');
            window.activePaymentGatewayOrder = null;
        } catch (err) {
            if (authStep) authStep.style.display = 'block';
            if (procStep) procStep.style.display = 'none';
            showToast(err.message, 'danger');
        }
    }, 1500);
}

function openPseModal() {
    closeWalletModal();
    const modal = document.getElementById('pse-modal');
    if (!modal) return;
    modal.classList.add('active');

    const me = window.stateManager.currentUser;
    if (me) {
        const holderEl = document.getElementById('pse-holder-name');
        if (holderEl && !holderEl.value) {
            holderEl.value = me.fullName || me.email.split('@')[0];
        }
    }
}

function closePseModal() {
    const modal = document.getElementById('pse-modal');
    if (modal) modal.classList.remove('active');
}

function setPseAmount(amt) {
    const input = document.getElementById('pse-amount');
    if (input) input.value = amt;
}

function closePseReceiptModal() {
    const modal = document.getElementById('pse-receipt-modal');
    if (modal) modal.classList.remove('active');
}

async function handlePseDepositSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();

    const bank = document.getElementById('pse-bank').value;
    const personType = document.getElementById('pse-person-type').value;
    const docType = document.getElementById('pse-doc-type').value;
    const docNumber = document.getElementById('pse-doc-number').value.trim();
    const holderName = document.getElementById('pse-holder-name').value.trim();
    const amount = parseFloat(document.getElementById('pse-amount').value);

    if (!bank) {
        showToast('Por favor selecciona tu banco o entidad financiera PSE.', 'danger');
        return;
    }
    if (!docNumber || !holderName) {
        showToast('Por favor ingresa tu número de documento y nombre del titular.', 'danger');
        return;
    }
    if (isNaN(amount) || amount < 1000) {
        showToast('El monto mínimo de recarga por PSE es $1,000 COP.', 'danger');
        return;
    }

    try {
        const res = await window.stateManager.processPseDeposit({
            bank,
            personType,
            docType,
            docNumber,
            holderName,
            amount
        });

        if (res && res.requiresGateway) {
            openPaymentGatewayModal(res);
        } else {
            showToast('No se pudo procesar la orden de recarga PSE.', 'danger');
        }
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

async function handleChangePasswordSubmit(source = 'wallet') {
    let oldEl, newEl;
    if (source === 'profile') {
        oldEl = document.getElementById('profile-change-old-password');
        newEl = document.getElementById('profile-change-new-password');
    } else {
        oldEl = document.getElementById('change-old-password');
        newEl = document.getElementById('change-new-password');
    }

    const oldPassword = oldEl ? oldEl.value : '';
    const newPassword = newEl ? newEl.value : '';

    if (!oldPassword || !newPassword) {
        showToast('Ingresa tu contraseña actual y la nueva contraseña.', 'danger');
        return;
    }

    if (newPassword.length < 6) {
        showToast('La nueva contraseña debe tener al menos 6 caracteres.', 'danger');
        return;
    }

    try {
        await window.stateManager.changePassword(oldPassword, newPassword);
        showToast('¡Contraseña actualizada con éxito!', 'success');
        if (oldEl) oldEl.value = '';
        if (newEl) newEl.value = '';
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
    // Mercado Pago Configuration
    const mpConfig = window.stateManager.state.mercadoPagoConfig;
    if (mpConfig) {
        document.getElementById('admin-mp-public-key').value = mpConfig.publicKey || '';
        const tokenInput = document.getElementById('admin-mp-access-token');
        tokenInput.value = '';
        tokenInput.placeholder = mpConfig.hasAccessToken ? 'Ya configurado (oculto por seguridad)' : 'TEST-xxxx...';
    }

    // SMTP Config Loading
    const smtpConfig = window.stateManager.state.smtpConfig;
    if (smtpConfig) {
        document.getElementById('admin-smtp-server').value = smtpConfig.server || '';
        document.getElementById('admin-smtp-port').value = smtpConfig.port || 587;
        document.getElementById('admin-smtp-alert-email').value = smtpConfig.alertEmail || 'jacobocastelblanco@gmail.com';
        document.getElementById('admin-smtp-user').value = smtpConfig.username || '';
        const smtpPassInput = document.getElementById('admin-smtp-password');
        smtpPassInput.value = '';
        smtpPassInput.placeholder = smtpConfig.hasPassword ? 'Contraseña configurada (oculta por seguridad)' : 'Contraseña de aplicación Gmail';
    }

    // Populate Player Select Dropdown
    const playerSelect = document.getElementById('admin-player-select');
    if (playerSelect) {
        const currentSelected = playerSelect.value;
        playerSelect.innerHTML = '<option value="">-- Seleccionar Usuario --</option>';
        const users = window.stateManager.state.adminUsers || [];
        users.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.email;
            opt.innerText = `${u.email} (${u.role.toUpperCase()} - VIP ${u.vipLevel} - Saldo: $${u.balance.toFixed(2)})`;
            playerSelect.appendChild(opt);
        });
        if (currentSelected) {
            playerSelect.value = currentSelected;
            renderSelectedPlayerHistory(currentSelected);
        }
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

    // Load PQR Tickets
    loadAdminPqrList();
}

function renderSelectedPlayerHistory(email) {
    const detailsContainer = document.getElementById('admin-player-details');
    if (!email) {
        if (detailsContainer) detailsContainer.style.display = 'none';
        return;
    }

    const users = window.stateManager.state.adminUsers || [];
    const user = users.find(u => u.email === email);
    if (!user) {
        if (detailsContainer) detailsContainer.style.display = 'none';
        return;
    }

    detailsContainer.style.display = 'block';
    document.getElementById('player-stat-balance').innerText = `$${(user.balance || 0).toFixed(2)}`;
    document.getElementById('player-stat-winnings').innerText = `$${(user.winnings || 0).toFixed(2)}`;
    document.getElementById('player-stat-losses').innerText = `$${(user.losses || 0).toFixed(2)}`;
    document.getElementById('player-stat-vip').innerText = `VIP ${user.vipLevel || 1} (${user.xp || 0} XP)`;

    // Render Player Payout Bank Account Details
    const payout = user.payoutAccount || {};
    const payoutDisplay = document.getElementById('player-payout-account-display');
    if (payoutDisplay) {
        if (payout.bank) {
            payoutDisplay.innerHTML = `
                <strong>Banco / Entidad:</strong> ${payout.bank} &nbsp;|&nbsp; 
                <strong>Tipo:</strong> ${payout.accountType || 'N/A'} &nbsp;|&nbsp; 
                <strong>Cuenta / Celular:</strong> <span style="color:var(--accent); font-weight:bold;">${payout.accountNumber}</span><br>
                <strong>Titular:</strong> ${payout.holderName || 'N/A'} &nbsp;|&nbsp; 
                <strong>Cédula:</strong> ${payout.docNumber || 'N/A'}
            `;
        } else {
            payoutDisplay.innerHTML = `<span style="color:var(--danger);">⚠️ El jugador no ha registrado sus datos bancarios de retiro aún.</span>`;
        }
    }

    const tbody = document.getElementById('player-history-tbody');
    tbody.innerHTML = '';

    const history = user.history || [];
    if (history.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="padding: 16px; text-align: center; color: var(--text-muted);">Sin historial de apuestas registrado aún.</td></tr>`;
        return;
    }

    history.forEach(item => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid rgba(255,255,255,0.03)';
        
        const dateStr = item.timestamp ? new Date(item.timestamp).toLocaleString() : 'N/A';
        const netColor = (item.net >= 0) ? 'var(--success)' : 'var(--danger)';
        const netSign = (item.net >= 0) ? '+' : '';

        tr.innerHTML = `
            <td style="padding: 10px; color: var(--text-muted);">${dateStr}</td>
            <td style="padding: 10px; font-weight: 600;">${item.gameId || 'Juego'}</td>
            <td style="padding: 10px;">$${(item.bet || 0).toFixed(2)}</td>
            <td style="padding: 10px;">$${(item.win || 0).toFixed(2)}</td>
            <td style="padding: 10px; color: ${netColor}; font-weight: 700;">${netSign}$${(item.net || 0).toFixed(2)}</td>
            <td style="padding: 10px; color: var(--text-muted); font-size: 0.8rem;">${item.ip || 'Local'}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function loadAdminPqrList() {
    const tbody = document.getElementById('admin-pqr-tbody');
    if (!tbody) return;
    try {
        const res = await window.stateManager.adminGetPqrs();
        const tickets = res.pqrTickets || [];
        if (tickets.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="padding: 16px; text-align: center; color: var(--text-muted);">Sin tickets de PQR registrados.</td></tr>`;
            return;
        }
        tbody.innerHTML = tickets.map(t => `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
                <td style="padding: 10px;"><strong>${t.id}</strong><br><span style="font-size:0.75rem; color:var(--text-muted);">${new Date(t.timestamp).toLocaleString()}</span></td>
                <td style="padding: 10px;"><strong>${t.name}</strong><br><span style="font-size:0.75rem; color:var(--secondary);">${t.email}</span></td>
                <td style="padding: 10px;"><span style="background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px; font-size:0.75rem;">${t.category}</span><br><strong>${t.subject}</strong></td>
                <td style="padding: 10px; max-width: 250px; font-size:0.8rem; line-height:1.3;">${t.message}</td>
                <td style="padding: 10px;"><span style="color:${t.status === 'RESUELTO' ? 'var(--success)' : 'var(--accent)'}; font-weight:bold;">${t.status}</span></td>
                <td style="padding: 10px;">
                    ${t.status !== 'RESUELTO' ? `<button class="btn btn-success btn-sm" onclick="adminResolvePqrAction('${t.id}')">Marcar Resuelto</button>` : '✔️ Resuelto'}
                </td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" style="color:var(--danger); padding:16px;">${err.message}</td></tr>`;
    }
}

async function adminResolvePqrAction(pqrId) {
    try {
        await window.stateManager.adminResolvePqr(pqrId, 'RESUELTO', 'Revisado y resuelto por administrador');
        showToast('Ticket PQR marcado como RESUELTO.', 'success');
        loadAdminPqrList();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

async function adminSaveSmtpConfig() {
    const server = document.getElementById('admin-smtp-server').value;
    const port = parseInt(document.getElementById('admin-smtp-port').value) || 587;
    const username = document.getElementById('admin-smtp-user').value;
    const password = document.getElementById('admin-smtp-password').value;
    const alertEmail = document.getElementById('admin-smtp-alert-email').value;

    try {
        await window.stateManager.setSmtpConfig(server, port, username, password, alertEmail);
        showToast(`Configuración de alertas guardada para ${alertEmail}`, 'success');
        updateAdminDashboard();
    } catch (e) {
        showToast(e.message, 'danger');
    }
}

async function adminTestSmtpAlert() {
    try {
        await window.stateManager.testSmtpAlert();
        showToast('Alerta de prueba enviada a jacobocastelblanco@gmail.com (revisa la consola y tu correo).', 'success');
    } catch (e) {
        showToast(e.message, 'danger');
    }
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
