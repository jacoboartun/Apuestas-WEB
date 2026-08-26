// Aetheris Casino - Game Engine, Audio Synthesizer, and Particle Confetti

// Web Audio API Synthesizer
class SoundManager {
    constructor() {
        this.ctx = null;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playClick() {
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.08);

        gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.08);
    }

    playWin() {
        this.init();
        const now = this.ctx.currentTime;
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C Major scale arpeggio
        
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.07);

            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.1, now + idx * 0.07 + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.15);

            osc.start(now + idx * 0.07);
            osc.stop(now + idx * 0.07 + 0.2);
        });
    }

    playLoss() {
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(80, this.ctx.currentTime + 0.4);

        gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.4);
    }

    playTick() {
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.frequency.setValueAtTime(600, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.02, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.03);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.03);
    }

    playExplode() {
        this.init();
        const now = this.ctx.currentTime;
        
        // Low rumbling sine
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.6);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.start();
        osc.stop(now + 0.6);

        // Noise burst simulation
        const bufferSize = this.ctx.sampleRate * 0.4;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(400, now);

        const noiseGain = this.ctx.createGain();
        
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);

        noiseGain.gain.setValueAtTime(0.15, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        noise.start(now);
        noise.stop(now + 0.4);
    }
}

window.soundManager = new SoundManager();

// Particle Confetti Engine
class ConfettiEngine {
    constructor() {
        this.canvas = document.getElementById('confetti-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.active = false;
        this.colors = ['#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#ef4444', '#ec4899'];
        
        window.addEventListener('resize', () => {
            if (this.active) {
                this.canvas.width = window.innerWidth;
                this.canvas.height = window.innerHeight;
            }
        });
    }

    start() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.particles = [];
        this.active = true;

        for (let i = 0; i < 100; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * -this.canvas.height - 20,
                r: Math.random() * 6 + 4,
                d: Math.random() * this.canvas.height,
                color: this.colors[Math.floor(Math.random() * this.colors.length)],
                tilt: Math.random() * 10 - 5,
                tiltAngleIncremental: Math.random() * 0.07 + 0.02,
                tiltAngle: 0
            });
        }
        
        this.animate();
    }

    animate() {
        if (!this.active) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        let remaining = false;

        this.particles.forEach(p => {
            p.tiltAngle += p.tiltAngleIncremental;
            p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
            p.x += Math.sin(p.tiltAngle);
            p.tilt = Math.sin(p.tiltAngle - p.r / 2) * 5;

            if (p.y <= this.canvas.height) {
                remaining = true;
            }

            this.ctx.beginPath();
            this.ctx.lineWidth = p.r;
            this.ctx.strokeStyle = p.color;
            this.ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
            this.ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
            this.ctx.stroke();
        });

        if (remaining) {
            requestAnimationFrame(() => this.animate());
        } else {
            this.active = false;
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
}

window.confettiEngine = new ConfettiEngine();

// Registry of individual games
window.gamesRegistry = {};

// Game Engine coordinator loading Console
function loadGameConsole(game) {
    // Show game area
    document.getElementById('dashboard-view').style.display = 'none';
    document.getElementById('game-view').style.display = 'block';

    // Set layout elements
    document.getElementById('active-game-title').innerText = game.name;
    const rtpVal = window.stateManager.state.rtpSettings.gameRtps[game.id] || (game.rtp / 100);
    document.getElementById('active-game-rtp-badge').innerText = `RTP: ${(rtpVal * 100).toFixed(0)}%`;

    // Reset components bet slider
    const betInput = document.getElementById('game-bet-input');
    const user = window.stateManager.getCurrentUser();
    betInput.max = user ? user.balance : 5000;
    betInput.value = Math.min(10, user ? user.balance : 10);

    // Clear Game Viewports
    const customConfigs = document.getElementById('game-custom-configs');
    customConfigs.innerHTML = '';
    const stage = document.getElementById('game-canvas-stage');
    stage.innerHTML = '';
    // Reset classes
    stage.className = 'game-stage-wrapper glass';

    // Hook play button
    const playBtn = document.getElementById('game-play-btn');
    playBtn.onclick = () => runActiveGameBet();
    playBtn.innerText = 'Iniciar Juego';
    playBtn.disabled = false;

    // Load particular game object
    const gameInstance = window.gamesRegistry[game.id];
    if (gameInstance && gameInstance.init) {
        gameInstance.init(stage, customConfigs);
    } else {
        stage.innerHTML = `<div style="text-align:center; padding:32px;">Próximamente: Implementación del juego ${game.name}.</div>`;
    }
}

async function runActiveGameBet() {
    const hash = window.location.hash || '';
    if (!hash.startsWith('#game-')) return;
    const gameId = hash.replace('#game-', '');

    const betInput = document.getElementById('game-bet-input');
    const betAmount = parseFloat(betInput.value);

    // Basic Validations
    if (isNaN(betAmount) || betAmount <= 0) {
        showToast('Ingrese un monto de apuesta válido.', 'danger');
        return;
    }

    const user = window.stateManager.getCurrentUser();
    if (!user) {
        openAuthModal('login');
        return;
    }

    if (user.balance < betAmount) {
        showToast('Saldo insuficiente.', 'danger');
        return;
    }

    const gameInstance = window.gamesRegistry[gameId];
    if (gameInstance && gameInstance.play) {
        window.soundManager.playClick();
        
        // Disable play button during bet animation
        const playBtn = document.getElementById('game-play-btn');
        playBtn.disabled = true;
        playBtn.innerText = 'Corriendo...';

        try {
            await gameInstance.play(betAmount);
        } catch (e) {
            showToast(e.message, 'danger');
            playBtn.disabled = false;
            playBtn.innerText = 'Apostar / Iniciar';
        }
    }
}

// Global hook to wrap game results settlement and syncs
async function settleGameOutcome(gameId, betAmount, winAmount, winDetails = '') {
    const results = await window.stateManager.settleBet(gameId, betAmount, winAmount, winDetails);
    
    // Play sounds
    if (winAmount > betAmount) {
        window.soundManager.playWin();
        if (winAmount >= betAmount * 3) {
            window.confettiEngine.start();
        }
    } else if (winAmount === 0) {
        window.soundManager.playLoss();
    } else {
        window.soundManager.playClick();
    }

    // Refresh HUD displays
    updateUserHud();

    // Re-enable bet controls
    const playBtn = document.getElementById('game-play-btn');
    if (playBtn) {
        playBtn.disabled = false;
        playBtn.innerText = 'Jugar de Nuevo';
    }

    return results;
}
