const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const db = require('../database');
const { safeParseArray } = require('../services/compatibilidad');
const { crearLobby, postearLobby } = require('../services/lobbies');

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

async function selectMenu(interaction, userId, customId, pregunta, opciones, config = {}) {
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
  if (config.returnInteraction) return resp;
  await resp.deferUpdate();
  return resp.values[0];
}

function generarOpcionesFecha() {
  const dias = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'];
  const hoy = new Date();
  const opciones = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() + i);
    if (i === 0) return 'hoy';
    if (i === 1) return 'manana';
    return `${dias[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
  });
  opciones.push('otra fecha');
  return opciones;
}

async function pedirFechaEvento(interaction, userId) {
  const fechaResp = await selectMenu(
    interaction,
    userId,
    'plan_fecha',
    '¿para cuando lo dejamos armado?',
    generarOpcionesFecha(),
    { returnInteraction: true }
  );
  if (!fechaResp) return null;

  const fechaElegida = fechaResp.values[0];
  const modal = new ModalBuilder()
    .setCustomId(`plan_fecha_${userId}_${Date.now()}`)
    .setTitle('programar partida');

  if (fechaElegida === 'otra fecha') {
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('fecha')
          .setLabel('dia')
          .setPlaceholder('ej: viernes 31/5, sabado que viene')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(40)
      )
    );
  }

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('hora')
        .setLabel('hora')
        .setPlaceholder('ej: 21:30, 00:15, despues de cenar')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(40)
    )
  );

  await fechaResp.showModal(modal);

  const submit = await fechaResp.awaitModalSubmit({
    filter: i => i.user.id === userId && i.customId.startsWith(`plan_fecha_${userId}_`),
    time: 120000
  }).catch(() => null);
  if (!submit) return null;

  const dia = fechaElegida === 'otra fecha'
    ? submit.fields.getTextInputValue('fecha').trim()
    : fechaElegida;
  const hora = submit.fields.getTextInputValue('hora').trim();

  await submit.deferUpdate().catch(() => null);
  return `${dia} ${hora}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('planificar')
    .setDescription('arma un evento para jugar mas tarde'),

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

    await interaction.reply({ content: 'mrrp~ lo dejamos agendado', flags: 64 });
    const timeout = () => interaction.editReply({ content: 'mewmi se durmio esperando... intenta de nuevo', components: [] });

    const juego = await selectMenu(interaction, userId, 'plan_juego', '¿que juego?', juegosRegistrados);
    if (!juego) return timeout();

    const modo = await selectMenu(interaction, userId, 'plan_modo', '¿modo?', MODOS[juego] || ['normal']);
    if (!modo) return timeout();

    let rango = null;
    if (RANGOS[juego]?.length && modo === 'ranked') {
      const elegido = await selectMenu(interaction, userId, 'plan_rango', '¿rango?', RANGOS[juego]);
      if (!elegido) return timeout();
      rango = elegido === 'cualquier rango' ? null : elegido;
    }

    const servidor = await selectMenu(interaction, userId, 'plan_servidor', '¿server?', SERVIDORES[juego] || ['cualquiera']);
    if (!servidor) return timeout();

    const maxFaltan = juego === 'fortnite' ? 3 : 4;
    const cupos = await selectMenu(
      interaction,
      userId,
      'plan_cupos',
      '¿cuantas faltan?',
      Array.from({ length: maxFaltan }, (_, i) => String(i + 1))
    );
    if (!cupos) return timeout();

    const fechaEvento = await pedirFechaEvento(interaction, userId);
    if (!fechaEvento) return timeout();

    const lobbyId = crearLobby({
      hostId: userId,
      juego,
      rango,
      modo,
      servidor,
      tipo: 'evento',
      fechaEvento,
      maxJugadoras: 1 + parseInt(cupos, 10)
    });

    await postearLobby(interaction.client, lobbyId, interaction.channel);

    return interaction.editReply({
      content: '',
      components: [],
      embeds: [new EmbedBuilder()
        .setColor('#cabdff')
        .setTitle('evento programado')
        .setDescription(`**${juego}** · ${modo} · ${servidor}\n**${fechaEvento}** · buscando **${cupos}** mas`)
        .setFooter({ text: 'mewmi lo deja visible para que se anoten sin presion' })]
    });
  }
};
