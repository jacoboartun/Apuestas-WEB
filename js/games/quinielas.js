// Aetheris Casino - Quinielas de Fútbol Game Module

window.gamesRegistry['quinielas'] = {
    matches: [
        { id: 1, home: 'Real Madrid', away: 'FC Barcelona', pick: '1' },
        { id: 2, home: 'Manchester City', away: 'Liverpool FC', pick: '1' },
        { id: 3, home: 'Bayern Munich', away: 'Dortmund', pick: '1' },
        { id: 4, home: 'Paris SG', away: 'Marseille', pick: '1' },
        { id: 5, home: 'Juventus FC', away: 'AC Milan', pick: '1' }
    ],
    betAmount: 10,
    isPlaying: false,

    init(stage, configs) {
        this.stage = stage;
        this.configs = configs;
        this.isPlaying = false;

        // Custom config labels
        configs.innerHTML = `
            <div style="background:rgba(0,0,0,0.2); padding:10px; border-radius:8px; border:1px solid var(--border-color); font-size:0.75rem; color:rgba(255,255,255,0.7); text-align:center;">
                Quiniela Express. Elige Local (1), Empate (X) o Visitante (2) para los 5 encuentros. Boleto cuesta $10. 
                Premios: 5 aciertos (x1000), 4 aciertos (x50), 3 aciertos (x5).
            </div>
        `;

        this.renderBoard();
    },

    renderBoard() {
        this.stage.innerHTML = `
            <div style="display:flex; flex-direction:column; justify-content:space-between; width:100%; height:100%; padding:16px; overflow-y:auto; gap:16px; align-items:center;">
                <div style="font-family:var(--font-serif); font-size:1.3rem; color:var(--accent);">QUINIELA DE FÚTBOL</div>
                
                <!-- Matches list -->
                <div style="display:flex; flex-direction:column; gap:10px; width:100%; max-width:400px;" id="qn-list">
                    ${this.matches.map(m => `
                        <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(0,0,0,0.3); border:1px solid var(--border-color); padding:10px 16px; border-radius:10px;">
                            <div style="font-size:0.85rem; font-weight:600; flex:1; max-width:180px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                                ${m.home} <span style="color:var(--text-muted);">vs</span> ${m.away}
                            </div>
                            
                            <div style="display:flex; gap:6px;">
                                <button id="qn-pick-${m.id}-1" onclick="window.gamesRegistry.quinielas.makePick(${m.id}, '1')" class="btn btn-secondary active" style="padding:6px 12px; font-size:0.8rem;">1</button>
                                <button id="qn-pick-${m.id}-X" onclick="window.gamesRegistry.quinielas.makePick(${m.id}, 'X')" class="btn btn-secondary" style="padding:6px 12px; font-size:0.8rem;">X</button>
                                <button id="qn-pick-${m.id}-2" onclick="window.gamesRegistry.quinielas.makePick(${m.id}, '2')" class="btn btn-secondary" style="padding:6px 12px; font-size:0.8rem;">2</button>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div id="qn-status-hud" style="font-family:var(--font-serif); font-size:1.1rem; font-weight:700; color:var(--accent); min-height:24px; text-align:center;">
                    Selecciona pronósticos y compra boleto
                </div>
            </div>
        `;

        this.highlightPicks();
    },

    makePick(matchId, pickVal) {
        if (this.isPlaying) return;
        const match = this.matches.find(m => m.id === matchId);
        if (match) {
            match.pick = pickVal;
            window.soundManager.playClick();
            this.highlightPicks();
        }
    },

    highlightPicks() {
        this.matches.forEach(m => {
            const btn1 = document.getElementById(`qn-pick-${m.id}-1`);
            const btnX = document.getElementById(`qn-pick-${m.id}-X`);
            const btn2 = document.getElementById(`qn-pick-${m.id}-2`);

            if (btn1 && btnX && btn2) {
                btn1.className = 'btn btn-secondary';
                btnX.className = 'btn btn-secondary';
                btn2.className = 'btn btn-secondary';

                if (m.pick === '1') btn1.className = 'btn btn-primary';
                else if (m.pick === 'X') btnX.className = 'btn btn-primary';
                else if (m.pick === '2') btn2.className = 'btn btn-primary';
            }
        });
    },

    async play(betAmount) {
        // Enforce pool prices
        if (betAmount !== 10) {
            showToast('El boleto de quiniela cuesta exactamente $10.', 'info');
            const betInput = document.getElementById('game-bet-input');
            betInput.value = 10;
        }

        this.isPlaying = true;

        const playBtn = document.getElementById('game-play-btn');
        playBtn.disabled = true;
        playBtn.innerText = 'Simulando Partidos...';

        document.getElementById('qn-status-hud').innerText = 'Partidos en juego. Esperando silbatazo final...';

        // Retrieve Admin RTP limits
        const globalRtp = window.stateManager.state.rtpSettings.globalRtp;
        const gameRtp = window.stateManager.state.rtpSettings.gameRtps.quinielas;
        const targetRtp = globalRtp * gameRtp;

        // Simulate games loop
        await new Promise(resolve => setTimeout(resolve, 1500));
        window.soundManager.playTick();

        const options = ['1', 'X', '2'];
        const results = [];

        this.matches.forEach(m => {
            let res = '';
            let attempts = 0;

            while (attempts < 100) {
                const tempRes = options[Math.floor(Math.random() * options.length)];
                
                // Sabotage matching outcomes: if targetRtp is low, force a retry if outcome matches player pick
                if (targetRtp < 0.90 && tempRes === m.pick && Math.random() > targetRtp) {
                    attempts++;
                    continue;
                }

                res = tempRes;
                break;
            }

            results.push({ matchId: m.id, outcome: res });
        });

        this.settlePool(results);
    },

    async settlePool(results) {
        this.isPlaying = false;

        let hits = 0;
        const detailsArr = [];

        this.matches.forEach(m => {
            const resObj = results.find(r => r.matchId === m.id);
            const isHit = resObj && resObj.outcome === m.pick;
            if (isHit) hits++;
            
            detailsArr.push(`${m.home}-${m.away} result: ${resObj ? resObj.outcome : '?'}`);
        });

        let multiplier = 0;
        if (hits === 3) multiplier = 5;
        else if (hits === 4) multiplier = 50;
        else if (hits === 5) multiplier = 1000;

        const winAmount = Number((this.betAmount * multiplier).toFixed(2));

        const hud = document.getElementById('qn-status-hud');
        if (multiplier > 0) {
            hud.innerText = `¡${hits}/5 Aciertos! Ganaste x${multiplier} ($${winAmount.toFixed(2)})`;
            hud.style.color = 'var(--success)';
            showToast(`¡Alineaste ${hits} resultados! Ganaste $${winAmount.toFixed(2)}`, 'success');
        } else {
            hud.innerText = `Obtuviste ${hits}/5 aciertos. Boleto sin premio.`;
            hud.style.color = 'var(--text-muted)';
            showToast('Quiniela sin premio.', 'danger');
        }

        // Draw outcomes visually alongside picks
        results.forEach(r => {
            const btn = document.getElementById(`qn-pick-${r.matchId}-${r.outcome}`);
            if (btn) {
                // If it was a hit, leave green. If it was a miss, show outcome as red
                const match = this.matches.find(m => m.id === r.matchId);
                if (match && match.pick === r.outcome) {
                    btn.className = 'btn btn-success';
                } else {
                    btn.className = 'btn btn-danger';
                }
            }
        });

        const playBtn = document.getElementById('game-play-btn');
        playBtn.disabled = false;
        playBtn.className = 'btn btn-primary';
        playBtn.innerText = 'Comprar Otro Boleto';
        playBtn.onclick = () => {
            this.renderBoard();
            runActiveGameBet();
        };

        await settleGameOutcome('quinielas', this.betAmount, winAmount, `Hits: ${hits} | Details: ${detailsArr.join('; ')}`);
    }
};
