// Aetheris Casino - Crash Game Module

window.gamesRegistry['crash'] = {
    canvas: null,
    ctx: null,
    animationId: null,
    multiplier: 1.0,
    crashPoint: 1.0,
    betAmount: 0,
    isPlaying: false,
    hasCashedOut: false,

    init(stage, configs) {
        this.stage = stage;
        this.configs = configs;
        this.isPlaying = false;
        this.hasCashedOut = false;

        stage.innerHTML = `
            <div style="position:relative; width:100%; height:100%; display:flex; flex-direction:column;">
                <!-- Real-time HUD -->
                <div style="position:absolute; top:20px; left:20px; font-family:var(--font-serif); font-size:1.4rem; color:var(--accent);">CRASH ROCKET</div>
                <div id="crash-multiplier-text" style="position:absolute; top:45%; left:50%; transform:translate(-50%, -50%); font-size:4.5rem; font-weight:800; font-family:var(--font-sans); text-shadow:0 0 20px rgba(139,92,246,0.4); text-align:center;">1.00x</div>
                <canvas id="crash-game-canvas" class="crash-canvas"></canvas>
            </div>
        `;

        this.canvas = document.getElementById('crash-game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        this.drawIdle();
    },

    resizeCanvas() {
        const rect = this.stage.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    },

    drawIdle() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        this.ctx.lineWidth = 2;
        
        // Draw grid lines
        const step = 40;
        for (let x = 0; x < this.canvas.width; x += step) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        for (let y = 0; y < this.canvas.height; y += step) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    },

    async play(betAmount) {
        this.betAmount = betAmount;
        this.multiplier = 1.0;
        this.isPlaying = true;
        this.hasCashedOut = false;

        // Calculate Crash point based on Admin settings
        const globalRtp = window.stateManager.state.rtpSettings.globalRtp;
        const gameRtp = window.stateManager.state.rtpSettings.gameRtps.crash;
        const targetRtp = globalRtp * gameRtp;

        // Formula skewing crash height with RTP controls
        const rng = Math.random();
        if (rng < 0.03) {
            // Instant crash (house edge absolute)
            this.crashPoint = 1.00;
        } else {
            // Exponential distribution weighted by targetRtp
            const power = 0.98 * targetRtp;
            this.crashPoint = Math.max(1.01, parseFloat((Math.pow(Math.random(), -1 / (power * 10)) * 0.9).toFixed(2)));
        }

        // Change the main Bet button into a "Cash Out" button
        const playBtn = document.getElementById('game-play-btn');
        playBtn.innerText = `CASH OUT ($${this.betAmount.toFixed(2)})`;
        playBtn.disabled = false;
        playBtn.className = 'btn btn-accent';
        playBtn.onclick = () => this.cashOut();

        this.startTime = Date.now();
        this.animate();
    },

    animate() {
        if (!this.isPlaying) return;

        const elapsed = (Date.now() - this.startTime) / 1000; // in seconds
        // Exponential multiplier scaling over time
        this.multiplier = parseFloat((Math.pow(1.06, elapsed * 10)).toFixed(2));

        if (this.multiplier >= this.crashPoint) {
            this.triggerCrash();
            return;
        }

        // Render Canvas Rocket
        const w = this.canvas.width;
        const h = this.canvas.height;
        this.ctx.clearRect(0, 0, w, h);
        this.drawIdle();

        // Draw exponential curve
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'var(--primary)';
        this.ctx.lineWidth = 4;
        this.ctx.shadowColor = 'var(--primary)';
        this.ctx.shadowBlur = 15;

        const maxTime = 12; // Maximum visual curve time
        const ratioX = Math.min(1, elapsed / maxTime);
        const startX = 40;
        const startY = h - 40;
        const endX = startX + (w - 100) * ratioX;
        const endY = startY - (h - 100) * (Math.min(10, this.multiplier) / 10);

        this.ctx.moveTo(startX, startY);
        this.ctx.quadraticCurveTo(startX + (endX - startX) * 0.5, startY, endX, endY);
        this.ctx.stroke();
        this.ctx.shadowBlur = 0; // reset

        // Draw Rocket
        this.ctx.font = '2.5rem sans-serif';
        this.ctx.fillText('🚀', endX - 20, endY + 10);

        // Update Text multiplier
        const multText = document.getElementById('crash-multiplier-text');
        multText.innerText = `${this.multiplier.toFixed(2)}x`;
        multText.style.color = 'var(--text-main)';

        // Update Cash Out button text in real-time
        if (!this.hasCashedOut) {
            const playBtn = document.getElementById('game-play-btn');
            const currentWin = Number((this.betAmount * this.multiplier).toFixed(2));
            playBtn.innerText = `CASH OUT ($${currentWin.toFixed(2)})`;
        }

        this.animationId = requestAnimationFrame(() => this.animate());
    },

    cashOut() {
        if (this.hasCashedOut || !this.isPlaying) return;
        this.hasCashedOut = true;

        const winAmount = Number((this.betAmount * this.multiplier).toFixed(2));
        
        // Visual updates
        const multText = document.getElementById('crash-multiplier-text');
        multText.style.color = 'var(--success)';
        
        const playBtn = document.getElementById('game-play-btn');
        playBtn.className = 'btn btn-primary';
        playBtn.innerText = 'Retirado!';
        playBtn.disabled = true;

        showToast(`¡Retirado con éxito en ${this.multiplier.toFixed(2)}x!`, 'success');
        
        // Record win in background state immediately
        settleGameOutcome('crash', this.betAmount, winAmount, `Cashed out at ${this.multiplier.toFixed(2)}x`);
    },

    triggerCrash() {
        this.isPlaying = false;
        cancelAnimationFrame(this.animationId);
        window.soundManager.playExplode();

        const multText = document.getElementById('crash-multiplier-text');
        multText.innerText = `BOOM @ ${this.crashPoint.toFixed(2)}x`;
        multText.style.color = 'var(--danger)';

        // Draw explosion on canvas
        const w = this.canvas.width;
        const h = this.canvas.height;
        this.ctx.font = '4rem sans-serif';
        const elapsed = (Date.now() - this.startTime) / 1000;
        const maxTime = 12;
        const ratioX = Math.min(1, elapsed / maxTime);
        const startX = 40;
        const startY = h - 40;
        const endX = startX + (w - 100) * ratioX;
        const endY = startY - (h - 100) * (Math.min(10, this.multiplier) / 10);
        this.ctx.fillText('💥', endX - 30, endY + 20);

        const playBtn = document.getElementById('game-play-btn');
        playBtn.className = 'btn btn-primary';
        playBtn.onclick = () => runActiveGameBet();
        playBtn.disabled = false;
        playBtn.innerText = 'Jugar de Nuevo';

        // Settle a loss only if player didn't cash out
        if (!this.hasCashedOut) {
            settleGameOutcome('crash', this.betAmount, 0, `Crashed at ${this.crashPoint.toFixed(2)}x`);
        }
    }
};
