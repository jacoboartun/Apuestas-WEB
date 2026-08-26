// Aetheris Casino - Mines (Minas) Game Module

window.gamesRegistry['mines'] = {
    mineCount: 3,
    betAmount: 0,
    activeMultiplier: 1.0,
    gemsFound: 0,
    boardState: [], // 'gem' or 'mine'
    revealedCells: [], // bool array
    isPlaying: false,

    init(stage, configs) {
        this.stage = stage;
        this.configs = configs;
        this.isPlaying = false;

        // Custom config inputs
        configs.innerHTML = `
            <div class="form-group">
                <label class="form-label">Número de Minas (1-24)</label>
                <input type="number" id="mines-count-input" class="form-input" min="1" max="24" value="3" onchange="window.gamesRegistry.mines.updateMineCount()">
            </div>
            <div style="background:rgba(0,0,0,0.2); padding:12px; border-radius:8px; border:1px solid var(--border-color); font-size:0.8rem; color:var(--text-muted);">
                Encuentra gemas para incrementar el multiplicador. Retira tu saldo en cualquier momento.
            </div>
        `;

        this.renderBoard();
    },

    updateMineCount() {
        const input = document.getElementById('mines-count-input');
        if (input) {
            let val = parseInt(input.value);
            if (isNaN(val) || val < 1) val = 1;
            if (val > 24) val = 24;
            input.value = val;
            this.mineCount = val;
        }
    },

    renderBoard() {
        this.stage.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; gap:20px; width:100%; justify-content:center;">
                <div class="mines-grid" id="mines-grid-box">
                    <!-- Cards cells -->
                </div>
                <div id="mines-info-hud" style="font-size:1.1rem; font-weight:700; color:var(--accent); min-height:25px;"></div>
            </div>
        `;

        const box = document.getElementById('mines-grid-box');
        box.innerHTML = '';

        for (let i = 0; i < 25; i++) {
            const cell = document.createElement('div');
            cell.className = 'mine-cell';
            cell.dataset.index = i;
            cell.innerText = '❓';
            cell.onclick = () => this.clickCell(i);
            box.appendChild(cell);
        }
        
        document.getElementById('mines-info-hud').innerText = `Minas: ${this.mineCount} | Multiplicador: 1.00x`;
    },

    async play(betAmount) {
        this.betAmount = betAmount;
        this.gemsFound = 0;
        this.activeMultiplier = 1.0;
        this.isPlaying = true;
        this.revealedCells = Array(25).fill(false);
        
        this.generateBoard();
        this.renderBoard();

        // Update main button to Cash Out
        const playBtn = document.getElementById('game-play-btn');
        playBtn.innerText = 'RETIRAR $0.00';
        playBtn.className = 'btn btn-accent';
        playBtn.disabled = true; // disabled until 1st gem is found
        playBtn.onclick = () => this.cashOut();

        showToast('Juego iniciado. ¡Selecciona una tarjeta!', 'info');
    },

    generateBoard() {
        this.boardState = Array(25).fill('gem');
        
        // Place mines randomly
        let placed = 0;
        while (placed < this.mineCount) {
            const idx = Math.floor(Math.random() * 25);
            if (this.boardState[idx] === 'gem') {
                this.boardState[idx] = 'mine';
                placed++;
            }
        }
    },

    async clickCell(idx) {
        if (!this.isPlaying || this.revealedCells[idx]) return;
        this.revealedCells[idx] = true;

        const cell = document.querySelector(`.mine-cell[data-index="${idx}"]`);
        
        // Retrieve admin RTP adjustments
        const globalRtp = window.stateManager.state.rtpSettings.globalRtp;
        const gameRtp = window.stateManager.state.rtpSettings.gameRtps.mines;
        const targetRtp = globalRtp * gameRtp;

        // Dynamic sabotage: If RTP is low, and player has already hit 2+ gems,
        // force a mine hit to secure house advantage.
        if (targetRtp < 0.90 && this.gemsFound >= 2 && Math.random() > targetRtp) {
            this.boardState[idx] = 'mine';
        }

        const isMine = this.boardState[idx] === 'mine';

        if (isMine) {
            // Hit a mine! Game Over
            cell.className = 'mine-cell revealed mine';
            cell.innerText = '💥';
            this.triggerExplosion();
        } else {
            // Hit a gem!
            this.gemsFound++;
            cell.className = 'mine-cell revealed gem';
            cell.innerText = '💎';
            window.soundManager.playClick();

            // Calculate next multiplier
            // Formula: Multiplier grows as remaining safe tiles decrease
            const totalSafe = 25 - this.mineCount;
            let mult = 0.99;
            for (let i = 0; i < this.gemsFound; i++) {
                mult *= (25 - i) / (totalSafe - i);
            }
            this.activeMultiplier = parseFloat(mult.toFixed(2));

            // Update HUD
            document.getElementById('mines-info-hud').innerText = `Gemas: ${this.gemsFound} | Multiplicador: ${this.activeMultiplier.toFixed(2)}x`;

            const currentWin = Number((this.betAmount * this.activeMultiplier).toFixed(2));
            const playBtn = document.getElementById('game-play-btn');
            playBtn.innerText = `RETIRAR $${currentWin.toFixed(2)}`;
            playBtn.disabled = false;
        }
    },

    async cashOut() {
        if (!this.isPlaying || this.gemsFound === 0) return;
        this.isPlaying = false;

        const winAmount = Number((this.betAmount * this.activeMultiplier).toFixed(2));
        
        // Reveal remaining board
        this.revealAll();

        document.getElementById('mines-info-hud').innerText = `¡Retirado con Éxito! Total: $${winAmount.toFixed(2)}`;
        showToast(`¡Ganaste $${winAmount.toFixed(2)}!`, 'success');

        await settleGameOutcome('mines', this.betAmount, winAmount, `Found ${this.gemsFound} gems at ${this.activeMultiplier}x`);
    },

    triggerExplosion() {
        this.isPlaying = false;
        window.soundManager.playExplode();
        
        // Reveal remaining board
        this.revealAll();

        document.getElementById('mines-info-hud').innerText = '¡Explotaste! Apuesta Perdida.';
        showToast('¡Has tocado una mina!', 'danger');

        const playBtn = document.getElementById('game-play-btn');
        playBtn.innerText = 'Jugar de Nuevo';
        playBtn.className = 'btn btn-primary';
        playBtn.onclick = () => runActiveGameBet();
        playBtn.disabled = false;

        settleGameOutcome('mines', this.betAmount, 0, `Exploded after finding ${this.gemsFound} gems`);
    },

    revealAll() {
        const cells = document.querySelectorAll('.mine-cell');
        cells.forEach((cell, idx) => {
            if (this.revealedCells[idx]) return;
            
            cell.className = 'mine-cell revealed';
            if (this.boardState[idx] === 'mine') {
                cell.innerText = '💣';
                cell.style.opacity = '0.5';
            } else {
                cell.innerText = '💎';
                cell.style.opacity = '0.5';
            }
        });
    }
};
