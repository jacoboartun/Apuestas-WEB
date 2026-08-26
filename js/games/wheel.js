// Aetheris Casino - Ruedas de la Fortuna Game Module

window.gamesRegistry['wheel'] = {
    canvas: null,
    ctx: null,
    betSector: '1', // 1, 2, 5, 10, 20, 40
    currentAngle: 0,
    isPlaying: false,
    betAmount: 0,

    // Wheel configuration sectors distribution (Total 54 segments)
    sectors: [
        '1', '2', '1', '5', '1', '2', '1', '10', '1', '2', '1', '5', '1', '2', '1', '20',
        '1', '2', '1', '5', '1', '2', '1', '10', '1', '2', '1', '5', '1', '2', '1', '40',
        '1', '2', '1', '5', '1', '2', '1', '10', '1', '2', '1', '5', '1', '2', '1', '20',
        '1', '2', '1', '5', '1', '2'
    ],

    sectorColors: {
        '1': '#334155', // slate gray
        '2': '#0891b2', // cyan
        '5': '#10b981', // green
        '10': '#8b5cf6', // purple
        '20': '#ec4899', // pink
        '40': '#f59e0b' // gold
    },

    init(stage, configs) {
        this.stage = stage;
        this.configs = configs;
        this.isPlaying = false;

        configs.innerHTML = `
            <div class="form-group">
                <label class="form-label">Sector a Apostar</label>
                <select id="wh-bet-sector" class="form-input" onchange="window.gamesRegistry.wheel.updateSector()">
                    <option value="1" selected>Sector x1 (x2 Payout)</option>
                    <option value="2">Sector x2 (x3 Payout)</option>
                    <option value="5">Sector x5 (x6 Payout)</option>
                    <option value="10">Sector x10 (x11 Payout)</option>
                    <option value="20">Sector x20 (x21 Payout)</option>
                    <option value="40">Sector x40 (x41 Payout)</option>
                </select>
            </div>
            <div style="background:rgba(0,0,0,0.2); padding:10px; border-radius:8px; border:1px solid var(--border-color); font-size:0.75rem; color:rgba(255,255,255,0.7); text-align:center;">
                Gira la rueda de la fortuna. Alinea tu sector con la flecha superior para ganar.
            </div>
        `;

        // Render Canvas layout
        stage.innerHTML = `
            <div style="position:relative; width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px;">
                <canvas id="wh-canvas" style="width:260px; height:260px; border-radius:50%; border:6px solid #3d2204; box-shadow:0 10px 25px rgba(0,0,0,0.5);"></canvas>
                <div id="wh-pointer" style="position:absolute; top:calc(50% - 150px); font-size:2rem; color:var(--accent); z-index:10;">▼</div>
                <div id="wh-result-hud" style="font-family:var(--font-serif); font-size:1.6rem; font-weight:700; min-height:40px; margin-top:8px;"></div>
            </div>
        `;

        this.canvas = document.getElementById('wh-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.canvas.width = 300;
        this.canvas.height = 300;
        
        this.currentAngle = 0;
        this.drawWheel(0);
    },

    updateSector() {
        const option = document.getElementById('wh-bet-sector');
        if (option) this.betSector = option.value;
    },

    drawWheel(angleOffset = 0) {
        const cx = 150;
        const cy = 150;
        const r = 140;
        const segments = this.sectors.length;
        const arc = (Math.PI * 2) / segments;

        this.ctx.clearRect(0, 0, 300, 300);

        for (let i = 0; i < segments; i++) {
            const angle = angleOffset + i * arc;
            const sectorVal = this.sectors[i];
            const color = this.sectorColors[sectorVal];

            this.ctx.beginPath();
            this.ctx.fillStyle = color;
            this.ctx.moveTo(cx, cy);
            this.ctx.arc(cx, cy, r, angle, angle + arc);
            this.ctx.fill();
            this.ctx.strokeStyle = 'rgba(255,255,255,0.12)';
            this.ctx.stroke();

            // Label sector text inside segments
            this.ctx.save();
            this.ctx.translate(cx, cy);
            this.ctx.rotate(angle + arc / 2);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 8px Outfit';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(sectorVal, r - 12, 3);
            this.ctx.restore();
        }

        // Inner rim gold circle
        this.ctx.beginPath();
        this.ctx.fillStyle = '#151821';
        this.ctx.arc(cx, cy, 70, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'var(--accent)';
        this.ctx.lineWidth = 2;
        this.ctx.arc(cx, cy, 72, 0, Math.PI * 2);
        this.ctx.stroke();
    },

    async play(betAmount) {
        this.betAmount = betAmount;
        this.isPlaying = true;

        // Retrieve Admin RTP limits
        const globalRtp = window.stateManager.state.rtpSettings.globalRtp;
        const gameRtp = window.stateManager.state.rtpSettings.gameRtps.wheel;
        const targetRtp = globalRtp * gameRtp;

        // Pick outcome
        let chosenSector = '1';
        let isWin = false;

        let attempts = 0;
        while (attempts < 100) {
            const rollIdx = Math.floor(Math.random() * this.sectors.length);
            const rollSector = this.sectors[rollIdx];
            
            const testWin = rollSector === this.betSector;

            // Sabotage win outcomes: if targetRtp is low, force a retry if outcome matches player pick
            if (testWin && targetRtp < 0.94 && Math.random() > targetRtp) {
                attempts++;
                continue; // roll again
            }

            chosenSector = rollSector;
            isWin = testWin;
            break;
        }

        // Spin animation calculations
        const targetIdx = this.sectors.indexOf(chosenSector);
        const arc = (Math.PI * 2) / this.sectors.length;
        
        // Align segment with 12 o'clock pointer (-Math.PI / 2)
        const targetAngle = -Math.PI / 2 - (targetIdx * arc) - (arc / 2);
        const fullSpins = 5;
        const totalSpinAngle = targetAngle - (fullSpins * Math.PI * 2);
        
        const duration = 3000; // 3 seconds
        const startTime = Date.now();

        const tickSpin = () => {
            const elapsed = Date.now() - startTime;
            if (elapsed >= duration) {
                this.currentAngle = targetAngle;
                this.drawWheel(this.currentAngle);
                this.settleOutcome(chosenSector, isWin, betAmount);
            } else {
                const t = elapsed / duration;
                const ease = 1 - Math.pow(1 - t, 3.5);
                const current = t * totalSpinAngle;

                this.drawWheel(current);
                
                // Click sound ticking
                if (Math.floor(elapsed / 100) % 2 === 0) {
                    window.soundManager.playTick();
                }

                requestAnimationFrame(tickSpin);
            }
        };

        requestAnimationFrame(tickSpin);
    },

    async settleOutcome(sector, isWin, betAmount) {
        this.isPlaying = false;

        const mult = isWin ? (parseInt(sector) + 1) : 0;
        const winAmount = Number((betAmount * mult).toFixed(2));

        const resultHud = document.getElementById('wh-result-hud');
        resultHud.innerText = `SECTOR ${sector}`;
        resultHud.style.color = this.sectorColors[sector];

        const msg = isWin ? `¡Alineaste Sector ${sector}! Cobras $${winAmount.toFixed(2)}` : 'Resultado perdedor.';
        showToast(msg, isWin ? 'success' : 'danger');

        const playBtn = document.getElementById('game-play-btn');
        playBtn.disabled = false;
        playBtn.className = 'btn btn-primary';
        playBtn.innerText = 'Jugar de Nuevo';
        playBtn.onclick = () => runActiveGameBet();

        await settleGameOutcome('wheel', this.betAmount, winAmount, `Wheel Sector landed: ${sector} | Bet sector choice: ${this.betSector}`);
    }
};
