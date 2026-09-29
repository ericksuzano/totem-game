(function () {
  const AUTO_CLOSE_MS = 8000;
  const MENU_AUTO_CLOSE_MS = 60000;

  const hitZone = document.getElementById('kiosk-exit-hitzone');
  const overlay = document.getElementById('kiosk-exit-overlay');
  const pinPanel = document.getElementById('kiosk-pin-panel');
  const display = document.getElementById('kiosk-exit-display');
  const errorEl = document.getElementById('kiosk-exit-error');
  const keypad = document.getElementById('kiosk-exit-keypad');
  const backspaceBtn = document.getElementById('kiosk-exit-backspace');
  const cancelBtn = document.getElementById('kiosk-exit-cancel');

  const menu = document.getElementById('maintenance-menu');
  const menuStatus = document.getElementById('maintenance-status');
  const menuReport = document.getElementById('maintenance-report');
  const menuMessage = document.getElementById('maintenance-message');
  const menuConfirm = document.getElementById('maintenance-confirm');

  let tapTimestamps = [];
  let entered = '';
  let expectedPin = '0000';
  let autoCloseTimer = null;
  let useMaintenanceMenu = false;
  let sessionPin = null;

  function updateDisplay() {
    display.textContent = entered ? '•'.repeat(entered.length) : ' ';
  }

  function resetAutoClose() {
    clearTimeout(autoCloseTimer);
    const ms = menu.hidden ? AUTO_CLOSE_MS : MENU_AUTO_CLOSE_MS;
    autoCloseTimer = setTimeout(closeModal, ms);
  }

  function openModal() {
    entered = '';
    errorEl.hidden = true;
    updateDisplay();
    pinPanel.hidden = false;
    menu.hidden = true;
    overlay.hidden = false;
    resetAutoClose();
  }

  function closeModal() {
    const wasMenuOpen = !menu.hidden;
    overlay.hidden = true;
    menu.hidden = true;
    pinPanel.hidden = false;
    sessionPin = null;
    clearTimeout(autoCloseTimer);
    if (wasMenuOpen && window.Totem) window.Totem.goHome();
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

  function showPinError() {
    errorEl.hidden = false;
    entered = '';
    updateDisplay();
    resetAutoClose();
  }

  async function checkPin() {
    if (useMaintenanceMenu) {
      const ok = await window.totemAPI.verifyMaintenancePin(entered);
      if (!ok) return showPinError();
      sessionPin = entered;
      openMenu();
      return;
    }

    const ok = await window.totemAPI.exitKiosk(entered);
    if (!ok) showPinError();
  }

  function setMenuMessage(text, isError) {
    menuMessage.textContent = text || '';
    menuMessage.classList.toggle('is-error', Boolean(isError));
  }

  async function refreshMenu() {
    const report = await window.totemAPI.maintenanceGetReport(sessionPin);
    if (!report) return closeModal();
    const voting = window.VotingApp;
    menuStatus.textContent = `Contagem atualizada em ${voting.formatDateTime(report.generatedAt)}`;
    voting.renderReport(menuReport, report, { sortByVotes: false });
  }

  function openMenu() {
    pinPanel.hidden = true;
    menu.hidden = false;
    menuConfirm.hidden = true;
    setMenuMessage('');
    resetAutoClose();
    refreshMenu();
  }

  document.getElementById('maintenance-refresh').addEventListener('click', () => {
    resetAutoClose();
    setMenuMessage('');
    refreshMenu();
  });

  const exportBtn = document.getElementById('maintenance-export');
  let exporting = false;

  exportBtn.addEventListener('click', async () => {
    if (exporting) return;
    exporting = true;
    exportBtn.disabled = true;
    setMenuMessage('');
    clearTimeout(autoCloseTimer);
    try {
      const result = await window.totemAPI.maintenanceExportVotes(sessionPin);
      if (result && result.ok) {
        setMenuMessage(`Votos exportados com sucesso. Arquivo salvo em: ${result.filePath}`);
      } else if (!result || !result.canceled) {
        setMenuMessage('Não foi possível exportar os votos. Tente novamente.', true);
      }
    } catch (err) {
      console.error('Falha ao exportar os votos.', err);
      setMenuMessage('Não foi possível exportar os votos. Tente novamente.', true);
    } finally {
      exporting = false;
      exportBtn.disabled = false;
      if (!menu.hidden) resetAutoClose();
    }
  });

  document.getElementById('maintenance-reset').addEventListener('click', () => {
    resetAutoClose();
    menuConfirm.hidden = false;
  });

  document.getElementById('maintenance-confirm-no').addEventListener('click', () => {
    resetAutoClose();
    menuConfirm.hidden = true;
  });

  document.getElementById('maintenance-confirm-yes').addEventListener('click', async () => {
    resetAutoClose();
    menuConfirm.hidden = true;
    const result = await window.totemAPI.maintenanceResetVotes(sessionPin);
    setMenuMessage(result
      ? `${result.removed} escolha(s) removida(s). Backup salvo: ${result.backupFile}`
      : 'Não foi possível zerar as escolhas.');
    refreshMenu();
  });

  document.getElementById('maintenance-exit').addEventListener('click', () => {
    window.totemAPI.exitKiosk(sessionPin);
  });

  document.getElementById('maintenance-close').addEventListener('click', closeModal);

  menu.addEventListener('pointerdown', resetAutoClose);

  keypad.querySelectorAll('[data-digit]').forEach((btn) => {
    btn.addEventListener('click', () => pressDigit(btn.dataset.digit));
  });
  backspaceBtn.addEventListener('click', pressBackspace);
  cancelBtn.addEventListener('click', closeModal);

  function init(config) {
    const kioskConfig = (config && config.kiosk) || {};
    if (kioskConfig.enabled === false) return;

    expectedPin = kioskConfig.exitPin || '0000';
    useMaintenanceMenu = config.totemMode === 'voting';
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
