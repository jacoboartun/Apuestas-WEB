/**
 * AETHERIS CASINO - Backend Service: Wallet
 * Handles deposits, withdrawals, and balance queries.
 */

/**
 * Deposits funds to the current user's balance.
 * @param {number} amount
 * @returns {Promise<number>} New balance
 */
async function deposit(amount) {
    await window.StateCore.ensureLoaded();
    const user = window.AuthService.getCurrentUser();
    if (!user) throw new Error('No hay sesión activa.');

    amount = parseFloat(amount);
    if (isNaN(amount) || amount <= 0) throw new Error('Monto inválido.');
    if (amount > 100_000) throw new Error('Monto máximo de depósito: $100,000.');

    user.balance = parseFloat((user.balance + amount).toFixed(2));
    window.StateCore.logEvent('WALLET_DEPOSIT', `${user.email} depositó $${amount.toFixed(2)}`);
    await window.StateCore.save();
    return user.balance;
}

/**
 * Withdraws funds from the current user's balance.
 * @param {number} amount
 * @returns {Promise<number>} New balance
 */
async function withdraw(amount) {
    await window.StateCore.ensureLoaded();
    const user = window.AuthService.getCurrentUser();
    if (!user) throw new Error('No hay sesión activa.');

    amount = parseFloat(amount);
    if (isNaN(amount) || amount <= 0) throw new Error('Monto inválido.');
    if (user.balance < amount) throw new Error('Saldo insuficiente.');

    user.balance = parseFloat((user.balance - amount).toFixed(2));
    window.StateCore.logEvent('WALLET_WITHDRAWAL', `${user.email} retiró $${amount.toFixed(2)}`);
    await window.StateCore.save();
    return user.balance;
}

/**
 * Returns the current balance of the logged-in user.
 * @returns {number|null}
 */
function getBalance() {
    const user = window.AuthService.getCurrentUser();
    return user ? user.balance : null;
}

// Export to global scope
window.WalletService = { deposit, withdraw, getBalance };
