// Aetheris Casino - Keno Rápido Game Module

window.gamesRegistry['keno'] = {
    selectedNumbers: [],
    betAmount: 10,
    isPlaying: false,

    // Simplified payout table based on hit ratios
    payoutTable: {
        1: { 1: 3 },
        2: { 1: 1, 2: 12 },
        3: { 2: 2, 3: 42 },
        4: { 2: 1, 3: 8, 4: 130 },
        5: { 3: 3, 4: 15, 5: 700 },
        6: { 3: 1, 4: 7, 5: 60, 6: 1800 },
        7: { 4: 3, 5: 20, 6: 250, 7: 5000 },
        8: { 4: 2, 5: 10, 6: 75, 7: 1000, 8: 15000 },
        9: { 5: 5, 6: 45, 7: 350, 8: 2500, 9: 25000 },
        10: { 5: 2, 6: 15, 7: 120, 8: 1000, 9: 5000, 10: 50000 }
    },

    init(stage, configs) {
        this.stage = stage;
        this.configs = configs;
        this.isPlaying = false;
        this.selectedNumbers = [];

        configs.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:12px; width:100%;">
                <button class="btn btn-secondary" onclick="window.gamesRegistry.keno.quickPick()">Auto-Elegir (10 Números)</button>
                <button class="btn btn-secondary" onclick="window.gamesRegistry.keno.clearSelections()">Limpiar Selección</button>
            </div>
            <div style="margin-top:10px; font-size:0.75rem; color:rgba(255,255,255,0.7); text-align:center;">
                Elige de 1 a 10 números en la tabla. El sistema extraerá 20 balotas. Los pagos dependen de la cantidad de aciertos.
            </div>
        `;

        this.renderBoard();
    },

    renderBoard() {
        this.stage.innerHTML = `
            <div style="display:flex; flex-direction:column; justify-content:space-between; width:100%; height:100%; padding:16px; overflow-y:auto; gap:12px; align-items:center;">
                <div style="font-family:var(--font-serif); font-size:1.3rem; color:var(--accent);">KENO DIRECTO</div>
                
                <!-- 1-80 Selector Board Grid -->
                <div style="display:grid; grid-template-columns: repeat(10, 1fr); gap:3px; max-width:320px; width:100%;" id="kn-grid">
                    ${Array.from({length:80}, (_, i) => i + 1).map(num => `
                        <div id="kn-num-${num}" onclick="window.gamesRegistry.keno.toggleNumber(${num})" style="aspect-ratio:1; background:rgba(255,255,255,0.03); border:1px solid var(--border-color); border-radius:3px; display:flex; align-items:center; justify-content:center; font-size:0.7rem; font-weight:700; color:#fff; cursor:pointer; transition:all 0.15s;">
                            ${num}
                        </div>
                    `).join('')}
                </div>

                <div id="kn-status-hud" style="font-family:var(--font-serif); font-size:1rem; font-weight:700; color:var(--accent); min-height:22px; text-align:center;">
                    Selecciona hasta 10 números
                </div>
            </div>
        `;

        this.highlightSelected();
    },

    toggleNumber(num) {
        if (this.isPlaying) return;

        const idx = this.selectedNumbers.indexOf(num);
        if (idx !== -1) {
            this.selectedNumbers.splice(idx, 1);
        } else {
            if (this.selectedNumbers.length >= 10) {
                showToast('Máximo 10 números seleccionados.', 'info');
                return;
            }
            this.selectedNumbers.push(num);
        }

        window.soundManager.playClick();
        this.highlightSelected();

        const playBtn = document.getElementById('game-play-btn');
        if (this.selectedNumbers.length > 0) {
            playBtn.disabled = false;
            playBtn.innerText = `Apostar en Keno (Elegidos: ${this.selectedNumbers.length})`;
        } else {
            playBtn.disabled = true;
            playBtn.innerText = 'Elige tus Números';
        }
    },

    highlightSelected() {
        for (let i = 1; i <= 80; i++) {
            const cell = document.getElementById(`kn-num-${i}`);
            if (cell) {
                cell.style.background = 'rgba(255,255,255,0.03)';
                cell.style.borderColor = 'var(--border-color)';
                cell.style.color = '#fff';
            }
        }
        this.selectedNumbers.forEach(num => {
            const cell = document.getElementById(`kn-num-${num}`);
            if (cell) {
                cell.style.background = 'var(--primary)';
                cell.style.borderColor = 'var(--primary)';
                cell.style.color = '#fff';
            }
        });
    },

    quickPick() {
        if (this.isPlaying) return;
        this.selectedNumbers = [];
        while (this.selectedNumbers.length < 10) {
            const num = Math.floor(Math.random() * 80) + 1;
            if (!this.selectedNumbers.includes(num)) {
                this.selectedNumbers.push(num);
            }
        }
        window.soundManager.playClick();
        this.highlightSelected();

        const playBtn = document.getElementById('game-play-btn');
        playBtn.disabled = false;
        playBtn.innerText = 'Apostar en Keno (Elegidos: 10)';
    },

    clearSelections() {
        if (this.isPlaying) return;
        this.selectedNumbers = [];
        this.highlightSelected();

        const playBtn = document.getElementById('game-play-btn');
        playBtn.disabled = true;
        playBtn.innerText = 'Elige tus Números';
    },

    async play(betAmount) {
        if (this.selectedNumbers.length === 0) {
            showToast('Selecciona al menos 1 número.', 'danger');
            return;
        }

        this.betAmount = betAmount;
        this.isPlaying = true;

        // Reset grid cells background to avoid mixing previous draw results
        this.highlightSelected();

        const playBtn = document.getElementById('game-play-btn');
        playBtn.disabled = true;
        playBtn.innerText = 'Extrayendo Balotas...';

        document.getElementById('kn-status-hud').innerText = 'Extrayendo 20 números...';

        // Retrieve Admin RTP parameters
        const globalRtp = window.stateManager.state.rtpSettings.globalRtp;
        const gameRtp = window.stateManager.state.rtpSettings.gameRtps.keno;
        const targetRtp = globalRtp * gameRtp;

        const drawn = [];

        // Draw 20 numbers loop
        for (let b = 0; b < 20; b++) {
            await new Promise(resolve => setTimeout(resolve, 80));

            let ball = 0;
            let attempts = 0;

            while (attempts < 100) {
                const tempBall = Math.floor(Math.random() * 80) + 1;
                
                if (drawn.includes(tempBall)) {
                    attempts++;
                    continue;
                }

                // Apply RTP restrictions: if draw hits a chosen number,
                // but RTP config is low, force a retry.
                if (targetRtp < 0.90 && attempts < 30 && Math.random() > targetRtp) {
                    const match = this.selectedNumbers.includes(tempBall);
                    if (match) {
                        attempts++;
                        continue;
                    }
                }

                ball = tempBall;
                break;
            }

            if (ball === 0) ball = Math.floor(Math.random() * 80) + 1;

            drawn.push(ball);

            // Highlight drawn cell on grid
            const cell = document.getElementById(`kn-num-${ball}`);
            if (cell) {
                if (this.selectedNumbers.includes(ball)) {
                    cell.style.background = 'var(--success)';
                    cell.style.color = '#000';
                } else {
                    cell.style.background = 'var(--secondary)';
                    cell.style.color = '#000';
                }
            }

            window.soundManager.playTick();
        }

        this.settleDraws(drawn);
    },

    settleDraws(drawn) {
        this.isPlaying = false;

        let hits = 0;
        drawn.forEach(ball => {
            if (this.selectedNumbers.includes(ball)) hits++;
        });

        // Fetch multiplier from tables
        const selectCount = this.selectedNumbers.length;
        const table = this.payoutTable[selectCount];
        const multiplier = (table && table[hits]) ? table[hits] : 0;

        const winAmount = Number((this.betAmount * multiplier).toFixed(2));
        
        const hud = document.getElementById('kn-status-hud');
        if (multiplier > 0) {
            hud.innerText = `¡${hits} Aciertos! Ganaste x${multiplier} ($${winAmount.toFixed(2)})`;
            hud.style.color = 'var(--success)';
            showToast(`¡Alineaste ${hits} números! Ganaste $${winAmount.toFixed(2)}`, 'success');
        } else {
            hud.innerText = `Obtuviste ${hits} aciertos. Sin premio.`;
            hud.style.color = 'var(--text-muted)';
            showToast('Keno no premiado.', 'danger');
        }

        const playBtn = document.getElementById('game-play-btn');
        playBtn.disabled = false;
        playBtn.className = 'btn btn-primary';
        playBtn.innerText = 'Jugar de Nuevo';
        playBtn.onclick = () => runActiveGameBet();

        settleGameOutcome('keno', this.betAmount, winAmount, `Hits: ${hits}/${selectCount} | Selected: ${this.selectedNumbers.join(',')}`);
    }
};
