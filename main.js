const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
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

const DEFAULT_CONFIG = {
  idleTimeoutMs: 60000,
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

function loadConfig() {
  try {
    const raw = fs.readFileSync(getConfigPath(), 'utf-8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch (err) {
    console.error('Falha ao ler app-config.json, usando configuracao padrao.', err);
    return DEFAULT_CONFIG;
  }
}

ipcMain.handle('get-config', () => loadConfig());

ipcMain.handle('register-vote', (event, { workId, workTitle }) => {
  db.registerVote(workId, workTitle, sessionId);
});

// Saida de manutencao do modo kiosk: so funciona com o PIN configurado em
// config/app-config.json. Fecha o aplicativo inteiro (o operador volta ao
// Windows para fazer o que for preciso e reabre o totem manualmente depois).
ipcMain.handle('exit-kiosk', (event, pin) => {
  const config = loadConfig();
  if (config.kiosk && pin && pin === config.kiosk.exitPin) {
    app.quit();
    return true;
  }
  return false;
});

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#12213D',
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
