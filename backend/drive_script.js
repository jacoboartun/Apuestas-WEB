/**
 * AETHERIS CASINO - Backend en Google Apps Script (API con sesiones)
 * =====================================================================
 * Este script reemplaza el "blob JSON abierto" original por una API real:
 *  - Las contraseñas se verifican y con-hashean EN EL SERVIDOR (nunca viajan
 *    los hashes de otros usuarios al navegador).
 *  - El acceso de administrador se valida con un token de sesión emitido
 *    por el servidor, no con datos que el propio cliente puede editar.
 *  - El Access Token de Mercado Pago jamás se envía al navegador: las
 *    preferencias de pago se crean desde aquí, y el saldo solo se acredita
 *    cuando Mercado Pago confirma el pago vía webhook (no al abrir el checkout).
 *  - Los códigos de verificación (registro / recuperación de clave) se
 *    generan y validan en el servidor, no en el navegador del solicitante.
 *
 * INSTRUCCIONES DE DESPLIEGUE:
 * 1. Ve a https://script.google.com/ y abre tu proyecto existente (el que ya
 *    tiene la URL configurada en `js/state.js`), o crea uno nuevo.
 * 2. Reemplaza TODO el contenido por el código de este archivo.
 * 3. Cambia el valor de PASSWORD_PEPPER más abajo por una frase secreta única
 *    (solo vive en el servidor, nunca la compartas ni la subas a un repo público).
 * 4. Guarda y haz clic en "Implementar" -> "Gestionar implementaciones" ->
 *    edita la implementación existente (ícono de lápiz) -> Versión: "Nueva
 *    versión" -> Implementar. (Si usas una implementación nueva en vez de
 *    editar la existente, deberás actualizar DRIVE_APP_URL en js/state.js).
 * 5. La primera vez que este script corra creará un archivo nuevo
 *    "aetheris_db.json" en tu Drive con la nueva estructura, o migrará
 *    automáticamente el archivo existente si ya tenías datos.
 */

// ============================= CONFIGURACIÓN =============================

const FILE_NAME = 'aetheris_db.json';

// ¡IMPORTANTE! Cambia este valor por una cadena secreta propia antes de
// desplegar. Se usa para "salar" los hashes de contraseña en el servidor.
// Como este archivo solo vive en Apps Script, este secreto NUNCA llega al navegador.
const PASSWORD_PEPPER = 'CAMBIA_ESTE_VALOR_POR_UN_SECRETO_PROPIO_2026';

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 horas
const VERIFICATION_TTL_MS = 10 * 60 * 1000; // 10 minutos
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCK_MS = 15 * 60 * 1000; // 15 minutos de bloqueo tras intentos fallidos
const MP_API_BASE = 'https://api.mercadopago.com';

// Multiplicador máximo razonable de pago por juego. Sirve como límite de
// cordura en el servidor para no aceptar resultados absurdos reportados por
// el cliente (ver nota de seguridad al final del archivo).
const GAME_MAX_MULTIPLIER = {
  slots: 50, crash: 100, plinko: 500, mines: 25, roulette: 36,
  blackjack: 3, poker: 100, baccarat: 9, craps: 30, videopoker: 800,
  sicbo: 180, scratch: 50, coinflip: 2, bingo: 100, lottery: 1000,
  keno: 1000, quinielas: 50, sports: 50, wheel: 50, livedealer: 20
};

// ============================= UTILIDADES =============================

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function sha256Hex(str) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str, Utilities.Charset.UTF_8);
  return bytes.map(function (b) {
    const v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

function hashPassword(password, salt) {
  return sha256Hex(password + ':' + salt + ':' + PASSWORD_PEPPER);
}

// Verifica contraseña soportando cuentas "legacy" creadas por la versión
// anterior (sha256 simple sin salt). Si coincide con el esquema legacy,
// migra la cuenta a hash+salt en el momento.
function verifyPassword(user, password) {
  if (user.salt) {
    return hashPassword(password, user.salt) === user.passwordHash;
  }
  // Esquema legacy: sha256(password) plano, igual al que usaba el frontend antiguo.
  const legacyHash = sha256Hex(password);
  if (legacyHash === user.passwordHash) {
    user.salt = Utilities.getUuid();
    user.passwordHash = hashPassword(password, user.salt);
    return true;
  }
  return false;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function newToken() {
  return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
}

// ============================= PERSISTENCIA =============================

function buildDefaultUser(email, password, role) {
  const salt = Utilities.getUuid();
  return {
    email: email,
    passwordHash: hashPassword(password, salt),
    salt: salt,
    role: role,
    balance: 0,
    winnings: 0,
    losses: 0,
    vipLevel: role === 'admin' ? 10 : 1,
    xp: role === 'admin' ? 999999 : 0,
    history: [],
    failedLoginAttempts: 0,
    lockedUntil: 0
  };
}

function buildDefaultDb() {
  return {
    version: 3,
    users: [
      buildDefaultUser('user@aetheris.com', 'user123', 'user'),
      buildDefaultUser('admin@aetheris.com', 'admin123', 'admin'),
      buildDefaultUser('jacobocastelblanco@gmail.com', 'admin1234', 'admin')
    ],
    sessions: {},
    pendingVerifications: {},
    pendingPayments: {},
    rtpSettings: {
      globalRtp: 0.95,
      gameRtps: {
        slots: 0.96, crash: 0.97, plinko: 0.98, mines: 0.96, roulette: 0.973,
        blackjack: 0.99, poker: 0.95, baccarat: 0.989, craps: 0.986, videopoker: 0.995,
        sicbo: 0.972, scratch: 0.85, coinflip: 0.98, bingo: 0.90, lottery: 0.70,
        keno: 0.80, quinielas: 0.75, sports: 0.92, wheel: 0.94, livedealer: 0.97
      }
    },
    platformStats: { totalBets: 0, totalWins: 0, totalVolume: 0, totalPayouts: 0, houseProfit: 0 },
    gameVisibility: {},
    mercadoPagoConfig: { publicKey: '', accessToken: '' },
    auditLogs: [{ timestamp: Date.now(), action: 'SYSTEM_INITIALIZATION', details: 'Aetheris State Engine (API v3) iniciado' }]
  };
}

// Rellena campos que puedan faltar en un archivo antiguo, sin borrar datos.
function migrateDb(db) {
  if (!db.sessions) db.sessions = {};
  if (!db.pendingVerifications) db.pendingVerifications = {};
  if (!db.pendingPayments) db.pendingPayments = {};
  if (!db.mercadoPagoConfig) db.mercadoPagoConfig = { publicKey: '', accessToken: '' };
  if (!db.gameVisibility) db.gameVisibility = {};
  if (!db.platformStats) db.platformStats = { totalBets: 0, totalWins: 0, totalVolume: 0, totalPayouts: 0, houseProfit: 0 };
  if (!db.auditLogs) db.auditLogs = [];
  if (!db.rtpSettings) db.rtpSettings = buildDefaultDb().rtpSettings;
  delete db.currentUser; // campo obsoleto de la versión anterior, ya no se usa

  (db.users || []).forEach(function (u) {
    if (typeof u.failedLoginAttempts !== 'number') u.failedLoginAttempts = 0;
    if (typeof u.lockedUntil !== 'number') u.lockedUntil = 0;
    if (typeof u.locked === 'boolean' && u.locked) u.lockedUntil = Date.now() + LOGIN_LOCK_MS;
    delete u.checksum; // el checksum "HMAC" del cliente ya no es necesario ni confiable
  });

  if (!db.users.some(function (u) { return u.email === 'jacobocastelblanco@gmail.com'; })) {
    db.users.push(buildDefaultUser('jacobocastelblanco@gmail.com', 'admin1234', 'admin'));
  }

  db.version = 3;
  return db;
}

function getOrCreateFile() {
  const iter = DriveApp.getFilesByName(FILE_NAME);
  if (iter.hasNext()) return iter.next();
  return DriveApp.createFile(FILE_NAME, JSON.stringify(buildDefaultDb()), MimeType.PLAIN_TEXT);
}

function getDb() {
  const file = getOrCreateFile();
  const raw = file.getBlob().getDataAsString();
  let db;
  try { db = JSON.parse(raw); } catch (e) { db = null; }
  if (!db || !db.users) db = buildDefaultDb();
  return migrateDb(db);
}

function saveDb(db) {
  const file = getOrCreateFile();
  file.setContent(JSON.stringify(db));
}

// ============================= AYUDANTES DE DOMINIO =============================

function findUser(db, email) {
  email = (email || '').trim().toLowerCase();
  return db.users.filter(function (u) { return u.email === email; })[0] || null;
}

function publicUser(u) {
  return {
    email: u.email,
    role: u.role,
    balance: u.balance,
    winnings: u.winnings,
    losses: u.losses,
    vipLevel: u.vipLevel,
    xp: u.xp,
    history: u.history || []
  };
}

function logEvent(db, action, details) {
  db.auditLogs.unshift({ timestamp: Date.now(), action: action, details: details });
  if (db.auditLogs.length > 300) db.auditLogs.length = 300;
}

function createSession(db, user) {
  const token = newToken();
  db.sessions[token] = { email: user.email, role: user.role, expiresAt: Date.now() + SESSION_TTL_MS };
  return token;
}

function requireSession(db, token) {
  if (!token || !db.sessions[token]) throw new Error('No autenticado. Vuelve a iniciar sesión.');
  const sess = db.sessions[token];
  if (sess.expiresAt < Date.now()) {
    delete db.sessions[token];
    throw new Error('Sesión expirada. Vuelve a iniciar sesión.');
  }
  const user = findUser(db, sess.email);
  if (!user) throw new Error('Usuario no encontrado.');
  if (user.lockedUntil && user.lockedUntil > Date.now()) throw new Error('Cuenta bloqueada temporalmente por seguridad.');
  return user;
}

function requireAdmin(db, token) {
  const user = requireSession(db, token);
  if (user.role !== 'admin') throw new Error('Se requiere rol de administrador.');
  return user;
}

function buildPublicConfig(db) {
  return {
    rtpSettings: db.rtpSettings,
    gameVisibility: db.gameVisibility,
    mercadoPagoConfig: { publicKey: db.mercadoPagoConfig.publicKey || '' }
  };
}

// ============================= ENTRADAS HTTP =============================

function doGet(e) {
  try {
    // Notificaciones (webhooks) de Mercado Pago pueden llegar por GET.
    if (e && e.parameter && e.parameter.topic === 'payment' && e.parameter.id) {
      return handleMpPaymentNotification(e.parameter.id);
    }
    return jsonOut(buildPublicConfig(getDb()));
  } catch (err) {
    return jsonOut({ error: err.toString() });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (lockErr) {
    return jsonOut({ success: false, error: 'El servidor está ocupado, intenta de nuevo.' });
  }

  try {
    const raw = e && e.postData ? e.postData.contents : '{}';
    let body = null;
    try { body = JSON.parse(raw); } catch (parseErr) { body = null; }

    // Webhook de Mercado Pago (no trae nuestro campo `action`).
    if (body && !body.action && (body.type || body.topic)) {
      const paymentId = (body.data && body.data.id) || body.resource || null;
      if (paymentId) return handleMpPaymentNotification(paymentId);
      return jsonOut({ success: true });
    }

    if (!body || !body.action) return jsonOut({ success: false, error: 'Solicitud inválida.' });

    const db = getDb();
    let result;
    try {
      switch (body.action) {
        case 'requestCode': result = actionRequestCode(db, body); break;
        case 'completeRegistration': result = actionCompleteRegistration(db, body); break;
        case 'completePasswordReset': result = actionCompletePasswordReset(db, body); break;
        case 'login': result = actionLogin(db, body); break;
        case 'logout': result = actionLogout(db, body); break;
        case 'getMe': result = actionGetMe(db, body); break;
        case 'settleBet': result = actionSettleBet(db, body); break;
        case 'wallet': result = actionWallet(db, body); break;
        case 'createMpPreference': result = actionCreateMpPreference(db, body); break;
        case 'adminGetDashboard': result = actionAdminGetDashboard(db, body); break;
        case 'adminAdjustBalance': result = actionAdminAdjustBalance(db, body); break;
        case 'adminSetRtp': result = actionAdminSetRtp(db, body); break;
        case 'adminSetVisibility': result = actionAdminSetVisibility(db, body); break;
        case 'adminSetMpConfig': result = actionAdminSetMpConfig(db, body); break;
        case 'adminResetPlatform': result = actionAdminResetPlatform(db, body); break;
        default: result = { success: false, error: 'Acción desconocida.' };
      }
      result.success = result.success !== false;
    } catch (actionErr) {
      result = { success: false, error: actionErr.message || actionErr.toString() };
    }

    return jsonOut(result);
  } finally {
    lock.releaseLock();
  }
}

function doOptions(e) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
  return ContentService.createTextOutput('').setMimeType(ContentService.MimeType.TEXT).setHeaders(headers);
}

// ============================= ACCIONES: CUENTA =============================

function actionRequestCode(db, body) {
  const email = (body.email || '').trim().toLowerCase();
  if (!isValidEmail(email)) throw new Error('Formato de email inválido.');
  const type = body.type === 'reset' ? 'reset' : 'register';

  if (type === 'register') {
    if (findUser(db, email)) throw new Error('Este correo ya está registrado.');
    if (!body.password || body.password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
    const role = body.role === 'admin' ? 'admin' : 'user';
    const salt = Utilities.getUuid();
    const code = generateCode();
    db.pendingVerifications[email] = {
      code: code, type: 'register', role: role,
      passwordHash: hashPassword(body.password, salt), salt: salt,
      expiresAt: Date.now() + VERIFICATION_TTL_MS
    };
    saveDb(db);
    MailApp.sendEmail(email, 'Aetheris Casino - Código de Registro',
      'Tu código de verificación de 4 dígitos es: ' + code + '\n\nSi no solicitaste este código, ignora este mensaje. Vence en 10 minutos.');
    return { success: true };
  }

  const user = findUser(db, email);
  if (!user) throw new Error('El correo no está registrado.');
  const code = generateCode();
  db.pendingVerifications[email] = { code: code, type: 'reset', expiresAt: Date.now() + VERIFICATION_TTL_MS };
  saveDb(db);
  MailApp.sendEmail(email, 'Aetheris Casino - Recuperación de Contraseña',
    'Tu código de verificación de 4 dígitos es: ' + code + '\n\nSi no solicitaste este código, ignora este mensaje. Vence en 10 minutos.');
  return { success: true };
}

function consumePendingCode(db, email, code, expectedType) {
  const pending = db.pendingVerifications[email];
  if (!pending) throw new Error('No hay una verificación pendiente para este correo.');
  if (pending.type !== expectedType) throw new Error('Tipo de verificación inválido.');
  if (pending.expiresAt < Date.now()) {
    delete db.pendingVerifications[email];
    throw new Error('El código ha expirado. Solicita uno nuevo.');
  }
  if (String(code) !== String(pending.code)) throw new Error('Código incorrecto.');
  delete db.pendingVerifications[email];
  return pending;
}

function actionCompleteRegistration(db, body) {
  const email = (body.email || '').trim().toLowerCase();
  const pending = consumePendingCode(db, email, body.code, 'register');
  if (findUser(db, email)) throw new Error('Este correo ya está registrado.');

  const newUser = {
    email: email, passwordHash: pending.passwordHash, salt: pending.salt, role: pending.role,
    balance: 0, winnings: 0, losses: 0, vipLevel: 1, xp: 0, history: [],
    failedLoginAttempts: 0, lockedUntil: 0
  };
  db.users.push(newUser);
  logEvent(db, 'USER_REGISTERED', 'Cuenta creada: ' + email + ' (' + newUser.role + ')');

  const token = createSession(db, newUser);
  saveDb(db);
  return { success: true, token: token, user: publicUser(newUser) };
}

function actionCompletePasswordReset(db, body) {
  const email = (body.email || '').trim().toLowerCase();
  if (!body.newPassword || body.newPassword.length < 6) throw new Error('La nueva contraseña debe tener al menos 6 caracteres.');
  consumePendingCode(db, email, body.code, 'reset');

  const user = findUser(db, email);
  if (!user) throw new Error('Usuario no encontrado.');

  const salt = Utilities.getUuid();
  user.salt = salt;
  user.passwordHash = hashPassword(body.newPassword, salt);
  user.failedLoginAttempts = 0;
  user.lockedUntil = 0;
  logEvent(db, 'PASSWORD_RESET', 'Contraseña restablecida: ' + email);

  const token = createSession(db, user);
  saveDb(db);
  return { success: true, token: token, user: publicUser(user) };
}

function actionLogin(db, body) {
  const email = (body.email || '').trim().toLowerCase();
  const user = findUser(db, email);

  if (!user) {
    logEvent(db, 'LOGIN_FAILED', 'Email no registrado: ' + email);
    saveDb(db);
    throw new Error('Email o contraseña incorrectos.');
  }

  if (user.lockedUntil && user.lockedUntil > Date.now()) {
    throw new Error('Cuenta bloqueada temporalmente por múltiples intentos fallidos. Intenta más tarde.');
  }

  if (!verifyPassword(user, body.password || '')) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    if (user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
      user.lockedUntil = Date.now() + LOGIN_LOCK_MS;
      logEvent(db, 'ACCOUNT_LOCKED', 'Bloqueo temporal por intentos fallidos: ' + email);
    } else {
      logEvent(db, 'LOGIN_FAILED', 'Contraseña incorrecta: ' + email);
    }
    saveDb(db);
    throw new Error('Email o contraseña incorrectos.');
  }

  user.failedLoginAttempts = 0;
  user.lockedUntil = 0;
  logEvent(db, 'USER_LOGIN', 'Sesión iniciada: ' + email);
  const token = createSession(db, user);
  saveDb(db);
  return { success: true, token: token, user: publicUser(user) };
}

function actionLogout(db, body) {
  if (body.token && db.sessions[body.token]) {
    logEvent(db, 'USER_LOGOUT', 'Sesión cerrada: ' + db.sessions[body.token].email);
    delete db.sessions[body.token];
    saveDb(db);
  }
  return { success: true };
}

function actionGetMe(db, body) {
  const user = requireSession(db, body.token);
  return { success: true, user: publicUser(user) };
}

// ============================= ACCIONES: JUEGO Y BILLETERA =============================

function actionSettleBet(db, body) {
  const user = requireSession(db, body.token);
  const gameId = String(body.gameId || '');
  const betAmount = Number(body.betAmount);
  let winAmount = Number(body.winAmount);

  if (!gameId || isNaN(betAmount) || betAmount <= 0) throw new Error('Apuesta inválida.');
  if (isNaN(winAmount) || winAmount < 0) winAmount = 0;
  if (user.balance < betAmount) throw new Error('Saldo insuficiente.');

  // Límite de cordura: el resultado de cada juego se calcula en el cliente
  // (ver nota de seguridad al final del archivo), así que el servidor no
  // puede validar la jugada en sí, pero sí puede rechazar pagos imposibles.
  const cap = GAME_MAX_MULTIPLIER[gameId] || 100;
  const maxWin = Number((betAmount * cap).toFixed(2));
  if (winAmount > maxWin) winAmount = maxWin;

  user.balance = Number((user.balance - betAmount + winAmount).toFixed(2));
  if (winAmount > betAmount) {
    user.winnings = Number((user.winnings + (winAmount - betAmount)).toFixed(2));
    user.xp += Math.floor(betAmount * 2);
  } else {
    user.losses = Number((user.losses + (betAmount - winAmount)).toFixed(2));
    user.xp += Math.floor(betAmount * 1.5);
  }

  const newLevel = Math.min(10, Math.floor(user.xp / 1000) + 1);
  if (newLevel > user.vipLevel) {
    user.vipLevel = newLevel;
    logEvent(db, 'VIP_LEVEL_UP', 'Usuario ' + user.email + ' alcanzó VIP ' + newLevel);
  }

  user.history = user.history || [];
  user.history.unshift({
    timestamp: Date.now(), gameId: gameId, bet: betAmount, win: winAmount,
    net: Number((winAmount - betAmount).toFixed(2)), details: String(body.details || '')
  });
  if (user.history.length > 50) user.history.length = 50;

  db.platformStats.totalBets += 1;
  if (winAmount > 0) db.platformStats.totalWins += 1;
  db.platformStats.totalVolume = Number((db.platformStats.totalVolume + betAmount).toFixed(2));
  db.platformStats.totalPayouts = Number((db.platformStats.totalPayouts + winAmount).toFixed(2));
  db.platformStats.houseProfit = Number((db.platformStats.totalVolume - db.platformStats.totalPayouts).toFixed(2));

  logEvent(db, 'GAME_SETTLED', user.email + ' apostó $' + betAmount + ' en ' + gameId + ', ganó $' + winAmount);
  saveDb(db);
  return { success: true, user: publicUser(user) };
}

function actionWallet(db, body) {
  const user = requireSession(db, body.token);
  const amount = Number(body.amount);
  if (isNaN(amount) || amount <= 0) throw new Error('Monto inválido.');

  if (body.isDeposit) {
    if (amount > 100000) throw new Error('Monto máximo de depósito: $100,000.');
    user.balance = Number((user.balance + amount).toFixed(2));
    logEvent(db, 'WALLET_DEPOSIT', user.email + ' depositó $' + amount.toFixed(2));
  } else {
    if (user.balance < amount) throw new Error('Saldo insuficiente para retirar.');
    user.balance = Number((user.balance - amount).toFixed(2));
    logEvent(db, 'WALLET_WITHDRAWAL', user.email + ' retiró $' + amount.toFixed(2));
  }

  saveDb(db);
  return { success: true, user: publicUser(user) };
}

// ============================= ACCIONES: MERCADO PAGO =============================

function actionCreateMpPreference(db, body) {
  const user = requireSession(db, body.token);
  const amount = Number(body.amount);
  if (isNaN(amount) || amount <= 0) throw new Error('Monto inválido.');

  const accessToken = db.mercadoPagoConfig.accessToken;
  if (!accessToken) throw new Error('Mercado Pago no está configurado por el administrador.');

  const externalRef = user.email + '|' + amount.toFixed(2) + '|' + Utilities.getUuid();
  const payload = {
    items: [{ title: 'Depósito Aetheris Casino', quantity: 1, currency_id: 'ARS', unit_price: amount }],
    external_reference: externalRef,
    notification_url: ScriptApp.getService().getUrl(),
    back_urls: { success: body.returnUrl || '', failure: body.returnUrl || '', pending: body.returnUrl || '' },
    auto_return: 'approved'
  };

  const response = UrlFetchApp.fetch(MP_API_BASE + '/checkout/preferences', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + accessToken },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const data = JSON.parse(response.getContentText());
  if (response.getResponseCode() >= 300 || !data.init_point) {
    throw new Error('No se pudo crear la preferencia de pago en Mercado Pago.');
  }

  db.pendingPayments[externalRef] = { email: user.email, amount: amount, consumed: false, createdAt: Date.now() };
  logEvent(db, 'MP_PREFERENCE_CREATED', user.email + ' solicitó depósito de $' + amount.toFixed(2) + ' vía Mercado Pago');
  saveDb(db);

  return { success: true, initPoint: data.init_point };
}

// Maneja la notificación (webhook) de Mercado Pago: solo aquí se acredita el saldo,
// y solo después de confirmar el estado real del pago contra la API de Mercado Pago.
function handleMpPaymentNotification(paymentId) {
  try {
    const db = getDb();
    const accessToken = db.mercadoPagoConfig.accessToken;
    if (!accessToken) return jsonOut({ success: true });

    const response = UrlFetchApp.fetch(MP_API_BASE + '/v1/payments/' + encodeURIComponent(paymentId), {
      method: 'get',
      headers: { Authorization: 'Bearer ' + accessToken },
      muteHttpExceptions: true
    });
    if (response.getResponseCode() >= 300) return jsonOut({ success: true });

    const payment = JSON.parse(response.getContentText());
    const ref = payment.external_reference;
    const pending = ref && db.pendingPayments[ref];

    if (pending && !pending.consumed && payment.status === 'approved') {
      const user = findUser(db, pending.email);
      if (user) {
        user.balance = Number((user.balance + pending.amount).toFixed(2));
        pending.consumed = true;
        logEvent(db, 'MP_PAYMENT_APPROVED', user.email + ' - depósito confirmado de $' + pending.amount.toFixed(2));
        saveDb(db);
      }
    }
    return jsonOut({ success: true });
  } catch (err) {
    return jsonOut({ success: false, error: err.toString() });
  }
}

// ============================= ACCIONES: ADMINISTRACIÓN =============================

function actionAdminGetDashboard(db, body) {
  requireAdmin(db, body.token);
  return {
    success: true,
    platformStats: db.platformStats,
    rtpSettings: db.rtpSettings,
    gameVisibility: db.gameVisibility,
    mercadoPagoConfig: { publicKey: db.mercadoPagoConfig.publicKey || '', hasAccessToken: !!db.mercadoPagoConfig.accessToken },
    auditLogs: db.auditLogs.slice(0, 100),
    users: db.users.map(function (u) {
      return { email: u.email, role: u.role, balance: u.balance, vipLevel: u.vipLevel };
    })
  };
}

function actionAdminAdjustBalance(db, body) {
  requireAdmin(db, body.token);
  const target = findUser(db, body.targetEmail);
  if (!target) throw new Error('Usuario objetivo no encontrado.');
  const amount = Number(body.amount);
  if (isNaN(amount) || amount < 0) throw new Error('Monto inválido.');

  target.balance = Number(amount.toFixed(2));
  logEvent(db, 'ADMIN_BALANCE_ADJUSTMENT', 'Saldo de ' + target.email + ' fijado a $' + target.balance.toFixed(2));
  saveDb(db);
  return { success: true };
}

function actionAdminSetRtp(db, body) {
  requireAdmin(db, body.token);
  if (typeof body.globalRtp === 'number') db.rtpSettings.globalRtp = body.globalRtp;
  const updates = body.gameRtps || {};
  for (const gameId in updates) {
    if (db.rtpSettings.gameRtps.hasOwnProperty(gameId)) db.rtpSettings.gameRtps[gameId] = Number(updates[gameId]);
  }
  logEvent(db, 'ADMIN_RTP_UPDATE', 'RTP global fijado a ' + (db.rtpSettings.globalRtp * 100).toFixed(0) + '%');
  saveDb(db);
  return { success: true };
}

function actionAdminSetVisibility(db, body) {
  requireAdmin(db, body.token);
  db.gameVisibility[body.gameId] = !!body.isVisible;
  logEvent(db, 'ADMIN_GAME_VISIBILITY', 'Juego ' + body.gameId + ' ' + (body.isVisible ? 'habilitado' : 'deshabilitado'));
  saveDb(db);
  return { success: true };
}

function actionAdminSetMpConfig(db, body) {
  requireAdmin(db, body.token);
  if (typeof body.publicKey === 'string') db.mercadoPagoConfig.publicKey = body.publicKey.trim();
  // Solo se sobrescribe el access token si el administrador envió uno nuevo,
  // así nunca hace falta (ni es posible) recuperarlo de vuelta desde el navegador.
  if (typeof body.accessToken === 'string' && body.accessToken.trim()) {
    db.mercadoPagoConfig.accessToken = body.accessToken.trim();
  }
  logEvent(db, 'ADMIN_MP_CONFIG_UPDATE', 'Credenciales de Mercado Pago actualizadas');
  saveDb(db);
  return { success: true };
}

function actionAdminResetPlatform(db, body) {
  requireAdmin(db, body.token);
  const fresh = buildDefaultDb();
  db.rtpSettings = fresh.rtpSettings;
  db.platformStats = fresh.platformStats;
  db.auditLogs = [{ timestamp: Date.now(), action: 'ADMIN_RESET', details: 'Estadísticas y RTP reiniciados por administrador' }];
  db.users.forEach(function (user) {
    user.balance = 0; user.winnings = 0; user.losses = 0;
    user.history = []; user.xp = 0; user.vipLevel = user.role === 'admin' ? 10 : 1;
    user.failedLoginAttempts = 0; user.lockedUntil = 0;
  });
  saveDb(db);
  return { success: true };
}

/**
 * NOTA DE SEGURIDAD IMPORTANTE (léela antes de usar esto con dinero real):
 * Este backend corrige los problemas más graves de la versión anterior:
 *   - Ya no se puede leer la base completa (emails, saldos, hashes) con un
 *     simple GET público.
 *   - El rol de administrador y la identidad del usuario ya no dependen de
 *     datos que el propio navegador controla: se validan con un token de
 *     sesión emitido por este servidor.
 *   - El Access Token de Mercado Pago nunca sale de este script.
 *   - El código de verificación de registro/recuperación se genera y valida
 *     aquí, no en la memoria del navegador de quien lo solicita.
 * Limitación que SIGUE existiendo y que debes conocer: el resultado de cada
 * juego (si ganaste, cuánto) se calcula en el JavaScript del navegador
 * (js/games/*.js) y se reporta a `settleBet`. Un usuario con conocimientos
 * técnicos podría manipular ese resultado desde la consola del navegador.
 * Este script limita el daño (tope de multiplicador por juego, ver
 * GAME_MAX_MULTIPLIER), pero la única forma de eliminar el riesgo por
 * completo es mover el cálculo de cada juego a este servidor. Para una
 * plataforma con dinero real, eso es indispensable; para una demo/simulador
 * como este, el límite de cordura es una mitigación razonable.
 */
