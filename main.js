const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const db = require('./database/db');

const isDev = process.argv.includes('--dev');
const forceKiosk = process.argv.includes('--kiosk');
// O executavel instalado (build final) sempre roda em kiosk. Rodando a partir
// do codigo-fonte (npm start / npm run dev), fica em janela para facilitar o
// desenvolvimento, a menos que --kiosk seja passado explicitamente para testar.
const useKiosk = forceKiosk || app.isPackaged;

// Identifica esta execucao do totem nos votos registrados (nao identifica o
// eleitor - ver database/schema.sql). Muda a cada abertura do aplicativo.
const sessionId = crypto.randomUUID();

// Cada totem fisico abre uma unica experiencia, sem menu de escolha.
const TOTEM_MODES = ['transformations', 'contest', 'voting'];

// Fases da votacao (ver README, secao "Zeresima e resultado"). A fase so muda
// pelo menu de manutencao (PIN); "open" e o padrao para que o totem funcione
// normalmente mesmo que ninguem configure nada.
const VOTING_PHASES = ['pre', 'open', 'closed', 'results'];
const DEFAULT_VOTING_PHASE = 'open';

// A grade de trabalhos foi desenhada para 2, 3 ou 4 trabalhos.
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
  // Em producao, o app-config.json fica fora do asar (extraResources), editavel
  // pelo operador do totem sem precisar reabrir o instalador.
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app-config.json');
  }
  return path.join(__dirname, 'config', 'app-config.json');
}

// Mesma ideia do app-config.json: o conteudo editavel (trabalhos e fotos) fica
// fora do asar para poder ser trocado no totem ja instalado.
function getContentDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'content');
  }
  return path.join(__dirname, 'content');
}

// --totem-mode=voting no atalho do Windows tem prioridade sobre o arquivo de
// configuracao (permite, por exemplo, testar os 3 modos na mesma maquina).
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

// Le content/trabalhos/trabalhos.json e resolve a foto de cada trabalho.
// Nunca lanca erro: problemas voltam em "warnings" para o renderer mostrar
// uma tela de configuracao, em vez de o totem travar.
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
  const phase = db.getSetting('voting_phase', DEFAULT_VOTING_PHASE);
  return VOTING_PHASES.includes(phase) ? phase : DEFAULT_VOTING_PHASE;
}

// Relatorio de votos (zeresima quando total = 0). Os trabalhos cadastrados
// aparecem sempre (mesmo com 0 votos); votos de ids que nao estao mais no
// cadastro tambem aparecem, para que nenhum voto fique oculto.
function buildVotingReport() {
  const { works } = loadWorks();
  const counts = db.countVotesByWork();
  const countById = new Map(counts.map((c) => [c.work_id, c]));

  const rows = works.map((w) => ({
    id: w.id,
    title: w.title,
    author: w.author,
    votes: countById.has(w.id) ? countById.get(w.id).votes : 0
  }));
  counts
    .filter((c) => !works.some((w) => w.id === c.work_id))
    .forEach((c) => rows.push({ id: c.work_id, title: c.work_title, author: '', votes: c.votes, orphan: true }));

  return {
    phase: getVotingPhase(),
    total: db.countVotes(),
    rows,
    generatedAt: new Date().toISOString()
  };
}

function isValidPin(pin) {
  const config = loadConfig();
  return Boolean(config.kiosk && pin && pin === config.kiosk.exitPin);
}

ipcMain.handle('get-config', () => loadConfig());

ipcMain.handle('get-works', () => loadWorks());

ipcMain.handle('get-voting-state', () => ({ phase: getVotingPhase() }));

ipcMain.handle('register-vote', (event, { workId, workTitle }) => {
  // Protecao no processo principal: fora da fase "open" nenhum voto e gravado,
  // mesmo que alguma tela antiga ainda esteja aberta no renderer.
  if (getVotingPhase() !== 'open') {
    return { ok: false, reason: 'voting-not-open' };
  }
  db.registerVote(workId, workTitle, sessionId);
  return { ok: true };
});

// Relatorio publico so quando a fase atual e de exibicao (zeresima ou
// resultado). Fora disso, apenas pelo menu de manutencao (com PIN).
ipcMain.handle('get-public-voting-report', () => {
  const phase = getVotingPhase();
  if (phase !== 'pre' && phase !== 'results') return null;
  return buildVotingReport();
});

// ---- Manutencao (todas as acoes exigem o PIN do kiosk) --------------------

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

// Saida de manutencao do modo kiosk: so funciona com o PIN configurado em
// config/app-config.json. Fecha o aplicativo inteiro (o operador volta ao
// Windows para fazer o que for preciso e reabre o totem manualmente depois).
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

  // Touchscreen: evita pinch-zoom e ctrl+scroll-zoom acidentais no totem.
  mainWindow.webContents.setVisualZoomLevelLimits(1, 1);

  if (useKiosk) {
    // Reconquista o foco se outra janela/notificacao do Windows tentar
    // aparecer por cima do totem durante o evento.
    mainWindow.on('blur', () => {
      if (!mainWindow.isDestroyed()) mainWindow.focus();
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
