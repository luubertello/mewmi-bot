const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits
} = require('discord.js');
const db = require('../database');
const { registrarPartida, registrarDuo, chequearYAnunciar, chequearHitosLobby } = require('./hitos');

const CANAL_JUGANDO_AHORA_ID = process.env.CANAL_JUGANDO_AHORA_ID || process.env.CANAL_PARTIDAS_ID || process.env.MATCH_CHANNEL_ID || '';
const LOBBY_TIMEOUT_MS = 2 * 60 * 60 * 1000;
const LOBBY_REMINDER_MS = 20 * 60 * 1000;

const JUEGOS = {
  valorant: { role: '1463688047097942056', emoji: '<:valorant:1476627453249065151>', color: '#ff4655' },
  lol: { role: '1463699691542675575', emoji: '<:lol:1476627472270491658>', color: '#c8aa6e' },
  fortnite: { role: '1463699786120171531', emoji: '<:fortnite:1476627435947556986>', color: '#00c8ff' },
};

function getMiembros(lobbyId) {
  return db.prepare(`
    SELECT user_id
    FROM lobby_miembros
    WHERE lobby_id = ?
    ORDER BY fecha_union ASC
  `).all(lobbyId);
}

function esEvento(lobby) {
  return lobby.tipo === 'evento';
}

function buildEmbed(lobby, hostUser, conteo) {
  const juego = JUEGOS[lobby.juego] || {};
  const evento = esEvento(lobby);
  const tipoLabel = evento
    ? `programado - ${lobby.fecha_evento}`
    : 'buscando ahora';
  const miembros = getMiembros(lobby.id);
  const miembrosList = miembros.map(r => `<@${r.user_id}>`).join(', ') || `<@${lobby.host_id}>`;
  const restantes = Math.max(lobby.max_jugadoras - conteo, 0);
  const estadoLabel = lobby.estado === 'cerrado'
    ? 'cerrado'
    : lobby.estado === 'lleno'
      ? 'completo'
      : restantes === 1
        ? 'falta 1'
        : `faltan ${restantes}`;

  return new EmbedBuilder()
    .setColor(juego.color || '#ffbfdc')
    .setAuthor({
      name: evento
        ? `${hostUser.username} armo evento de ${lobby.juego}`
        : `${hostUser.username} busca ${lobby.juego}`,
      iconURL: hostUser.displayAvatarURL()
    })
    .setTitle(evento ? 'partida programada' : 'buscando partida ahora')
    .setDescription(evento
      ? `Mewmi deja esto agendado para **${lobby.fecha_evento}**. Toca "me anoto" si queres reservar lugar.`
      : 'Toca "me uno" para sumarte. La creadora puede cerrarlo cuando ya no este buscando.')
    .addFields(
      { name: 'modo', value: lobby.modo || 'normal', inline: true },
      { name: 'rango', value: lobby.rango || 'cualquier rango', inline: true },
      { name: 'servidor', value: lobby.servidor || 'cualquiera', inline: true },
      { name: 'tipo', value: tipoLabel, inline: true },
      { name: evento ? 'anotadas' : 'jugadoras', value: `${conteo}/${lobby.max_jugadoras}`, inline: true },
      { name: 'estado', value: estadoLabel, inline: true },
      { name: evento ? 'lista' : 'en el lobby', value: miembrosList, inline: false }
    )
    .setFooter({ text: lobby.estado === 'abierto' ? (evento ? 'mewmi lo guarda para mas tarde' : 'mewmi party finder') : 'lobby cerrado' });
}

function buildButtons(lobby, disabled = false) {
  const evento = esEvento(lobby);
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`join_lobby_${lobby.id}`)
      .setLabel(disabled ? 'cerrado' : (evento ? 'me anoto' : 'me uno'))
      .setStyle(disabled ? ButtonStyle.Secondary : ButtonStyle.Primary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`leave_lobby_${lobby.id}`)
      .setLabel(evento ? 'desanotarme' : 'salir')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`close_lobby_${lobby.id}`)
      .setLabel(evento ? 'cancelar' : 'cerrar')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled)
  );
}

function crearLobby({ hostId, juego, rango, modo, servidor, tipo, fechaEvento, maxJugadoras }) {
  const result = db.prepare(`
    INSERT INTO lobbies (host_id, juego, rango, modo, servidor, tipo, fecha_evento, max_jugadoras, estado, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'abierto', ?)
  `).run(
    hostId,
    juego,
    rango || null,
    modo || 'normal',
    servidor || 'cualquiera',
    tipo || 'ya',
    fechaEvento || null,
    maxJugadoras || 2,
    new Date().toISOString()
  );

  const lobbyId = result.lastInsertRowid;
  db.prepare('INSERT OR IGNORE INTO lobby_miembros (lobby_id, user_id, fecha_union) VALUES (?, ?, ?)').run(lobbyId, hostId, new Date().toISOString());
  db.prepare('INSERT OR IGNORE INTO reputacion (user_id) VALUES (?)').run(hostId);
  db.prepare('UPDATE reputacion SET lobbies_abiertos = lobbies_abiertos + 1, ultima_actividad = ? WHERE user_id = ?').run(new Date().toISOString(), hostId);
  chequearHitosLobby(hostId, 1);

  return lobbyId;
}

async function postearLobby(client, lobbyId, channel = null) {
  const lobby = db.prepare('SELECT * FROM lobbies WHERE id = ?').get(lobbyId);
  if (!lobby) return null;

  const canal = channel || client.channels.cache.get(CANAL_JUGANDO_AHORA_ID);
  if (!canal) return null;

  const hostUser = await client.users.fetch(lobby.host_id).catch(() => null);
  if (!hostUser) return null;

  const juego = JUEGOS[lobby.juego];
  const roleMention = juego?.role ? `<@&${juego.role}>` : lobby.juego;
  const conteo = db.prepare('SELECT COUNT(*) as n FROM lobby_miembros WHERE lobby_id = ?').get(lobbyId).n;
  const msg = await canal.send({
    content: esEvento(lobby)
      ? `mewmi dejo una partida programada para **${lobby.juego}**`
      : `${roleMention} alguien busca partida ahora`,
    embeds: [buildEmbed(lobby, hostUser, conteo)],
    components: [buildButtons(lobby)],
    allowedMentions: !esEvento(lobby) && juego?.role ? { roles: [juego.role] } : undefined
  }).catch(() => null);

  if (!msg) return null;

  db.prepare('UPDATE lobbies SET canal_id = ?, mensaje_id = ? WHERE id = ?').run(canal.id, msg.id, lobbyId);

  if (lobby.tipo === 'ya') {
    setTimeout(() => cerrarPorTimeout(client, lobbyId), LOBBY_TIMEOUT_MS);
    setTimeout(() => recordarLobbySiEstaSolo(client, lobbyId), LOBBY_REMINDER_MS);
  }

  return msg;
}

async function recordarLobbySiEstaSolo(client, lobbyId) {
  const lobby = db.prepare('SELECT * FROM lobbies WHERE id = ?').get(lobbyId);
  if (!lobby || lobby.tipo !== 'ya' || lobby.estado !== 'abierto') return;

  const conteo = db.prepare('SELECT COUNT(*) as n FROM lobby_miembros WHERE lobby_id = ?').get(lobbyId).n;
  if (conteo !== 1) return;

  const canal = client.channels.cache.get(lobby.canal_id);
  if (!canal) return;

  const juego = JUEGOS[lobby.juego];
  await canal.send({
    content: `${juego?.role ? `<@&${juego.role}>` : ''}\n\nmrrp~ <@${lobby.host_id}> sigue buscando para **${lobby.juego}**. falta gente todavia, por si alguna estaba dudando.`,
    allowedMentions: juego?.role ? { roles: [juego.role], users: [lobby.host_id] } : { users: [lobby.host_id] }
  }).catch(() => null);
}

async function cerrarPorTimeout(client, lobbyId) {
  const lobby = db.prepare('SELECT * FROM lobbies WHERE id = ?').get(lobbyId);
  if (!lobby || lobby.estado !== 'abierto') return;

  db.prepare("UPDATE lobbies SET estado = 'cerrado' WHERE id = ?").run(lobbyId);
  await actualizarMensaje(client, lobbyId);
}

function lobbyYaExpiro(lobby) {
  if (lobby.tipo !== 'ya' || lobby.estado !== 'abierto' || !lobby.created_at) return false;
  const createdAt = new Date(lobby.created_at).getTime();
  if (Number.isNaN(createdAt)) return false;
  return Date.now() - createdAt >= LOBBY_TIMEOUT_MS;
}

async function cerrarLobbiesExpirados(client = null) {
  const expirados = db.prepare(`
    SELECT *
    FROM lobbies
    WHERE tipo = 'ya' AND estado = 'abierto'
  `).all().filter(lobbyYaExpiro);

  for (const lobby of expirados) {
    db.prepare("UPDATE lobbies SET estado = 'cerrado' WHERE id = ?").run(lobby.id);
    if (client) await actualizarMensaje(client, lobby.id);
  }

  return expirados.length;
}

async function actualizarMensaje(client, lobbyId) {
  const lobby = db.prepare('SELECT * FROM lobbies WHERE id = ?').get(lobbyId);
  if (!lobby?.mensaje_id || !lobby?.canal_id) return;

  const canal = client.channels.cache.get(lobby.canal_id);
  if (!canal) return;

  const msg = await canal.messages.fetch(lobby.mensaje_id).catch(() => null);
  if (!msg) return;

  const hostUser = await client.users.fetch(lobby.host_id).catch(() => null);
  if (!hostUser) return;

  const conteo = db.prepare('SELECT COUNT(*) as n FROM lobby_miembros WHERE lobby_id = ?').get(lobbyId).n;
  const cerrado = lobby.estado === 'cerrado' || lobby.estado === 'lleno';

  await msg.edit({
    embeds: [buildEmbed(lobby, hostUser, conteo)],
    components: cerrado ? [] : [buildButtons(lobby)]
  }).catch(() => null);
}

async function cerrarLobby(client, lobbyId, options = {}) {
  const registrar = options.registrar !== false;
  const motivo = options.motivo || 'lobby completo';
  const lobby = db.prepare('SELECT * FROM lobbies WHERE id = ?').get(lobbyId);
  if (!lobby || lobby.estado === 'cerrado') return;

  db.prepare("UPDATE lobbies SET estado = 'cerrado' WHERE id = ?").run(lobbyId);

  const miembros = getMiembros(lobbyId);
  const ids = miembros.map(m => m.user_id);

  if (registrar && ids.length > 1) {
    chequearHitosLobby(lobby.host_id, ids.length);

    for (const { user_id } of miembros) {
      registrarPartida(user_id, lobby.juego, lobby.modo, lobbyId);

      for (const partnerId of ids) {
        if (partnerId !== user_id) registrarDuo(user_id, partnerId, lobby.juego, null);
      }

      chequearYAnunciar(client, user_id).catch(() => {});
    }
  }

  const canal = client.channels.cache.get(lobby.canal_id);
  if (canal && ids.length > 1) {
    await canal.send({
      content: esEvento(lobby)
        ? `${ids.map(id => `<@${id}>`).join(' ')}\n\n${motivo}. queda agendado para **${lobby.fecha_evento}**`
        : `${ids.map(id => `<@${id}>`).join(' ')}\n\n${motivo}. entren al vc y a jugar`
    }).catch(() => null);
  }

  await actualizarMensaje(client, lobbyId);
}

async function handleJoinButton(interaction, client) {
  const lobbyId = parseInt(interaction.customId.replace('join_lobby_', ''), 10);
  if (Number.isNaN(lobbyId)) return;

  await interaction.deferReply({ flags: 64 });

  const perfil = db.prepare('SELECT * FROM perfiles WHERE user_id = ?').get(interaction.user.id);
  if (!perfil) {
    return interaction.editReply({ content: 'primero necesitas un perfil. usa /registrar' });
  }

  const lobby = db.prepare('SELECT * FROM lobbies WHERE id = ?').get(lobbyId);
  if (!lobby || lobby.estado !== 'abierto') {
    return interaction.editReply({ content: 'ese lobby ya no esta abierto' });
  }

  const yaEsta = db.prepare('SELECT 1 FROM lobby_miembros WHERE lobby_id = ? AND user_id = ?').get(lobbyId, interaction.user.id);
  if (yaEsta) {
    return interaction.editReply({ content: 'ya estas en ese lobby' });
  }

  const conteoActual = db.prepare('SELECT COUNT(*) as n FROM lobby_miembros WHERE lobby_id = ?').get(lobbyId).n;
  if (conteoActual >= lobby.max_jugadoras) {
    return interaction.editReply({ content: 'ese lobby ya esta lleno' });
  }

  db.prepare('INSERT INTO lobby_miembros (lobby_id, user_id, fecha_union) VALUES (?, ?, ?)').run(lobbyId, interaction.user.id, new Date().toISOString());
  db.prepare('INSERT OR IGNORE INTO reputacion (user_id) VALUES (?)').run(interaction.user.id);

  const nuevoConteo = conteoActual + 1;
  const lleno = nuevoConteo >= lobby.max_jugadoras;

  if (lleno) {
    db.prepare("UPDATE lobbies SET estado = 'lleno' WHERE id = ?").run(lobbyId);
  }

  const hostUser = await client.users.fetch(lobby.host_id).catch(() => null);
  if (hostUser && hostUser.id !== interaction.user.id) {
    const dm = await hostUser.createDM().catch(() => null);
    if (dm) {
      await dm.send({
        embeds: [new EmbedBuilder()
          .setColor('#ffbfdc')
          .setDescription(esEvento(lobby)
            ? `**${interaction.user.username}** se anoto a tu evento de ${lobby.juego}\n${lobby.fecha_evento} - ${nuevoConteo}/${lobby.max_jugadoras} anotadas`
            : `**${interaction.user.username}** se unio a tu lobby de ${lobby.juego}\n${nuevoConteo}/${lobby.max_jugadoras} jugadoras`)]
      }).catch(() => null);
    }
  }

  await interaction.editReply({
    content: esEvento(lobby)
      ? `listo, quedaste anotada para ${lobby.juego} - ${lobby.fecha_evento}`
      : `te uniste al lobby de ${lobby.juego}`
  });
  await actualizarMensaje(client, lobbyId);

  const canal = client.channels.cache.get(lobby.canal_id);
  if (canal && !lleno) {
    await canal.send({
      content: esEvento(lobby)
        ? `<@${lobby.host_id}> <@${interaction.user.id}>\n\nmrrp~ nueva anotada para **${lobby.juego}** el **${lobby.fecha_evento}** (${nuevoConteo}/${lobby.max_jugadoras})`
        : `<@${lobby.host_id}> <@${interaction.user.id}>\n\nalguien se sumo al lobby de **${lobby.juego}** (${nuevoConteo}/${lobby.max_jugadoras})`
    }).catch(() => null);
  }

  if (lleno) {
    await cerrarLobby(client, lobbyId, { motivo: esEvento(lobby) ? 'evento completo' : 'lobby completo' });
  }
}

async function handleLeaveButton(interaction, client) {
  const lobbyId = parseInt(interaction.customId.replace('leave_lobby_', ''), 10);
  if (Number.isNaN(lobbyId)) return;

  await interaction.deferReply({ flags: 64 });

  const lobby = db.prepare('SELECT * FROM lobbies WHERE id = ?').get(lobbyId);
  if (!lobby || lobby.estado !== 'abierto') {
    return interaction.editReply({ content: 'ese lobby ya no esta abierto' });
  }

  if (interaction.user.id === lobby.host_id) {
    return interaction.editReply({ content: esEvento(lobby) ? 'si creaste el evento, usa cancelar para bajarlo' : 'si sos la creadora, usa cerrar para bajar el lobby' });
  }

  const result = db.prepare('DELETE FROM lobby_miembros WHERE lobby_id = ? AND user_id = ?').run(lobbyId, interaction.user.id);
  if (!result.changes) {
    return interaction.editReply({ content: 'no estabas en ese lobby' });
  }

  await actualizarMensaje(client, lobbyId);
  return interaction.editReply({ content: esEvento(lobby) ? 'listo, te desanotaste del evento' : 'listo, saliste del lobby' });
}

async function handleCloseButton(interaction, client) {
  const lobbyId = parseInt(interaction.customId.replace('close_lobby_', ''), 10);
  if (Number.isNaN(lobbyId)) return;

  await interaction.deferReply({ flags: 64 });

  const lobby = db.prepare('SELECT * FROM lobbies WHERE id = ?').get(lobbyId);
  if (!lobby || lobby.estado === 'cerrado') {
    return interaction.editReply({ content: 'ese lobby ya estaba cerrado' });
  }

  const member = interaction.guild
    ? await interaction.guild.members.fetch(interaction.user.id).catch(() => interaction.member)
    : interaction.member;
  const puedeCerrar = interaction.user.id === lobby.host_id
    || member?.permissions?.has?.(PermissionFlagsBits.Administrator);

  if (!puedeCerrar) {
    return interaction.editReply({
      content: esEvento(lobby)
        ? 'solo quien creo el evento puede cancelarlo'
        : 'solo quien creo el lobby puede cerrarlo'
    });
  }

  const miembros = getMiembros(lobbyId);
  await cerrarLobby(client, lobbyId, {
    registrar: miembros.length > 1,
    motivo: esEvento(lobby) ? 'evento cancelado/cerrado' : 'lobby cerrado'
  });

  return interaction.editReply({ content: esEvento(lobby) ? 'evento cerrado' : 'lobby cerrado' });
}

function listarLobbiesAbiertos() {
  cerrarLobbiesExpirados().catch(() => {});
  return db.prepare(`
    SELECT l.*, COUNT(m.user_id) AS miembros
    FROM lobbies l
    LEFT JOIN lobby_miembros m ON m.lobby_id = l.id
    WHERE l.estado = 'abierto'
    GROUP BY l.id
    ORDER BY l.created_at DESC
    LIMIT 10
  `).all();
}

module.exports = {
  crearLobby,
  postearLobby,
  actualizarMensaje,
  cerrarLobby,
  handleJoinButton,
  handleLeaveButton,
  handleCloseButton,
  listarLobbiesAbiertos,
  cerrarLobbiesExpirados
};
