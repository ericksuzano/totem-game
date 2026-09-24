-- Esquema do banco de dados local (SQLite) do Totem de Votacao.
-- Sem dados de identificacao do eleitor (sem CPF, matricula, login, biometria).
-- Todas as tabelas usam IF NOT EXISTS: o esquema e aplicado a cada abertura
-- do app sem apagar nada que ja exista (bancos antigos ganham as tabelas novas).

CREATE TABLE IF NOT EXISTS votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  work_id TEXT NOT NULL,
  work_title TEXT NOT NULL,
  session_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Configuracoes persistentes do totem (chave/valor). Hoje guarda apenas a fase
-- da votacao ("voting_phase": pre | open | closed | results). Fica no banco,
-- e nao no app-config.json, porque e alterada pelo menu de manutencao durante
-- o evento e precisa sobreviver a reinicios do totem.
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Registro de auditoria das acoes de manutencao da votacao (troca de fase,
-- zeramento, emissao de relatorio). Nunca e apagado pelo app.
CREATE TABLE IF NOT EXISTS voting_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event TEXT NOT NULL,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
