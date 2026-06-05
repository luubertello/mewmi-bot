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
    content: 'mrrp~ ¿para qué juego buscamos duo?',
    components: [new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('duo_juego')
        .setPlaceholder('elegi un juego')
        .addOptions(juegos.map(j => ({ label: j, value: j })))
    )],
    flags: 64
  });

  const resp = await interaction.channel.awaitMessageComponent({
    filter: i => i.user.id === userId && i.customId === 'duo_juego',
    time: 60000
  }).catch(() => null);

  if (!resp) return null;
  await resp.deferUpdate();
  return resp.values[0];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('duo')
    .setDescription('mewmi busca tus mejores duos compatibles'),

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

    const candidatas = db.prepare('SELECT * FROM perfiles WHERE user_id != ?').all(userId)
      .map(candidata => ({
        ...candidata,
        compat: detalleCompatibilidad(perfil, candidata, juego, [])
      }))
      .filter(c => c.compat.score > 0)
      .sort((a, b) => b.compat.score - a.compat.score)
      .slice(0, 3);

    if (!candidatas.length) {
      return interaction.editReply({
        content: `paw... no encontre duos compatibles para **${juego}** ahora.\nusa \`/buscar\` y mewmi lo convierte en lobby.`,
        components: []
      });
    }

    const users = await Promise.all(candidatas.map(c => interaction.client.users.fetch(c.user_id).catch(() => null)));
    const fields = candidatas.map((c, index) => {
      const user = users[index];
      const razones = c.compat.razones.slice(0, 3).join(' · ') || 'compatibilidad general';
      return {
        name: `${index + 1}. ${c.nick || user?.username || 'jugadora'} · ${c.compat.score}%`,
        value: `${user ? `${user}` : `<@${c.user_id}>`}\n${razones}`,
        inline: false
      };
    });

    const mejor = users[0] ? `${users[0]}` : `<@${candidatas[0].user_id}>`;
    const embed = new EmbedBuilder()
      .setColor('#ff87bc')
      .setTitle(`✦ duos para ${juego}`)
      .setDescription(`mewmi encontro opciones con buena pinta para ${interaction.user}.\n\nmejor match: ${mejor}`)
      .addFields(fields)
      .setFooter({ text: 'si pinta jugar ya, /buscar arma el lobby en dos clicks' });

    const payload = {
      content: `${interaction.user} esta buscando duo para **${juego}**`,
      embeds: [embed]
    };

    const matchChannel = MATCH_CHANNEL_ID
      ? interaction.guild?.channels.cache.get(MATCH_CHANNEL_ID)
      : null;

    if (matchChannel) {
      await matchChannel.send(payload).catch(() => null);
      await interaction.editReply({ content: 'listo, mewmi tiro tus posibles duos al canal de partidas', components: [] });
    } else {
      await interaction.editReply({ content: '', embeds: [embed], components: [] });
    }
  }
};
