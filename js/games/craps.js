// Aetheris Casino - Craps (Dados) Game Module

window.gamesRegistry['craps'] = {
    betType: 'pass', // pass, dontpass, field, craps
    point: 0,
    isPlaying: false,
    betAmount: 0,

    init(stage, configs) {
        this.stage = stage;
        this.configs = configs;
        this.isPlaying = false;
        this.point = 0;

        stage.className = 'game-stage-wrapper glass velvet-felt';

        configs.innerHTML = `
            <div class="form-group">
                <label class="form-label">Tipo de Apuesta</label>
                <select id="craps-bet-option" class="form-input" onchange="window.gamesRegistry.craps.updateBetType()">
                    <option value="pass" selected>Línea de Pase / Pass Line (x2)</option>
                    <option value="dontpass">No Pase / Don't Pass (x2)</option>
                    <option value="field">Campo / Field Bets (x2/x3)</option>
                    <option value="craps">Craps (2,3,12) (x8)</option>
                </select>
            </div>
            <div style="background:rgba(0,0,0,0.2); padding:10px; border-radius:8px; border:1px solid var(--border-color); font-size:0.75rem; color:rgba(255,255,255,0.7); text-align:center;">
                Pase gana con 7 u 11 en salida; pierde con 2,3,12. Si se establece Punto, debes repetirlo antes de sacar un 7.
            </div>
        `;

        this.renderBoard();
    },

    updateBetType() {
        const option = document.getElementById('craps-bet-option');
        if (option) this.betType = option.value;
    },

    renderBoard() {
        this.stage.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:space-between; width:100%; height:100%; padding:24px;">
                <div style="font-family:var(--font-serif); font-size:1.4rem; color:var(--accent);">CRAPS TABLE</div>
                
                <!-- Dice container -->
                <div style="display:flex; gap:20px;">
                    <div id="craps-die-1" style="width:64px; height:64px; background:#fff; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:2.5rem; color:#000; box-shadow:0 4px 10px rgba(0,0,0,0.3);">🎲</div>
                    <div id="craps-die-2" style="width:64px; height:64px; background:#fff; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:2.5rem; color:#000; box-shadow:0 4px 10px rgba(0,0,0,0.3);">🎲</div>
                </div>

                <div id="craps-status-hud" style="text-align:center; font-family:var(--font-serif); font-size:1.3rem; font-weight:700; color:var(--accent); min-height:40px;">
                    Establece tu apuesta y tira
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; width:100%; max-width:300px;">
                    <div class="stat-item" style="padding:10px;">
                        <span class="form-label" style="font-size:0.75rem;">Punto Activo</span>
                        <div class="stat-val" id="craps-val-point" style="font-size:1.2rem; color:var(--secondary);">Ninguno</div>
                    </div>
                    <div class="stat-item" style="padding:10px;">
                        <span class="form-label" style="font-size:0.75rem;">Fase de Tiro</span>
                        <div class="stat-val" id="craps-val-phase" style="font-size:1.2rem; color:var(--secondary);">Salida</div>
                    </div>
                </div>
            </div>
        `;
    },

    async play(betAmount) {
        this.betAmount = betAmount;
        
        // Settle a point roll if already playing
        if (this.isPlaying) {
            this.rollDice();
            return;
        }

        // Fresh game start
        this.isPlaying = true;
        this.point = 0;
        this.renderBoard();
        
        // Lock bet option select controls
        const optionSelect = document.getElementById('craps-bet-option');
        if (optionSelect) optionSelect.disabled = true;

        document.getElementById('craps-val-phase').innerText = 'Salida';
        document.getElementById('craps-val-point').innerText = 'Ninguno';

        // Set Main Bet Button to Roll
        const playBtn = document.getElementById('game-play-btn');
        playBtn.innerText = 'Lanzar Dados';
        playBtn.className = 'btn btn-accent';
        playBtn.disabled = false;
        playBtn.onclick = () => this.rollDice();

        this.rollDice();
    },

    async rollDice() {
        const playBtn = document.getElementById('game-play-btn');
        playBtn.disabled = true;
        playBtn.innerText = 'Rodando...';

        // Die rolling animation loop
        let rolls = 0;
        const rollInterval = setInterval(() => {
            document.getElementById('craps-die-1').innerText = this.getDieGlyph(Math.floor(Math.random() * 6) + 1);
            document.getElementById('craps-die-2').innerText = this.getDieGlyph(Math.floor(Math.random() * 6) + 1);
            window.soundManager.playTick();
            rolls++;
            if (rolls > 6) clearInterval(rollInterval);
        }, 80);

        await new Promise(resolve => setTimeout(resolve, 600));

        // Get RTP multipliers
        const globalRtp = window.stateManager.state.rtpSettings.globalRtp;
        const gameRtp = window.stateManager.state.rtpSettings.gameRtps.craps;
        const targetRtp = globalRtp * gameRtp;

        // Roll outcome selector
        let d1 = 1, d2 = 1, sum = 2;
        let attempts = 0;

        while (attempts < 100) {
            const tempD1 = Math.floor(Math.random() * 6) + 1;
            const tempD2 = Math.floor(Math.random() * 6) + 1;
            const tempSum = tempD1 + tempD2;

            // Check if player would win on this roll
            let testWin = false;
            if (this.point === 0) {
                // Come-out roll
                if (this.betType === 'pass' && [7, 11].includes(tempSum)) testWin = true;
                else if (this.betType === 'dontpass' && [2, 3].includes(tempSum)) testWin = true;
                else if (this.betType === 'field' && [3,4,9,10,11,2,12].includes(tempSum)) testWin = true;
                else if (this.betType === 'craps' && [2,3,12].includes(tempSum)) testWin = true;
            } else {
                // Point rolls phase
                if (this.betType === 'pass' && tempSum === this.point) testWin = true;
                else if (this.betType === 'dontpass' && tempSum === 7) testWin = true;
            }

            // Apply RTP control: retry if win occurs on low RTP settings
            if (testWin && targetRtp < 0.94 && Math.random() > targetRtp) {
                attempts++;
                continue;
            }

            d1 = tempD1;
            d2 = tempD2;
            sum = tempSum;
            break;
        }

        // Show final die icons
        document.getElementById('craps-die-1').innerText = this.getDieGlyph(d1);
        document.getElementById('craps-die-2').innerText = this.getDieGlyph(d2);
        window.soundManager.playClick();

        const statusHud = document.getElementById('craps-status-hud');
        statusHud.innerText = `Lanzaste ${sum} (${d1} + ${d2})`;

        await new Promise(resolve => setTimeout(resolve, 800));

        this.settleRoll(sum);
    },

    settleRoll(sum) {
        const optionSelect = document.getElementById('craps-bet-option');
        const playBtn = document.getElementById('game-play-btn');

        if (this.point === 0) {
            // Come-Out Roll Phase
            if (sum === 7 || sum === 11) {
                // Natural
                this.isPlaying = false;
                if (this.betType === 'pass') this.endGame(true, `Lanzaste Natural ${sum}. ¡Ganaste!`);
                else if (this.betType === 'dontpass') this.endGame(false, `Lanzaste Natural ${sum}. Perdiste.`);
                else this.settleInstantBets(sum);
            } else if (sum === 2 || sum === 3 || sum === 12) {
                // Craps
                this.isPlaying = false;
                if (this.betType === 'pass') this.endGame(false, `Lanzaste Craps ${sum}. Perdiste.`);
                else if (this.betType === 'dontpass') {
                    // Push on 12 for dont pass
                    if (sum === 12) this.endGame(true, `Push en 12. Se devuelve tu apuesta.`, 1.0);
                    else this.endGame(true, `Lanzaste Craps ${sum}. ¡Ganaste!`);
                } else {
                    this.settleInstantBets(sum);
                }
            } else {
                // Establish Point
                // Field or Craps bets settle instantly even if Point is set
                if (this.betType === 'field' || this.betType === 'craps') {
                    this.isPlaying = false;
                    this.settleInstantBets(sum);
                } else {
                    this.point = sum;
                    document.getElementById('craps-val-point').innerText = this.point;
                    document.getElementById('craps-val-phase').innerText = 'Punto';
                    document.getElementById('craps-status-hud').innerText = `Punto establecido en ${this.point}. ¡Sigue lanzando!`;
                    
                    playBtn.innerText = 'Lanzar Dados (Punto)';
                    playBtn.disabled = false;
                }
            }
        } else {
            // Point Roll Phase
            if (sum === this.point) {
                // Winner!
                this.isPlaying = false;
                if (this.betType === 'pass') this.endGame(true, `¡Punto repetido! Ganaste.`);
                else this.endGame(false, `Punto repetido. Perdiste.`);
            } else if (sum === 7) {
                // Seven Out!
                this.isPlaying = false;
                if (this.betType === 'dontpass') this.endGame(true, `¡Seven Out! Ganaste.`);
                else this.endGame(false, `Seven Out. Perdiste.`);
            } else {
                // Keep rolling
                document.getElementById('craps-status-hud').innerText = `Lanzaste ${sum}. Se busca el punto ${this.point}. Lanza de nuevo.`;
                playBtn.disabled = false;
                playBtn.innerText = 'Lanzar Dados';
            }
        }
    },

    settleInstantBets(sum) {
        let win = false;
        let mult = 0;
        let details = `Roll: ${sum}`;

        if (this.betType === 'field') {
            if ([3,4,9,10,11].includes(sum)) {
                win = true;
                mult = 2.0;
            } else if (sum === 2) {
                win = true;
                mult = 3.0; // field double win
            } else if (sum === 12) {
                win = true;
                mult = 4.0; // field triple win
            }
        } else if (this.betType === 'craps') {
            if ([2,3,12].includes(sum)) {
                win = true;
                mult = 8.0;
            }
        }

        if (win) {
            this.endGame(true, `¡Ganaste la apuesta instantánea con ${sum}!`, mult);
        } else {
            this.endGame(false, `Perdiste la apuesta instantánea con ${sum}.`);
        }
    },

    getDieGlyph(val) {
        const glyphs = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        return glyphs[val] || '🎲';
    },

    async endGame(isWin, message, multiplier = 2.0) {
        this.isPlaying = false;
        
        // Unlock bet option select controls
        const optionSelect = document.getElementById('craps-bet-option');
        if (optionSelect) optionSelect.disabled = false;

        const winAmount = isWin ? Number((this.betAmount * multiplier).toFixed(2)) : 0;
        
        document.getElementById('craps-status-hud').innerText = message;
        document.getElementById('craps-status-hud').style.color = isWin ? 'var(--success)' : 'var(--danger)';
        showToast(message, isWin ? 'success' : 'danger');

        const playBtn = document.getElementById('game-play-btn');
        playBtn.innerText = 'Jugar de Nuevo';
        playBtn.className = 'btn btn-primary';
        playBtn.onclick = () => runActiveGameBet();
        playBtn.disabled = false;

        await settleGameOutcome('craps', this.betAmount, winAmount, `Bet Type: ${this.betType.toUpperCase()} | ${message}`);
    }
};
