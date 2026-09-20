// ==========================================================================
// JOGO DAS TRANSFORMACOES
//
// Regras:
// - 10 pares oficiais em TRANSFORMATIONS_DATA
// - 2 rodadas
// - Cada rodada apresenta 3 cards antigos e 3 cards modernos
// - 2 combinacoes corretas
// - 1 distrator de cada lado
// - 3 tentativas por rodada
// - Necessarios 2 acertos para passar
// - Menos de 2 acertos apos 3 tentativas:
//   "Tente daqui a pouco."
// - As partidas sao embaralhadas
// - Historico recente evita repetir a mesma configuracao
// ==========================================================================

(function () {
  'use strict';

  // ==========================================================================
  // CONFIGURACOES
  // ==========================================================================

  const TOTAL_ROUNDS = 2;
  const SOURCE_PAIRS_PER_ROUND = 4;
  const CARDS_PER_SIDE = 3;

  const CORRECT_PAIRS_PER_ROUND = 2;
  const ATTEMPTS_PER_ROUND = 3;

  const RECENT_GAMES_LIMIT = 30;

  const GAME_HISTORY_STORAGE_KEY =
    'aproxima2026_transformations_game_history';

  const CORRECT_FEEDBACK_MS = 2600;
  const ERROR_FEEDBACK_MS = 1800;
  const ROUND_ADVANCE_DELAY_MS = 1300;

  // ==========================================================================
  // ELEMENTOS
  // ==========================================================================

  const layout = document.getElementById(
    'transformations-game-layout'
  );

  const instructionOkBtn = document.getElementById(
    'btn-transformations-instruction-ok'
  );

  const playAgainBtn = document.getElementById(
    'btn-transformations-play-again'
  );

  // ==========================================================================
  // ESTADO
  // ==========================================================================

  const state = {
    rounds: [],
    roundIndex: 0,

    oldCards: [],
    newCards: [],

    matchedIds: new Set(),

    selectedOldId: null,

    attempts: 0,
    correctAnswers: 0,

    locked: false
  };

  // ==========================================================================
  // HISTORICO
  // ==========================================================================

  function loadGameHistory() {
    try {
      const stored =
        window.localStorage.getItem(
          GAME_HISTORY_STORAGE_KEY
        );

      if (!stored) {
        return [];
      }

      const parsed = JSON.parse(stored);

      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter(
        (item) => typeof item === 'string'
      );
    } catch (error) {
      console.warn(
        '[TRANSFORMATIONS] Erro ao ler historico:',
        error
      );

      return [];
    }
  }

  function saveGameToHistory(signature) {
    if (!signature) {
      return;
    }

    try {
      const history = loadGameHistory();

      const filtered = history.filter(
        (item) => item !== signature
      );

      filtered.push(signature);

      const limited = filtered.slice(
        -RECENT_GAMES_LIMIT
      );

      window.localStorage.setItem(
        GAME_HISTORY_STORAGE_KEY,
        JSON.stringify(limited)
      );
    } catch (error) {
      console.warn(
        '[TRANSFORMATIONS] Erro ao salvar historico:',
        error
      );
    }
  }

  // ==========================================================================
  // ASSINATURAS
  // ==========================================================================

  function createRoundSignature(round) {
    const oldIds = round.oldCards.map(
      (pair) => pair.id
    );

    const newIds = round.newCards.map(
      (pair) => pair.id
    );

    return [
      oldIds.join(','),
      newIds.join(',')
    ].join('|');
  }

  function createGameSignature(rounds) {
    return rounds
      .map((round) =>
        createRoundSignature(round)
      )
      .join('||');
  }

  // ==========================================================================
  // CRIA UMA RODADA
  //
  // 4 pares sao escolhidos:
  //
  // A = correto
  // B = correto
  // C = distrator
  // D = distrator
  //
  // De C e D:
  // - um fornece o card antigo
  // - outro fornece o card moderno
  //
  // Resultado:
  // 3 cards antigos
  // 3 cards modernos
  // 2 combinacoes corretas
  // ==========================================================================

  function createRound(sourcePairs) {
    if (
      !Array.isArray(sourcePairs) ||
      sourcePairs.length !==
        SOURCE_PAIRS_PER_ROUND
    ) {
      return null;
    }

    const shuffledSources =
      shuffleArray(sourcePairs);

    const correctA =
      shuffledSources[0];

    const correctB =
      shuffledSources[1];

    const decoyA =
      shuffledSources[2];

    const decoyB =
      shuffledSources[3];

    const decoys = shuffleArray([
      decoyA,
      decoyB
    ]);

    const oldDecoy = decoys[0];
    const newDecoy = decoys[1];

    const oldCards = shuffleArray([
      correctA,
      correctB,
      oldDecoy
    ]);

    const newCards = shuffleArray([
      correctA,
      correctB,
      newDecoy
    ]);

    if (
      oldCards.length !== CARDS_PER_SIDE ||
      newCards.length !== CARDS_PER_SIDE
    ) {
      return null;
    }

    return {
      correctPairs: [
        correctA,
        correctB
      ],
      oldCards,
      newCards
    };
  }

  // ==========================================================================
  // GERA UMA PARTIDA
  //
  // IMPORTANTE:
  // Aqui usamos TRANSFORMATIONS_DATA diretamente,
  // como o projeto original fazia.
  // ==========================================================================

  function generateCandidateGame() {
    if (
      typeof TRANSFORMATIONS_DATA ===
      'undefined'
    ) {
      console.error(
        '[TRANSFORMATIONS] TRANSFORMATIONS_DATA nao foi carregado.'
      );

      return null;
    }

    if (
      !Array.isArray(
        TRANSFORMATIONS_DATA
      )
    ) {
      console.error(
        '[TRANSFORMATIONS] TRANSFORMATIONS_DATA nao e um array.'
      );

      return null;
    }

    const shuffled = shuffleArray(
      TRANSFORMATIONS_DATA
    );

    const pairsNeeded =
      TOTAL_ROUNDS *
      SOURCE_PAIRS_PER_ROUND;

    if (
      shuffled.length < pairsNeeded
    ) {
      console.error(
        `[TRANSFORMATIONS] Sao necessarios pelo menos ${pairsNeeded} pares.`
      );

      return null;
    }

    const rounds = [];

    for (
      let roundIndex = 0;
      roundIndex < TOTAL_ROUNDS;
      roundIndex += 1
    ) {
      const start =
        roundIndex *
        SOURCE_PAIRS_PER_ROUND;

      const sourcePairs =
        shuffled.slice(
          start,
          start +
            SOURCE_PAIRS_PER_ROUND
        );

      const round =
        createRound(sourcePairs);

      if (!round) {
        return null;
      }

      rounds.push(round);
    }

    return rounds;
  }

  // ==========================================================================
  // GERA PARTIDA SEM REPETIR CONFIGURACOES RECENTES
  // ==========================================================================

  function buildRounds() {
    const history =
      loadGameHistory();

    const MAX_GENERATION_ATTEMPTS = 100;

    let fallback = null;

    for (
      let attempt = 0;
      attempt < MAX_GENERATION_ATTEMPTS;
      attempt += 1
    ) {
      const candidate =
        generateCandidateGame();

      if (!candidate) {
        break;
      }

      fallback = candidate;

      const signature =
        createGameSignature(
          candidate
        );

      if (
        !history.includes(signature)
      ) {
        saveGameToHistory(
          signature
        );

        return candidate;
      }
    }

    // Caso extremo: usa a ultima configuracao gerada
    // para evitar que o jogo fique travado.

    if (fallback) {
      const signature =
        createGameSignature(
          fallback
        );

      saveGameToHistory(
        signature
      );

      return fallback;
    }

    return [];
  }

  // ==========================================================================
  // RESET
  // ==========================================================================

  function resetGame() {
    state.rounds =
      buildRounds();

    state.roundIndex = 0;

    state.oldCards = [];
    state.newCards = [];

    state.matchedIds = new Set();

    state.selectedOldId = null;

    state.attempts = 0;
    state.correctAnswers = 0;

    state.locked = false;

    if (
      !state.rounds ||
      state.rounds.length !== TOTAL_ROUNDS
    ) {
      console.error(
        '[TRANSFORMATIONS] Nao foi possivel gerar as rodadas.'
      );

      return;
    }

    startRound(0);
  }

  // ==========================================================================
  // INICIA RODADA
  // ==========================================================================

  function startRound(index) {
    const round =
      state.rounds[index];

    if (!round) {
      return;
    }

    state.roundIndex = index;

    state.oldCards =
      round.oldCards;

    state.newCards =
      round.newCards;

    state.matchedIds = new Set();

    state.selectedOldId = null;

    state.attempts = 0;
    state.correctAnswers = 0;

    state.locked = false;

    renderRound();

    window.Totem.showScreen(
      'transformations-game'
    );
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  function renderRound() {
    if (!layout) {
      console.error(
        '[TRANSFORMATIONS] Layout do jogo nao encontrado.'
      );

      return;
    }

    layout.innerHTML = `
      <div class="game-header">

        <p class="game-header__round">
          Rodada ${state.roundIndex + 1} de ${state.rounds.length}
        </p>

        <p class="game-header__progress">
          Acertos: ${state.correctAnswers} de ${CORRECT_PAIRS_PER_ROUND}
          &nbsp;•&nbsp;
          Tentativas: ${state.attempts} de ${ATTEMPTS_PER_ROUND}
        </p>

      </div>

      <div
        class="game-columns"
        id="game-columns"
      >

        <div class="game-column">

          <p class="game-column__title">
            Tecnologias de antigamente
          </p>

          <div
            class="game-column__list"
            id="game-column-old"
          ></div>

        </div>

        <div class="game-column">

          <p class="game-column__title">
            Tecnologias de hoje
          </p>

          <div
            class="game-column__list"
            id="game-column-new"
          ></div>

        </div>

      </div>
    `;

    const oldList =
      document.getElementById(
        'game-column-old'
      );

    const newList =
      document.getElementById(
        'game-column-new'
      );

    if (!oldList || !newList) {
      return;
    }

    state.oldCards.forEach(
      (pair) => {
        oldList.appendChild(
          createCard(pair, 'old')
        );
      }
    );

    state.newCards.forEach(
      (pair) => {
        newList.appendChild(
          createCard(pair, 'new')
        );
      }
    );

    ensureFeedbackEl();
  }

  // ==========================================================================
  // CARD
  // ==========================================================================

  function createCard(pair, side) {
    const card =
      document.createElement('button');

    card.className = 'game-card';
    card.type = 'button';

    card.dataset.pairId = pair.id;
    card.dataset.side = side;

    const image =
      document.createElement('img');

    image.className =
      'game-card__image';

    image.src =
      side === 'old'
        ? pair.oldImage
        : pair.newImage;

    image.alt = '';
    image.draggable = false;

    image.addEventListener(
      'error',
      () => {
        image.classList.add(
          'is-image-error'
        );
      }
    );

    const label =
      document.createElement('span');

    label.className =
      'game-card__label';

    label.textContent =
      side === 'old'
        ? pair.oldLabel
        : pair.newLabel;

    card.appendChild(image);
    card.appendChild(label);

    card.addEventListener(
      'click',
      (event) => {
        event.preventDefault();

        handleCardClick(
          pair.id,
          side,
          card
        );
      }
    );

    return card;
  }

  // ==========================================================================
  // FEEDBACK
  // ==========================================================================

  function ensureFeedbackEl() {
    if (
      document.getElementById(
        'game-feedback'
      )
    ) {
      return;
    }

    const app =
      document.getElementById('app');

    if (!app) {
      return;
    }

    const feedback =
      document.createElement('div');

    feedback.id =
      'game-feedback';

    feedback.className =
      'game-feedback';

    app.appendChild(feedback);
  }

  function showFeedback(
    text,
    success,
    durationMs
  ) {
    const feedback =
      document.getElementById(
        'game-feedback'
      );

    if (!feedback) {
      return;
    }

    feedback.textContent = text;

    feedback.classList.remove(
      'is-success',
      'is-error'
    );

    feedback.classList.add(
      success
        ? 'is-success'
        : 'is-error',
      'is-visible'
    );

    setTimeout(
      () => {
        feedback.classList.remove(
          'is-visible'
        );
      },
      durationMs
    );
  }

  // ==========================================================================
  // PROGRESSO
  // ==========================================================================

  function updateRoundProgress() {
    const progress =
      document.querySelector(
        '.game-header__progress'
      );

    if (!progress) {
      return;
    }

    progress.innerHTML = `
      Acertos: ${state.correctAnswers} de ${CORRECT_PAIRS_PER_ROUND}
      &nbsp;•&nbsp;
      Tentativas: ${state.attempts} de ${ATTEMPTS_PER_ROUND}
    `;
  }

  // ==========================================================================
  // LINHA DE CONEXAO
  // ==========================================================================

  function drawConnectionLine(
    cardA,
    cardB
  ) {
    if (!cardA || !cardB) {
      return;
    }

    const container =
      document.getElementById(
        'game-columns'
      );

    if (!container) {
      return;
    }

    const containerRect =
      container.getBoundingClientRect();

    const rectA =
      cardA.getBoundingClientRect();

    const rectB =
      cardB.getBoundingClientRect();

    const x1 =
      rectA.left +
      rectA.width / 2 -
      containerRect.left;

    const y1 =
      rectA.top +
      rectA.height / 2 -
      containerRect.top;

    const x2 =
      rectB.left +
      rectB.width / 2 -
      containerRect.left;

    const y2 =
      rectB.top +
      rectB.height / 2 -
      containerRect.top;

    const dx = x2 - x1;
    const dy = y2 - y1;

    const length =
      Math.sqrt(
        dx * dx +
        dy * dy
      );

    const angle =
      (Math.atan2(dy, dx) * 180) /
      Math.PI;

    const line =
      document.createElement('div');

    line.className =
      'connection-line';

    line.style.left =
      `${x1}px`;

    line.style.top =
      `${y1}px`;

    line.style.width = '0px';

    line.style.transform =
      `rotate(${angle}deg)`;

    container.appendChild(line);

    requestAnimationFrame(
      () => {
        line.style.width =
          `${length}px`;
      }
    );

    setTimeout(
      () => {
        line.remove();
      },
      900
    );
  }

  // ==========================================================================
  // CLIQUE
  // ==========================================================================

  function handleCardClick(
    pairId,
    side,
    cardEl
  ) {
    if (state.locked) {
      return;
    }

    // ------------------------------------------------------------------------
    // CARD ANTIGO
    // ------------------------------------------------------------------------

    if (side === 'old') {
      if (
        state.matchedIds.has(
          pairId
        )
      ) {
        return;
      }

      state.selectedOldId =
        pairId;

      document
        .querySelectorAll(
          '#game-column-old .game-card'
        )
        .forEach((el) => {
          el.classList.toggle(
            'is-selected',
            String(
              el.dataset.pairId
            ) ===
              String(pairId)
          );
        });

      return;
    }

    // ------------------------------------------------------------------------
    // CARD MODERNO
    // ------------------------------------------------------------------------

    if (
      state.matchedIds.has(
        pairId
      )
    ) {
      return;
    }

    if (
      state.selectedOldId ===
      null
    ) {
      return;
    }

    const oldCardEl =
      document.querySelector(
        `#game-column-old .game-card[data-pair-id="${state.selectedOldId}"]`
      );

    state.attempts += 1;

    updateRoundProgress();

    // ------------------------------------------------------------------------
    // ACERTO
    // ------------------------------------------------------------------------

    if (
      String(
        state.selectedOldId
      ) ===
      String(pairId)
    ) {
      handleCorrectMatch(
        pairId,
        oldCardEl,
        cardEl
      );

      return;
    }

    // ------------------------------------------------------------------------
    // ERRO
    // ------------------------------------------------------------------------

    handleIncorrectMatch(
      oldCardEl,
      cardEl
    );
  }

  // ==========================================================================
  // ACERTO
  // ==========================================================================

  function handleCorrectMatch(
    pairId,
    oldCardEl,
    newCardEl
  ) {
    state.locked = true;

    state.correctAnswers += 1;

    state.matchedIds.add(
      pairId
    );

    if (oldCardEl) {
      oldCardEl.classList.remove(
        'is-selected'
      );

      oldCardEl.classList.add(
        'is-matched'
      );
    }

    if (newCardEl) {
      newCardEl.classList.add(
        'is-matched'
      );
    }

    drawConnectionLine(
      oldCardEl,
      newCardEl
    );

    const pair =
      TRANSFORMATIONS_DATA.find(
        (item) =>
          String(item.id) ===
          String(pairId)
      );

    if (pair) {
      showFeedback(
        pair.phrase,
        true,
        CORRECT_FEEDBACK_MS
      );
    }

    updateRoundProgress();

    setTimeout(
      () => {
        state.selectedOldId =
          null;

        // ---------------------------------------------------
        // 2 ACERTOS = AVANCA
        // ---------------------------------------------------

        if (
          state.correctAnswers >=
          CORRECT_PAIRS_PER_ROUND
        ) {
          state.locked = false;

          advanceRound();

          return;
        }

        // ---------------------------------------------------
        // CHEGOU A 3 TENTATIVAS SEM 2 ACERTOS
        // ---------------------------------------------------

        if (
          state.attempts >=
          ATTEMPTS_PER_ROUND
        ) {
          state.locked = false;

          showTryLater();

          return;
        }

        state.locked = false;
      },
      ROUND_ADVANCE_DELAY_MS
    );
  }

  // ==========================================================================
  // ERRO
  // ==========================================================================

  function handleIncorrectMatch(
    oldCardEl,
    newCardEl
  ) {
    state.locked = true;

    showFeedback(
      'Ops, essa combinação não corresponde. Tente novamente.',
      false,
      ERROR_FEEDBACK_MS
    );

    [oldCardEl, newCardEl].forEach(
      (el) => {
        if (el) {
          el.classList.add(
            'is-error'
          );
        }
      }
    );

    setTimeout(
      () => {
        [oldCardEl, newCardEl].forEach(
          (el) => {
            if (!el) {
              return;
            }

            el.classList.remove(
              'is-error'
            );

            el.classList.remove(
              'is-selected'
            );
          }
        );

        state.selectedOldId =
          null;

        // ---------------------------------------------------
        // 3 TENTATIVAS SEM 2 ACERTOS
        // ---------------------------------------------------

        if (
          state.attempts >=
            ATTEMPTS_PER_ROUND &&
          state.correctAnswers <
            CORRECT_PAIRS_PER_ROUND
        ) {
          state.locked = false;

          showTryLater();

          return;
        }

        state.locked = false;

        updateRoundProgress();
      },
      ERROR_FEEDBACK_MS
    );
  }

  // ==========================================================================
  // PROXIMA RODADA
  // ==========================================================================

  function advanceRound() {
    const nextIndex =
      state.roundIndex + 1;

    setTimeout(
      () => {
        if (
          nextIndex <
          state.rounds.length
        ) {
          startRound(
            nextIndex
          );

          return;
        }

        window.Totem.showScreen(
          'transformations-complete'
        );
      },
      ROUND_ADVANCE_DELAY_MS
    );
  }

  // ==========================================================================
  // TENTE DAQUI A POUCO
  // ==========================================================================

  function showTryLater() {
    state.locked = true;

    if (!layout) {
      return;
    }

    layout.innerHTML = `
      <div
        class="game-round-failure"
        style="
          width: 100%;
          height: 100%;
          min-height: 360px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 24px;
          padding: 40px;
          box-sizing: border-box;
        "
      >

        <p
          style="
            margin: 0;
            font-size: clamp(34px, 4vw, 60px);
            font-weight: 800;
            line-height: 1.15;
          "
        >
          Tente daqui a pouco.
        </p>

        <p
          style="
            margin: 0;
            max-width: 850px;
            font-size: clamp(22px, 2.2vw, 32px);
            line-height: 1.4;
          "
        >
          Obrigado por participar!
        </p>

        <button
          type="button"
          id="btn-transformations-try-later-home"
          class="btn btn-primary"
          style="
            min-width: 280px;
            min-height: 72px;
            font-size: 24px;
          "
        >
          Voltar ao início
        </button>

      </div>
    `;

    const homeBtn =
      document.getElementById(
        'btn-transformations-try-later-home'
      );

    if (homeBtn) {
      homeBtn.addEventListener(
        'click',
        (event) => {
          event.preventDefault();

          window.Totem.goHome();
        }
      );
    }
  }

  // ==========================================================================
  // EVENTOS
  // ==========================================================================

  if (instructionOkBtn) {
    instructionOkBtn.addEventListener(
      'click',
      (event) => {
        event.preventDefault();

        resetGame();
      }
    );
  }

  if (playAgainBtn) {
    playAgainBtn.addEventListener(
      'click',
      (event) => {
        event.preventDefault();

        window.Totem.goHome();
      }
    );
  }

  // ==========================================================================
  // API PUBLICA
  // ==========================================================================

  window.TransformationsGame = {
    start() {
      window.Totem.showScreen(
        'transformations-instruction'
      );
    }
  };
})();