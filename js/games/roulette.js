// Aetheris Casino - Roulette (Ruleta) Game Module

window.gamesRegistry['roulette'] = {
    canvas: null,
    ctx: null,
    selectedBetType: 'red', // red, black, green, even, odd, numbers
    selectedBetValue: '',   // specific number if numbers is chosen
    wheelNumbers: [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26],
    colors: {
        red: [32, 19, 21, 25, 34, 27, 36, 30, 23, 5, 16, 1, 14, 9, 18, 7, 12, 3],
        black: [15, 4, 2, 17, 6, 13, 11, 8, 10, 24, 33, 20, 31, 22, 29, 28, 35, 26]
    },

    init(stage, configs) {
        this.stage = stage;
        this.configs = configs;

        // Populate bet settings inside the controls panel
        configs.innerHTML = `
            <div class="form-group">
                <label class="form-label">Tipo de Apuesta</label>
                <select id="roulette-type" class="form-input" onchange="window.gamesRegistry.roulette.updateType()">
                    <option value="red" selected>Rojo (x2)</option>
                    <option value="black">Negro (x2)</option>
                    <option value="even">Par (x2)</option>
                    <option value="odd">Impar (x2)</option>
                    <option value="green">Cero Verde (x35)</option>
                    <option value="number">Número Específico (x35)</option>
                </select>
            </div>
            <div class="form-group" id="roulette-number-row" style="display:none;">
                <label class="form-label">Número a Apostar (0-36)</label>
                <input type="number" id="roulette-number-val" class="form-input" min="0" max="36" value="17">
            </div>
        `;

        // Render Canvas + stats wheel layout
        stage.innerHTML = `
            <div style="position:relative; width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px;">
                <canvas id="roulette-canvas" style="width:260px; height:260px; border-radius:50%; border:6px solid #3d2204; box-shadow:0 10px 25px rgba(0,0,0,0.5);"></canvas>
                <div id="roulette-pointer" style="position:absolute; top:calc(50% - 150px); font-size:2rem; color:var(--accent); z-index:10;">▼</div>
                <div id="roulette-result-hud" style="font-family:var(--font-serif); font-size:1.6rem; font-weight:700; min-height:40px; margin-top:8px;"></div>
            </div>
        `;

        this.canvas = document.getElementById('roulette-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.canvas.width = 300;
        this.canvas.height = 300;
        
        this.currentAngle = 0;
        this.drawWheel(0);
    },

    updateType() {
        const typeEl = document.getElementById('roulette-type');
        const numRow = document.getElementById('roulette-number-row');
        this.selectedBetType = typeEl.value;

        if (this.selectedBetType === 'number') {
            numRow.style.display = 'block';
        } else {
            numRow.style.display = 'none';
        }
    },

    drawWheel(angleOffset = 0) {
        const cx = 150;
        const cy = 150;
        const r = 140;
        const segments = this.wheelNumbers.length;
        const arc = (Math.PI * 2) / segments;

        this.ctx.clearRect(0, 0, 300, 300);

        for (let i = 0; i < segments; i++) {
            const angle = angleOffset + i * arc;
            const num = this.wheelNumbers[i];
            
            let color = '#000'; // black
            if (num === 0) {
                color = '#10b981'; // green
            } else if (this.colors.red.includes(num)) {
                color = '#ef4444'; // red
            }

            this.ctx.beginPath();
            this.ctx.fillStyle = color;
            this.ctx.moveTo(cx, cy);
            this.ctx.arc(cx, cy, r, angle, angle + arc);
            this.ctx.fill();
            this.ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            this.ctx.stroke();

            // Draw numbers text inside segments
            this.ctx.save();
            this.ctx.translate(cx, cy);
            this.ctx.rotate(angle + arc / 2);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 10px Outfit';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(num, r - 12, 4);
            this.ctx.restore();
        }

        // Inner rim gold circle
        this.ctx.beginPath();
        this.ctx.fillStyle = '#151821';
        this.ctx.arc(cx, cy, 80, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'var(--accent)';
        this.ctx.lineWidth = 2;
        this.ctx.arc(cx, cy, 82, 0, Math.PI * 2);
        this.ctx.stroke();
    },

    async play(betAmount) {
        // Collect number bet value if active
        if (this.selectedBetType === 'number') {
            const numVal = parseInt(document.getElementById('roulette-number-val').value);
            this.selectedBetValue = isNaN(numVal) ? 0 : numVal;
        }

        // Read global configurations
        const globalRtp = window.stateManager.state.rtpSettings.globalRtp;
        const gameRtp = window.stateManager.state.rtpSettings.gameRtps.roulette;
        const targetRtp = globalRtp * gameRtp;

        // Choose outcome
        let chosenNumber = 0;
        let isWin = false;
        
        // Loop outcomes until we satisfy RTP bounds
        let attempts = 0;
        while (attempts < 100) {
            const rollIdx = Math.floor(Math.random() * this.wheelNumbers.length);
            const rollNum = this.wheelNumbers[rollIdx];
            
            // Check win conditions
            let testWin = false;
            if (this.selectedBetType === 'red' && this.colors.red.includes(rollNum)) testWin = true;
            else if (this.selectedBetType === 'black' && this.colors.black.includes(rollNum)) testWin = true;
            else if (this.selectedBetType === 'even' && rollNum !== 0 && rollNum % 2 === 0) testWin = true;
            else if (this.selectedBetType === 'odd' && rollNum !== 0 && rollNum % 2 !== 0) testWin = true;
            else if (this.selectedBetType === 'green' && rollNum === 0) testWin = true;
            else if (this.selectedBetType === 'number' && rollNum === this.selectedBetValue) testWin = true;

            // Admin manipulation
            // If the roll is a WIN but we are running in lower RTP, force a retry
            if (testWin && targetRtp < 0.95 && Math.random() > targetRtp) {
                attempts++;
                continue; // roll again
            }

            chosenNumber = rollNum;
            isWin = testWin;
            break;
        }

        // Spin animation mechanics
        const targetIdx = this.wheelNumbers.indexOf(chosenNumber);
        const arc = (Math.PI * 2) / this.wheelNumbers.length;
        
        // The pointer is at 12 o'clock, which corresponds to angle -Math.PI / 2
        // We want target segment to align at -Math.PI / 2
        const targetAngle = -Math.PI / 2 - (targetIdx * arc) - (arc / 2);
        
        // Spin multiple full circles
        const fullSpins = 4;
        const totalSpinAngle = targetAngle - (fullSpins * Math.PI * 2);
        
        const duration = 2800; // 2.8s
        const startTime = Date.now();

        const tickSpin = () => {
            const elapsed = Date.now() - startTime;
            if (elapsed >= duration) {
                this.currentAngle = targetAngle;
                this.drawWheel(this.currentAngle);
                this.settleOutcome(chosenNumber, isWin, betAmount);
            } else {
                // Easing cubic ease-out
                const t = elapsed / duration;
                const ease = 1 - Math.pow(1 - t, 3);
                const current = t * totalSpinAngle;

                this.drawWheel(current);
                
                // Play ticks sounds periodically during spin slowing down
                if (Math.floor(elapsed / 100) % 2 === 0) {
                    window.soundManager.playTick();
                }

                requestAnimationFrame(tickSpin);
            }
        };
        
        requestAnimationFrame(tickSpin);
    },

    async settleOutcome(number, isWin, betAmount) {
        let multiplier = 0;
        if (isWin) {
            if (this.selectedBetType === 'number' || this.selectedBetType === 'green') {
                multiplier = 35;
            } else {
                multiplier = 2; // red, black, odd, even
            }
        }

        const winAmount = Number((betAmount * multiplier).toFixed(2));
        
        // Get number color string
        let colName = 'Negro';
        if (number === 0) colName = 'Verde';
        else if (this.colors.red.includes(number)) colName = 'Rojo';

        const resultHud = document.getElementById('roulette-result-hud');
        resultHud.innerText = `${number} (${colName})`;
        resultHud.style.color = number === 0 ? 'var(--success)' : (colName === 'Rojo' ? 'var(--danger)' : '#aaa');

        await settleGameOutcome('roulette', betAmount, winAmount, `Rolled number ${number} (${colName})`);
    }
};
