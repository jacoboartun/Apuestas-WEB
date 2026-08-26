/**
 * AETHERIS CASINO - Backend Core: Auth
 * Authentication service: registration, login, session management.
 * Depends on: SecurityCore, StateCore
 */

/**
 * Registers a new user account.
 * @param {string} email
 * @param {string} password - Plain text; will be hashed
 * @param {string} role - 'user' | 'admin'
 * @returns {Promise<Object>} The created user
 */
async function register(email, password, role = 'user') {
    await window.StateCore.ensureLoaded();
    const state = window.StateCore.getState();

    email = email.trim().toLowerCase();
    if (!email || !password) throw new Error('Email y contraseña son requeridos.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Formato de email inválido.');
    if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
    if (state.users.some(u => u.email === email)) throw new Error('Este email ya está registrado.');

    const passwordHash = await window.SecurityCore.sha256(password);
    const newUser = window.UserModel.createUser(email, passwordHash, role);
    await window.SecurityCore.stampUserChecksum(newUser);

    state.users.push(newUser);
    window.StateCore.logEvent('USER_REGISTERED', `Cuenta creada: ${email} (${role})`);
    await window.StateCore.save();

    return newUser;
}

/**
 * Authenticates a user and creates a session.
 * @param {string} email
 * @param {string} password - Plain text
 * @returns {Promise<Object>} The authenticated user (public view)
 */
async function login(email, password) {
    await window.StateCore.ensureLoaded();
    const state = window.StateCore.getState();

    email = email.trim().toLowerCase();
    const passwordHash = await window.SecurityCore.sha256(password);

    const user = state.users.find(u => u.email === email && u.passwordHash === passwordHash);
    if (!user) {
        window.StateCore.logEvent('LOGIN_FAILED', `Email: ${email}`);
        throw new Error('Email o contraseña incorrectos.');
    }

    // Integrity check
    const isValid = await window.SecurityCore.verifyUserIntegrity(user);
    if (!isValid) {
        window.StateCore.logEvent('SECURITY_BREACH_DETECTED', `Tamper detectado en cuenta: ${email}`);
        window.StateCore.triggerSecurityBreach();
        throw new Error('Validación de seguridad fallida. Cuenta bloqueada.');
    }

    user.lastLoginAt = Date.now();
    state.session = { email: user.email, role: user.role, loginAt: Date.now() };

    window.StateCore.logEvent('USER_LOGIN', `Sesión iniciada: ${email} (${user.role})`);
    await window.StateCore.save();

    return window.UserModel.toPublicUser(user);
}

/**
 * Destroys the current session.
 */
function logout() {
    const state = window.StateCore.getState();
    if (!state.session) return;
    window.StateCore.logEvent('USER_LOGOUT', `Sesión cerrada: ${state.session.email}`);
    state.session = null;
    window.StateCore.save();
}

/**
 * Returns the currently authenticated user object (or null).
 * @returns {Object|null}
 */
function getCurrentUser() {
    const state = window.StateCore.getState();
    if (!state || !state.session) return null;
    return state.users.find(u => u.email === state.session.email) || null;
}

/**
 * Returns true if there is an active admin session.
 */
function isAdmin() {
    const user = getCurrentUser();
    return user && user.role === 'admin';
}

// Export to global scope
window.AuthService = { register, login, logout, getCurrentUser, isAdmin };
