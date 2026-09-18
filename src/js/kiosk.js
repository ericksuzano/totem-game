// Gesto oculto de saida do modo kiosk para manutencao (nao visivel ao publico).
// Um numero configuravel de toques no logo "FIPECq Previdência" da topbar,
// dentro de uma janela de tempo, abre um teclado numerico. O PIN correto
// fecha o aplicativo (o operador volta ao Windows e reabre o totem
// manualmente depois).

(function () {
  const AUTO_CLOSE_MS = 8000;

  const hitZone = document.getElementById('kiosk-exit-hitzone');
  const overlay = document.getElementById('kiosk-exit-overlay');
  const display = document.getElementById('kiosk-exit-display');
  const errorEl = document.getElementById('kiosk-exit-error');
  const keypad = document.getElementById('kiosk-exit-keypad');
  const backspaceBtn = document.getElementById('kiosk-exit-backspace');
  const cancelBtn = document.getElementById('kiosk-exit-cancel');

  let tapTimestamps = [];
  let entered = '';
  let expectedPin = '0000';
  let autoCloseTimer = null;

  function updateDisplay() {
    display.textContent = entered ? '•'.repeat(entered.length) : ' ';
  }

  function resetAutoClose() {
    clearTimeout(autoCloseTimer);
    autoCloseTimer = setTimeout(closeModal, AUTO_CLOSE_MS);
  }

  function openModal() {
    entered = '';
    errorEl.hidden = true;
    updateDisplay();
    overlay.hidden = false;
    resetAutoClose();
  }

  function closeModal() {
    overlay.hidden = true;
    clearTimeout(autoCloseTimer);
  }

  function pressDigit(digit) {
    if (entered.length >= expectedPin.length) return;
    entered += digit;
    updateDisplay();
    resetAutoClose();
    if (entered.length === expectedPin.length) {
      checkPin();
    }
  }

  function pressBackspace() {
    entered = entered.slice(0, -1);
    errorEl.hidden = true;
    updateDisplay();
    resetAutoClose();
  }

  async function checkPin() {
    const ok = await window.totemAPI.exitKiosk(entered);
    if (!ok) {
      errorEl.hidden = false;
      entered = '';
      updateDisplay();
      resetAutoClose();
    }
    // Se ok, o processo principal esta encerrando o aplicativo - nao ha mais
    // nada a fazer aqui.
  }

  keypad.querySelectorAll('[data-digit]').forEach((btn) => {
    btn.addEventListener('click', () => pressDigit(btn.dataset.digit));
  });
  backspaceBtn.addEventListener('click', pressBackspace);
  cancelBtn.addEventListener('click', closeModal);

  function init(config) {
    const kioskConfig = (config && config.kiosk) || {};
    if (kioskConfig.enabled === false) return;

    expectedPin = kioskConfig.exitPin || '0000';
    const gesture = kioskConfig.exitGesture || { taps: 5, windowMs: 3000 };

    hitZone.addEventListener('pointerdown', () => {
      const now = Date.now();
      tapTimestamps.push(now);
      tapTimestamps = tapTimestamps.filter((t) => now - t <= gesture.windowMs);
      if (tapTimestamps.length >= gesture.taps) {
        tapTimestamps = [];
        openModal();
      }
    });
  }

  window.Kiosk = { init };
})();
