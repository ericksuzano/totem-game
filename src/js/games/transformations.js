// Logica do Jogo das Transformacoes.
//
// Regras:
// - 2 rodadas, usando pares de TRANSFORMATIONS_DATA (data/transformations-data.js).
// - Cada rodada mostra 3 objetos antigos e 3 modernos:
//     2 pares corretos (A e B, presentes nos dois lados)
//     1 distrator: um antigo sem par (C) e um moderno sem par (D),
//     de pares diferentes - qualquer ligacao com eles e incorreta.
// - Cada ligacao (antigo -> moderno) consome 1 tentativa; maximo 3 por rodada.
// - 2 acertos encerram a rodada com sucesso na hora (passa a proxima rodada
//   ou, na ultima, abre a tela de conclusao).
// - 3 tentativas com menos de 2 acertos: tela "Tente daqui a pouco." e volta
//   a tela de espera do totem.
// - As 2 rodadas usam 8 pares diferentes, sorteados a cada partida
//   (crypto.getRandomValues - ver utils/shuffle.js). Um historico recente em
//   localStorage impede que a proxima pessoa receba a mesma configuracao.
//
// Layout: antigos na fileira de cima, modernos na de baixo; cada cartao mostra
// [imagem] + [nome] juntos. Os fios dos pares acertados passam pelo espaco
// entre as fileiras e ficam visiveis ate o fim da rodada.

(function () {
  const TOTAL_ROUNDS = 2;
  const CORRECT_PAIRS_PER_ROUND = 2;
  // Pares consumidos por rodada: 2 corretos + 1 antigo sem par + 1 moderno sem par.
  const PAIRS_USED_PER_ROUND = CORRECT_PAIRS_PER_ROUND + 2;
  const ATTEMPTS_PER_ROUND = 3;
  const HITS_TO_ADVANCE = 2;

  const HISTORY_STORAGE_KEY = 'aproxima2026_transformations_game_history';
  const HISTORY_SIZE = 10;
  const MAX_GENERATION_TRIES = 50;

  const CORRECT_FEEDBACK_MS = 2600;
  const ERROR_FEEDBACK_MS = 1800;
  const HINT_FEEDBACK_MS = 2200;
  const ROUND_ADVANCE_DELAY_MS = 1600;
  const RETRY_RETURN_MS = 5000;
  // Cores de fio definidas em css/transformations.css (.game-wire--1 ... --4),
  // as 4 cores da identidade APROXIMA.
  const WIRE_COLORS = 4;

  const INSTRUCTION_TEXT =
    'Toque em objeto antigo e, em seguida toque no objeto moderno para formar o par correto.';

  const layout = document.getElementById('transformations-game-layout');
  const startBtn = document.getElementById('btn-transformations-start');
  const finishBtn = document.getElementById('btn-transformations-finish');

  const SVG_NS = 'http://www.w3.org/2000/svg';

  const state = {
    rounds: [],
    roundIndex: 0,
    hits: 0,
    attempts: 0,
    // Combinacoes erradas ja tentadas nesta rodada ("antigo-moderno"): repetir
    // a mesma nao consome outra tentativa.
    triedKeys: new Set(),
    // Fios desta rodada, na ordem dos acertos: { pairId, color }
    wires: [],
    selectedOldId: null,
    // true enquanto uma tentativa esta sendo processada ou a rodada acabou:
    // bloqueia toques repetidos/rapidos.
    locked: false
  };

  // Todos os temporizadores do jogo, para cancelar de uma vez ao reiniciar
  // (nenhum callback de uma partida antiga age sobre a nova).
  const timers = new Set();
  let messageTimer = null;

  function schedule(fn, ms) {
    const id = setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
  }

  function cancelTimers() {
    timers.forEach((id) => clearTimeout(id));
    timers.clear();
    clearTimeout(messageTimer);
  }

  // ---- Geracao da partida + historico anti-repeticao ----------------------

  function buildRound([pairA, pairB, oldOnly, newOnly]) {
    return {
      oldCards: shuffleArray([pairA, pairB, oldOnly]),
      newCards: shuffleArray([pairA, pairB, newOnly]),
      // Assinatura do conteudo da rodada (independe da ordem das cartas):
      // quais sao os 2 pares corretos e qual e o distrator de cada lado.
      signature:
        `c${[pairA.id, pairB.id].sort((a, b) => a - b).join('+')}` +
        `-o${oldOnly.id}-n${newOnly.id}`
    };
  }

  function buildGame() {
    const picked = shuffleArray(TRANSFORMATIONS_DATA).slice(0, TOTAL_ROUNDS * PAIRS_USED_PER_ROUND);
    const rounds = [];
    for (let i = 0; i < TOTAL_ROUNDS; i++) {
      rounds.push(buildRound(picked.slice(i * PAIRS_USED_PER_ROUND, (i + 1) * PAIRS_USED_PER_ROUND)));
    }
    return rounds;
  }

  // Historico: lista das ultimas partidas, cada uma com as assinaturas das
  // suas rodadas. localStorage pode falhar (armazenamento bloqueado) - nesse
  // caso o jogo segue so com a aleatoriedade.
  function readHistory() {
    try {
      const value = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY));
      return Array.isArray(value) ? value.filter(Array.isArray) : [];
    } catch (err) {
      return [];
    }
  }

  function saveToHistory(rounds) {
    try {
      const history = readHistory();
      history.unshift(rounds.map((r) => r.signature));
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, HISTORY_SIZE)));
    } catch (err) {
      // Sem armazenamento: nada a fazer.
    }
  }

  // Sorteia partidas ate encontrar uma em que NENHUMA rodada tenha aparecido
  // nas ultimas partidas (ha milhares de rodadas possiveis, entao isso
  // acontece quase sempre na primeira tentativa).
  function createGame() {
    const recent = new Set(readHistory().flat());
    let rounds = buildGame();
    for (let i = 1; i < MAX_GENERATION_TRIES && rounds.some((r) => recent.has(r.signature)); i++) {
      rounds = buildGame();
    }
    saveToHistory(rounds);
    return rounds;
  }

  // ---- Partida / rodada ----------------------------------------------------

  function resetGame() {
    cancelTimers();
    state.rounds = createGame();
    startRound(0);
  }

  function currentRound() {
    return state.rounds[state.roundIndex];
  }

  function startRound(index) {
    state.roundIndex = index;
    state.hits = 0;
    state.attempts = 0;
    state.triedKeys = new Set();
    state.wires = [];
    state.selectedOldId = null;
    state.locked = false;

    renderRound();
    window.Totem.showScreen('transformations-game');
  }

  function renderRound() {
    clearTimeout(messageTimer);
    const round = currentRound();

    layout.innerHTML = `
      <div class="game-head">
        <div class="game-head__text">
          <p class="eyebrow">Jogo das Transformações · Rodada ${state.roundIndex + 1} de ${TOTAL_ROUNDS}</p>
          <h1 class="game-head__title">Relacione os objetos antigos com os objetos modernos</h1>
          <p class="game-message" id="game-message"></p>
        </div>
        <div class="game-stats">
          <div class="game-stat">
            <span class="game-stat__label">Acertos</span>
            <span class="game-stat__value" id="game-hits"></span>
          </div>
          <div class="game-stat">
            <span class="game-stat__label">Tentativas</span>
            <span class="game-stat__value" id="game-attempts"></span>
            <span class="game-stat__dots" id="game-attempt-dots" aria-hidden="true"></span>
          </div>
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
    round.oldCards.forEach((pair) => oldRow.appendChild(createCard(pair, 'old')));
    round.newCards.forEach((pair) => newRow.appendChild(createCard(pair, 'new')));

    const dots = document.getElementById('game-attempt-dots');
    for (let i = 0; i < ATTEMPTS_PER_ROUND; i++) {
      dots.appendChild(document.createElement('span'));
    }

    setMessage(INSTRUCTION_TEXT, null);
    updateStats();
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
      // Imagem ausente: mostra um marcador neutro no lugar.
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
    // So "click": no touch o navegador gera um unico click por toque (sem
    // pointerdown paralelo que pudesse duplicar a tentativa).
    card.addEventListener('click', () => handleCardClick(pair.id, side, card));
    return card;
  }

  function updateStats() {
    document.getElementById('game-hits').textContent = `${state.hits}/${HITS_TO_ADVANCE}`;
    document.getElementById('game-attempts').textContent = `${state.attempts}/${ATTEMPTS_PER_ROUND}`;
    document.querySelectorAll('#game-attempt-dots span').forEach((dot, i) => {
      dot.classList.toggle('is-used', i < state.attempts);
    });
  }

  // Linha de mensagem do cabecalho: mostra a instrucao e, por alguns
  // segundos, a frase de apoio (acerto), o aviso de erro ou uma dica.
  function setMessage(text, kind) {
    const el = document.getElementById('game-message');
    if (!el) return;
    el.textContent = text;
    el.classList.remove('is-success', 'is-error', 'is-hint');
    if (kind) el.classList.add(`is-${kind}`);
  }

  function showFeedback(text, kind, durationMs) {
    clearTimeout(messageTimer);
    setMessage(text, kind);
    messageTimer = setTimeout(() => setMessage(INSTRUCTION_TEXT, null), durationMs);
  }

  // ---- Fios (SVG). Os corretos ficam em state.wires e sao redesenhados se a
  // janela mudar de tamanho; o de erro aparece so durante o aviso. ----

  function nodeCenter(card, fieldRect) {
    const r = card.querySelector('.game-card__node').getBoundingClientRect();
    return {
      x: r.left + r.width / 2 - fieldRect.left,
      y: r.top + r.height / 2 - fieldRect.top
    };
  }

  function drawWire(oldCard, newCard, className, animate) {
    const field = document.getElementById('game-field');
    const svg = document.getElementById('game-wires');
    if (!field || !svg || !oldCard || !newCard) return [];
    const fieldRect = field.getBoundingClientRect();
    const a = nodeCenter(oldCard, fieldRect);
    const b = nodeCenter(newCard, fieldRect);
    const dy = b.y - a.y;
    const d = `M ${a.x} ${a.y} C ${a.x} ${a.y + dy * 0.55}, ${b.x} ${b.y - dy * 0.55}, ${b.x} ${b.y}`;

    const halo = document.createElementNS(SVG_NS, 'path');
    halo.setAttribute('class', 'game-wire-halo');
    halo.setAttribute('d', d);

    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('class', `game-wire ${className}`);
    path.setAttribute('d', d);
    path.setAttribute('pathLength', '1');
    if (animate) path.classList.add('is-drawing');

    svg.append(halo, path);
    return [halo, path];
  }

  function cardFor(side, pairId) {
    return layout.querySelector(`.game-card--${side}[data-pair-id="${pairId}"]`);
  }

  function redrawWires() {
    const svg = document.getElementById('game-wires');
    if (!svg) return;
    svg.innerHTML = '';
    state.wires.forEach((wire) => {
      drawWire(cardFor('old', wire.pairId), cardFor('new', wire.pairId), `game-wire--${wire.color}`, false);
    });
  }

  window.addEventListener('resize', redrawWires);

  // ---- Interacao -----------------------------------------------------------

  function clearSelection() {
    state.selectedOldId = null;
    layout.querySelectorAll('.game-card--old.is-selected').forEach((el) => el.classList.remove('is-selected'));
    layout.classList.remove('has-selection');
  }

  function handleCardClick(pairId, side, cardEl) {
    if (state.locked || cardEl.classList.contains('is-matched')) return;

    if (side === 'old') {
      state.selectedOldId = pairId;
      layout.querySelectorAll('.game-card--old').forEach((el) => {
        el.classList.toggle('is-selected', el === cardEl);
      });
      layout.classList.add('has-selection');
      return;
    }

    // side === 'new'
    if (state.selectedOldId === null) {
      showFeedback('Toque primeiro em um objeto antigo.', 'hint', HINT_FEEDBACK_MS);
      return;
    }

    const oldId = state.selectedOldId;
    const oldCardEl = cardFor('old', oldId);
    const key = `${oldId}-${pairId}`;

    if (state.triedKeys.has(key)) {
      showFeedback('Essa combinação já foi tentada. Escolha outra.', 'hint', HINT_FEEDBACK_MS);
      clearSelection();
      return;
    }

    // A partir daqui a tentativa conta: trava antes de qualquer outra coisa
    // para que toques rapidos nao registrem a mesma tentativa duas vezes.
    state.locked = true;
    state.triedKeys.add(key);
    state.attempts += 1;

    if (oldId === pairId) {
      handleCorrectMatch(pairId, oldCardEl, cardEl);
    } else {
      handleIncorrectMatch(oldCardEl, cardEl);
    }
  }

  function handleCorrectMatch(pairId, oldCardEl, newCardEl) {
    state.hits += 1;
    clearSelection();

    const color = ((state.roundIndex * CORRECT_PAIRS_PER_ROUND + state.hits - 1) % WIRE_COLORS) + 1;
    state.wires.push({ pairId, color });

    [oldCardEl, newCardEl].forEach((el) => {
      el.classList.add('is-matched');
      el.dataset.color = String(color);
    });

    drawWire(oldCardEl, newCardEl, `game-wire--${color}`, true);

    const pair = TRANSFORMATIONS_DATA.find((p) => p.id === pairId);
    showFeedback(pair.phrase, 'success', CORRECT_FEEDBACK_MS);
    updateStats();

    if (state.hits >= HITS_TO_ADVANCE) {
      schedule(finishRoundWithSuccess, ROUND_ADVANCE_DELAY_MS);
    } else {
      schedule(continueOrFail, ROUND_ADVANCE_DELAY_MS);
    }
  }

  function handleIncorrectMatch(oldCardEl, newCardEl) {
    showFeedback('Ops, essa combinação não corresponde.', 'error', ERROR_FEEDBACK_MS);
    updateStats();

    [oldCardEl, newCardEl].forEach((el) => el.classList.add('is-error'));
    const errorWire = drawWire(oldCardEl, newCardEl, 'game-wire--error', true);

    schedule(() => {
      errorWire.forEach((el) => el.remove());
      [oldCardEl, newCardEl].forEach((el) => el.classList.remove('is-error'));
      clearSelection();
      continueOrFail();
    }, ERROR_FEEDBACK_MS);
  }

  // Depois de uma tentativa que nao completou a rodada: libera o proximo toque
  // ou, se as tentativas acabaram, encerra a partida.
  function continueOrFail() {
    if (state.attempts >= ATTEMPTS_PER_ROUND) {
      failGame();
      return;
    }
    state.locked = false;
  }

  function finishRoundWithSuccess() {
    const nextIndex = state.roundIndex + 1;
    if (nextIndex < TOTAL_ROUNDS) {
      startRound(nextIndex);
    } else {
      window.Totem.showScreen('transformations-complete');
    }
  }

  // 3 tentativas sem 2 acertos: "Tente daqui a pouco." e volta a tela de
  // espera, liberando o totem para a proxima pessoa.
  function failGame() {
    window.Totem.showScreen('transformations-retry');
    schedule(() => window.Totem.goHome(), RETRY_RETURN_MS);
  }

  startBtn.addEventListener('click', () => {
    resetGame();
  });

  // FINALIZAR (unico botao da tela de conclusao): encerra a experiencia e
  // volta para a tela de espera do totem.
  finishBtn.addEventListener('click', () => {
    window.Totem.goHome();
  });

  window.TransformationsGame = {
    start() {
      cancelTimers();
      window.Totem.showScreen('transformations-start');
    }
  };
})();
