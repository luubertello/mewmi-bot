const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder
} = require('discord.js');
const db = require('../database');
const { safeParseArray } = require('../services/compatibilidad');
const { crearLobby, postearLobby } = require('../services/lobbies');
const { darHito } = require('../services/hitos');

const MODOS = {
  valorant: ['ranked', 'normal', 'swift'],
  lol: ['ranked', 'normal', 'aram'],
  fortnite: ['construccion', 'cero construccion', 'blitz', 'creativo']
};

const RANGOS = {
  valorant: ['cualquier rango', 'hierro', 'bronce', 'plata', 'oro', 'platino', 'diamante', 'ascendente', 'inmortal', 'radiante'],
  lol: ['cualquier rango', 'hierro', 'bronce', 'plata', 'oro', 'platino', 'esmeralda', 'diamante', 'master', 'grandmaster', 'challenger'],
  fortnite: []
};

const SERVIDORES = {
  valorant: ['santiago', 'miami', 'bogota', 'madrid', 'chicago'],
  lol: ['NA', 'EUW', 'EUNE', 'LAN', 'LAS', 'BR'],
  fortnite: ['NA East', 'NA Central', 'NA West', 'Europa', 'Brasil']
};

async function selectMenu(interaction, userId, customId, pregunta, opciones) {
  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder('elegi una opcion')
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(opciones.map(o => ({ label: o, value: o })))
  );

  await interaction.editReply({ content: pregunta, components: [row], embeds: [] });

  const resp = await interaction.channel.awaitMessageComponent({
    filter: i => i.user.id === userId && i.customId === customId,
    time: 90000
  }).catch(() => null);

  if (!resp) return null;
  await resp.deferUpdate();
  return resp.values[0];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buscar')
    .setDescription('arma un lobby para jugar ahora'),

  async execute(interaction) {
    const userId = interaction.user.id;
    const perfil = db.prepare('SELECT * FROM perfiles WHERE user_id = ?').get(userId);
    if (!perfil) {
      return interaction.reply({ content: 'mrrp~ primero necesitas un perfil. usa `/registrar`', flags: 64 });
    }

    const juegosRegistrados = safeParseArray(perfil.juegos);
    if (!juegosRegistrados.length) {
      return interaction.reply({ content: 'paw... no tenes juegos registrados. usa `/editar`', flags: 64 });
    }

    await interaction.reply({ content: 'mrrp~ armemos lobby rapido', flags: 64 });
    const timeout = () => interaction.editReply({ content: 'mewmi se durmio esperando... intenta de nuevo', components: [] });

    const juego = await selectMenu(interaction, userId, 'buscar_juego', '¿que jugamos?', juegosRegistrados);
    if (!juego) return timeout();

    const modo = await selectMenu(interaction, userId, 'buscar_modo', '¿modo?', MODOS[juego] || ['normal']);
    if (!modo) return timeout();

    let rango = null;
    if (RANGOS[juego]?.length && modo === 'ranked') {
      const elegido = await selectMenu(interaction, userId, 'buscar_rango', '¿rango?', RANGOS[juego]);
      if (!elegido) return timeout();
      rango = elegido === 'cualquier rango' ? null : elegido;
    }

    const servidor = await selectMenu(interaction, userId, 'buscar_servidor', '¿server?', SERVIDORES[juego] || ['cualquiera']);
    if (!servidor) return timeout();

    const maxFaltan = juego === 'fortnite' ? 3 : 4;
    const cupos = await selectMenu(
      interaction,
      userId,
      'buscar_cupos',
      '¿cuantas faltan?',
      Array.from({ length: maxFaltan }, (_, i) => String(i + 1))
    );
    if (!cupos) return timeout();

    if (new Date().getHours() < 5) darHito(userId, '5am_queue');

    const lobbyId = crearLobby({
      hostId: userId,
      juego,
      rango,
      modo,
      servidor,
      tipo: 'ya',
      fechaEvento: null,
      maxJugadoras: 1 + parseInt(cupos, 10)
    });

    await postearLobby(interaction.client, lobbyId, interaction.channel);

    return interaction.editReply({
      content: '',
      components: [],
      embeds: [new EmbedBuilder()
        .setColor('#ffbfdc')
        .setTitle('lobby publicado')
        .setDescription(`**${juego}** · ${modo} · ${servidor}\nbuscando **${cupos}** mas`)
        .setFooter({ text: 'se cierra solo en 2h si no se llena' })]
    });
  }
};
