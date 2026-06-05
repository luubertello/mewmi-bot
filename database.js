const Database = require('better-sqlite3');
const db = new Database('mewmi.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS perfiles (
    user_id TEXT PRIMARY KEY,
    username TEXT,
    nick TEXT,
    pais TEXT,
    edad TEXT,
    horario TEXT,
    juegos TEXT,
    bio TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS juegos_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    juego TEXT,
    modo TEXT,
    rango TEXT,
    rol TEXT,
    servidor TEXT,
    FOREIGN KEY (user_id) REFERENCES perfiles(user_id)
  );

  CREATE TABLE IF NOT EXISTS coins (
    user_id TEXT PRIMARY KEY,
    balance INTEGER DEFAULT 0,
    total_earned INTEGER DEFAULT 0,
    last_daily TEXT
  );

  CREATE TABLE IF NOT EXISTS inventario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    item_id TEXT,
    item_type TEXT,
    equipped INTEGER DEFAULT 0,
    slot INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS mascotas (
    user_id TEXT PRIMARY KEY,
    item_id TEXT,
    nombre_custom TEXT,
    estado INTEGER DEFAULT 1,
    ultima_interaccion TEXT
  );

  CREATE TABLE IF NOT EXISTS hitos (
    user_id TEXT,
    hito_id TEXT,
    fecha TEXT,
    PRIMARY KEY (user_id, hito_id)
  );

  CREATE TABLE IF NOT EXISTS partidas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    juego TEXT,
    modo TEXT,
    mood TEXT,
    fecha TEXT,
    lobby_id INTEGER
  );

  CREATE TABLE IF NOT EXISTS duos_historial (
    user_id TEXT,
    partner_id TEXT,
    juego TEXT,
    fecha TEXT,
    partida_id INTEGER
  );

  CREATE TABLE IF NOT EXISTS lobbies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    host_id TEXT,
    juego TEXT,
    rango TEXT,
    modo TEXT,
    mood TEXT,
    servidor TEXT,
    tipo TEXT,
    fecha_evento TEXT,
    max_jugadoras INTEGER DEFAULT 5,
    estado TEXT DEFAULT 'abierto',
    canal_id TEXT,
    mensaje_id TEXT,
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS lobby_miembros (
    lobby_id INTEGER,
    user_id TEXT,
    fecha_union TEXT,
    PRIMARY KEY (lobby_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS reputacion (
    user_id TEXT PRIMARY KEY,
    lobbies_abiertos INTEGER DEFAULT 0,
    lobbies_abandonados INTEGER DEFAULT 0,
    lobbies_completados INTEGER DEFAULT 0,
    ratio_respuesta REAL DEFAULT 1.0,
    ultima_actividad TEXT
  );

  CREATE TABLE IF NOT EXISTS favoritas (
    user_id TEXT,
    favorita_id TEXT,
    PRIMARY KEY (user_id, favorita_id)
  );

  CREATE TABLE IF NOT EXISTS equipos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT,
    juego TEXT,
    lider_id TEXT,
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS equipo_miembros (
    equipo_id INTEGER,
    user_id TEXT,
    PRIMARY KEY (equipo_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS cumples (
    user_id TEXT PRIMARY KEY,
    dia INTEGER,
    mes INTEGER
  );

  CREATE TABLE IF NOT EXISTS desafios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    retador_id TEXT,
    retada_id TEXT,
    descripcion TEXT,
    estado TEXT DEFAULT 'pendiente',
    ganadora_id TEXT,
    fecha TEXT
  );

  CREATE TABLE IF NOT EXISTS recordatorios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    mensaje TEXT,
    fecha_aviso TEXT,
    enviado INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS propuestas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    texto TEXT,
    reacciones INTEGER DEFAULT 0,
    estado TEXT DEFAULT 'abierta',
    mensaje_id TEXT,
    fecha TEXT
  );

  CREATE TABLE IF NOT EXISTS temporadas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero INTEGER,
    fecha_inicio TEXT,
    fecha_fin TEXT,
    activa INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS cuentas_vinculadas (
    user_id TEXT PRIMARY KEY,
    riot_id TEXT,
    riot_puuid TEXT,
    epic_username TEXT
  );

  CREATE TABLE IF NOT EXISTS stats_cache (
    user_id TEXT,
    juego TEXT,
    datos TEXT,
    actualizado TEXT,
    PRIMARY KEY (user_id, juego)
  );
`);

// Migraciones para bases ya existentes
const migraciones = [
  `ALTER TABLE perfiles ADD COLUMN bio TEXT`,
  `ALTER TABLE perfiles ADD COLUMN horario TEXT`,
];
for (const m of migraciones) {
  try { db.exec(m); } catch {}
}

module.exports = db;