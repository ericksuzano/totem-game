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
  db.run(schema);
  persist();
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
  const result = db.exec(
    'SELECT id, work_id, work_title, session_id, created_at FROM votes ORDER BY id DESC'
  );
  if (result.length === 0) return [];

  const { columns, values } = result[0];
  return values.map((row) =>
    Object.fromEntries(row.map((value, i) => [columns[i], value]))
  );
}

module.exports = {
  init,
  registerVote,
  listVotes
};
