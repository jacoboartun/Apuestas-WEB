// Aetheris Casino - Cara o Cruz Virtual Game Module

window.gamesRegistry['coinflip'] = {
    choice: 'cara', // cara, cruz
    isPlaying: false,
    betAmount: 0,

    init(stage, configs) {
        this.stage = stage;
        this.configs = configs;
        this.isPlaying = false;

        configs.innerHTML = `
            <div class="form-group">
                <label class="form-label">Elige tu Lado</label>
                <select id="cf-choice-option" class="form-input" onchange="window.gamesRegistry.coinflip.updateChoice()">
                    <option value="cara" selected>Cara / Heads (x2)</option>
                    <option value="cruz">Cruz / Tails (x2)</option>
                </select>
            </div>
            <div style="background:rgba(0,0,0,0.2); padding:10px; border-radius:8px; border:1px solid var(--border-color); font-size:0.75rem; color:rgba(255,255,255,0.7); text-align:center;">
                Elige un lado de la moneda de Coolbet. Adivina el lanzamiento para ganar el doble de tu apuesta.
            </div>
        `;

        this.renderBoard();
    },

    updateChoice() {
        const option = document.getElementById('cf-choice-option');
        if (option) this.choice = option.value;
    },

    renderBoard() {
        this.stage.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:space-between; width:100%; height:100%; padding:24px;">
                <div style="font-family:var(--font-serif); font-size:1.4rem; color:var(--accent);">COIN FLIP</div>
                
                <!-- 3D Coin element -->
                <div style="perspective:400px;">
                    <div id="cf-coin-element" class="coin-3d">COOLBET</div>
                </div>

                <div id="cf-status-hud" style="text-align:center; font-family:var(--font-serif); font-size:1.4rem; font-weight:700; color:var(--accent); min-height:40px;">
                    Elige un lado y lanza la moneda
                </div>
            </div>
        `;
    },

    async play(betAmount) {
        this.betAmount = betAmount;
        this.isPlaying = true;
        this.renderBoard();

        const playBtn = document.getElementById('game-play-btn');
        playBtn.disabled = true;
        playBtn.innerText = 'Lanzando Moneda...';

        // Add CSS spinning classes
        const coin = document.getElementById('cf-coin-element');
        coin.classList.add('flipping');
        window.soundManager.playTick();

        // Play ticker arpeggios during flip
        let ticks = 0;
        const tickInt = setInterval(() => {
            window.soundManager.playTick();
            ticks++;
            if (ticks > 6) clearInterval(tickInt);
        }, 180);

        await new Promise(resolve => setTimeout(resolve, 1400));

        // Read RTP settings
        const globalRtp = window.stateManager.state.rtpSettings.globalRtp;
        const gameRtp = window.stateManager.state.rtpSettings.gameRtps.coinflip;
        const targetRtp = globalRtp * gameRtp;

        // Roll Flip outcome
        let outcome = 'cara';
        let isWin = false;

        const rng = Math.random();
        if (rng < targetRtp * 0.5) {
            // Player wins
            outcome = this.choice;
            isWin = true;
        } else {
            // Player loses
            outcome = this.choice === 'cara' ? 'cruz' : 'cara';
            isWin = false;
        }

        // Stop spin animation, apply final side rotate transform
        coin.classList.remove('flipping');
        coin.innerText = outcome.toUpperCase();

        if (outcome === 'cara') {
            coin.style.transform = 'rotateY(0deg)';
            coin.style.background = 'linear-gradient(135deg, var(--accent) 0%, #d97706 100%)';
            coin.style.borderColor = '#fff';
        } else {
            coin.style.transform = 'rotateY(180deg)';
            coin.style.background = 'linear-gradient(135deg, var(--secondary) 0%, #0891b2 100%)';
            coin.style.borderColor = 'var(--primary)';
        }

        const winAmount = isWin ? Number((betAmount * 2.0).toFixed(2)) : 0;
        
        const hud = document.getElementById('cf-status-hud');
        hud.innerText = `Cayó ${outcome.toUpperCase()}! ${isWin ? `¡Ganaste $${winAmount.toFixed(2)}!` : 'Perdiste la apuesta.'}`;
        hud.style.color = isWin ? 'var(--success)' : 'var(--danger)';
        showToast(isWin ? `¡Ganaste $${winAmount.toFixed(2)}!` : 'Perdiste el flip.', isWin ? 'success' : 'danger');

        playBtn.disabled = false;
        playBtn.className = 'btn btn-primary';
        playBtn.innerText = 'Lanzar de Nuevo';
        playBtn.onclick = () => runActiveGameBet();

        await settleGameOutcome('coinflip', this.betAmount, winAmount, `Flipped: ${outcome.toUpperCase()} | Bet choice: ${this.choice.toUpperCase()}`);
    }
};
