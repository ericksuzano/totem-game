// Modulo de acesso ao banco de dados local (SQLite via sql.js - WASM, sem
// compilacao nativa). Roda apenas no processo principal (main). O renderer nunca
// acessa isto diretamente, apenas atraves das funcoes expostas via preload.js + IPC.
//
// sql.js mantem o banco em memoria; por isso persistimos em disco (fs.writeFileSync)
// apos cada escrita. Escolhido no lugar de better-sqlite3 por nao exigir Visual Studio
// Build Tools / node-gyp para compilar, o que tornaria o build fragil em outras maquinas.
//
// Desenhado como um "repositorio": no futuro, trocar estas funcoes por chamadas a uma
// API externa nao deve exigir mudancas em quem as consome (main.js / preload.js).

const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

let SQL = null;
let db = null;
let dbFilePath = null;

function resolveDbFilePath(app) {
  if (app.isPackaged) {
    return path.join(app.getPath('userData'), 'votes.sqlite');
  }
  return path.join(__dirname, 'votes.sqlite');
}

function persist() {
  const data = db.export();
  fs.writeFileSync(dbFilePath, Buffer.from(data));
}

async function init(app) {
  dbFilePath = resolveDbFilePath(app);

  SQL = await initSqlJs({
    locateFile: (file) => path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', file)
  });

  if (fs.existsSync(dbFilePath)) {
    db = new SQL.Database(fs.readFileSync(dbFilePath));
  } else {
    db = new SQL.Database();
  }

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  db.exec(schema);
  persist();
}

function queryAll(sql, params) {
  const stmt = db.prepare(sql);
  if (params) stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function registerVote(workId, workTitle, sessionId) {
  const stmt = db.prepare(
    'INSERT INTO votes (work_id, work_title, session_id) VALUES (?, ?, ?)'
  );
  stmt.run([workId, workTitle, sessionId || null]);
  stmt.free();
  persist();
}

function listVotes() {
  return queryAll(
    'SELECT id, work_id, work_title, session_id, created_at FROM votes ORDER BY id DESC'
  );
}

// Contagem de votos por trabalho (usada na zeresima e no resultado).
function countVotesByWork() {
  return queryAll(
    'SELECT work_id, MAX(work_title) AS work_title, COUNT(*) AS votes FROM votes GROUP BY work_id'
  );
}

function countVotes() {
  const [row] = queryAll('SELECT COUNT(*) AS total FROM votes');
  return row ? row.total : 0;
}

function getSetting(key, fallback) {
  const [row] = queryAll('SELECT value FROM settings WHERE key = ?', [key]);
  return row ? row.value : fallback;
}

function setSetting(key, value) {
  const stmt = db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  );
  stmt.run([key, String(value)]);
  stmt.free();
  persist();
}

function logEvent(event, details) {
  const stmt = db.prepare('INSERT INTO voting_log (event, details) VALUES (?, ?)');
  stmt.run([event, details ? JSON.stringify(details) : null]);
  stmt.free();
  persist();
}

// Zera os votos. Antes de apagar, salva uma copia completa do banco ao lado do
// arquivo principal (votes-backup-AAAAMMDD-HHMMSS.sqlite), para que nenhum voto
// seja perdido de forma irreversivel por um toque errado. Retorna quantos votos
// foram removidos e onde ficou o backup.
function resetVotes() {
  const removed = countVotes();
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  const backupPath = path.join(path.dirname(dbFilePath), `votes-backup-${stamp}.sqlite`);
  fs.writeFileSync(backupPath, Buffer.from(db.export()));

  db.run('DELETE FROM votes');
  persist();
  logEvent('reset', { removed, backup: path.basename(backupPath) });
  return { removed, backupPath };
}

module.exports = {
  init,
  registerVote,
  listVotes,
  countVotesByWork,
  countVotes,
  getSetting,
  setSetting,
  logEvent,
  resetVotes
};
