const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const db = require('./database/db');

const isDev = process.argv.includes('--dev');
const forceKiosk = process.argv.includes('--kiosk');
const useKiosk = forceKiosk || app.isPackaged;

const sessionId = crypto.randomUUID();

const TOTEM_MODES = ['transformations', 'contest', 'voting'];

const VOTING_PHASES = ['pre', 'open', 'closed', 'results'];
const DEFAULT_VOTING_PHASE = 'open';

const MAX_WORKS = 4;
const WORK_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

const DEFAULT_CONFIG = {
  totemMode: 'transformations',
  idleTimeoutMs: 60000,
  idleAfterFinishMs: 20000,
  kiosk: {
    enabled: true,
    exitPin: '0000',
    exitGesture: { taps: 5, windowMs: 3000 }
  },
  development: false
};

function getConfigPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app-config.json');
  }
  return path.join(__dirname, 'config', 'app-config.json');
}

function getContentDir() {
  const portableDir = process.env.PORTABLE_EXECUTABLE_DIR;
  if (portableDir) {
    const besideExe = path.join(portableDir, 'content');
    if (fs.existsSync(path.join(besideExe, 'trabalhos', 'trabalhos.json'))) return besideExe;
  }
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'content');
  }
  return path.join(__dirname, 'content');
}

function getTotemModeFromArgs() {
  const arg = process.argv.find((a) => a.startsWith('--totem-mode='));
  return arg ? arg.slice('--totem-mode='.length).trim() : null;
}

function loadConfig() {
  let config;
  try {
    const raw = fs.readFileSync(getConfigPath(), 'utf-8');
    config = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch (err) {
    console.error('Falha ao ler app-config.json, usando configuracao padrao.', err);
    config = { ...DEFAULT_CONFIG };
  }

  const modeFromArgs = getTotemModeFromArgs();
  if (modeFromArgs) config.totemMode = modeFromArgs;
  config.validTotemModes = TOTEM_MODES;
  return config;
}

function findWorkImage(worksDir, work) {
  const candidates = [];
  if (work.image) candidates.push(work.image);
  WORK_IMAGE_EXTENSIONS.forEach((ext) => candidates.push(`${work.id}${ext}`));

  for (const name of candidates) {
    const filePath = path.join(worksDir, name);
    if (fs.existsSync(filePath)) return pathToFileURL(filePath).href;
  }
  return null;
}

function loadWorks() {
  const worksDir = path.join(getContentDir(), 'trabalhos');
  const warnings = [];
  let list = [];

  try {
    const raw = fs.readFileSync(path.join(worksDir, 'trabalhos.json'), 'utf-8');
    list = JSON.parse(raw).works || [];
  } catch (err) {
    console.error('Falha ao ler trabalhos.json.', err);
    warnings.push('Nao foi possivel ler content/trabalhos/trabalhos.json.');
  }

  if (list.length > MAX_WORKS) {
    warnings.push(`trabalhos.json tem ${list.length} trabalhos; so os ${MAX_WORKS} primeiros sao exibidos.`);
    list = list.slice(0, MAX_WORKS);
  }

  const works = list
    .filter((w) => w && w.id && w.title)
    .map((w) => ({
      id: String(w.id),
      title: String(w.title),
      author: w.author ? String(w.author) : '',
      category: w.category ? String(w.category) : '',
      description: w.description ? String(w.description) : '',
      imageUrl: findWorkImage(worksDir, w)
    }));

  return { works, warnings };
}

function getVotingPhase() {
  return DEFAULT_VOTING_PHASE;
}

function buildVotingReport() {
  const { works } = loadWorks();
  const countById = new Map(db.countVotesByWork().map((c) => [c.work_id, c.votes]));

  const rows = works.map((w) => ({
    id: w.id,
    title: w.title,
    author: w.author,
    category: w.category,
    votes: countById.get(w.id) || 0
  }));

  return {
    phase: getVotingPhase(),
    total: rows.reduce((sum, r) => sum + r.votes, 0),
    rows,
    generatedAt: new Date().toISOString()
  };
}

const pad2 = (n) => String(n).padStart(2, '0');

function formatExportDate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatExportDateTime(d) {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ` +
    `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function buildVotesExportText(report, exportedAt) {
  const strong = '='.repeat(40);
  const light = '-'.repeat(40);
  const lines = [
    'APROXIMA 2026 - APURAÇÃO DA VOTAÇÃO',
    'FIPECq Previdência',
    '',
    `Data da exportação: ${formatExportDateTime(exportedAt)}`,
    '',
    strong,
    'RESUMO DA VOTAÇÃO',
    strong,
    '',
    `TOTAL DE VOTOS: ${report.total}`,
    '',
    light,
    'OBRAS',
    light,
    ''
  ];

  report.rows.forEach((row, i) => {
    lines.push(`${i + 1}. ${row.title}`);
    lines.push(`   Artista: ${row.author || '-'}`);
    lines.push(`   Tipo: ${row.category || '-'}`);
    lines.push(`   Votos: ${row.votes}`);
    lines.push('');
  });

  lines.push(strong, 'FIM DA APURAÇÃO', strong, '');
  return '﻿' + lines.join('\r\n');
}

let nativeDialogOpen = false;

function isValidPin(pin) {
  const config = loadConfig();
  return Boolean(config.kiosk && pin && pin === config.kiosk.exitPin);
}

ipcMain.handle('get-config', () => loadConfig());

ipcMain.handle('get-works', () => loadWorks());

ipcMain.handle('get-voting-state', () => ({ phase: getVotingPhase() }));

ipcMain.handle('register-vote', (event, { workId, workTitle }) => {
  if (getVotingPhase() !== 'open') {
    return { ok: false, reason: 'voting-not-open' };
  }
  db.registerVote(workId, workTitle, sessionId);
  return { ok: true };
});

ipcMain.handle('get-public-voting-report', () => {
  const phase = getVotingPhase();
  if (phase !== 'pre' && phase !== 'results') return null;
  return buildVotingReport();
});

ipcMain.handle('verify-maintenance-pin', (event, pin) => isValidPin(pin));

ipcMain.handle('maintenance-get-report', (event, pin) => {
  if (!isValidPin(pin)) return null;
  const report = buildVotingReport();
  db.logEvent('report', { phase: report.phase, total: report.total });
  return report;
});

ipcMain.handle('maintenance-set-voting-phase', (event, { pin, phase }) => {
  if (!isValidPin(pin) || !VOTING_PHASES.includes(phase)) return false;
  const previous = getVotingPhase();
  db.setSetting('voting_phase', phase);
  db.logEvent('phase', { from: previous, to: phase, totalVotes: db.countVotes() });
  return true;
});

ipcMain.handle('maintenance-reset-votes', (event, pin) => {
  if (!isValidPin(pin)) return null;
  const { removed, backupPath } = db.resetVotes();
  return { removed, backupFile: path.basename(backupPath) };
});

ipcMain.handle('maintenance-export-votes', async (event, pin) => {
  if (!isValidPin(pin)) return { ok: false, error: true };

  const exportedAt = new Date();
  let content;
  try {
    content = buildVotesExportText(buildVotingReport(), exportedAt);
  } catch (err) {
    console.error('Falha ao montar a apuracao para exportar.', err);
    return { ok: false, error: true };
  }

  const win = BrowserWindow.fromWebContents(event.sender);
  const defaultName = `votos-aproxima-2026-${formatExportDate(exportedAt)}.txt`;
  let result;
  nativeDialogOpen = true;
  try {
    result = await dialog.showSaveDialog(win, {
      title: 'Exportar votos',
      defaultPath: path.join(app.getPath('desktop'), defaultName),
      buttonLabel: 'Salvar',
      filters: [{ name: 'Arquivo de texto', extensions: ['txt'] }]
    });
  } catch (err) {
    console.error('Falha ao abrir a janela de salvar arquivo.', err);
    return { ok: false, error: true };
  } finally {
    nativeDialogOpen = false;
    if (win && !win.isDestroyed()) win.focus();
  }

  if (result.canceled || !result.filePath) return { ok: false, canceled: true };

  try {
    fs.writeFileSync(result.filePath, content, 'utf-8');
    return { ok: true, filePath: result.filePath };
  } catch (err) {
    console.error('Falha ao salvar a apuracao em', result.filePath, err);
    return { ok: false, error: true };
  }
});

ipcMain.handle('exit-kiosk', (event, pin) => {
  if (isValidPin(pin)) {
    app.quit();
    return true;
  }
  return false;
});

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#F7EDDF',
    fullscreen: useKiosk,
    kiosk: useKiosk,
    frame: !useKiosk,
    alwaysOnTop: useKiosk,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (!isDev) {
    Menu.setApplicationMenu(null);
  }

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.webContents.setVisualZoomLevelLimits(1, 1);

  if (useKiosk) {
    mainWindow.on('blur', () => {
      if (!mainWindow.isDestroyed() && !nativeDialogOpen) mainWindow.focus();
    });
  }

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(async () => {
  await db.init(app);
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
