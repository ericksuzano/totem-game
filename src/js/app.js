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
    appEl.dataset.chrome = (currentScreen && currentScreen.dataset.chrome) || 'bar';
    appEl.dataset.currentScreen = screenId;
    if (idleTimer) idleTimer.reset();
  }

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

    window.Totem = {
      config,
      experience,
      showScreen,
      goHome
    };

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
