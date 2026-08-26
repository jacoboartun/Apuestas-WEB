// Aetheris Casino - Póker Online (Texas Hold'em Simulator) Game Module

window.gamesRegistry['poker'] = {
    deck: [],
    playerHand: [],
    opponents: [], // Array of { name, hand, active, chips }
    communityCards: [],
    pot: 0,
    betAmount: 0,
    roundStep: 0, // 0: Preflop, 1: Flop, 2: Turn, 3: River, 4: Showdown
    isPlaying: false,

    suits: ['H', 'D', 'C', 'S'],
    values: ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'],

    init(stage, configs) {
        this.stage = stage;
        this.configs = configs;
        this.isPlaying = false;
        
        stage.className = 'game-stage-wrapper glass velvet-felt';

        configs.innerHTML = `
            <div id="poker-controls" style="display:flex; flex-direction:column; gap:12px; width:100%;">
                <button class="btn btn-secondary" id="poker-btn-next" onclick="window.gamesRegistry.poker.nextStage()" disabled>Ver Flop / Continuar</button>
                <button class="btn btn-danger" id="poker-btn-fold" onclick="window.gamesRegistry.poker.fold()" disabled>Retirarse (Fold)</button>
            </div>
            <div style="margin-top:12px; font-size:0.8rem; color:rgba(255,255,255,0.7); text-align:center;">
                Simulador Texas Hold'em. La bolsa (Pot) se acumula con tus apuestas y las llamadas de los oponentes.
            </div>
        `;

        this.renderTable();
    },

    renderTable() {
        this.stage.innerHTML = `
            <div style="width:100%; height:100%; display:flex; flex-direction:column; justify-content:space-between; padding:16px;">
                <!-- AI Opponents Area -->
                <div style="display:flex; justify-content:space-around; width:100%;">
                    <div id="poker-ai-0" style="text-align:center; background:rgba(0,0,0,0.4); padding:6px 12px; border-radius:8px;">
                        <div style="font-weight:700; font-size:0.8rem; color:var(--secondary);">Bot Daniel</div>
                        <div id="poker-ai-hand-0" style="font-size:0.75rem; color:#aaa;">🎴 🎴</div>
                    </div>
                    <div id="poker-ai-1" style="text-align:center; background:rgba(0,0,0,0.4); padding:6px 12px; border-radius:8px;">
                        <div style="font-weight:700; font-size:0.8rem; color:var(--secondary);">Bot Phil</div>
                        <div id="poker-ai-hand-1" style="font-size:0.75rem; color:#aaa;">🎴 🎴</div>
                    </div>
                    <div id="poker-ai-2" style="text-align:center; background:rgba(0,0,0,0.4); padding:6px 12px; border-radius:8px;">
                        <div style="font-weight:700; font-size:0.8rem; color:var(--secondary);">Bot Doyle</div>
                        <div id="poker-ai-hand-2" style="font-size:0.75rem; color:#aaa;">🎴 🎴</div>
                    </div>
                </div>

                <!-- Community cards Board -->
                <div style="display:flex; flex-direction:column; align-items:center; gap:8px;">
                    <div style="font-size:0.9rem; font-weight:700; color:var(--accent);">POT ACUMULADO: <span id="poker-pot-value">$0.00</span></div>
                    <div id="poker-community-cards" style="display:flex; gap:8px; min-height:85px; align-items:center; justify-content:center;">
                        <!-- Flop Turn River -->
                    </div>
                </div>

                <!-- Status HUD -->
                <div id="poker-status-text" style="text-align:center; font-family:var(--font-serif); font-size:1.2rem; font-weight:700; color:var(--accent); min-height:30px;">
                    Inicia el juego para recibir cartas
                </div>

                <!-- Player Hand Area -->
                <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
                    <div style="display:flex; gap:10px; min-height:100px;" id="poker-player-cards"></div>
                    <span class="form-label" style="color:#fff;">Tus Cartas</span>
                </div>
            </div>
        `;
    },

    buildDeck() {
        this.deck = [];
        this.suits.forEach(suit => {
            this.values.forEach(val => {
                this.deck.push({ suit, value: val });
            });
        });
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    },

    drawCard() {
        return this.deck.pop();
    },

    async play(betAmount) {
        this.betAmount = betAmount;
        this.pot = betAmount * 4; // User bet + 3 AI matches
        this.isPlaying = true;
        this.roundStep = 0;
        this.communityCards = [];

        this.buildDeck();

        // Deal Cards
        this.playerHand = [this.drawCard(), this.drawCard()];
        this.opponents = [
            { name: 'Bot Daniel', hand: [this.drawCard(), this.drawCard()], active: true },
            { name: 'Bot Phil', hand: [this.drawCard(), this.drawCard()], active: true },
            { name: 'Bot Doyle', hand: [this.drawCard(), this.drawCard()], active: true }
        ];

        this.renderTable();
        this.renderHandCards('poker-player-cards', this.playerHand);
        
        document.getElementById('poker-pot-value').innerText = `$${this.pot.toFixed(2)}`;
        document.getElementById('poker-status-text').innerText = 'Fase Pre-flop. Oponentes igualan apuesta.';
        
        window.soundManager.playTick();

        // Enable buttons
        document.getElementById('poker-btn-next').disabled = false;
        document.getElementById('poker-btn-next').innerText = 'Ver Flop (+$10)';
        document.getElementById('poker-btn-fold').disabled = false;
    },

    renderHandCards(containerId, hand, hide = false) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        hand.forEach(card => {
            const cardEl = document.createElement('div');
            cardEl.style.transform = 'scale(0.85)';
            if (hide) {
                cardEl.className = 'playing-card hidden-card';
                cardEl.innerText = '❓';
            } else {
                const isRed = ['H', 'D'].includes(card.suit);
                cardEl.className = `playing-card${isRed ? ' red' : ''}`;
                const suitSym = card.suit === 'H' ? '♥' : (card.suit === 'D' ? '♦' : (card.suit === 'C' ? '♣' : '♠'));
                cardEl.innerHTML = `
                    <div>${card.value}</div>
                    <div style="font-size:1.8rem; align-self:center;">${suitSym}</div>
                    <div style="transform:rotate(180deg);">${card.value}</div>
                `;
            }
            container.appendChild(cardEl);
        });
    },

    async nextStage() {
        if (!this.isPlaying) return;

        // Subtract additional bets for next rounds
        const checkAmount = this.betAmount * 0.5; // add 50% bet per phase
        const user = window.stateManager.getCurrentUser();
        
        if (user.balance < checkAmount) {
            showToast('Saldo insuficiente para seguir llamando la apuesta.', 'danger');
            return;
        }

        // Deduct from state directly during rounds
        await window.stateManager.updateWallet(checkAmount, false);
        this.pot += checkAmount * 4; // Player + 3 AI match call
        document.getElementById('poker-pot-value').innerText = `$${this.pot.toFixed(2)}`;
        updateUserHud();

        this.roundStep++;
        window.soundManager.playTick();

        if (this.roundStep === 1) {
            // Deal FLOP (3 cards)
            this.communityCards.push(this.drawCard(), this.drawCard(), this.drawCard());
            this.renderHandCards('poker-community-cards', this.communityCards);
            document.getElementById('poker-status-text').innerText = 'El Flop ha sido revelado.';
            document.getElementById('poker-btn-next').innerText = 'Ver Turn (+$5)';
        } else if (this.roundStep === 2) {
            // Deal TURN (1 card)
            this.communityCards.push(this.drawCard());
            this.renderHandCards('poker-community-cards', this.communityCards);
            document.getElementById('poker-status-text').innerText = 'El Turn ha sido revelado.';
            document.getElementById('poker-btn-next').innerText = 'Ver River (+$5)';
        } else if (this.roundStep === 3) {
            // Deal RIVER (1 card)
            this.communityCards.push(this.drawCard());
            this.renderHandCards('poker-community-cards', this.communityCards);
            document.getElementById('poker-status-text').innerText = 'El River en la mesa. ¡Hora del Showdown!';
            document.getElementById('poker-btn-next').innerText = 'Mostrar Cartas (Showdown)';
        } else if (this.roundStep === 4) {
            this.showdown();
        }
    },

    fold() {
        if (!this.isPlaying) return;
        this.isPlaying = false;
        
        document.getElementById('poker-status-text').innerText = 'Te has retirado de la mano.';
        showToast('Mano abandonada.', 'info');

        document.getElementById('poker-btn-next').disabled = true;
        document.getElementById('poker-btn-fold').disabled = true;

        const playBtn = document.getElementById('game-play-btn');
        playBtn.disabled = false;
        playBtn.innerText = 'Jugar de Nuevo';
        playBtn.onclick = () => runActiveGameBet();

        // Deductions occurred sequentially. The lost amount is recorded.
        settleGameOutcome('poker', this.betAmount, 0, 'Folded hand early');
    },

    async showdown() {
        this.isPlaying = false;
        document.getElementById('poker-btn-next').disabled = true;
        document.getElementById('poker-btn-fold').disabled = true;

        // Reveal opponent cards
        this.renderHandCards('poker-ai-hand-0', this.opponents[0].hand);
        this.renderHandCards('poker-ai-hand-1', this.opponents[1].hand);
        this.renderHandCards('poker-ai-hand-2', this.opponents[2].hand);

        // Fetch target Admin RTP parameters
        const globalRtp = window.stateManager.state.rtpSettings.globalRtp;
        const gameRtp = window.stateManager.state.rtpSettings.gameRtps.poker;
        const targetRtp = globalRtp * gameRtp;

        // Determine Poker Hands rankings (simulated based on high cards/pairs coefficients)
        // We will resolve a score for each player
        const getHandScore = (hand) => {
            // Evaluates matches + card numeric heights
            const values = hand.concat(this.communityCards).map(c => {
                if (c.value === 'A') return 14;
                if (c.value === 'K') return 13;
                if (c.value === 'Q') return 12;
                if (c.value === 'J') return 11;
                return parseInt(c.value);
            });
            values.sort((a,b) => b-a);
            
            // Check Pairs
            const counts = {};
            values.forEach(v => counts[v] = (counts[v] || 0) + 1);
            
            const pairs = Object.keys(counts).filter(k => counts[k] === 2).map(Number);
            const trips = Object.keys(counts).filter(k => counts[k] === 3).map(Number);
            const quads = Object.keys(counts).filter(k => counts[k] === 4).map(Number);

            if (quads.length > 0) return 800 + quads[0];
            if (trips.length > 0 && pairs.length > 0) return 700 + trips[0];
            if (trips.length > 0) return 400 + trips[0];
            if (pairs.length >= 2) {
                pairs.sort((a,b) => b-a);
                return 300 + pairs[0];
            }
            if (pairs.length === 1) return 200 + pairs[0];
            return 100 + values[0]; // High card
        };

        let playerVal = getHandScore(this.playerHand);
        let dVal = getHandScore(this.opponents[0].hand);
        let pVal = getHandScore(this.opponents[1].hand);
        let dyVal = getHandScore(this.opponents[2].hand);

        // Admin RTP manipulation: If targetRtp is low, we make Phil or Daniel have a massive score to beat player
        if (targetRtp < 0.94 && Math.random() > targetRtp) {
            dVal = playerVal + 5; // force bot to beat player
        }

        const maxScore = Math.max(playerVal, dVal, pVal, dyVal);
        let winAmount = 0;
        let details = '';
        let statusMsg = '';
        let toastType = 'info';

        if (playerVal === maxScore) {
            winAmount = this.pot;
            statusMsg = `¡Felicidades! Ganaste el bote de $${winAmount.toFixed(2)} con la mejor mano.`;
            details = `Showdown Win | Player ${playerVal} vs Bots (${dScoreVal()})`;
            toastType = 'success';
        } else {
            winAmount = 0;
            // Identify which bot won
            let winnerName = 'Daniel';
            if (dVal === maxScore) winnerName = 'Bot Daniel';
            else if (pVal === maxScore) winnerName = 'Bot Phil';
            else if (dyVal === maxScore) winnerName = 'Bot Doyle';
            
            statusMsg = `${winnerName} se lleva el bote de $${this.pot.toFixed(2)} con una mano superior.`;
            details = `Showdown Loss | Winner: ${winnerName}`;
            toastType = 'danger';
        }

        function dScoreVal() {
            return `D:${dVal} P:${pVal} Dy:${dyVal}`;
        }

        document.getElementById('poker-status-text').innerText = statusMsg;
        showToast(statusMsg, toastType);

        const playBtn = document.getElementById('game-play-btn');
        playBtn.className = 'btn btn-primary';
        playBtn.disabled = false;
        playBtn.innerText = 'Jugar de Nuevo';
        playBtn.onclick = () => runActiveGameBet();

        // The bet amount sent to state is only the starting bet. 
        // Winnings are paid on this baseline.
        await settleGameOutcome('poker', this.betAmount, winAmount, details);
    }
};
