// Aetheris Casino - Video Póker (Jacks or Better) Game Module

window.gamesRegistry['videopoker'] = {
    deck: [],
    hand: [],
    holds: [false, false, false, false, false],
    betAmount: 0,
    gamePhase: 'deal', // deal, draw
    isPlaying: false,

    suits: ['H', 'D', 'C', 'S'],
    values: ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'],
    
    payoutTable: {
        'Royal Flush': 250,
        'Straight Flush': 50,
        'Four of a Kind': 25,
        'Full House': 9,
        'Flush': 6,
        'Straight': 4,
        'Three of a Kind': 3,
        'Two Pair': 2,
        'Jacks or Better': 1,
        'No Hand': 0
    },

    init(stage, configs) {
        this.stage = stage;
        this.configs = configs;
        this.isPlaying = false;

        stage.className = 'game-stage-wrapper glass velvet-felt';

        configs.innerHTML = `
            <div id="vp-controls" style="display:flex; flex-direction:column; gap:10px; width:100%;">
                <button class="btn btn-secondary" id="vp-btn-action" onclick="window.gamesRegistry.videopoker.triggerDraw()" disabled>Descartar y Robar</button>
            </div>
            <div style="margin-top:10px; font-size:0.75rem; color:rgba(255,255,255,0.7); text-align:center;">
                Jacks or Better. Haz clic en las tarjetas que deseas conservar (HOLD) antes de robar nuevas cartas.
            </div>
        `;

        this.renderTable();
    },

    renderTable() {
        this.stage.innerHTML = `
            <div style="display:flex; flex-direction:column; justify-content:space-between; width:100%; height:100%; padding:20px; align-items:center;">
                <!-- Hand Display -->
                <div style="font-family:var(--font-serif); font-size:1.2rem; color:var(--accent);">JACKS OR BETTER</div>
                
                <div style="display:flex; gap:8px; justify-content:center; width:100%;">
                    ${[0,1,2,3,4].map(idx => `
                        <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
                            <div id="vp-card-${idx}" class="playing-card hidden-card" onclick="window.gamesRegistry.videopoker.toggleHold(${idx})" style="cursor:pointer; width:65px; height:95px;">❓</div>
                            <div id="vp-hold-badge-${idx}" style="font-size:0.75rem; font-weight:800; color:var(--accent); visibility:hidden; background:rgba(0,0,0,0.5); padding:2px 6px; border-radius:4px;">HOLD</div>
                        </div>
                    `).join('')}
                </div>

                <!-- Hand Rank result display -->
                <div id="vp-rank-text" style="font-family:var(--font-serif); font-size:1.4rem; font-weight:700; color:var(--accent); min-height:36px;">
                    Apuesta para repartir cartas
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

    toggleHold(idx) {
        if (this.gamePhase !== 'draw') return;
        this.holds[idx] = !this.holds[idx];
        document.getElementById(`vp-hold-badge-${idx}`).style.visibility = this.holds[idx] ? 'visible' : 'hidden';
        window.soundManager.playClick();
    },

    async play(betAmount) {
        this.betAmount = betAmount;
        this.holds = Array(5).fill(false);
        this.buildDeck();

        this.hand = [];
        for (let i = 0; i < 5; i++) {
            this.hand.push(this.deck.pop());
        }

        this.gamePhase = 'draw';
        this.renderTable();
        this.renderCards();

        document.getElementById('vp-rank-text').innerText = 'Selecciona cartas a conservar y presiona robar.';
        
        // Audio deal ticks
        window.soundManager.playTick();
        setTimeout(() => window.soundManager.playTick(), 200);

        const actionBtn = document.getElementById('vp-btn-action');
        actionBtn.disabled = false;
        actionBtn.innerText = 'Descartar y Robar';

        const playBtn = document.getElementById('game-play-btn');
        playBtn.disabled = true;
        playBtn.innerText = 'Fase de Descartes...';
    },

    renderCards() {
        this.hand.forEach((card, idx) => {
            const cardEl = document.getElementById(`vp-card-${idx}`);
            const isRed = ['H', 'D'].includes(card.suit);
            cardEl.className = `playing-card${isRed ? ' red' : ''}`;
            
            const suitSym = card.suit === 'H' ? '♥' : (card.suit === 'D' ? '♦' : (card.suit === 'C' ? '♣' : '♠'));
            cardEl.innerHTML = `
                <div>${card.value}</div>
                <div style="font-size:1.6rem; align-self:center;">${suitSym}</div>
                <div style="transform:rotate(180deg);">${card.value}</div>
            `;
        });
    },

    async triggerDraw() {
        if (this.gamePhase !== 'draw') return;
        this.gamePhase = 'deal';

        const actionBtn = document.getElementById('vp-btn-action');
        actionBtn.disabled = true;

        const globalRtp = window.stateManager.state.rtpSettings.globalRtp;
        const gameRtp = window.stateManager.state.rtpSettings.gameRtps.videopoker;
        const targetRtp = globalRtp * gameRtp;

        // Draw new cards for slots that are not held
        this.hand.forEach((card, idx) => {
            if (!this.holds[idx]) {
                let nextCard = null;
                
                // If RTP is low, block draw combinations improving player's payout
                if (targetRtp < 0.95 && Math.random() > targetRtp) {
                    // Try to avoid giving values that match existing cards in hand
                    const existingVals = this.hand.filter((_, i) => this.holds[i]).map(c => c.value);
                    const idxInDeck = this.deck.findIndex(c => !existingVals.includes(c.value));
                    if (idxInDeck !== -1) {
                        nextCard = this.deck.splice(idxInDeck, 1)[0];
                    }
                }

                if (!nextCard) nextCard = this.deck.pop();
                this.hand[idx] = nextCard;
            }
        });

        this.renderCards();
        window.soundManager.playTick();

        // Evaluate Hand Rank
        const rank = this.evaluateHand();
        const payoutMult = this.payoutTable[rank];
        const winAmount = Number((this.betAmount * payoutMult).toFixed(2));

        const resultText = document.getElementById('vp-rank-text');
        if (payoutMult > 0) {
            resultText.innerText = `¡${rank}! Ganas x${payoutMult} ($${winAmount.toFixed(2)})`;
            resultText.style.color = 'var(--success)';
            showToast(`¡${rank}! Ganas $${winAmount.toFixed(2)}`, 'success');
        } else {
            resultText.innerText = 'Sin Combinación. Intenta de nuevo.';
            resultText.style.color = 'var(--text-muted)';
            showToast('Mano sin premio.', 'danger');
        }

        const playBtn = document.getElementById('game-play-btn');
        playBtn.className = 'btn btn-primary';
        playBtn.disabled = false;
        playBtn.innerText = 'Jugar de Nuevo';
        playBtn.onclick = () => runActiveGameBet();

        await settleGameOutcome('videopoker', this.betAmount, winAmount, `Hand Rank: ${rank}`);
    },

    evaluateHand() {
        const suits = this.hand.map(c => c.suit);
        const values = this.hand.map(c => {
            if (c.value === 'A') return 14;
            if (c.value === 'K') return 13;
            if (c.value === 'Q') return 12;
            if (c.value === 'J') return 11;
            return parseInt(c.value);
        });
        values.sort((a,b) => a-b);

        const isFlush = suits.every(s => s === suits[0]);
        
        // Check Straight
        let isStraight = true;
        for (let i = 0; i < 4; i++) {
            if (values[i+1] !== values[i] + 1) {
                isStraight = false;
                break;
            }
        }
        // Wheel straight (A-2-3-4-5)
        if (!isStraight && JSON.stringify(values) === JSON.stringify([2,3,4,5,14])) {
            isStraight = true;
        }

        // Count value duplicates
        const counts = {};
        values.forEach(v => counts[v] = (counts[v] || 0) + 1);
        const listCounts = Object.values(counts);
        listCounts.sort((a,b) => b-a);

        if (isFlush && isStraight) {
            if (values[0] === 10) return 'Royal Flush';
            return 'Straight Flush';
        }
        if (listCounts[0] === 4) return 'Four of a Kind';
        if (listCounts[0] === 3 && listCounts[1] === 2) return 'Full House';
        if (isFlush) return 'Flush';
        if (isStraight) return 'Straight';
        if (listCounts[0] === 3) return 'Three of a Kind';
        if (listCounts[0] === 2 && listCounts[1] === 2) return 'Two Pair';
        
        // Jacks or Better check
        if (listCounts[0] === 2) {
            const pairVal = Object.keys(counts).find(k => counts[k] === 2);
            if (parseInt(pairVal) >= 11) {
                return 'Jacks or Better';
            }
        }

        return 'No Hand';
    }
};
