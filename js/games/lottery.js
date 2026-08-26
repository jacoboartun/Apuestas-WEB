// Aetheris Casino - Loterías Internacionales Game Module

window.gamesRegistry['lottery'] = {
    selectedNumbers: [],
    betAmount: 10,
    isPlaying: false,

    init(stage, configs) {
        this.stage = stage;
        this.configs = configs;
        this.isPlaying = false;
        this.selectedNumbers = [];

        configs.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:12px; width:100%;">
                <button class="btn btn-secondary" onclick="window.gamesRegistry.lottery.quickPick()">Quick Pick (Aleatorio)</button>
                <button class="btn btn-secondary" onclick="window.gamesRegistry.lottery.clearSelections()">Limpiar Selección</button>
            </div>
            <div style="margin-top:10px; font-size:0.75rem; color:rgba(255,255,255,0.7); text-align:center;">
                Elige exactamente 6 números. Boleto cuesta $10. Aciertos: 3 aciertos (x5), 4 (x50), 5 (x500), 6 (x5000).
            </div>
        `;

        this.renderBoard();
    },

    renderBoard() {
        this.stage.innerHTML = `
            <div style="display:flex; flex-direction:column; justify-content:space-between; width:100%; height:100%; padding:16px; overflow-y:auto; gap:16px; align-items:center;">
                <div style="font-family:var(--font-serif); font-size:1.3rem; color:var(--accent);">LOTERÍA INTERNACIONAL (6/49)</div>
                
                <!-- Drawn numbers area -->
                <div style="display:flex; gap:8px;" id="lt-draw-box">
                    ${[0,1,2,3,4,5].map(idx => `<div id="lt-draw-ball-${idx}" style="width:36px; height:36px; border-radius:50%; background:rgba(255,255,255,0.03); border:1px solid var(--border-color); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:0.95rem; color:#fff;">--</div>`).join('')}
                </div>

                <!-- 1-49 Grid selector -->
                <div style="display:grid; grid-template-columns: repeat(7, 1fr); gap:4px; max-width:280px; width:100%;" id="lt-grid">
                    ${Array.from({length:49}, (_, i) => i + 1).map(num => `
                        <div id="lt-num-${num}" onclick="window.gamesRegistry.lottery.toggleNumber(${num})" style="aspect-ratio:1; background:rgba(255,255,255,0.03); border:1px solid var(--border-color); border-radius:4px; display:flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:700; color:#fff; cursor:pointer; transition:all 0.2s;">
                            ${num}
                        </div>
                    `).join('')}
                </div>

                <div id="lt-status-hud" style="font-family:var(--font-serif); font-size:1.1rem; font-weight:700; color:var(--accent); min-height:24px; text-align:center;">
                    Selecciona 6 números en la cuadrícula
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
            if (this.selectedNumbers.length >= 6) {
                showToast('Ya has seleccionado 6 números.', 'info');
                return;
            }
            this.selectedNumbers.push(num);
        }

        window.soundManager.playClick();
        this.highlightSelected();
        
        // Lock bet button if not exactly 6 numbers
        const playBtn = document.getElementById('game-play-btn');
        if (this.selectedNumbers.length === 6) {
            playBtn.disabled = false;
            playBtn.innerText = 'Comprar Boleto ($10)';
        } else {
            playBtn.disabled = true;
            playBtn.innerText = 'Elige 6 Números';
        }
    },

    highlightSelected() {
        // Clear all highlight classes
        for (let i = 1; i <= 49; i++) {
            const cell = document.getElementById(`lt-num-${i}`);
            if (cell) {
                cell.style.background = 'rgba(255,255,255,0.03)';
                cell.style.borderColor = 'var(--border-color)';
            }
        }
        // Highlight active
        this.selectedNumbers.forEach(num => {
            const cell = document.getElementById(`lt-num-${num}`);
            if (cell) {
                cell.style.background = 'var(--primary)';
                cell.style.borderColor = 'var(--primary)';
            }
        });
    },

    quickPick() {
        if (this.isPlaying) return;
        this.selectedNumbers = [];
        while (this.selectedNumbers.length < 6) {
            const num = Math.floor(Math.random() * 49) + 1;
            if (!this.selectedNumbers.includes(num)) {
                this.selectedNumbers.push(num);
            }
        }
        window.soundManager.playClick();
        this.highlightSelected();

        const playBtn = document.getElementById('game-play-btn');
        playBtn.disabled = false;
        playBtn.innerText = 'Comprar Boleto ($10)';
    },

    clearSelections() {
        if (this.isPlaying) return;
        this.selectedNumbers = [];
        this.highlightSelected();

        const playBtn = document.getElementById('game-play-btn');
        playBtn.disabled = true;
        playBtn.innerText = 'Elige 6 Números';
    },

    async play(betAmount) {
        if (this.selectedNumbers.length !== 6) {
            showToast('Selecciona exactamente 6 números.', 'danger');
            return;
        }

        // Adjust bet amount
        if (betAmount !== 10) {
            showToast('El boleto de lotería cuesta exactamente $10.', 'info');
            const betInput = document.getElementById('game-bet-input');
            betInput.value = 10;
        }

        this.isPlaying = true;
        
        // Reset drawn balls HUD
        for (let i = 0; i < 6; i++) {
            document.getElementById(`lt-draw-ball-${i}`).innerText = '--';
            document.getElementById(`lt-draw-ball-${i}`).style.background = 'rgba(255,255,255,0.03)';
        }

        const playBtn = document.getElementById('game-play-btn');
        playBtn.disabled = true;
        playBtn.innerText = 'Sorteando Balotas...';

        document.getElementById('lt-status-hud').innerText = 'Extrayendo esferas del bombo...';

        // Retrieve Admin RTP limits
        const globalRtp = window.stateManager.state.rtpSettings.globalRtp;
        const gameRtp = window.stateManager.state.rtpSettings.gameRtps.lottery;
        const targetRtp = globalRtp * gameRtp;

        // Draw balls outcomes
        const drawn = [];
        
        for (let b = 0; b < 6; b++) {
            await new Promise(resolve => setTimeout(resolve, 350));
            
            let ball = 0;
            let attempts = 0;

            while (attempts < 100) {
                const tempBall = Math.floor(Math.random() * 49) + 1;
                
                if (drawn.includes(tempBall)) {
                    attempts++;
                    continue;
                }

                // Apply RTP control: if the drawn ball matches a user pick,
                // but RTP settings are low, we force redraw to prevent matches.
                if (targetRtp < 0.85 && attempts < 25 && Math.random() > targetRtp) {
                    const match = this.selectedNumbers.includes(tempBall);
                    if (match) {
                        attempts++;
                        continue;
                    }
                }

                ball = tempBall;
                break;
            }

            if (ball === 0) ball = Math.floor(Math.random() * 49) + 1; // backup

            drawn.push(ball);

            // Update draw ball cell
            const cell = document.getElementById(`lt-draw-ball-${b}`);
            cell.innerText = ball;
            
            // Color ball gold if it matches a player selection
            if (this.selectedNumbers.includes(ball)) {
                cell.style.background = 'var(--accent)';
                cell.style.color = '#000';
            } else {
                cell.style.background = 'var(--primary)';
                cell.style.color = '#fff';
            }

            window.soundManager.playTick();
        }

        this.settleDraws(drawn);
    },

    async settleDraws(drawn) {
        this.isPlaying = false;

        // Calculate hits
        let hits = 0;
        drawn.forEach(ball => {
            if (this.selectedNumbers.includes(ball)) hits++;
        });

        let multiplier = 0;
        if (hits === 3) multiplier = 5;
        else if (hits === 4) multiplier = 50;
        else if (hits === 5) multiplier = 500;
        else if (hits === 6) multiplier = 5000;

        const winAmount = Number((this.betAmount * multiplier).toFixed(2));
        
        const hud = document.getElementById('lt-status-hud');
        if (multiplier > 0) {
            hud.innerText = `¡${hits} Aciertos! Ganaste x${multiplier} ($${winAmount.toFixed(2)})`;
            hud.style.color = 'var(--success)';
            showToast(`¡Alineaste ${hits} números! Ganaste $${winAmount.toFixed(2)}`, 'success');
        } else {
            hud.innerText = `Obtuviste ${hits} aciertos. Boleto sin premio.`;
            hud.style.color = 'var(--text-muted)';
            showToast('Lotería no premiada.', 'danger');
        }

        const playBtn = document.getElementById('game-play-btn');
        playBtn.disabled = false;
        playBtn.className = 'btn btn-primary';
        playBtn.innerText = 'Comprar Otro Boleto';
        playBtn.onclick = () => runActiveGameBet();

        await settleGameOutcome('lottery', this.betAmount, winAmount, `Matches: ${hits} | Selected: ${this.selectedNumbers.join(',')}`);
    }
};
