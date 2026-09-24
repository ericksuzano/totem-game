// Bootstrap comum aos 3 totens: le a configuracao (via IPC), identifica a
// experiencia deste totem (totemMode), monta a tela de espera, controla a
// troca de telas e o retorno automatico por inatividade. Nao existe menu de
// escolha: cada totem fisico abre direto a sua experiencia. A logica de cada
// experiencia fica em games/transformations.js, contest/contest.js e
// voting/voting.js (registradas em experiences.js).

(function () {
  const ATTRACT_SCREEN_ID = 'attract';

  const appEl = document.getElementById('app');
  const screens = Array.from(document.querySelectorAll('.screen'));
  const headerTitle = document.getElementById('totem-header-title');

  let config = null;
  let experience = null;
  let currentScreen = null;
  let idleTimer = null;

  function showScreen(screenId) {
    screens.forEach((el) => {
      const active = el.dataset.screen === screenId;
      el.classList.toggle('is-active', active);
      if (active) currentScreen = el;
    });
    // Estilo do cabecalho da tela: "minimal" (so o logo, na tela de espera),
    // "none" (carregando) ou barra fina (padrao das telas internas).
    appEl.dataset.chrome = (currentScreen && currentScreen.dataset.chrome) || 'bar';
    appEl.dataset.currentScreen = screenId;
    if (idleTimer) idleTimer.reset();
  }

  // ---- Inatividade: qualquer toque reinicia a contagem. O tempo depende da
  // tela atual: data-idle="none" (telas de espera, sem contagem),
  // data-idle="finished" (telas finais, tempo menor) ou padrao. ----
  function currentIdleTimeoutMs() {
    const kind = currentScreen ? currentScreen.dataset.idle : '';
    if (kind === 'none') return 0;
    if (kind === 'finished') return config.idleAfterFinishMs || config.idleTimeoutMs;
    return config.idleTimeoutMs;
  }

  function createIdleTimer(onIdle) {
    let timer = null;

    function reset() {
      clearTimeout(timer);
      const ms = currentIdleTimeoutMs();
      if (ms > 0) timer = setTimeout(onIdle, ms);
    }

    ['pointerdown', 'pointermove', 'keydown'].forEach((evt) => {
      document.addEventListener(evt, reset, { passive: true });
    });

    reset();
    return { reset };
  }

  // Volta para a tela de espera do totem (ou para a tela de fase da votacao,
  // quando a votacao nao esta aberta - ver voting/voting.js).
  async function goHome() {
    const module = experience.module();
    const home = module.getHomeScreen ? await module.getHomeScreen() : ATTRACT_SCREEN_ID;
    showScreen(home || ATTRACT_SCREEN_ID);
  }

  function setupAttract(texts) {
    document.getElementById('attract-cta').textContent = texts.cta;
    document.getElementById('attract-title').textContent = texts.title;
    document.getElementById('attract-subtitle').textContent = texts.subtitle;
    document.getElementById('attract-hint').textContent = texts.hint;

    // Qualquer toque na tela de espera inicia a experiencia deste totem.
    document.querySelector('.screen[data-screen="attract"]').addEventListener('click', () => {
      experience.module().start();
    });
  }

  function showConfigError(mode, validModes) {
    const shown = mode ? `"${mode}"` : '(vazio)';
    document.getElementById('config-error-text').textContent =
      `O valor ${shown} em "totemMode" não é válido. Use um destes: ` +
      `${validModes.map((m) => `"${m}"`).join(', ')} no arquivo app-config.json.`;
    showScreen('config-error');
  }

  async function bootstrap() {
    config = await window.totemAPI.getConfig();
    experience = TOTEM_EXPERIENCES[config.totemMode] || null;

    // Exposto para os modulos das experiencias chamarem showScreen/goHome
    // sem duplicar essa logica.
    window.Totem = {
      config,
      experience,
      showScreen,
      goHome
    };

    // O gesto de manutencao precisa funcionar ate na tela de erro de
    // configuracao, por isso o kiosk e iniciado antes de qualquer validacao.
    if (window.Kiosk) {
      window.Kiosk.init(config);
    }

    if (!experience) {
      showConfigError(config.totemMode, config.validTotemModes || Object.keys(TOTEM_EXPERIENCES));
      return;
    }

    appEl.dataset.totemMode = config.totemMode;
    headerTitle.textContent = experience.label;
    setupAttract(experience.attract);

    const module = experience.module();
    if (module.init) await module.init();

    idleTimer = createIdleTimer(() => goHome());
    await goHome();
  }

  bootstrap();
})();
