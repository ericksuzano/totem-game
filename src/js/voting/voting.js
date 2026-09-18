// Logica do Totem de Votacao: trabalhos, selecao, confirmacao e registro do voto
// (usa VOTING_DATA e window.totemAPI.registerVote, implementado na Etapa 6).

(function () {
  const REGISTERED_AUTO_RETURN_MS = 6000;

  const grid = document.getElementById('voting-grid');
  const confirmImage = document.getElementById('voting-confirm-image');
  const confirmTitle = document.getElementById('voting-confirm-title');
  const backBtn = document.getElementById('btn-voting-back');
  const confirmBtn = document.getElementById('btn-voting-confirm');

  let selectedWork = null;
  let autoReturnTimer = null;

  function renderWorks() {
    grid.innerHTML = '';
    VOTING_DATA.forEach((work) => {
      grid.appendChild(createWorkCard(work));
    });
  }

  function createWorkCard(work) {
    const card = document.createElement('button');
    card.className = 'work-card';
    card.type = 'button';
    card.innerHTML = `
      <div class="work-card__image">
        <span class="work-card__image-fallback">Imagem do trabalho</span>
        <img src="${work.image}" alt="${work.title}" onerror="this.remove()">
      </div>
      <div class="work-card__body">
        <h2 class="work-card__title">${work.title}</h2>
        <p class="work-card__author">${work.author}</p>
        <p class="work-card__description">${work.description}</p>
        <span class="btn btn-gold work-card__choose">ESCOLHER ESTE</span>
      </div>
    `;
    card.addEventListener('click', () => selectWork(work));
    return card;
  }

  function selectWork(work) {
    selectedWork = work;

    confirmImage.innerHTML = `
      <span class="voting-confirm__image-fallback">Imagem do trabalho</span>
      <img src="${work.image}" alt="${work.title}" onerror="this.remove()">
    `;
    confirmTitle.textContent = work.title;

    window.Totem.showScreen('voting-confirm');
  }

  backBtn.addEventListener('click', () => {
    window.Totem.showScreen('voting-works');
  });

  confirmBtn.addEventListener('click', async () => {
    if (!selectedWork) return;
    await window.totemAPI.registerVote(selectedWork.id, selectedWork.title);

    window.Totem.showScreen('voting-registered');

    if (autoReturnTimer) clearTimeout(autoReturnTimer);
    autoReturnTimer = setTimeout(() => {
      selectedWork = null;
      window.Totem.goHome();
    }, REGISTERED_AUTO_RETURN_MS);
  });

  window.VotingApp = {
    start() {
      renderWorks();
      window.Totem.showScreen('voting-works');
    }
  };
})();
