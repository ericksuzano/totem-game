-- Esquema do banco de dados local (SQLite) do Totem de Votacao.
-- Sem dados de identificacao do eleitor (sem CPF, matricula, login, biometria).

CREATE TABLE IF NOT EXISTS votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  work_id TEXT NOT NULL,
  work_title TEXT NOT NULL,
  session_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
