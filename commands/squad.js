const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder
} = require('discord.js');
const db = require('../database');
const { detalleCompatibilidad, safeParseArray } = require('../services/compatibilidad');

const MATCH_CHANNEL_ID = process.env.CANAL_PARTIDAS_ID || process.env.MATCH_CHANNEL_ID || '';

async function elegirJuego(interaction, userId, juegos) {
  await interaction.reply({
    content: 'mrrp~ ¿para qué juego armamos party?',
    components: [new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('squad_juego')
        .setPlaceholder('elegi un juego')
        .addOptions(juegos.map(j => ({ label: j, value: j })))
    )],
    flags: 64
  });

  const resp = await interaction.channel.awaitMessageComponent({
    filter: i => i.user.id === userId && i.customId === 'squad_juego',
    time: 60000
  }).catch(() => null);

  if (!resp) return null;
  await resp.deferUpdate();
  return resp.values[0];
}

function configJuego(userId, juego) {
  return db.prepare('SELECT * FROM juegos_config WHERE user_id = ? AND juego = ?').get(userId, juego);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('squad')
    .setDescription('mewmi sugiere una party compatible'),

  async execute(interaction) {
    const userId = interaction.user.id;
    const perfil = db.prepare('SELECT * FROM perfiles WHERE user_id = ?').get(userId);
    if (!perfil) {
      return interaction.reply({ content: 'mrrp~ primero necesitas un perfil. usa `/registrar`', flags: 64 });
    }

    const juegos = safeParseArray(perfil.juegos);
    if (!juegos.length) {
      return interaction.reply({ content: 'paw... no tenes juegos registrados. usa `/editar`', flags: 64 });
    }

    const juego = await elegirJuego(interaction, userId, juegos);
    if (!juego) {
      return interaction.editReply({ content: 'mewmi se durmio esperando... intenta de nuevo', components: [] });
    }

    const maxEquipo = juego === 'fortnite' ? 4 : 5;
    const tipoLabel = juego === 'fortnite' ? 'squad' : 'party';
    const equipo = [{ ...perfil, compat: { score: 100, razones: ['host'] } }];
    const usadas = new Set([userId]);
    const rolesEquipo = safeParseArray(configJuego(userId, juego)?.rol);
    const todas = db.prepare('SELECT * FROM perfiles WHERE user_id != ?').all(userId);

    while (equipo.length < maxEquipo) {
      const candidatas = todas
        .filter(c => !usadas.has(c.user_id))
        .map(c => ({ ...c, compat: detalleCompatibilidad(perfil, c, juego, rolesEquipo) }))
        .filter(c => c.compat.score > 0)
        .sort((a, b) => b.compat.score - a.compat.score);

      if (!candidatas.length) break;

      const elegida = candidatas[0];
      equipo.push(elegida);
      usadas.add(elegida.user_id);
      rolesEquipo.push(...safeParseArray(configJuego(elegida.user_id, juego)?.rol));
    }

    if (equipo.length < 2) {
      return interaction.editReply({
        content: `paw... no encontre gente compatible para **${juego}** ahora.\nproba con \`/buscar\` y dejamos el lobby abierto.`,
        components: []
      });
    }

    const users = await Promise.all(equipo.map(e => interaction.client.users.fetch(e.user_id).catch(() => null)));
    const fields = equipo.map((persona, index) => {
      const user = users[index];
      const cfg = configJuego(persona.user_id, juego);
      const detalles = [
        `score: ${persona.compat.score}%`,
        `roles: ${safeParseArray(cfg?.rol).join(', ') || 'sin rol'}`,
        `rango: ${cfg?.rango || 'sin rango'}`
      ].join(' · ');

      return {
        name: index === 0 ? `${index + 1}. ${persona.nick || user?.username || 'host'} · host` : `${index + 1}. ${persona.nick || user?.username || 'jugadora'}`,
        value: `${user ? `${user}` : `<@${persona.user_id}>`}\n${detalles}`,
        inline: false
      };
    });

    const embed = new EmbedBuilder()
      .setColor('#cabdff')
      .setTitle(`✦ ${tipoLabel} sugerida para ${juego}`)
      .setDescription(`mewmi junto **${equipo.length}/${maxEquipo}** perfiles compatibles.\n\nNo obliga a nadie: es una sugerencia para romper el hielo.`)
      .addFields(fields)
      .setFooter({ text: 'si quieren abrir cupos reales, /buscar arma el lobby' });

    const payload = {
      content: `${users.filter(Boolean).map(u => `${u}`).join(' ')}\n\nmewmi encontro una ${tipoLabel} posible para **${juego}**`,
      embeds: [embed]
    };

    const matchChannel = MATCH_CHANNEL_ID
      ? interaction.guild?.channels.cache.get(MATCH_CHANNEL_ID)
      : null;

    if (matchChannel) {
      await matchChannel.send(payload).catch(() => null);
      await interaction.editReply({ content: `listo, mewmi tiro una ${tipoLabel} sugerida al canal de partidas`, components: [] });
    } else {
      await interaction.editReply({ content: '', embeds: [embed], components: [] });
    }
  }
};
