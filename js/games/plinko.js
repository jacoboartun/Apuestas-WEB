// Aetheris Casino - Plinko Game Module

window.gamesRegistry['plinko'] = {
    canvas: null,
    ctx: null,
    rows: 10,
    risk: 'medium',
    isPlaying: false,
    pegs: [],
    balls: [],
    buckets: [],

    // Multipliers profiles
    riskProfiles: {
        low: {
            8: [5.6, 1.6, 1.1, 1.0, 0.5, 1.0, 1.1, 1.6, 5.6],
            10: [8.9, 3.0, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 3.0, 8.9],
            12: [10, 5.0, 2.0, 1.6, 1.1, 1.0, 0.5, 1.0, 1.1, 1.6, 2.0, 5.0, 10],
            14: [12, 7.0, 4.0, 2.0, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 2.0, 4.0, 7.0, 12],
            16: [16, 9.0, 5.0, 3.0, 2.0, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 2.0, 3.0, 5.0, 9.0, 16]
        },
        medium: {
            8: [13, 3.0, 1.3, 0.7, 0.4, 0.7, 1.3, 3.0, 13],
            10: [22, 5.0, 2.0, 1.4, 0.6, 0.4, 0.6, 1.4, 2.0, 5.0, 22],
            12: [33, 11, 4.0, 2.0, 1.1, 0.6, 0.3, 0.6, 1.1, 2.0, 4.0, 11, 33],
            14: [58, 15, 7.0, 4.0, 1.9, 1.0, 0.5, 0.2, 0.5, 1.0, 1.9, 4.0, 7.0, 15, 58],
            16: [110, 41, 10, 5.0, 3.0, 1.5, 1.0, 0.5, 0.3, 0.5, 1.0, 1.5, 3.0, 5.0, 10, 41, 110]
        },
        high: {
            8: [29, 4.0, 1.5, 0.3, 0.2, 0.3, 1.5, 4.0, 29],
            10: [76, 10, 3.0, 0.9, 0.3, 0.2, 0.3, 0.9, 3.0, 10, 76],
            12: [170, 24, 8.1, 2.0, 0.7, 0.2, 0.2, 0.2, 0.7, 2.0, 8.1, 24, 170],
            14: [250, 80, 15, 4.0, 1.9, 0.5, 0.2, 0.2, 0.2, 0.5, 1.9, 4.0, 15, 80, 250],
            16: [1000, 130, 26, 9.0, 4.0, 2.0, 0.2, 0.2, 0.2, 0.2, 0.2, 2.0, 4.0, 9.0, 26, 130, 1000]
        }
    },

    init(stage, configs) {
        this.stage = stage;
        this.configs = configs;
        this.balls = [];

        // Build Custom configs panel
        configs.innerHTML = `
            <div class="form-group">
                <label class="form-label">Riesgo / Volatilidad</label>
                <select id="plinko-risk" class="form-input" onchange="window.gamesRegistry.plinko.updateSettings()">
                    <option value="low">Bajo</option>
                    <option value="medium" selected>Medio</option>
                    <option value="high">Alto</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Filas de Clavos</label>
                <select id="plinko-rows" class="form-input" onchange="window.gamesRegistry.plinko.updateSettings()">
                    <option value="8">8 Filas</option>
                    <option value="10" selected>10 Filas</option>
                    <option value="12">12 Filas</option>
                    <option value="14">14 Filas</option>
                    <option value="16">16 Filas</option>
                </select>
            </div>
        `;

        stage.innerHTML = `<canvas id="plinko-canvas" class="plinko-canvas"></canvas>`;
        this.canvas = document.getElementById('plinko-canvas');
        this.ctx = this.canvas.getContext('2d');

        this.updateSettings();
        this.startLoop();
    },

    updateSettings() {
        const riskEl = document.getElementById('plinko-risk');
        const rowsEl = document.getElementById('plinko-rows');

        if (riskEl) this.risk = riskEl.value;
        if (rowsEl) this.rows = parseInt(rowsEl.value);

        this.resizeCanvas();
        this.buildPegboard();
    },

    resizeCanvas() {
        const rect = this.stage.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    },

    buildPegboard() {
        this.pegs = [];
        const w = this.canvas.width;
        const h = this.canvas.height;
        const spacingX = w / (this.rows + 3);
        const spacingY = (h - 100) / (this.rows + 1);

        for (let r = 0; r <= this.rows; r++) {
            const cols = r + 3; // start with 3 pegs on row 0
            const rowWidth = (cols - 1) * spacingX;
            const startX = (w - rowWidth) / 2;
            const y = 50 + r * spacingY;

            for (let c = 0; c < cols; c++) {
                this.pegs.push({
                    x: startX + c * spacingX,
                    y: y,
                    r: 4
                });
            }
        }

        // Build bottom buckets
        this.buckets = [];
        const mults = this.riskProfiles[this.risk][this.rows];
        const bucketCount = this.rows + 1;
        const startX = (w - (bucketCount * spacingX)) / 2;
        const y = h - 35;

        for (let i = 0; i < bucketCount; i++) {
            this.buckets.push({
                x: startX + i * spacingX,
                w: spacingX - 4,
                h: 25,
                mult: mults[i]
            });
        }
    },

    startLoop() {
        if (this.loopActive) return;
        this.loopActive = true;
        
        const tick = () => {
            this.updatePhysics();
            this.draw();
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    },

    updatePhysics() {
        const h = this.canvas.height;
        for (let i = this.balls.length - 1; i >= 0; i--) {
            const b = this.balls[i];
            
            // Gravity acceleration
            b.vy += 0.15;
            b.x += b.vx;
            b.y += b.vy;

            // Collision with pegs
            this.pegs.forEach(peg => {
                const dx = b.x - peg.x;
                const dy = b.y - peg.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const minDist = b.r + peg.r;

                if (dist < minDist) {
                    // Elastic rebound calculations
                    const angle = Math.atan2(dy, dx);
                    
                    // Push out
                    b.x = peg.x + Math.cos(angle) * minDist;
                    b.y = peg.y + Math.sin(angle) * minDist;

                    // Reverse velocity vector
                    const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
                    b.vx = Math.cos(angle) * speed * 0.55;
                    b.vy = Math.sin(angle) * speed * 0.55;
                    
                    // Add slight random deflection
                    b.vx += (Math.random() - 0.5) * 0.2;

                    window.soundManager.playTick();
                }
            });

            // Reached buckets floor
            if (b.y >= h - 45) {
                // Find matching bucket index
                let matchedIndex = 0;
                let minDist = 99999;
                
                this.buckets.forEach((bucket, idx) => {
                    const dist = Math.abs(b.x - (bucket.x + bucket.w / 2));
                    if (dist < minDist) {
                        minDist = dist;
                        matchedIndex = idx;
                    }
                });

                const bucket = this.buckets[matchedIndex];
                const winAmount = Number((b.bet * bucket.mult).toFixed(2));
                
                settleGameOutcome('plinko', b.bet, winAmount, `Landed in bucket index ${matchedIndex} (${bucket.mult}x)`);

                // Remove ball
                this.balls.splice(i, 1);
            }
        }
    },

    draw() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        this.ctx.clearRect(0, 0, w, h);

        // Draw Pegs
        this.ctx.fillStyle = 'rgba(255,255,255,0.6)';
        this.ctx.shadowBlur = 5;
        this.ctx.shadowColor = '#fff';
        this.pegs.forEach(peg => {
            this.ctx.beginPath();
            this.ctx.arc(peg.x, peg.y, peg.r, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.shadowBlur = 0; // reset

        // Draw Buckets
        this.buckets.forEach((bucket, idx) => {
            this.ctx.fillStyle = 'rgba(139,92,246,0.1)';
            this.ctx.strokeStyle = 'var(--primary)';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(bucket.x, h - 35, bucket.w, bucket.h);
            this.ctx.fillRect(bucket.x, h - 35, bucket.w, bucket.h);

            this.ctx.fillStyle = 'var(--text-main)';
            this.ctx.font = '8px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`${bucket.mult}x`, bucket.x + bucket.w / 2, h - 20);
        });

        // Draw Falling Balls
        this.ctx.fillStyle = 'var(--secondary)';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = 'var(--secondary)';
        this.balls.forEach(b => {
            this.ctx.beginPath();
            this.ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.shadowBlur = 0;
    },

    async play(betAmount) {
        // Calculate dynamic skew based on Admin RTP settings
        const globalRtp = window.stateManager.state.rtpSettings.globalRtp;
        const gameRtp = window.stateManager.state.rtpSettings.gameRtps.plinko;
        const targetRtp = globalRtp * gameRtp;

        // Bouncing path bias:
        // A lower RTP biases the ball towards the center.
        // A higher RTP pushes the ball towards the outer edges.
        let biasStrength = 0;
        if (targetRtp < 0.90) {
            biasStrength = -0.3; // Pull towards center
        } else if (targetRtp > 1.10) {
            biasStrength = 0.35; // Push towards borders
        }

        const ballX = this.canvas.width / 2 + (Math.random() - 0.5) * 6;
        const ballY = 20;

        // Pre-compute bounce trajectory path force vector adjustments
        let currentBiasX = 0;
        if (biasStrength < 0) {
            // Keep it near center
            currentBiasX = (Math.random() - 0.5) * 0.15;
        } else if (biasStrength > 0) {
            // Pull it left or right
            currentBiasX = Math.random() > 0.5 ? 0.35 : -0.35;
        }

        this.balls.push({
            x: ballX,
            y: ballY,
            vx: currentBiasX,
            vy: 0,
            r: 5,
            bet: betAmount
        });

        // Keep play button active to allow drops overlays
        const playBtn = document.getElementById('game-play-btn');
        playBtn.disabled = false;
        playBtn.innerText = 'Lanzar Bola';
    }
};
