const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { listarLobbiesAbiertos } = require('../services/lobbies');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lobbies')
    .setDescription('muestra quien esta buscando partida ahora'),

  async execute(interaction) {
    const lobbies = listarLobbiesAbiertos();

    if (!lobbies.length) {
      return interaction.reply({
        content: 'no hay lobbies abiertos ahora. podes crear uno con /buscar',
        flags: 64
      });
    }

    const lines = lobbies.map(lobby => {
      const restantes = Math.max(lobby.max_jugadoras - lobby.miembros, 0);
      const esEvento = lobby.tipo === 'evento';
      const link = lobby.canal_id && lobby.mensaje_id && interaction.guildId
        ? `https://discord.com/channels/${interaction.guildId}/${lobby.canal_id}/${lobby.mensaje_id}`
        : null;

      return [
        `**#${lobby.id} ${lobby.juego}** - ${esEvento ? `programado para ${lobby.fecha_evento}` : 'ahora'}`,
        `${lobby.modo || 'normal'} - ${lobby.servidor || 'cualquiera'}`,
        `host: <@${lobby.host_id}> - ${lobby.miembros}/${lobby.max_jugadoras} - ${esEvento ? 'lugares libres' : 'faltan'} ${restantes}`,
        link ? `[ir al lobby](${link})` : 'sin mensaje vinculado'
      ].join('\n');
    });

    const embed = new EmbedBuilder()
      .setColor('#ffbfdc')
      .setTitle('lobbies abiertos')
      .setDescription(lines.join('\n\n'))
      .setFooter({ text: 'usa /buscar para armar uno nuevo' });

    return interaction.reply({ embeds: [embed], flags: 64 });
  }
};
