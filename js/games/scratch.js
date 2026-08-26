// Aetheris Casino - Rasca y Gana Digital Game Module

window.gamesRegistry['scratch'] = {
    cardType: 'silver', // silver ($10), gold ($50), diamond ($100)
    betAmount: 10,
    isPlaying: false,
    symbols: [],
    scratchedCount: 0,
    isSettled: false,

    prices: {
        silver: { bet: 10, jack: 200, tier2: 50, tier3: 20, tier4: 10 },
        gold: { bet: 50, jack: 1000, tier2: 250, tier3: 100, tier4: 50 },
        diamond: { bet: 100, jack: 5000, tier2: 500, tier3: 200, tier4: 100 }
    },

    init(stage, configs) {
        this.stage = stage;
        this.configs = configs;
        this.isPlaying = false;
        this.isSettled = false;

        configs.innerHTML = `
            <div class="form-group">
                <label class="form-label">Tipo de Raspa y Gana</label>
                <select id="sc-card-type" class="form-input" onchange="window.gamesRegistry.scratch.updateCardType()">
                    <option value="silver" selected>Foil de Plata (Apuesta $10 | Premio Max $200)</option>
                    <option value="gold">Foil de Oro (Apuesta $50 | Premio Max $1000)</option>
                    <option value="diamond">Foil de Diamante (Apuesta $100 | Premio Max $5000)</option>
                </select>
            </div>
            <div style="background:rgba(0,0,0,0.2); padding:10px; border-radius:8px; border:1px solid var(--border-color); font-size:0.75rem; color:rgba(255,255,255,0.7); text-align:center;">
                Compra la tarjeta. Mueve tu cursor presionando sobre los cuadros para raspar el foil. Alinea 3 premios iguales para ganar.
            </div>
        `;

        this.updateCardType();
    },

    updateCardType() {
        const option = document.getElementById('sc-card-type');
        if (option) this.cardType = option.value;

        this.betAmount = this.prices[this.cardType].bet;
        
        // Sync main bet input text
        const betInput = document.getElementById('game-bet-input');
        if (betInput) betInput.value = this.betAmount;

        this.renderCard();
    },

    renderCard() {
        this.stage.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; gap:16px; width:100%; justify-content:center; padding:12px;">
                <div style="font-family:var(--font-serif); font-size:1.3rem; color:var(--accent); text-transform:uppercase;">
                    Rasca ${this.cardType === 'silver' ? 'Plata' : (this.cardType === 'gold' ? 'Oro' : 'Diamante')}
                </div>
                
                <!-- 3x3 scratch Grid -->
                <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:10px; width:270px; height:270px;" id="sc-grid">
                    ${[0,1,2,3,4,5,6,7,8].map(idx => `
                        <div style="position:relative; background:#1e293b; border:1px solid var(--border-color); border-radius:8px; overflow:hidden; display:flex; align-items:center; justify-content:center;">
                            <!-- Prize text below -->
                            <div id="sc-prize-text-${idx}" style="font-size:1.1rem; font-weight:800; color:var(--accent); z-index:1;">$--</div>
                            <!-- Scratch canvas overlay -->
                            <canvas id="sc-canvas-${idx}" width="80" height="80" style="position:absolute; top:0; left:0; width:100%; height:100%; cursor:crosshair; z-index:2;"></canvas>
                        </div>
                    `).join('')}
                </div>

                <div id="sc-status-hud" style="font-family:var(--font-serif); font-size:1.1rem; font-weight:700; min-height:24px;">
                    ¡Compra la raspa para raspar!
                </div>
            </div>
        `;

        this.drawFoilOverlay();
    },

    drawFoilOverlay() {
        const fillStyle = this.cardType === 'silver' ? '#78716c' : (this.cardType === 'gold' ? '#d97706' : '#0891b2');
        for (let i = 0; i < 9; i++) {
            const canvas = document.getElementById(`sc-canvas-${i}`);
            if (!canvas) continue;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = fillStyle;
            ctx.fillRect(0, 0, 80, 80);
            
            // Add custom visual dust/dots texture
            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            for (let dot = 0; dot < 40; dot++) {
                ctx.fillRect(Math.random() * 80, Math.random() * 80, 2, 2);
            }
        }
    },

    async play(betAmount) {
        // Enforce bet amounts matching choice
        if (betAmount !== this.betAmount) {
            showToast(`Este boleto cuesta exactamente $${this.betAmount}. Ajustando apuesta...`, 'info');
            const betInput = document.getElementById('game-bet-input');
            betInput.value = this.betAmount;
        }

        this.isPlaying = true;
        this.isSettled = false;
        this.scratchedCount = 0;
        this.renderCard();

        // Calculate card layout values based on Admin RTP settings
        const globalRtp = window.stateManager.state.rtpSettings.globalRtp;
        const gameRtp = window.stateManager.state.rtpSettings.gameRtps.scratch;
        const targetRtp = globalRtp * gameRtp;

        const cardPrices = this.prices[this.cardType];
        const tierPrizes = [cardPrices.jack, cardPrices.tier2, cardPrices.tier3, cardPrices.tier4];
        
        let winningTier = -1;
        const rng = Math.random();

        // Admin RTP outcomes control
        if (rng < targetRtp * 0.25) {
            // Player wins a prize tier
            const tierRng = Math.random();
            if (tierRng < 0.05) winningTier = 0; // Jackpot
            else if (tierRng < 0.20) winningTier = 1;
            else if (tierRng < 0.50) winningTier = 2;
            else winningTier = 3;
        }

        // Fill symbol grid
        this.symbols = [];
        if (winningTier !== -1) {
            const winVal = tierPrizes[winningTier];
            // Place exactly 3 winning items
            this.symbols.push(winVal, winVal, winVal);
            
            // Populate remaining 6 slots with random other tier prizes, avoiding making another 3-match
            const remainingPool = tierPrizes.filter(v => v !== winVal);
            for (let i = 0; i < 6; i++) {
                this.symbols.push(remainingPool[Math.floor(Math.random() * remainingPool.length)]);
            }
        } else {
            // House wins (lose card). Populate grid ensuring no symbol appears 3 times.
            const shuffledPool = [
                cardPrices.jack, cardPrices.jack,
                cardPrices.tier2, cardPrices.tier2,
                cardPrices.tier3, cardPrices.tier3,
                cardPrices.tier4, cardPrices.tier4,
                cardPrices.tier4 // only one tier4 to make 9 symbols total
            ];
            // Shuffle
            this.symbols = shuffledPool.sort(() => Math.random() - 0.5);
        }

        // Shuffle symbols for distribution
        this.symbols.sort(() => Math.random() - 0.5);

        // Apply symbol texts underneath
        for (let i = 0; i < 9; i++) {
            document.getElementById(`sc-prize-text-${i}`).innerText = `$${this.symbols[i]}`;
        }

        // Bind interactive mouse/touch scratch listener triggers
        this.bindScratchEvents();

        document.getElementById('sc-status-hud').innerText = '¡Foil listo! Raspa las tarjetas con tu cursor.';
        showToast('Boleto comprado. Raspa el foil.', 'info');
        
        const playBtn = document.getElementById('game-play-btn');
        playBtn.disabled = true;
        playBtn.innerText = 'Raspando...';
    },

    bindScratchEvents() {
        for (let i = 0; i < 9; i++) {
            const canvas = document.getElementById(`sc-canvas-${i}`);
            const ctx = canvas.getContext('2d');
            let isDrawing = false;

            const scratch = (e) => {
                if (!isDrawing || !this.isPlaying) return;
                
                const rect = canvas.getBoundingClientRect();
                const x = (e.clientX || e.touches[0].clientX) - rect.left;
                const y = (e.clientY || e.touches[0].clientY) - rect.top;

                // Erase drawing mode
                ctx.globalCompositeOperation = 'destination-out';
                ctx.beginPath();
                ctx.arc(x, y, 14, 0, Math.PI * 2);
                ctx.fill();
            };

            const endScratch = () => {
                if (!isDrawing) return;
                isDrawing = false;
                
                // Check if card is mostly scratched (> 50%)
                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                let clearedPixels = 0;
                for (let p = 3; p < imgData.data.length; p += 4) {
                    if (imgData.data[p] === 0) clearedPixels++;
                }

                if (clearedPixels > (canvas.width * canvas.height) * 0.45) {
                    // Fully clear canvas
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    
                    if (!canvas.classList.contains('scratched')) {
                        canvas.classList.add('scratched');
                        window.soundManager.playTick();
                        this.scratchedCount++;
                        
                        if (this.scratchedCount === 9) {
                            this.settleScratchCard();
                        }
                    }
                }
            };

            canvas.addEventListener('mousedown', () => isDrawing = true);
            canvas.addEventListener('mousemove', scratch);
            canvas.addEventListener('mouseup', endScratch);
            canvas.addEventListener('mouseleave', endScratch);

            // Touch events
            canvas.addEventListener('touchstart', (e) => { e.preventDefault(); isDrawing = true; });
            canvas.addEventListener('touchmove', scratch);
            canvas.addEventListener('touchend', endScratch);
        }
    },

    async settleScratchCard() {
        if (this.isSettled) return;
        this.isSettled = true;
        this.isPlaying = false;

        // Group cards matching values
        const counts = {};
        this.symbols.forEach(s => counts[s] = (counts[s] || 0) + 1);

        let winVal = 0;
        Object.keys(counts).forEach(val => {
            if (counts[val] >= 3) {
                winVal = parseInt(val);
            }
        });

        const hud = document.getElementById('sc-status-hud');
        if (winVal > 0) {
            hud.innerText = `¡Felicidades! Ganaste $${winVal.toFixed(2)}`;
            hud.style.color = 'var(--success)';
            showToast(`¡Ganaste $${winVal.toFixed(2)}!`, 'success');
        } else {
            hud.innerText = 'Esta vez no ganaste. ¡Sigue raspando!';
            hud.style.color = 'var(--text-muted)';
            showToast('Boleto no premiado.', 'danger');
        }

        const playBtn = document.getElementById('game-play-btn');
        playBtn.disabled = false;
        playBtn.className = 'btn btn-primary';
        playBtn.innerText = 'Comprar Otro Boleto';
        playBtn.onclick = () => runActiveGameBet();

        await settleGameOutcome('scratch', this.betAmount, winAmountVal(), `Revealed matching prize: $${winVal}`);

        function winAmountVal() {
            return winVal;
        }
    }
};
