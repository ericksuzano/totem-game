// Logica do Jogo das Transformacoes: instrucao, associacao dos 10 pares
// (divididos em 2 rodadas de 5 para caber confortavelmente na tela), feedback
// de acerto/erro com animacao de conexao, e tela de conclusao.

(function () {
  const PAIRS_PER_ROUND = 5;
  const CORRECT_FEEDBACK_MS = 2600;
  const ERROR_FEEDBACK_MS = 1800;
  const ROUND_ADVANCE_DELAY_MS = 1300;

  const layout = document.getElementById('transformations-game-layout');
  const instructionOkBtn = document.getElementById('btn-transformations-instruction-ok');
  const playAgainBtn = document.getElementById('btn-transformations-play-again');

  const state = {
    rounds: [],
    roundIndex: 0,
    oldCards: [],
    newCards: [],
    matchedIds: new Set(),
    selectedOldId: null,
    locked: false
  };

  function buildRounds() {
    const shuffled = shuffleArray(TRANSFORMATIONS_DATA);
    const rounds = [];
    for (let i = 0; i < shuffled.length; i += PAIRS_PER_ROUND) {
      rounds.push(shuffled.slice(i, i + PAIRS_PER_ROUND));
    }
    return rounds;
  }

  function totalPairs() {
    return TRANSFORMATIONS_DATA.length;
  }

  function matchedSoFar() {
    return state.roundIndex * PAIRS_PER_ROUND + state.matchedIds.size;
  }

  function resetGame() {
    state.rounds = buildRounds();
    state.roundIndex = 0;
    startRound(0);
  }

  function startRound(index) {
    state.roundIndex = index;
    const pairs = state.rounds[index];
    state.oldCards = shuffleArray(pairs);
    state.newCards = shuffleArray(pairs);
    state.matchedIds = new Set();
    state.selectedOldId = null;
    state.locked = false;

    renderRound();
    window.Totem.showScreen('transformations-game');
  }

  function renderRound() {
    layout.innerHTML = `
      <div class="game-header">
        <p class="game-header__round">Rodada ${state.roundIndex + 1} de ${state.rounds.length}</p>
        <p class="game-header__progress">${matchedSoFar()} de ${totalPairs()} concluídos</p>
      </div>
      <div class="game-columns" id="game-columns">
        <div class="game-column">
          <p class="game-column__title">Tecnologias de antigamente</p>
          <div class="game-column__list" id="game-column-old"></div>
        </div>
        <div class="game-column">
          <p class="game-column__title">Tecnologias de hoje</p>
          <div class="game-column__list" id="game-column-new"></div>
        </div>
      </div>
    `;

    const oldList = document.getElementById('game-column-old');
    const newList = document.getElementById('game-column-new');

    state.oldCards.forEach((pair) => {
      oldList.appendChild(createCard(pair, 'old'));
    });
    state.newCards.forEach((pair) => {
      newList.appendChild(createCard(pair, 'new'));
    });

    ensureFeedbackEl();
  }

  function createCard(pair, side) {
    const card = document.createElement('button');
    card.className = 'game-card';
    card.type = 'button';
    card.textContent = side === 'old' ? pair.oldLabel : pair.newLabel;
    card.dataset.pairId = pair.id;
    card.dataset.side = side;
    card.addEventListener('click', () => handleCardClick(pair.id, side, card));
    return card;
  }

  function ensureFeedbackEl() {
    if (document.getElementById('game-feedback')) return;
    const feedback = document.createElement('div');
    feedback.id = 'game-feedback';
    feedback.className = 'game-feedback';
    document.getElementById('app').appendChild(feedback);
  }

  function showFeedback(text, success, durationMs) {
    const feedback = document.getElementById('game-feedback');
    if (!feedback) return;
    feedback.textContent = text;
    feedback.classList.remove('is-success', 'is-error');
    feedback.classList.add(success ? 'is-success' : 'is-error', 'is-visible');
    setTimeout(() => feedback.classList.remove('is-visible'), durationMs);
  }

  function drawConnectionLine(cardA, cardB) {
    const container = document.getElementById('game-columns');
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const rectA = cardA.getBoundingClientRect();
    const rectB = cardB.getBoundingClientRect();

    const x1 = rectA.left + rectA.width / 2 - containerRect.left;
    const y1 = rectA.top + rectA.height / 2 - containerRect.top;
    const x2 = rectB.left + rectB.width / 2 - containerRect.left;
    const y2 = rectB.top + rectB.height / 2 - containerRect.top;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

    const line = document.createElement('div');
    line.className = 'connection-line';
    line.style.left = `${x1}px`;
    line.style.top = `${y1}px`;
    line.style.width = '0px';
    line.style.transform = `rotate(${angle}deg)`;
    container.appendChild(line);

    requestAnimationFrame(() => {
      line.style.width = `${length}px`;
    });

    setTimeout(() => line.remove(), 900);
  }

  function handleCardClick(pairId, side, cardEl) {
    if (state.locked) return;

    if (side === 'old') {
      if (state.matchedIds.has(pairId)) return;
      state.selectedOldId = pairId;
      document.querySelectorAll('#game-column-old .game-card').forEach((el) => {
        el.classList.toggle('is-selected', Number(el.dataset.pairId) === pairId);
      });
      return;
    }

    // side === 'new'
    if (state.matchedIds.has(pairId)) return;
    if (state.selectedOldId === null) return;

    const oldCardEl = document.querySelector(
      `#game-column-old .game-card[data-pair-id="${state.selectedOldId}"]`
    );

    if (state.selectedOldId === pairId) {
      handleCorrectMatch(pairId, oldCardEl, cardEl);
    } else {
      handleIncorrectMatch(oldCardEl, cardEl);
    }
  }

  function handleCorrectMatch(pairId, oldCardEl, newCardEl) {
    state.locked = true;
    state.matchedIds.add(pairId);
    oldCardEl.classList.remove('is-selected');
    oldCardEl.classList.add('is-matched');
    newCardEl.classList.add('is-matched');

    drawConnectionLine(oldCardEl, newCardEl);

    const pair = TRANSFORMATIONS_DATA.find((p) => p.id === pairId);
    showFeedback(pair.phrase, true, CORRECT_FEEDBACK_MS);

    document.querySelector('.game-header__progress').textContent =
      `${matchedSoFar()} de ${totalPairs()} concluídos`;

    setTimeout(() => {
      state.selectedOldId = null;
      state.locked = false;

      if (state.matchedIds.size === state.oldCards.length) {
        advanceRound();
      }
    }, ROUND_ADVANCE_DELAY_MS);
  }

  function handleIncorrectMatch(oldCardEl, newCardEl) {
    state.locked = true;
    showFeedback('Ops, essa combinação não corresponde. Tente novamente.', false, ERROR_FEEDBACK_MS);
    [oldCardEl, newCardEl].forEach((el) => el && el.classList.add('is-error'));

    setTimeout(() => {
      [oldCardEl, newCardEl].forEach((el) => {
        if (!el) return;
        el.classList.remove('is-error');
        el.classList.remove('is-selected');
      });
      state.selectedOldId = null;
      state.locked = false;
    }, ERROR_FEEDBACK_MS);
  }

  function advanceRound() {
    const nextIndex = state.roundIndex + 1;
    setTimeout(() => {
      if (nextIndex < state.rounds.length) {
        startRound(nextIndex);
      } else {
        window.Totem.showScreen('transformations-complete');
      }
    }, ROUND_ADVANCE_DELAY_MS);
  }

  instructionOkBtn.addEventListener('click', () => {
    resetGame();
  });

  playAgainBtn.addEventListener('click', () => {
    window.Totem.goHome();
  });

  window.TransformationsGame = {
    start() {
      window.Totem.showScreen('transformations-instruction');
    }
  };
})();
