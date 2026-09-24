// Logica do Jogo das Transformacoes: tela inicial, associacao dos 10 pares
// (divididos em 2 rodadas de 5 para caber confortavelmente na tela), feedback
// de acerto/erro, "fios" coloridos ligando cada par acertado (ficam visiveis
// ate o fim da rodada) e tela de conclusao (FINALIZAR / VOLTAR AO INICIO).
//
// Layout: objetos antigos na fileira de cima, modernos na de baixo; cada
// cartao mostra [imagem] + [nome] juntos. Os fios passam pelo espaco entre as
// duas fileiras, sem cobrir nenhum cartao.

(function () {
  const PAIRS_PER_ROUND = 5;
  const CORRECT_FEEDBACK_MS = 2600;
  const ERROR_FEEDBACK_MS = 1800;
  const ROUND_ADVANCE_DELAY_MS = 1300;
  // Quantidade de cores de fio definidas em css/transformations.css
  // (.game-wire--1 ... --5), todas da identidade APROXIMA.
  const WIRE_COLORS = 5;

  const INSTRUCTION_TEXT =
    'Toque em objeto antigo e, em seguida toque no objeto moderno para formar o par correto.';

  const layout = document.getElementById('transformations-game-layout');
  const startBtn = document.getElementById('btn-transformations-start');
  const finishBtn = document.getElementById('btn-transformations-finish');
  const homeBtn = document.getElementById('btn-transformations-home');

  const SVG_NS = 'http://www.w3.org/2000/svg';

  const state = {
    rounds: [],
    roundIndex: 0,
    oldCards: [],
    newCards: [],
    matchedIds: new Set(),
    // Fios desta rodada, na ordem dos acertos: { pairId, color }
    wires: [],
    selectedOldId: null,
    locked: false
  };

  let messageTimer = null;

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
    state.wires = [];
    state.selectedOldId = null;
    state.locked = false;

    renderRound();
    window.Totem.showScreen('transformations-game');
  }

  function renderRound() {
    clearTimeout(messageTimer);
    layout.innerHTML = `
      <div class="game-head">
        <div class="game-head__text">
          <p class="eyebrow">Jogo das Transformações</p>
          <h1 class="game-head__title">Relacione os objetos antigos com os objetos modernos</h1>
          <p class="game-message" id="game-message"></p>
        </div>
        <div class="game-progress">
          <span class="game-progress__round">Rodada ${state.roundIndex + 1} de ${state.rounds.length}</span>
          <span class="game-progress__count" id="game-progress-count"></span>
          <span class="game-progress__label">pares</span>
        </div>
      </div>
      <div class="game-field" id="game-field">
        <svg class="game-wires" id="game-wires" aria-hidden="true"></svg>
        <div class="game-row game-row--old">
          <p class="game-row__label">Objetos antigos</p>
          <div class="game-row__cards" id="game-row-old"></div>
        </div>
        <div class="game-row game-row--new">
          <div class="game-row__cards" id="game-row-new"></div>
          <p class="game-row__label">Objetos modernos</p>
        </div>
      </div>
    `;

    const oldRow = document.getElementById('game-row-old');
    const newRow = document.getElementById('game-row-new');
    state.oldCards.forEach((pair) => oldRow.appendChild(createCard(pair, 'old')));
    state.newCards.forEach((pair) => newRow.appendChild(createCard(pair, 'new')));

    setMessage(INSTRUCTION_TEXT, null);
    updateProgress();
  }

  function createCard(pair, side) {
    const label = side === 'old' ? pair.oldLabel : pair.newLabel;
    const imageSrc = side === 'old' ? pair.oldImage : pair.newImage;

    const card = document.createElement('button');
    card.className = `game-card game-card--${side}`;
    card.type = 'button';
    card.dataset.pairId = pair.id;
    card.dataset.side = side;

    // Imagem e nome no mesmo cartao, um logo abaixo do outro.
    const media = document.createElement('span');
    media.className = 'game-card__media';
    const img = document.createElement('img');
    img.src = imageSrc;
    img.alt = '';
    img.addEventListener('error', () => {
      // Imagem ainda nao fornecida: mostra um marcador neutro no lugar.
      media.classList.add('is-empty');
      media.innerHTML = TOTEM_ICONS.image;
    });
    media.appendChild(img);

    const name = document.createElement('span');
    name.className = 'game-card__name';
    name.textContent = label;

    // "No" onde o fio se conecta (embaixo nos antigos, em cima nos modernos).
    const node = document.createElement('span');
    node.className = 'game-card__node';

    card.append(media, name, node);
    card.addEventListener('click', () => handleCardClick(pair.id, side, card));
    return card;
  }

  function updateProgress() {
    const el = document.getElementById('game-progress-count');
    if (el) el.textContent = `${matchedSoFar()}/${totalPairs()}`;
  }

  // Linha de mensagem do cabecalho: mostra a instrucao e, por alguns
  // segundos, a frase de apoio (acerto) ou o aviso de erro.
  function setMessage(text, kind) {
    const el = document.getElementById('game-message');
    if (!el) return;
    el.textContent = text;
    el.classList.remove('is-success', 'is-error');
    if (kind) el.classList.add(`is-${kind}`);
  }

  function showFeedback(text, success, durationMs) {
    clearTimeout(messageTimer);
    setMessage(text, success ? 'success' : 'error');
    messageTimer = setTimeout(() => setMessage(INSTRUCTION_TEXT, null), durationMs);
  }

  // ---- Fios (SVG). Guardados em state.wires e redesenhados se a janela
  // mudar de tamanho, para continuarem ligando os nos certos. ----

  function nodeCenter(card, fieldRect) {
    const r = card.querySelector('.game-card__node').getBoundingClientRect();
    return {
      x: r.left + r.width / 2 - fieldRect.left,
      y: r.top + r.height / 2 - fieldRect.top
    };
  }

  function wirePath(a, b) {
    const dy = b.y - a.y;
    return `M ${a.x} ${a.y} C ${a.x} ${a.y + dy * 0.55}, ${b.x} ${b.y - dy * 0.55}, ${b.x} ${b.y}`;
  }

  function drawWire(wire, animate) {
    const field = document.getElementById('game-field');
    const svg = document.getElementById('game-wires');
    if (!field || !svg) return;
    const fieldRect = field.getBoundingClientRect();
    const oldCard = field.querySelector(`.game-card--old[data-pair-id="${wire.pairId}"]`);
    const newCard = field.querySelector(`.game-card--new[data-pair-id="${wire.pairId}"]`);
    if (!oldCard || !newCard) return;

    const d = wirePath(nodeCenter(oldCard, fieldRect), nodeCenter(newCard, fieldRect));

    const halo = document.createElementNS(SVG_NS, 'path');
    halo.setAttribute('class', 'game-wire-halo');
    halo.setAttribute('d', d);

    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('class', `game-wire game-wire--${wire.color}`);
    path.setAttribute('d', d);
    path.setAttribute('pathLength', '1');
    if (animate) path.classList.add('is-drawing');

    svg.append(halo, path);
  }

  function redrawWires() {
    const svg = document.getElementById('game-wires');
    if (!svg) return;
    svg.innerHTML = '';
    state.wires.forEach((wire) => drawWire(wire, false));
  }

  window.addEventListener('resize', redrawWires);

  function handleCardClick(pairId, side, cardEl) {
    if (state.locked) return;

    if (side === 'old') {
      if (state.matchedIds.has(pairId)) return;
      state.selectedOldId = pairId;
      layout.querySelectorAll('.game-card--old').forEach((el) => {
        el.classList.toggle('is-selected', Number(el.dataset.pairId) === pairId);
      });
      layout.classList.add('has-selection');
      return;
    }

    // side === 'new'
    if (state.matchedIds.has(pairId)) return;
    if (state.selectedOldId === null) return;

    const oldCardEl = layout.querySelector(
      `.game-card--old[data-pair-id="${state.selectedOldId}"]`
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
    layout.classList.remove('has-selection');

    const color = (state.wires.length % WIRE_COLORS) + 1;
    const wire = { pairId, color };
    state.wires.push(wire);

    [oldCardEl, newCardEl].forEach((el) => {
      el.classList.remove('is-selected');
      el.classList.add('is-matched');
      el.dataset.color = String(color);
    });

    drawWire(wire, true);

    const pair = TRANSFORMATIONS_DATA.find((p) => p.id === pairId);
    showFeedback(pair.phrase, true, CORRECT_FEEDBACK_MS);
    updateProgress();

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
      layout.classList.remove('has-selection');
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

  startBtn.addEventListener('click', () => {
    resetGame();
  });

  // FINALIZAR: encerra a experiencia e volta para a tela de espera.
  finishBtn.addEventListener('click', () => {
    window.Totem.goHome();
  });

  // VOLTAR AO INICIO: volta para a tela inicial do jogo.
  homeBtn.addEventListener('click', () => {
    window.TransformationsGame.start();
  });

  window.TransformationsGame = {
    start() {
      window.Totem.showScreen('transformations-start');
    }
  };
})();
