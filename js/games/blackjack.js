// Aetheris Casino - Blackjack 21 Game Module

window.gamesRegistry['blackjack'] = {
    deck: [],
    playerHand: [],
    dealerHand: [],
    betAmount: 0,
    isPlaying: false,
    gameStage: null,

    suits: ['H', 'D', 'C', 'S'], // Hearts, Diamonds, Clubs, Spades
    values: ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'],

    init(stage, configs) {
        this.stage = stage;
        this.configs = configs;
        this.isPlaying = false;

        // Apply visual table class
        stage.className = 'game-stage-wrapper glass velvet-felt';

        configs.innerHTML = `
            <div id="bj-controls" style="display:flex; flex-direction:column; gap:12px; width:100%;">
                <button class="btn btn-secondary" id="bj-btn-hit" onclick="window.gamesRegistry.blackjack.hit()" disabled>Pedir Carta (Hit)</button>
                <button class="btn btn-secondary" id="bj-btn-stand" onclick="window.gamesRegistry.blackjack.stand()" disabled>Plantarse (Stand)</button>
                <button class="btn btn-secondary" id="bj-btn-double" onclick="window.gamesRegistry.blackjack.double()" disabled>Doblar Apuesta</button>
            </div>
            <div style="margin-top:12px; font-size:0.8rem; color:rgba(255,255,255,0.7); text-align:center;">
                El Crupier pide con 16 y se planta en 17 suave. Doblar duplica la apuesta actual y pide una sola carta.
            </div>
        `;

        this.renderBoard();
    },

    renderBoard() {
        this.stage.innerHTML = `
            <div class="bj-table">
                <!-- Dealer Area -->
                <div class="bj-dealer-area">
                    <span class="form-label" style="color:#fff;">Crupier: <span id="bj-dealer-score" style="color:var(--accent); font-weight:700;">?</span></span>
                    <div class="bj-cards-container" id="bj-dealer-cards">
                        <!-- Cards here -->
                    </div>
                </div>

                <!-- Mid text status -->
                <div id="bj-status-msg" style="text-align:center; font-family:var(--font-serif); font-size:1.5rem; font-weight:700; color:var(--accent); min-height:36px;">
                    Apuesta para comenzar
                </div>

                <!-- Player Area -->
                <div class="bj-player-area">
                    <div class="bj-cards-container" id="bj-player-cards">
                        <!-- Cards here -->
                    </div>
                    <span class="form-label" style="color:#fff;">Tú: <span id="bj-player-score" style="color:var(--accent); font-weight:700;">0</span></span>
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
        // Shuffle
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    },

    drawCard(targetRtp = 1.0, forceBust = false) {
        // Deck depletion fail-safe
        if (this.deck.length < 10) this.buildDeck();
        
        // Admin RTP checks
        // If forceBust is true or we want to sabotage player draw, we pull a card that exceeds score
        if (forceBust) {
            const curSum = this.calculateHandScore(this.playerHand);
            const neededValue = 22 - curSum;
            // Find a card value in deck that causes a bust
            const bustCardIdx = this.deck.findIndex(c => this.getCardNumericValue(c) >= neededValue);
            if (bustCardIdx !== -1) {
                return this.deck.splice(bustCardIdx, 1)[0];
            }
        }

        return this.deck.pop();
    },

    getCardNumericValue(card) {
        if (['J', 'Q', 'K'].includes(card.value)) return 10;
        if (card.value === 'A') return 11;
        return parseInt(card.value);
    },

    calculateHandScore(hand) {
        let sum = 0;
        let aces = 0;

        hand.forEach(c => {
            sum += this.getCardNumericValue(c);
            if (c.value === 'A') aces++;
        });

        // Convert Aces if we exceed 21
        while (sum > 21 && aces > 0) {
            sum -= 10;
            aces--;
        }

        return sum;
    },

    renderHandCards(containerId, hand, hideFirst = false) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        hand.forEach((card, idx) => {
            const cardEl = document.createElement('div');
            if (hideFirst && idx === 0) {
                cardEl.className = 'playing-card hidden-card';
                cardEl.innerText = '❓';
            } else {
                const isRed = ['H', 'D'].includes(card.suit);
                cardEl.className = `playing-card${isRed ? ' red' : ''}`;
                
                const suitSym = card.suit === 'H' ? '♥' : (card.suit === 'D' ? '♦' : (card.suit === 'C' ? '♣' : '♠'));
                
                cardEl.innerHTML = `
                    <div>${card.value}</div>
                    <div style="font-size:2rem; align-self:center;">${suitSym}</div>
                    <div style="transform:rotate(180deg);">${card.value}</div>
                `;
            }
            container.appendChild(cardEl);
        });
    },

    async play(betAmount) {
        this.betAmount = betAmount;
        this.isPlaying = true;
        
        this.buildDeck();
        this.playerHand = [];
        this.dealerHand = [];

        // Initial Deal
        this.playerHand.push(this.drawCard());
        this.dealerHand.push(this.drawCard());
        this.playerHand.push(this.drawCard());
        this.dealerHand.push(this.drawCard());

        this.renderBoard();
        this.renderHandCards('bj-player-cards', this.playerHand);
        this.renderHandCards('bj-dealer-cards', this.dealerHand, true);

        // Update scores display
        document.getElementById('bj-player-score').innerText = this.calculateHandScore(this.playerHand);
        document.getElementById('bj-dealer-score').innerText = '?';
        document.getElementById('bj-status-msg').innerText = '¿Carta (Hit) o Plantarse (Stand)?';

        // Play dealt sounds
        window.soundManager.playTick();
        setTimeout(() => window.soundManager.playTick(), 200);

        // Check for player Blackjack
        const pScore = this.calculateHandScore(this.playerHand);
        if (pScore === 21) {
            this.stand();
            return;
        }

        // Enable buttons
        document.getElementById('bj-btn-hit').disabled = false;
        document.getElementById('bj-btn-stand').disabled = false;
        
        const user = window.stateManager.getCurrentUser();
        if (user.balance >= this.betAmount * 2) {
            document.getElementById('bj-btn-double').disabled = false;
        }
    },

    async hit() {
        if (!this.isPlaying) return;
        document.getElementById('bj-btn-double').disabled = true;

        const globalRtp = window.stateManager.state.rtpSettings.globalRtp;
        const gameRtp = window.stateManager.state.rtpSettings.gameRtps.blackjack;
        const targetRtp = globalRtp * gameRtp;

        // Force bust if RTP is low and player hit to a risky position (e.g. 15+)
        const curScore = this.calculateHandScore(this.playerHand);
        const shouldSabotage = targetRtp < 0.92 && curScore >= 12 && Math.random() > targetRtp;

        const card = this.drawCard(targetRtp, shouldSabotage);
        this.playerHand.push(card);

        this.renderHandCards('bj-player-cards', this.playerHand);
        
        const score = this.calculateHandScore(this.playerHand);
        document.getElementById('bj-player-score').innerText = score;
        window.soundManager.playTick();

        if (score > 21) {
            this.endGame('bust');
        } else if (score === 21) {
            this.stand();
        }
    },

    async stand() {
        if (!this.isPlaying) return;
        this.disableControls();

        // Reveal dealer first card
        this.renderHandCards('bj-dealer-cards', this.dealerHand, false);
        
        let dScore = this.calculateHandScore(this.dealerHand);
        document.getElementById('bj-dealer-score').innerText = dScore;
        window.soundManager.playTick();

        const globalRtp = window.stateManager.state.rtpSettings.globalRtp;
        const gameRtp = window.stateManager.state.rtpSettings.gameRtps.blackjack;
        const targetRtp = globalRtp * gameRtp;

        // Dealer playing loop
        while (dScore < 17) {
            await new Promise(resolve => setTimeout(resolve, 600));

            // Sabotage dealer draws: if the dealer has high chance of busting,
            // but RTP is low, we draw a card that gives them 17-21 instead of busting.
            let card = null;
            if (targetRtp < 0.90 && dScore >= 12 && Math.random() > targetRtp) {
                const maxVal = 21 - dScore;
                // Try to find a card in the deck that equals <= maxVal
                const saveCardIdx = this.deck.findIndex(c => this.getCardNumericValue(c) <= maxVal);
                if (saveCardIdx !== -1) {
                    card = this.deck.splice(saveCardIdx, 1)[0];
                }
            }
            
            if (!card) card = this.deck.pop();
            this.dealerHand.push(card);

            this.renderHandCards('bj-dealer-cards', this.dealerHand, false);
            dScore = this.calculateHandScore(this.dealerHand);
            document.getElementById('bj-dealer-score').innerText = dScore;
            window.soundManager.playTick();
        }

        const pScore = this.calculateHandScore(this.playerHand);

        if (dScore > 21) {
            this.endGame('dealer_bust');
        } else if (dScore > pScore) {
            this.endGame('dealer_win');
        } else if (dScore < pScore) {
            this.endGame('player_win');
        } else {
            this.endGame('push');
        }
    },

    async double() {
        if (!this.isPlaying) return;
        this.betAmount *= 2;
        this.disableControls();

        // Draw one card
        const card = this.drawCard();
        this.playerHand.push(card);
        
        this.renderHandCards('bj-player-cards', this.playerHand);
        const score = this.calculateHandScore(this.playerHand);
        document.getElementById('bj-player-score').innerText = score;
        window.soundManager.playTick();

        if (score > 21) {
            this.endGame('bust');
        } else {
            await new Promise(resolve => setTimeout(resolve, 600));
            this.stand();
        }
    },

    disableControls() {
        document.getElementById('bj-btn-hit').disabled = true;
        document.getElementById('bj-btn-stand').disabled = true;
        document.getElementById('bj-btn-double').disabled = true;
    },

    async endGame(outcome) {
        this.isPlaying = false;
        this.disableControls();

        let winAmount = 0;
        let details = '';
        let statusMsg = '';
        let toastType = 'info';

        const pScore = this.calculateHandScore(this.playerHand);
        const dScore = this.calculateHandScore(this.dealerHand);

        if (outcome === 'bust') {
            winAmount = 0;
            statusMsg = `Te pasaste de 21 (${pScore}). ¡Perdiste!`;
            details = 'Bust';
            toastType = 'danger';
        } else if (outcome === 'dealer_bust') {
            winAmount = Number((this.betAmount * 2).toFixed(2));
            statusMsg = `¡El Crupier se pasó! Ganaste $${winAmount.toFixed(2)}`;
            details = `Dealer Bust | Player score ${pScore}`;
            toastType = 'success';
        } else if (outcome === 'player_win') {
            // Check for natural Blackjack (pays 3:2)
            const paysMultiplier = (pScore === 21 && this.playerHand.length === 2) ? 2.5 : 2;
            winAmount = Number((this.betAmount * paysMultiplier).toFixed(2));
            statusMsg = `¡Ganaste la mano! Recibes $${winAmount.toFixed(2)}`;
            details = `Win | Player ${pScore} vs Dealer ${dScore}`;
            toastType = 'success';
        } else if (outcome === 'dealer_win') {
            winAmount = 0;
            statusMsg = `El Crupier gana con ${dScore} contra ${pScore}.`;
            details = `Loss | Dealer ${dScore} vs Player ${pScore}`;
            toastType = 'danger';
        } else if (outcome === 'push') {
            winAmount = this.betAmount; // Return bet
            statusMsg = `Empate (Push) a ${pScore}. Se devuelve tu apuesta.`;
            details = 'Push';
        }

        document.getElementById('bj-status-msg').innerText = statusMsg;
        showToast(statusMsg, toastType);

        // Reset main play buttons
        const playBtn = document.getElementById('game-play-btn');
        playBtn.className = 'btn btn-primary';
        playBtn.disabled = false;
        playBtn.innerText = 'Jugar de Nuevo';
        playBtn.onclick = () => runActiveGameBet();

        await settleGameOutcome('blackjack', this.betAmount, winAmount, details);
    }
};
