// Aetheris Casino - Sic Bo Game Module

window.gamesRegistry['sicbo'] = {
    betType: 'small', // small, big, triple, double
    betAmount: 0,
    isPlaying: false,

    init(stage, configs) {
        this.stage = stage;
        this.configs = configs;
        this.isPlaying = false;

        stage.className = 'game-stage-wrapper glass velvet-felt';

        configs.innerHTML = `
            <div class="form-group">
                <label class="form-label">Tipo de Pronóstico</label>
                <select id="sb-bet-option" class="form-input" onchange="window.gamesRegistry.sicbo.updateBetType()">
                    <option value="small" selected>Menor / Small (Suma 4-10, sin triples) (x2)</option>
                    <option value="big">Mayor / Big (Suma 11-17, sin triples) (x2)</option>
                    <option value="double">Cualquier Doble (Dos dados idénticos) (x8)</option>
                    <option value="triple">Cualquier Triple (Tres dados idénticos) (x30)</option>
                </select>
            </div>
            <div style="background:rgba(0,0,0,0.2); padding:10px; border-radius:8px; border:1px solid var(--border-color); font-size:0.75rem; color:rgba(255,255,255,0.7); text-align:center;">
                Pequeño gana con sumas de 4 a 10. Grande con sumas de 11 a 17. Los triples pierden para ambos.
            </div>
        `;

        this.renderBoard();
    },

    updateBetType() {
        const option = document.getElementById('sb-bet-option');
        if (option) this.betType = option.value;
    },

    renderBoard() {
        this.stage.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:space-between; width:100%; height:100%; padding:24px;">
                <div style="font-family:var(--font-serif); font-size:1.4rem; color:var(--accent);">SIC BO SHAKER</div>
                
                <!-- Shaker Cup or dice display -->
                <div style="display:flex; gap:16px;" id="sb-dice-box">
                    <div id="sb-die-1" style="width:50px; height:50px; background:#fff; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:2.2rem; color:#000; box-shadow:0 4px 8px rgba(0,0,0,0.3);">⚀</div>
                    <div id="sb-die-2" style="width:50px; height:50px; background:#fff; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:2.2rem; color:#000; box-shadow:0 4px 8px rgba(0,0,0,0.3);">⚁</div>
                    <div id="sb-die-3" style="width:50px; height:50px; background:#fff; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:2.2rem; color:#000; box-shadow:0 4px 8px rgba(0,0,0,0.3);">⚂</div>
                </div>

                <div id="sb-status-msg" style="text-align:center; font-family:var(--font-serif); font-size:1.3rem; font-weight:700; color:var(--accent); min-height:40px;">
                    Elige tu apuesta e inicia la vibración
                </div>

                <div class="stat-item" style="width:100%; max-width:240px; padding:10px;">
                    <span class="form-label" style="font-size:0.75rem;">Resultado Obtenido</span>
                    <div class="stat-val" id="sb-val-total" style="font-size:1.2rem; color:var(--secondary);">Total: --</div>
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
        playBtn.innerText = 'Sacudiendo...';

        // Animate Shaking
        let shakes = 0;
        const diceBox = document.getElementById('sb-dice-box');
        
        const shakeInterval = setInterval(() => {
            diceBox.style.transform = `translate(${(Math.random()-0.5)*15}px, ${(Math.random()-0.5)*15}px)`;
            
            document.getElementById('sb-die-1').innerText = this.getDieGlyph(Math.floor(Math.random() * 6) + 1);
            document.getElementById('sb-die-2').innerText = this.getDieGlyph(Math.floor(Math.random() * 6) + 1);
            document.getElementById('sb-die-3').innerText = this.getDieGlyph(Math.floor(Math.random() * 6) + 1);
            
            window.soundManager.playTick();
            shakes++;
            if (shakes > 10) {
                clearInterval(shakeInterval);
                diceBox.style.transform = 'translate(0, 0)';
            }
        }, 80);

        await new Promise(resolve => setTimeout(resolve, 900));

        // Read RTP limits
        const globalRtp = window.stateManager.state.rtpSettings.globalRtp;
        const gameRtp = window.stateManager.state.rtpSettings.gameRtps.sicbo;
        const targetRtp = globalRtp * gameRtp;

        // Roll outcomes
        let d1 = 1, d2 = 1, d3 = 1, sum = 3;
        let attempts = 0;

        while (attempts < 100) {
            const tempD1 = Math.floor(Math.random() * 6) + 1;
            const tempD2 = Math.floor(Math.random() * 6) + 1;
            const tempD3 = Math.floor(Math.random() * 6) + 1;
            const tempSum = tempD1 + tempD2 + tempD3;

            // Check win conditions
            let testWin = false;
            const isTriple = tempD1 === tempD2 && tempD2 === tempD3;
            const isDouble = tempD1 === tempD2 || tempD2 === tempD3 || tempD1 === tempD3;

            if (this.betType === 'small' && tempSum >= 4 && tempSum <= 10 && !isTriple) testWin = true;
            else if (this.betType === 'big' && tempSum >= 11 && tempSum <= 17 && !isTriple) testWin = true;
            else if (this.betType === 'double' && isDouble && !isTriple) testWin = true;
            else if (this.betType === 'triple' && isTriple) testWin = true;

            // Apply RTP checks
            if (testWin && targetRtp < 0.95 && Math.random() > targetRtp) {
                attempts++;
                continue;
            }

            d1 = tempD1;
            d2 = tempD2;
            d3 = tempD3;
            sum = tempSum;
            break;
        }

        // Render final dice
        document.getElementById('sb-die-1').innerText = this.getDieGlyph(d1);
        document.getElementById('sb-die-2').innerText = this.getDieGlyph(d2);
        document.getElementById('sb-die-3').innerText = this.getDieGlyph(d3);
        window.soundManager.playClick();

        // Check if winning roll
        const isTriple = d1 === d2 && d2 === d3;
        const isDouble = d1 === d2 || d2 === d3 || d1 === d3;
        
        let didWin = false;
        let mult = 0;

        if (this.betType === 'small' && sum >= 4 && sum <= 10 && !isTriple) {
            didWin = true;
            mult = 2;
        } else if (this.betType === 'big' && sum >= 11 && sum <= 17 && !isTriple) {
            didWin = true;
            mult = 2;
        } else if (this.betType === 'double' && isDouble && !isTriple) {
            didWin = true;
            mult = 8;
        } else if (this.betType === 'triple' && isTriple) {
            didWin = true;
            mult = 30;
        }

        const winAmount = didWin ? Number((betAmount * mult).toFixed(2)) : 0;
        
        let detail = `Suma: ${sum} (${d1}+${d2}+${d3})`;
        if (isTriple) detail += ' | TRIPLE!';
        else if (isDouble) detail += ' | DOBLE';

        document.getElementById('sb-val-total').innerText = `Total: ${sum} | ${isTriple ? 'Triple' : (isDouble ? 'Doble' : 'Singular')}`;
        
        const statusMsg = document.getElementById('sb-status-msg');
        statusMsg.innerText = didWin ? `¡Ganaste x${mult}! Payout: $${winAmount.toFixed(2)}` : 'Resultado perdedor.';
        statusMsg.style.color = didWin ? 'var(--success)' : 'var(--danger)';
        showToast(didWin ? '¡Ganaste!' : 'Perdiste', didWin ? 'success' : 'danger');

        playBtn.disabled = false;
        playBtn.className = 'btn btn-primary';
        playBtn.innerText = 'Jugar de Nuevo';
        playBtn.onclick = () => runActiveGameBet();

        await settleGameOutcome('sicbo', this.betAmount, winAmount, `Roll sum ${sum} (${d1}+${d2}+${d3}). ${detail}`);
    },

    getDieGlyph(val) {
        const glyphs = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        return glyphs[val] || '🎲';
    }
};
