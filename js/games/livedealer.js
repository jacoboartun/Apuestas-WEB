// Aetheris Casino - Juegos de Mesa en Vivo Game Module

window.gamesRegistry['livedealer'] = {
    betType: 'player', // player, dealer
    isPlaying: false,
    betAmount: 0,
    chatIntervalId: null,

    init(stage, configs) {
        this.stage = stage;
        this.configs = configs;
        this.isPlaying = false;

        stage.className = 'game-stage-wrapper glass velvet-felt';

        configs.innerHTML = `
            <div class="form-group">
                <label class="form-label">Apuesta de Mesa en Vivo</label>
                <select id="ld-bet-option" class="form-input" onchange="window.gamesRegistry.livedealer.updateBetType()">
                    <option value="player" selected>Apuesta al Jugador (x2)</option>
                    <option value="dealer">Apuesta al Dealer (x2)</option>
                </select>
            </div>
            <div style="background:rgba(0,0,0,0.2); padding:10px; border-radius:8px; border:1px solid var(--border-color); font-size:0.75rem; color:rgba(255,255,255,0.7); text-align:center;">
                Estudio en directo Coolbet. Coloca tu apuesta y el crupier virtual repartirá las cartas en vivo.
            </div>
        `;

        this.renderStudio();
        this.startDealerChat();
    },

    updateBetType() {
        const option = document.getElementById('ld-bet-option');
        if (option) this.betType = option.value;
    },

    renderStudio() {
        this.stage.innerHTML = `
            <div style="display:grid; grid-template-columns: 1.5fr 1fr; width:100%; height:100%; padding:16px; gap:16px;">
                
                <!-- Camera stream panel -->
                <div style="display:flex; flex-direction:column; justify-content:space-between; background:#111827; border:2px solid rgba(255,255,255,0.05); border-radius:12px; padding:16px; position:relative; overflow:hidden;">
                    <!-- Live feed indicator -->
                    <div style="position:absolute; top:12px; left:12px; display:flex; align-items:center; gap:6px; background:rgba(0,0,0,0.6); padding:4px 8px; border-radius:4px; font-size:0.65rem; font-weight:700;">
                        <span style="width:6px; height:6px; border-radius:50%; background:red; animation:pulse 1s infinite;"></span>
                        ESTUDIO #4 VIVO
                    </div>

                    <!-- Host/Dealer graphic placeholder simulation -->
                    <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; margin-top:20px;">
                        <div style="font-size:4rem; filter:drop-shadow(0 0 10px rgba(139,92,246,0.3));" id="ld-dealer-avatar">🤵‍♀️</div>
                        <div id="ld-croupier-bubble" style="background:#fff; color:#000; border-radius:10px; padding:6px 12px; font-size:0.75rem; font-weight:600; text-align:center; max-width:200px; position:relative;">
                            ¡Bienvenidos! Realicen sus apuestas.
                        </div>
                    </div>

                    <!-- Cards drawing slot -->
                    <div style="display:flex; gap:10px; justify-content:center; min-height:80px;" id="ld-studio-cards"></div>
                </div>

                <!-- Studio live chat panel -->
                <div style="display:flex; flex-direction:column; background:rgba(0,0,0,0.4); border:1px solid var(--border-color); border-radius:12px; overflow:hidden;">
                    <div style="background:rgba(255,255,255,0.03); padding:8px; font-size:0.75rem; font-weight:700; border-bottom:1px solid var(--border-color); text-align:center; color:var(--secondary);">
                        CHAT DE LA MESA #4
                    </div>
                    <div style="flex:1; overflow-y:auto; padding:8px; display:flex; flex-direction:column; gap:8px;" id="ld-studio-messages"></div>
                </div>

            </div>
        `;
    },

    startDealerChat() {
        if (this.chatIntervalId) clearInterval(this.chatIntervalId);
        
        const box = document.getElementById('ld-studio-messages');
        if (!box) return;

        const dealerPhrases = [
            "Dealer Clara: ¡No más apuestas para la ronda!",
            "Daniel99: bet player 20$",
            "Dealer Clara: Cartas sobre la mesa...",
            "DoyleF: dealer is hot today!",
            "Phil9: bet $100 dealer",
            "Dealer Clara: ¡Felicidades a los ganadores!",
            "Dealer Clara: Iniciando tiempo de apuestas..."
        ];

        this.chatIntervalId = setInterval(() => {
            const container = document.getElementById('ld-studio-messages');
            if (!container) return;

            const text = dealerPhrases[Math.floor(Math.random() * dealerPhrases.length)];
            const msg = document.createElement('div');
            msg.style.fontSize = '0.7rem';
            msg.style.background = 'rgba(255,255,255,0.02)';
            msg.style.padding = '4px 8px';
            msg.style.borderRadius = '6px';
            
            if (text.startsWith("Dealer")) {
                msg.style.borderColor = 'var(--accent)';
                msg.style.borderWidth = '1px';
                msg.style.borderStyle = 'solid';
                msg.innerHTML = `<span style="color:var(--accent); font-weight:800;">${text}</span>`;
            } else {
                msg.innerHTML = text;
            }

            container.appendChild(msg);
            container.scrollTop = container.scrollHeight;

            if (container.children.length > 20) container.children[0].remove();
        }, 3500);
    },

    async play(betAmount) {
        this.betAmount = betAmount;
        this.isPlaying = true;

        const playBtn = document.getElementById('game-play-btn');
        playBtn.disabled = true;
        playBtn.innerText = 'Crupier Repartiendo...';

        const bubble = document.getElementById('ld-croupier-bubble');
        bubble.innerText = "¡No va más! Repartiendo cartas...";
        window.soundManager.playTick();

        // Clear card slots
        const cardBox = document.getElementById('ld-studio-cards');
        cardBox.innerHTML = '';

        // Retrieve Admin RTP limits
        const globalRtp = window.stateManager.state.rtpSettings.globalRtp;
        const gameRtp = window.stateManager.state.rtpSettings.gameRtps.livedealer;
        const targetRtp = globalRtp * gameRtp;

        // Choose outcome
        let outcome = 'player';
        let isWin = false;

        const rng = Math.random();
        if (rng < targetRtp * 0.5) {
            outcome = this.betType;
            isWin = true;
        } else {
            outcome = this.betType === 'player' ? 'dealer' : 'player';
            isWin = false;
        }

        // Simulating dealer drawing player card
        await new Promise(resolve => setTimeout(resolve, 1000));
        window.soundManager.playTick();
        
        let pCard = document.createElement('div');
        pCard.className = 'playing-card';
        pCard.style.transform = 'scale(0.7)';
        pCard.innerHTML = `<div>9</div><div style="font-size:1.4rem; align-self:center;">♥</div><div style="transform:rotate(180deg);">9</div>`;
        cardBox.appendChild(pCard);
        bubble.innerText = "Nueve para Jugador...";

        // Simulating dealer drawing banker card
        await new Promise(resolve => setTimeout(resolve, 1200));
        window.soundManager.playTick();

        let bCard = document.createElement('div');
        bCard.className = 'playing-card';
        bCard.style.transform = 'scale(0.7)';
        
        if (outcome === 'player') {
            bCard.innerHTML = `<div>6</div><div style="font-size:1.4rem; align-self:center;">♣</div><div style="transform:rotate(180deg);">6</div>`;
            bubble.innerText = "¡Nueve para Jugador, Seis para Dealer! Gana Jugador.";
        } else {
            bCard.innerHTML = `<div>10</div><div style="font-size:1.4rem; align-self:center;">♣</div><div style="transform:rotate(180deg);">10</div>`;
            bubble.innerText = "¡Nueve para Jugador, Diez para Dealer! Gana Dealer.";
        }
        cardBox.appendChild(bCard);

        await new Promise(resolve => setTimeout(resolve, 1200));

        this.settleOutcome(outcome, isWin, betAmount);
    },

    async settleOutcome(outcome, isWin, betAmount) {
        this.isPlaying = false;
        
        const winAmount = isWin ? Number((betAmount * 2.0).toFixed(2)) : 0;
        
        const msg = isWin ? `¡Ganaste la apuesta en vivo! Cobras $${winAmount.toFixed(2)}` : 'Apuesta perdida en mesa en vivo.';
        showToast(msg, isWin ? 'success' : 'danger');

        const playBtn = document.getElementById('game-play-btn');
        playBtn.disabled = false;
        playBtn.className = 'btn btn-primary';
        playBtn.innerText = 'Apuntar Otra Apuesta';
        playBtn.onclick = () => runActiveGameBet();

        await settleGameOutcome('livedealer', this.betAmount, winAmount, `Live Table outcome: ${outcome.toUpperCase()} | Bet choice: ${this.betType.toUpperCase()}`);
    }
};
