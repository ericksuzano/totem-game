// Totem do Concurso Cultural ("O que a FIPECq representa na sua trajetoria de
// vida"). Experiencia propria, SEM votacao: apresenta os trabalhos cadastrados
// em content/trabalhos/trabalhos.json (galeria + detalhe de cada trabalho).
//
// O formato final desta experiencia ainda depende do cliente (ver README,
// "Pendencias"). A estrutura ja esta pronta para receber: texto de
// apresentacao (experiences.js -> contest.introText) e as fotos dos trabalhos.

(function () {
  const grid = document.getElementById('contest-grid');
  const intro = document.getElementById('contest-intro');
  const detailImage = document.getElementById('contest-detail-image');
  const detailCategory = document.getElementById('contest-detail-category');
  const detailTitle = document.getElementById('contest-detail-title');
  const detailAuthor = document.getElementById('contest-detail-author');
  const detailDescription = document.getElementById('contest-detail-description');
  const backBtn = document.getElementById('btn-contest-back');

  function showDetail(work) {
    window.Works.renderFrame(detailImage, work);
    detailCategory.textContent = work.category;
    detailCategory.hidden = !work.category;
    detailTitle.textContent = work.title;
    detailAuthor.textContent = work.author;
    detailDescription.textContent = work.description;
    detailDescription.hidden = !work.description;
    window.Totem.showScreen('contest-detail');
  }

  backBtn.addEventListener('click', () => {
    window.Totem.showScreen('contest-gallery');
  });

  window.ContestApp = {
    async init() {
      const introText = (TOTEM_EXPERIENCES.contest.introText || '').trim();
      intro.textContent = introText;
      intro.hidden = !introText;

      await window.Works.load();
      window.Works.renderGrid(grid, { actionLabel: 'VER TRABALHO', onSelect: showDetail });
    },

    start() {
      window.Totem.showScreen('contest-gallery');
    }
  };
})();
