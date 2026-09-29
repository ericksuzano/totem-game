(function () {
  const REGISTERED_AUTO_RETURN_MS = 6000;
  const CHOICE_FEEDBACK_MS = 450;
  const CONFIRM_GUARD_MS = 800;

  const PHASE_LABELS = {
    pre: 'Zerésima (escolhas ainda não abertas)',
    open: 'Escolhas abertas',
    closed: 'Escolhas encerradas',
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
        selectedWork = null;
        await window.Totem.goHome();
        return;
      }
    } finally {
      submitting = false;
    }

    doneWork.textContent = `Você escolheu “${selectedWork.title}”.`;
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
      title.textContent = row.title;
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
    total.textContent = `Total de escolhas: ${report.total}`;
    container.appendChild(total);
  }

  function reportTitle(report) {
    if (report.phase === 'results') return 'Resultado';
    return report.total === 0 ? 'Zerésima' : 'Relatório de escolhas';
  }

  async function showPublicReport() {
    const report = await window.totemAPI.getPublicVotingReport();
    if (!report) return null;
    document.getElementById('voting-report-title').textContent = reportTitle(report);
    document.getElementById('voting-report-meta').textContent =
      report.phase === 'pre' && report.total === 0
        ? `Nenhuma escolha registrada. Emitida em ${formatDateTime(report.generatedAt)}.`
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
