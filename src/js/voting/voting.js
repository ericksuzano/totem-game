// Logica do Totem de Votacao ("Vote no seu trabalho favorito"): trabalhos,
// selecao, confirmacao e registro do voto. Trabalhos vem de
// content/trabalhos/trabalhos.json (via js/works/works.js).
//
// Fases da votacao (guardadas no banco, alteradas so pelo menu de manutencao):
//   "pre"     -> zeresima: o totem mostra a contagem zerada, sem aceitar votos
//   "open"    -> votacao normal (padrao)
//   "closed"  -> votacao encerrada, sem exibir resultado
//   "results" -> o totem mostra o resultado
// QUANDO cada fase acontece e decisao do cliente (ver README) - o codigo
// apenas oferece os estados.

(function () {
  const REGISTERED_AUTO_RETURN_MS = 6000;
  // Tempo em que a obra tocada fica em destaque antes da confirmacao abrir.
  const CHOICE_FEEDBACK_MS = 450;
  // Ao abrir a confirmacao, os botoes ignoram toques por um instante: um
  // toque duplo na obra nao pode cair em "CONFIRMAR VOTO" sem querer.
  const CONFIRM_GUARD_MS = 800;

  const PHASE_LABELS = {
    pre: 'Zerésima (votação ainda não aberta)',
    open: 'Votação aberta',
    closed: 'Votação encerrada',
    results: 'Exibindo resultado'
  };

  const grid = document.getElementById('voting-grid');
  const confirmImage = document.getElementById('voting-confirm-image');
  const confirmTitle = document.getElementById('voting-confirm-title');
  const confirmAuthor = document.getElementById('voting-confirm-author');
  const confirmCategory = document.getElementById('voting-confirm-category');
  const backBtn = document.getElementById('btn-voting-back');
  const confirmBtn = document.getElementById('btn-voting-confirm');
  const doneWork = document.getElementById('voting-done-work');
  const doneScreen = document.querySelector('.screen[data-screen="voting-registered"]');

  let selectedWork = null;
  let autoReturnTimer = null;
  let submitting = false;
  // true entre o toque numa obra e a abertura da confirmacao (ignora outros).
  let choosing = false;
  let confirmReadyAt = 0;

  function clearChoice() {
    choosing = false;
    grid.classList.remove('has-choice');
    grid.querySelectorAll('.work-card.is-chosen').forEach((el) => el.classList.remove('is-chosen'));
  }

  function selectWork(work, card) {
    if (choosing) return;
    choosing = true;
    selectedWork = work;
    if (card) card.classList.add('is-chosen');
    grid.classList.add('has-choice');

    window.Works.renderFrame(confirmImage, work);
    confirmCategory.textContent = work.category || '';
    confirmCategory.hidden = !work.category;
    confirmTitle.textContent = work.title;
    confirmAuthor.textContent = work.author || '';

    setTimeout(() => {
      confirmReadyAt = performance.now() + CONFIRM_GUARD_MS;
      window.Totem.showScreen('voting-confirm');
    }, CHOICE_FEEDBACK_MS);
  }

  function confirmReady() {
    return performance.now() >= confirmReadyAt;
  }

  backBtn.addEventListener('click', () => {
    if (!confirmReady() || submitting) return;
    clearChoice();
    window.Totem.showScreen('voting-works');
  });

  confirmBtn.addEventListener('click', async () => {
    if (!selectedWork || submitting || !confirmReady()) return;
    submitting = true;
    try {
      const result = await window.totemAPI.registerVote(selectedWork.id, selectedWork.title);
      if (!result || !result.ok) {
        // A fase mudou (ex.: votacao encerrada pela manutencao): nao grava.
        selectedWork = null;
        await window.Totem.goHome();
        return;
      }
    } finally {
      submitting = false;
    }

    doneWork.textContent = `Seu voto em “${selectedWork.title}” foi computado.`;
    // Reinicia a barra do retorno automatico (animacao CSS com o mesmo tempo).
    doneScreen.style.setProperty('--return-ms', `${REGISTERED_AUTO_RETURN_MS}ms`);
    doneScreen.classList.remove('is-counting');
    void doneScreen.offsetWidth;
    doneScreen.classList.add('is-counting');
    window.Totem.showScreen('voting-registered');

    if (autoReturnTimer) clearTimeout(autoReturnTimer);
    autoReturnTimer = setTimeout(() => {
      selectedWork = null;
      window.Totem.goHome();
    }, REGISTERED_AUTO_RETURN_MS);
  });

  // ---- Relatorio (zeresima / resultado). Usado na tela publica e no menu
  // de manutencao. Monta a tabela com textContent (dados do cadastro). ----

  function formatDateTime(iso) {
    const d = new Date(iso);
    const date = d.toLocaleDateString('pt-BR');
    const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return `${date} às ${time}`;
  }

  function renderReport(container, report, { sortByVotes }) {
    container.innerHTML = '';
    const rows = report.rows.slice();
    if (sortByVotes) rows.sort((a, b) => b.votes - a.votes);

    rows.forEach((row) => {
      const pct = report.total > 0 ? Math.round((row.votes / report.total) * 100) : 0;
      const line = document.createElement('div');
      line.className = 'report__row';

      const info = document.createElement('div');
      info.className = 'report__info';
      const title = document.createElement('p');
      title.className = 'report__title';
      title.textContent = row.orphan ? `${row.title} (fora do cadastro atual)` : row.title;
      info.appendChild(title);
      if (row.author) {
        const author = document.createElement('p');
        author.className = 'report__author';
        author.textContent = row.author;
        info.appendChild(author);
      }
      const bar = document.createElement('div');
      bar.className = 'report__bar';
      const fill = document.createElement('span');
      fill.style.width = `${pct}%`;
      bar.appendChild(fill);
      info.appendChild(bar);

      const votes = document.createElement('p');
      votes.className = 'report__votes';
      votes.textContent = report.total > 0 ? `${row.votes} (${pct}%)` : String(row.votes);

      line.append(info, votes);
      container.appendChild(line);
    });

    const total = document.createElement('p');
    total.className = 'report__total';
    total.textContent = `Total de votos: ${report.total}`;
    container.appendChild(total);
  }

  function reportTitle(report) {
    if (report.phase === 'results') return 'Resultado da votação';
    return report.total === 0 ? 'Zerésima da votação' : 'Relatório de votos';
  }

  async function showPublicReport() {
    const report = await window.totemAPI.getPublicVotingReport();
    if (!report) return null;
    document.getElementById('voting-report-title').textContent = reportTitle(report);
    document.getElementById('voting-report-meta').textContent =
      report.phase === 'pre' && report.total === 0
        ? `Nenhum voto registrado. Emitida em ${formatDateTime(report.generatedAt)}.`
        : `Emitido em ${formatDateTime(report.generatedAt)}.`;
    renderReport(document.getElementById('voting-report-body'), report, {
      sortByVotes: report.phase === 'results'
    });
    return 'voting-report';
  }

  window.VotingApp = {
    PHASE_LABELS,
    renderReport,
    reportTitle,
    formatDateTime,

    async init() {
      await window.Works.load();
    },

    start() {
      selectedWork = null;
      clearChoice();
      window.Works.renderGrid(grid, { actionLabel: 'ESCOLHER', onSelect: selectWork });
      window.Totem.showScreen('voting-works');
    },

    // Tela de "espera" conforme a fase: votacao aberta -> tela de atracao;
    // demais fases -> zeresima, encerrada ou resultado.
    async getHomeScreen() {
      const { phase } = await window.totemAPI.getVotingState();
      if (phase === 'closed') return 'voting-closed';
      if (phase === 'pre' || phase === 'results') {
        return (await showPublicReport()) || 'attract';
      }
      return 'attract';
    }
  };
})();
