const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');
const { formatearHito } = require('../services/hitos');

function topJuego(userId) {
  return db.prepare(`
    SELECT juego, COUNT(*) AS total
    FROM partidas
    WHERE user_id = ?
    GROUP BY juego
    ORDER BY total DESC
    LIMIT 1
  `).get(userId);
}

function duoFavorito(userId) {
  return db.prepare(`
    SELECT partner_id, COUNT(*) AS total
    FROM duos_historial
    WHERE user_id = ?
    GROUP BY partner_id
    ORDER BY total DESC
    LIMIT 1
  `).get(userId);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('memoria')
    .setDescription('muestra tu historial simple de partidas y duos')
    .addUserOption(option =>
      option
        .setName('usuario')
        .setDescription('ver memoria de otra persona')
        .setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('usuario') || interaction.user;
    const perfil = db.prepare('SELECT * FROM perfiles WHERE user_id = ?').get(target.id);

    if (!perfil) {
      return interaction.reply({
        content: target.id === interaction.user.id
          ? 'todavia no tenes perfil. usa /registrar'
          : 'esa persona todavia no tiene perfil en Mewmi',
        flags: 64
      });
    }

    const partidas = db.prepare('SELECT COUNT(*) AS total FROM partidas WHERE user_id = ?').get(target.id).total;
    const lobbiesCreados = db.prepare('SELECT COUNT(*) AS total FROM lobbies WHERE host_id = ?').get(target.id).total;
    const lobbiesCompletados = db.prepare(`
      SELECT COUNT(*) AS total
      FROM lobbies
      WHERE host_id = ? AND estado = 'cerrado' AND id IN (
        SELECT lobby_id
        FROM lobby_miembros
        GROUP BY lobby_id
        HAVING COUNT(*) > 1
      )
    `).get(target.id).total;

    const juego = topJuego(target.id);
    const duo = duoFavorito(target.id);
    const hitos = db.prepare('SELECT hito_id FROM hitos WHERE user_id = ? ORDER BY fecha ASC LIMIT 8').all(target.id);

    const duoText = duo
      ? `<@${duo.partner_id}> (${duo.total} partidas juntas)`
      : 'todavia no hay duo favorito';

    const juegoText = juego
      ? `${juego.juego} (${juego.total})`
      : 'sin partidas registradas';

    const hitoText = hitos.length
      ? hitos.map(h => formatearHito(h.hito_id)).join('\n')
      : 'sin hitos todavia';

    const embed = new EmbedBuilder()
      .setColor('#ffbfdc')
      .setTitle(`memoria de ${perfil.nick || target.username}`)
      .setThumbnail(target.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'partidas jugadas', value: String(partidas), inline: true },
        { name: 'lobbies creados', value: String(lobbiesCreados), inline: true },
        { name: 'lobbies con gente', value: String(lobbiesCompletados), inline: true },
        { name: 'juego mas jugado', value: juegoText, inline: false },
        { name: 'duo fav', value: duoText, inline: false },
        { name: 'hitos', value: hitoText, inline: false }
      )
      .setFooter({ text: 'la memoria crece cuando los lobbies se cierran con al menos 2 personas' });

    return interaction.reply({ embeds: [embed] });
  }
};
