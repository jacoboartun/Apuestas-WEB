// Aetheris Casino - Slots (Tragamonedas) Game Module

window.gamesRegistry['slots'] = {
    symbols: ['🍒', '🍋', '🍇', '🍉', '🔔', '💎', '7️⃣', '⭐'],
    multipliers: {
        '🍒': 1.5,
        '🍋': 2,
        '🍇': 3,
        '🍉': 4,
        '🔔': 6,
        '💎': 10,
        '7️⃣': 25,
        '⭐': 50
    },

    init(stage, configs) {
        this.stage = stage;
        this.configs = configs;

        // Render slots HUD
        stage.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; gap:20px; width:100%; height:100%; justify-content:center;">
                <div style="font-family:var(--font-serif); font-size:1.4rem; color:var(--accent); text-shadow:0 0 10px rgba(245,158,11,0.2);">AETHERIS REELS</div>
                <div class="slots-container" id="slots-reels-box">
                    <!-- Reels will render here -->
                </div>
                <div id="slots-win-display" style="font-size:1.2rem; font-weight:700; color:var(--success); min-height:30px; text-shadow: 0 0 10px rgba(16,185,129,0.3);"></div>
            </div>
        `;

        this.renderReels();
    },

    renderReels() {
        const box = document.getElementById('slots-reels-box');
        box.innerHTML = '';

        for (let i = 0; i < 5; i++) {
            const reel = document.createElement('div');
            reel.className = 'slot-reel';
            reel.id = `slot-reel-${i}`;

            const symbolsList = document.createElement('div');
            symbolsList.className = 'slot-symbols';
            symbolsList.id = `slot-symbols-inner-${i}`;

            // Add initial symbols
            for (let s = 0; s < 15; s++) {
                const sym = document.createElement('div');
                sym.className = 'slot-symbol';
                sym.innerText = this.symbols[Math.floor(Math.random() * this.symbols.length)];
                symbolsList.appendChild(sym);
            }

            reel.appendChild(symbolsList);
            box.appendChild(reel);
        }
    },

    async play(betAmount) {
        // Calculate Win or Loss based on Admin RTP settings
        const globalRtp = window.stateManager.state.rtpSettings.globalRtp;
        const gameRtp = window.stateManager.state.rtpSettings.gameRtps.slots;
        const targetRtp = globalRtp * gameRtp; // Combined RTP coefficient

        // Run RTP check
        const rng = Math.random();
        let winMultiplier = 0;
        let winSymbol = null;

        if (rng < targetRtp * 0.4) {
            // RTP hit! Calculate win multiplier
            const winRng = Math.random();
            if (winRng < 0.02) {
                winSymbol = '⭐'; // Jackpot
            } else if (winRng < 0.08) {
                winSymbol = '7️⃣';
            } else if (winRng < 0.18) {
                winSymbol = '💎';
            } else if (winRng < 0.35) {
                winSymbol = '🔔';
            } else if (winRng < 0.55) {
                winSymbol = '🍉';
            } else if (winRng < 0.75) {
                winSymbol = '🍇';
            } else if (winRng < 0.90) {
                winSymbol = '🍋';
            } else {
                winSymbol = '🍒';
            }
            winMultiplier = this.multipliers[winSymbol];
        }

        const winAmount = Number((betAmount * winMultiplier).toFixed(2));
        
        // Spin animations
        const spinTime = 1200;
        
        for (let i = 0; i < 5; i++) {
            const inner = document.getElementById(`slot-symbols-inner-${i}`);
            inner.style.transition = 'none';
            inner.style.transform = 'translateY(0)';
            
            // Re-populate random items to simulate speed blur
            inner.innerHTML = '';
            for (let s = 0; s < 25; s++) {
                const sym = document.createElement('div');
                sym.className = 'slot-symbol';
                
                // Set target row indices for matching combinations on wins
                if (winMultiplier > 0 && s >= 22) {
                    sym.innerText = winSymbol;
                } else {
                    sym.innerText = this.symbols[Math.floor(Math.random() * this.symbols.length)];
                }
                inner.appendChild(sym);
            }

            // Force reflow
            inner.offsetHeight;

            // Trigger CSS sliding transition
            inner.style.transition = `transform ${spinTime + (i * 200)}ms cubic-bezier(0.1, 0.9, 0.2, 1)`;
            inner.style.transform = 'translateY(-1320px)'; // 20 symbols * 66px
            
            // Audio ticking tick
            let ticks = 0;
            const tickInterval = setInterval(() => {
                window.soundManager.playTick();
                ticks++;
                if (ticks > 8) clearInterval(tickInterval);
            }, 150);
        }

        await new Promise(resolve => setTimeout(resolve, spinTime + 1000));

        // Settle results
        const detail = winMultiplier > 0 ? `Línea de ${winSymbol} 5x! Multiplicador ${winMultiplier}x` : 'Sin combinaciones';
        await settleGameOutcome('slots', betAmount, winAmount, detail);

        const winDisplay = document.getElementById('slots-win-display');
        if (winMultiplier > 0) {
            winDisplay.innerText = `¡GANASTE $${winAmount.toFixed(2)}! (${winMultiplier}x)`;
            winDisplay.style.color = 'var(--success)';
        } else {
            winDisplay.innerText = 'Inténtalo de nuevo';
            winDisplay.style.color = 'var(--text-muted)';
        }
    }
};
