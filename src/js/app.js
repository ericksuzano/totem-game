// Bootstrap comum ao totem: le a configuracao (via IPC), mostra o menu de
// escolha entre as duas experiencias, controla a troca de telas e o retorno
// automatico por inatividade. A logica especifica de cada jogo fica em
// games/transformations.js e voting/voting.js.

(function () {
  const HOME_SCREEN_ID = 'menu';

  const screens = Array.from(document.querySelectorAll('.screen'));

  function showScreen(screenId) {
    screens.forEach((el) => {
      el.classList.toggle('is-active', el.dataset.screen === screenId);
    });
  }

  // ---- Timer de inatividade: qualquer toque reinicia a contagem; ao expirar,
  // volta para o menu principal. ----
  function createIdleTimer(timeoutMs, onIdle) {
    let timer = null;

    function reset() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(onIdle, timeoutMs);
    }

    ['pointerdown', 'pointermove', 'keydown'].forEach((evt) => {
      document.addEventListener(evt, reset, { passive: true });
    });

    reset();
    return { reset };
  }

  async function bootstrap() {
    const config = await window.totemAPI.getConfig();

    // Exposto para os modulos de jogo/votacao chamarem showScreen e goHome
    // sem duplicar essa logica.
    window.Totem = {
      config,
      showScreen,
      goHome: () => showScreen(HOME_SCREEN_ID)
    };

    createIdleTimer(config.idleTimeoutMs, () => window.Totem.goHome());

    if (window.Kiosk) {
      window.Kiosk.init(config);
    }

    showScreen(HOME_SCREEN_ID);

    document.getElementById('menu-choice-transformations').addEventListener('click', () => {
      showScreen('transformations-start');
    });
    document.getElementById('menu-choice-voting').addEventListener('click', () => {
      showScreen('voting-start');
    });

    document.getElementById('btn-transformations-start').addEventListener('click', () => {
      window.TransformationsGame.start();
    });
    document.getElementById('btn-voting-start').addEventListener('click', () => {
      window.VotingApp.start();
    });
  }

  bootstrap();
})();
