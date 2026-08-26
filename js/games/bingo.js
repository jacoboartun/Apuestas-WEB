// Aetheris Casino - Bingo Online Game Module

window.gamesRegistry['bingo'] = {
    cardCount: 2,
    cards: [],
    drawnBalls: [],
    betAmount: 0,
    isPlaying: false,
    intervalId: null,

    init(stage, configs) {
        this.stage = stage;
        this.configs = configs;
        this.isPlaying = false;

        configs.innerHTML = `
            <div class="form-group">
                <label class="form-label">Cantidad de Cartones (1-4)</label>
                <select id="bg-card-select" class="form-input" onchange="window.gamesRegistry.bingo.updateCardsCount()">
                    <option value="1">1 Cartón (Apuesta $10)</option>
                    <option value="2" selected>2 Cartones (Apuesta $20)</option>
                    <option value="3">3 Cartones (Apuesta $30)</option>
                    <option value="4">4 Cartones (Apuesta $40)</option>
                </select>
            </div>
            <div style="background:rgba(0,0,0,0.2); padding:10px; border-radius:8px; border:1px solid var(--border-color); font-size:0.75rem; color:rgba(255,255,255,0.7); text-align:center;">
                Completar 1 Línea paga x1.5. Doble Línea paga x5. ¡Bingo (Full House) paga x50!
            </div>
        `;

        this.updateCardsCount();
    },

    updateCardsCount() {
        const option = document.getElementById('bg-card-select');
        if (option) this.cardCount = parseInt(option.value);
        this.betAmount = this.cardCount * 10;

        const betInput = document.getElementById('game-bet-input');
        if (betInput) betInput.value = this.betAmount;

        this.generateCards();
        this.renderBoard();
    },

    generateCards() {
        this.cards = [];
        for (let c = 0; c < this.cardCount; c++) {
            const grid = [];
            // Generate standard 5x5 card numbers (1-75). Col 1: 1-15, Col 2: 16-30, etc.
            for (let col = 0; col < 5; col++) {
                const pool = [];
                for (let num = col * 15 + 1; num <= col * 15 + 15; num++) {
                    pool.push(num);
                }
                // Shuffle pool
                pool.sort(() => Math.random() - 0.5);
                
                for (let row = 0; row < 5; row++) {
                    if (!grid[row]) grid[row] = [];
                    grid[row][col] = pool[row];
                }
            }
            // Free center tile
            grid[2][2] = 'FREE';
            this.cards.push({
                grid: grid,
                marked: Array(5).fill(null).map(() => Array(5).fill(false))
            });
            // Mark FREE tile initially
            this.cards[c].marked[2][2] = true;
        }
    },

    renderBoard() {
        this.stage.innerHTML = `
            <div style="display:flex; flex-direction:column; justify-content:space-between; width:100%; height:100%; padding:16px; overflow-y:auto; gap:16px;">
                <!-- Recent ball caller HUD -->
                <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(0,0,0,0.3); padding:10px 16px; border-radius:10px; border:1px solid var(--border-color);">
                    <div style="font-weight:700; font-size:0.9rem; color:var(--accent);">BALOTA ACTUAL</div>
                    <div id="bg-ball-caller" style="width:40px; height:40px; border-radius:50%; background:var(--primary); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:1.2rem; box-shadow:0 0 10px var(--primary);">--</div>
                    <div style="font-size:0.8rem; color:var(--text-muted); max-width:140px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;" id="bg-previous-balls">Previos: --</div>
                </div>

                <!-- Cards grid container -->
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap:12px; width:100%; overflow-y:auto; flex:1;" id="bg-cards-box">
                    <!-- Cards will draw here -->
                </div>

                <div id="bg-status-hud" style="text-align:center; font-family:var(--font-serif); font-size:1.1rem; font-weight:700; color:var(--accent); min-height:25px;">
                    Compra tus cartones y juega
                </div>
            </div>
        `;

        const box = document.getElementById('bg-cards-box');
        box.innerHTML = '';

        this.cards.forEach((card, cIdx) => {
            const cardEl = document.createElement('div');
            cardEl.style.background = 'rgba(0, 0, 0, 0.4)';
            cardEl.style.border = '1px solid var(--border-color)';
            cardEl.style.borderRadius = '8px';
            cardEl.style.padding = '8px';
            cardEl.style.display = 'flex';
            cardEl.style.flexDirection = 'column';
            cardEl.style.gap = '6px';

            cardEl.innerHTML = `
                <div style="font-weight:700; font-size:0.8rem; color:var(--secondary); text-align:center;">Cartón #${cIdx + 1}</div>
                <div style="display:grid; grid-template-columns: repeat(5, 1fr); gap:3px;">
                    ${['B','I','N','G','O'].map(h => `<div style="text-align:center; font-weight:800; font-size:0.75rem; color:var(--accent);">${h}</div>`).join('')}
                    ${card.grid.map((row, rIdx) => 
                        row.map((val, cIdx2) => {
                            const isMarked = card.marked[rIdx][cIdx2];
                            const bg = isMarked ? 'var(--primary)' : 'rgba(255,255,255,0.03)';
                            return `<div id="bg-cell-${cIdx}-${rIdx}-${cIdx2}" style="aspect-ratio:1; background:${bg}; border-radius:4px; display:flex; align-items:center; justify-content:center; font-size:0.7rem; font-weight:700; color:#fff; transition:all 0.2s;">${val}</div>`;
                        }).join('')
                    ).join('')}
                </div>
            `;
            box.appendChild(cardEl);
        });
    },

    async play(betAmount) {
        if (betAmount !== this.betAmount) {
            showToast(`La apuesta obligatoria para ${this.cardCount} cartones es $${this.betAmount}.`, 'info');
            const betInput = document.getElementById('game-bet-input');
            betInput.value = this.betAmount;
        }

        this.isPlaying = true;
        this.drawnBalls = [];
        this.generateCards();
        this.renderBoard();

        const playBtn = document.getElementById('game-play-btn');
        playBtn.disabled = true;
        playBtn.innerText = 'Cantando Números...';

        document.getElementById('bg-status-hud').innerText = 'Juego iniciado. Sorteando balotas...';

        // Draw balls cycle
        let draws = 0;
        const totalDrawsLimit = 42; // standard quick bingo draw count

        const globalRtp = window.stateManager.state.rtpSettings.globalRtp;
        const gameRtp = window.stateManager.state.rtpSettings.gameRtps.bingo;
        const targetRtp = globalRtp * gameRtp;

        this.intervalId = setInterval(async () => {
            if (!this.isPlaying) return;

            // Generate next drawn ball (1-75)
            let ball = 0;
            let attempts = 0;
            
            while (attempts < 100) {
                const tempBall = Math.floor(Math.random() * 75) + 1;
                
                if (this.drawnBalls.includes(tempBall)) {
                    attempts++;
                    continue;
                }

                // If RTP is low, avoid drawing numbers that appear on user cards
                if (targetRtp < 0.90 && attempts < 20 && Math.random() > targetRtp) {
                    const appears = this.cards.some(c => c.grid.some(row => row.includes(tempBall)));
                    if (appears) {
                        attempts++;
                        continue;
                    }
                }

                ball = tempBall;
                break;
            }

            if (ball === 0) ball = Math.floor(Math.random() * 75) + 1; // backup

            this.drawnBalls.unshift(ball);
            draws++;

            // Visual elements update
            document.getElementById('bg-ball-caller').innerText = ball;
            document.getElementById('bg-previous-balls').innerText = `Previos: ${this.drawnBalls.slice(1, 5).join(', ')}`;
            window.soundManager.playTick();

            // Daub/Mark cards
            this.cards.forEach((card, cIdx) => {
                card.grid.forEach((row, rIdx) => {
                    const cIdx2 = row.indexOf(ball);
                    if (cIdx2 !== -1) {
                        card.marked[rIdx][cIdx2] = true;
                        
                        // Apply CSS highlight update
                        const cell = document.getElementById(`bg-cell-${cIdx}-${rIdx}-${cIdx2}`);
                        if (cell) {
                            cell.style.background = 'var(--primary)';
                            cell.style.transform = 'scale(1.1)';
                            setTimeout(() => cell.style.transform = 'scale(1)', 200);
                        }
                    }
                });
            });

            // Check if rounds are complete
            if (draws >= totalDrawsLimit) {
                clearInterval(this.intervalId);
                this.settleBingo();
            }
        }, 300); // Draw every 300ms
    },

    settleBingo() {
        this.isPlaying = false;

        let totalWin = 0;
        let highestRank = 'Ninguno';

        this.cards.forEach(card => {
            let linesCompleted = 0;
            let fullHouse = true;

            // Check horizontal lines
            for (let r = 0; r < 5; r++) {
                const line = card.marked[r].every(v => v === true);
                if (line) linesCompleted++;
            }
            // Check vertical lines
            for (let c = 0; c < 5; c++) {
                let colMarked = true;
                for (let r = 0; r < 5; r++) {
                    if (!card.marked[r][c]) {
                        colMarked = false;
                        break;
                    }
                }
                if (colMarked) linesCompleted++;
            }

            // Check full card completion
            card.marked.forEach(row => row.forEach(cell => {
                if (!cell) fullHouse = false;
            }));

            // Calculate card win payout
            if (fullHouse) {
                totalWin += 500; // 50x payout
                highestRank = 'BINGO!';
            } else if (linesCompleted >= 2) {
                totalWin += 50; // 5x payout
                highestRank = 'Doble Línea';
            } else if (linesCompleted === 1) {
                totalWin += 15; // 1.5x payout
                if (highestRank !== 'Doble Línea') highestRank = '1 Línea';
            }
        });

        const hud = document.getElementById('bg-status-hud');
        if (totalWin > 0) {
            hud.innerText = `¡Juego Completado! Resultado: ${highestRank} (Ganas $${totalWin.toFixed(2)})`;
            hud.style.color = 'var(--success)';
            showToast(`¡Completaste ${highestRank}! Ganas $${totalWin.toFixed(2)}`, 'success');
        } else {
            hud.innerText = 'Fin del Sorteo. Sin combinaciones ganadoras.';
            hud.style.color = 'var(--text-muted)';
            showToast('Cartón sin completar.', 'danger');
        }

        const playBtn = document.getElementById('game-play-btn');
        playBtn.disabled = false;
        playBtn.className = 'btn btn-primary';
        playBtn.innerText = 'Comprar Nuevos Cartones';
        playBtn.onclick = () => runActiveGameBet();

        settleGameOutcome('bingo', this.betAmount, totalWin, `Completed draws with highest rank: ${highestRank}`);
    }
};
