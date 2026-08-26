// Aetheris Casino - Sports Betting (Apuestas Deportivas) Game Module

window.gamesRegistry['sports'] = {
    matchesList: [
        { id: 1, home: 'Real Madrid', away: 'FC Barcelona', oddsHome: 1.85, oddsDraw: 3.40, oddsAway: 3.80, status: 'Pre-partido', time: '00:00', scoreHome: 0, scoreAway: 0 },
        { id: 2, home: 'Golden State Warriors', away: 'LA Lakers', oddsHome: 1.65, oddsDraw: 12.0, oddsAway: 2.10, status: 'Pre-partido', time: '00:00', scoreHome: 0, scoreAway: 0 },
        { id: 3, home: 'Carlos Alcaraz', away: 'Novak Djokovic', oddsHome: 1.95, oddsDraw: 0.0, oddsAway: 1.80, status: 'Pre-partido', time: '00:00', scoreHome: 0, scoreAway: 0 }
    ],
    selectedMatchId: 1,
    selectedBetOutcome: 'home', // home, draw, away
    betAmount: 10,
    isPlaying: false,

    init(stage, configs) {
        this.stage = stage;
        this.configs = configs;
        this.isPlaying = false;

        // Custom config slips
        configs.innerHTML = `
            <div class="form-group">
                <label class="form-label">Cupón de Apuesta</label>
                <div style="background:rgba(0,0,0,0.3); border:1px solid var(--border-color); padding:12px; border-radius:8px;">
                    <div id="sp-slip-match" style="font-weight:700; font-size:0.85rem; margin-bottom:4px;">Real Madrid vs Barcelona</div>
                    <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:var(--text-muted);">
                        <span>Tu Pronóstico: <strong id="sp-slip-outcome" style="color:var(--accent);">1 (Local)</strong></span>
                        <span>Cuota (Odds): <strong id="sp-slip-odds" style="color:var(--secondary);">1.85</strong></span>
                    </div>
                </div>
            </div>
            <div style="background:rgba(0,0,0,0.2); padding:10px; border-radius:8px; border:1px solid var(--border-color); font-size:0.75rem; color:rgba(255,255,255,0.7); text-align:center;">
                Los partidos se simulan en tiempo real acelerado (15 segundos de juego).
            </div>
        `;

        this.renderBoard();
    },

    renderBoard() {
        this.stage.innerHTML = `
            <div style="display:flex; flex-direction:column; justify-content:space-between; width:100%; height:100%; padding:16px; overflow-y:auto; gap:16px;">
                <div style="font-family:var(--font-serif); font-size:1.3rem; color:var(--accent); text-align:center;">AETHERIS SPORTSBOOK</div>
                
                <!-- Matches odds list -->
                <div class="sports-container">
                    ${this.matchesList.map(m => `
                        <div class="sports-match-row">
                            <div style="display:flex; flex-direction:column; gap:4px; flex:1;">
                                <div style="font-size:0.7rem; font-weight:700; color:var(--success); text-transform:uppercase;" id="sp-match-status-${m.id}">${m.status} | ${m.time}</div>
                                <div style="font-size:0.9rem; font-weight:700;">
                                    ${m.home} <span id="sp-match-score-${m.id}" style="color:var(--accent); font-weight:800; margin:0 6px;">${m.scoreHome} - ${m.scoreAway}</span> ${m.away}
                                </div>
                            </div>
                            
                            <div class="sports-odds-grid">
                                <button id="sp-odds-${m.id}-home" onclick="window.gamesRegistry.sports.addToSlip(${m.id}, 'home', ${m.oddsHome})" class="odds-btn active">
                                    <span>Local</span>
                                    <strong>${m.oddsHome.toFixed(2)}</strong>
                                </button>
                                ${m.oddsDraw > 0 ? `
                                    <button id="sp-odds-${m.id}-draw" onclick="window.gamesRegistry.sports.addToSlip(${m.id}, 'draw', ${m.oddsDraw})" class="odds-btn">
                                        <span>Empate</span>
                                        <strong>${m.oddsDraw.toFixed(2)}</strong>
                                    </button>
                                ` : ''}
                                <button id="sp-odds-${m.id}-away" onclick="window.gamesRegistry.sports.addToSlip(${m.id}, 'away', ${m.oddsAway})" class="odds-btn">
                                    <span>Visita</span>
                                    <strong>${m.oddsAway.toFixed(2)}</strong>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <!-- Event logs ticker -->
                <div id="sp-live-ticker" style="background:rgba(0,0,0,0.4); border:1px solid var(--border-color); border-radius:10px; padding:12px; height:80px; overflow-y:auto; font-family:monospace; font-size:0.75rem; color:#888;">
                    [Ticker] Selecciona una cuota e inicia la simulación.
                </div>
            </div>
        `;

        this.syncSlip();
    },

    addToSlip(matchId, outcome, odds) {
        if (this.isPlaying) return;
        this.selectedMatchId = matchId;
        this.selectedBetOutcome = outcome;
        
        window.soundManager.playClick();
        
        // Update highlight buttons
        this.matchesList.forEach(m => {
            const btnHome = document.getElementById(`sp-odds-${m.id}-home`);
            const btnDraw = document.getElementById(`sp-odds-${m.id}-draw`);
            const btnAway = document.getElementById(`sp-odds-${m.id}-away`);

            if (btnHome) btnHome.className = 'odds-btn';
            if (btnDraw) btnDraw.className = 'odds-btn';
            if (btnAway) btnAway.className = 'odds-btn';

            if (m.id === matchId) {
                if (outcome === 'home' && btnHome) btnHome.className = 'odds-btn active';
                else if (outcome === 'draw' && btnDraw) btnDraw.className = 'odds-btn active';
                else if (outcome === 'away' && btnAway) btnAway.className = 'odds-btn active';
            }
        });

        this.syncSlip();
    },

    syncSlip() {
        const match = this.matchesList.find(m => m.id === this.selectedMatchId);
        if (!match) return;

        let outcomeLabel = '1 (Local)';
        let oddsVal = match.oddsHome;
        
        if (this.selectedBetOutcome === 'draw') {
            outcomeLabel = 'X (Empate)';
            oddsVal = match.oddsDraw;
        } else if (this.selectedBetOutcome === 'away') {
            outcomeLabel = '2 (Visitante)';
            oddsVal = match.oddsAway;
        }

        document.getElementById('sp-slip-match').innerText = `${match.home} vs ${match.away}`;
        document.getElementById('sp-slip-outcome').innerText = outcomeLabel;
        document.getElementById('sp-slip-odds').innerText = oddsVal.toFixed(2);
    },

    async play(betAmount) {
        this.betAmount = betAmount;
        this.isPlaying = true;

        const playBtn = document.getElementById('game-play-btn');
        playBtn.disabled = true;
        playBtn.innerText = 'Partido en Curso...';

        const match = this.matchesList.find(m => m.id === this.selectedMatchId);
        
        // Reset scores
        match.scoreHome = 0;
        match.scoreAway = 0;
        match.status = 'EN VIVO';
        
        this.renderBoard();

        const ticker = document.getElementById('sp-live-ticker');
        ticker.innerHTML = `[00:00] ¡Pitazo inicial! Inicia el encuentro entre ${match.home} y ${match.away}.`;

        const globalRtp = window.stateManager.state.rtpSettings.globalRtp;
        const gameRtp = window.stateManager.state.rtpSettings.gameRtps.sports;
        const targetRtp = globalRtp * gameRtp;

        // Run game simulation ticks (5 ticks of 2.5s each)
        let phase = 0;
        const timeTicks = ['15\'', '30\'', '45\'', '60\'', '75\'', '90\''];

        const runTick = async () => {
            if (phase >= 6) {
                this.settleMatch(match, targetRtp);
                return;
            }

            await new Promise(resolve => setTimeout(resolve, 2000));
            window.soundManager.playTick();

            match.time = timeTicks[phase];
            document.getElementById(`sp-match-status-${match.id}`).innerText = `EN VIVO | ${match.time}`;

            // Random events generator
            const eventRng = Math.random();
            if (eventRng < 0.25) {
                // Goal Home
                match.scoreHome++;
                ticker.innerHTML = `[${match.time}] ⚽ ¡GOOOOOOL de ${match.home}! (${match.scoreHome} - ${match.scoreAway})<br>` + ticker.innerHTML;
            } else if (eventRng < 0.45) {
                // Goal Away
                match.scoreAway++;
                ticker.innerHTML = `[${match.time}] ⚽ ¡GOOOOOOL de ${match.away}! (${match.scoreHome} - ${match.scoreAway})<br>` + ticker.innerHTML;
            } else if (eventRng < 0.70) {
                // Yellow Card
                const cardTeam = Math.random() > 0.5 ? match.home : match.away;
                ticker.innerHTML = `[${match.time}] 🟨 Tarjeta amarilla para un jugador de ${cardTeam}.<br>` + ticker.innerHTML;
            }

            document.getElementById(`sp-match-score-${match.id}`).innerText = `${match.scoreHome} - ${match.scoreAway}`;

            phase++;
            runTick();
        };

        runTick();
    },

    async settleMatch(match, targetRtp) {
        this.isPlaying = false;
        
        match.status = 'Finalizado';
        match.time = '90:00';
        document.getElementById(`sp-match-status-${match.id}`).innerText = 'Finalizado';

        // Check original outcome
        let outcome = 'draw';
        if (match.scoreHome > match.scoreAway) outcome = 'home';
        else if (match.scoreAway > match.scoreHome) outcome = 'away';

        // Admin RTP manipulation: If targetRtp is low, and player was winning,
        // we dynamically alter the score at the last second to make them lose!
        let isWin = this.selectedBetOutcome === outcome;

        if (isWin && targetRtp < 0.90 && Math.random() > targetRtp) {
            // Alter score
            if (this.selectedBetOutcome === 'home') {
                match.scoreAway = match.scoreHome + 1; // force away win
                outcome = 'away';
            } else if (this.selectedBetOutcome === 'away') {
                match.scoreHome = match.scoreAway + 1; // force home win
                outcome = 'home';
            } else {
                match.scoreHome = match.scoreAway + 1; // force break draw
                outcome = 'home';
            }
            isWin = false;
            
            // Log last second change to ticker
            const ticker = document.getElementById('sp-live-ticker');
            ticker.innerHTML = `[90:00] ⚽ ¡GOL DE ÚLTIMO SEGUNDO! Marcador final modificado: ${match.scoreHome} - ${match.scoreAway}.<br>` + ticker.innerHTML;
            document.getElementById(`sp-match-score-${match.id}`).innerText = `${match.scoreHome} - ${match.scoreAway}`;
        }

        // Settle payouts
        let oddsVal = match.oddsHome;
        if (this.selectedBetOutcome === 'draw') oddsVal = match.oddsDraw;
        else if (this.selectedBetOutcome === 'away') oddsVal = match.oddsAway;

        const winAmount = isWin ? Number((this.betAmount * oddsVal).toFixed(2)) : 0;
        
        const ticker = document.getElementById('sp-live-ticker');
        ticker.innerHTML = `[90:00] ¡Pitazo final! Partido concluido. Marcador final: ${match.home} ${match.scoreHome} - ${match.scoreAway} ${match.away}.<br>` + ticker.innerHTML;

        const hud = document.getElementById('sp-live-ticker');
        const statusMsg = isWin ? `¡Boleto Ganador! Cobras $${winAmount.toFixed(2)}` : 'Boleto Perdedor.';
        showToast(statusMsg, isWin ? 'success' : 'danger');

        const playBtn = document.getElementById('game-play-btn');
        playBtn.disabled = false;
        playBtn.className = 'btn btn-primary';
        playBtn.innerText = 'Apuntar Otra Apuesta';
        playBtn.onclick = () => {
            this.renderBoard();
            runActiveGameBet();
        };

        await settleGameOutcome('sports', this.betAmount, winAmount, `Sports Bet settled. Match score: ${match.scoreHome}-${match.scoreAway}. Bet Choice: ${this.selectedBetOutcome.toUpperCase()}`);
    }
};
