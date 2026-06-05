const db = require('../database');

const HITOS = {
  primera_partida: { emoji: '🌱', nombre: 'primer respawn social' },
  partidas_5: { emoji: '🔥', nombre: 'ya sos habitué' },
  partidas_10: { emoji: '🎮', nombre: 'tocaste pasto virtual' },
  partidas_25: { emoji: '💫', nombre: 'main de Mewmi' },
  partidas_50: { emoji: '👑', nombre: 'leyenda del lobby' },
  primer_lobby: { emoji: '📣', nombre: 'rompiste el silencio' },
  lobbies_5: { emoji: '🧲', nombre: 'imán de partys' },
  lobbies_10: { emoji: '🏮', nombre: 'farolito del server' },
  lobby_lleno: { emoji: '✨', nombre: 'party completa' },
  duo_repetido_3: { emoji: '🤝', nombre: 'duo sospechosamente estable' },
  duo_repetido_10: { emoji: '💞', nombre: 'contrato no firmado' },
  '5am_queue': { emoji: '🌙', nombre: 'criatura de la madrugada' },
  valo_5: { emoji: '🎯', nombre: 'valorant era' },
  lol_5: { emoji: '🧙', nombre: 'grieta enjoyer' },
  fortnite_5: { emoji: '🚌', nombre: 'bajó del bus' }
};

function getHito(hitoId) {
  return HITOS[hitoId] || {
    emoji: '✦',
    nombre: String(hitoId || '').replace(/_/g, ' ')
  };
}

function formatearHito(hitoId) {
  const hito = getHito(hitoId);
  return `${hito.emoji} ${hito.nombre}`;
}

function darHito(userId, hitoId) {
  if (!userId || !hitoId) return false;

  const result = db.prepare(`
    INSERT OR IGNORE INTO hitos (user_id, hito_id, fecha)
    VALUES (?, ?, ?)
  `).run(userId, hitoId, new Date().toISOString());

  return result.changes > 0;
}

function contarPartidas(userId, juego = null) {
  if (juego) {
    return db.prepare('SELECT COUNT(*) AS total FROM partidas WHERE user_id = ? AND juego = ?').get(userId, juego).total;
  }

  return db.prepare('SELECT COUNT(*) AS total FROM partidas WHERE user_id = ?').get(userId).total;
}

function contarLobbiesCreados(userId) {
  return db.prepare('SELECT COUNT(*) AS total FROM lobbies WHERE host_id = ?').get(userId).total;
}

function contarDuo(userId, partnerId) {
  return db.prepare(`
    SELECT COUNT(*) AS total
    FROM duos_historial
    WHERE user_id = ? AND partner_id = ?
  `).get(userId, partnerId).total;
}

function registrarPartida(userId, juego, modo, lobbyId) {
  db.prepare(`
    INSERT INTO partidas (user_id, juego, modo, mood, fecha, lobby_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, juego || null, modo || null, null, new Date().toISOString(), lobbyId || null);

  darHito(userId, 'primera_partida');

  const total = contarPartidas(userId);
  if (total >= 5) darHito(userId, 'partidas_5');
  if (total >= 10) darHito(userId, 'partidas_10');
  if (total >= 25) darHito(userId, 'partidas_25');
  if (total >= 50) darHito(userId, 'partidas_50');

  const totalJuego = contarPartidas(userId, juego);
  if (juego === 'valorant' && totalJuego >= 5) darHito(userId, 'valo_5');
  if (juego === 'lol' && totalJuego >= 5) darHito(userId, 'lol_5');
  if (juego === 'fortnite' && totalJuego >= 5) darHito(userId, 'fortnite_5');
}

function registrarDuo(userId, partnerId, juego, partidaId) {
  db.prepare(`
    INSERT INTO duos_historial (user_id, partner_id, juego, fecha, partida_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, partnerId, juego || null, new Date().toISOString(), partidaId || null);

  const total = contarDuo(userId, partnerId);
  if (total >= 3) darHito(userId, 'duo_repetido_3');
  if (total >= 10) darHito(userId, 'duo_repetido_10');
}

async function chequearYAnunciar() {
  return null;
}

function chequearHitosLobby(hostId, miembrosCount = 1) {
  const creados = contarLobbiesCreados(hostId);
  if (creados >= 1) darHito(hostId, 'primer_lobby');
  if (creados >= 5) darHito(hostId, 'lobbies_5');
  if (creados >= 10) darHito(hostId, 'lobbies_10');
  if (miembrosCount > 1) darHito(hostId, 'lobby_lleno');
}

module.exports = {
  HITOS,
  getHito,
  formatearHito,
  darHito,
  registrarPartida,
  registrarDuo,
  chequearYAnunciar,
  chequearHitosLobby
};
