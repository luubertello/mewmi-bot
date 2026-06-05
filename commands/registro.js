const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder
} = require('discord.js');
const db = require('../database');
const { puntajeCompatibilidad } = require('../services/compatibilidad');

const PAISES = ['argentina', 'bolivia', 'brasil', 'chile', 'colombia', 'costa rica', 'cuba', 'ecuador', 'el salvador', 'guatemala', 'honduras', 'mexico', 'nicaragua', 'panama', 'paraguay', 'peru', 'republica dominicana', 'uruguay', 'usa', 'venezuela', 'españa', 'otro'];
const EDADES = ['18-20', '21-25', '26-30', '31-35', '36+'];
const HORARIOS = ['mañana (8-12)', 'mediodía (12-16)', 'tarde (16-20)', 'noche (20-00)', 'madrugada (00-06)', 'varía mucho'];
const JUEGOS_DISPONIBLES = ['valorant', 'lol', 'fortnite'];

const JUEGOS_CONFIG = {
  valorant: {
    modos: ['ranked', 'normal', 'swift'],
    roles: ['duelista', 'centinela', 'controlador', 'iniciador'],
    rangos: ['hierro', 'bronce', 'plata', 'oro', 'platino', 'diamante', 'ascendente', 'inmortal', 'radiante'],
    servidores: ['santiago', 'miami', 'bogotá', 'madrid', 'chicago'],
    multiServidor: true,
    multiRol: true
  },
  lol: {
    modos: ['ranked', 'normal', 'aram'],
    roles: ['top', 'jungla', 'mid', 'adc', 'support'],
    rangos: ['hierro', 'bronce', 'plata', 'oro', 'platino', 'esmeralda', 'diamante', 'master', 'grandmaster', 'challenger'],
    servidores: ['NA', 'EUW', 'EUNE', 'LAN', 'LAS', 'BR'],
    multiServidor: true,
    multiRol: true
  },
  fortnite: {
    modos: ['construcción', 'cero construcción', 'blitz', 'creativo'],
    servidores: ['NA East', 'NA Central', 'NA West', 'Europa', 'Brasil'],
    multiServidor: false,
    multiRol: false
  }
};

async function selectMenu(interaction, userId, customId, pregunta, opciones, multi = false) {
  const hint = multi ? '\n-# *(podés elegir varias)*' : '';
  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder(multi ? 'elegí una o más opciones' : 'elegí una opción')
      .setMinValues(1)
      .setMaxValues(multi ? opciones.length : 1)
      .addOptions(opciones.map(o => ({ label: o, value: o })))
  );
  await interaction.editReply({ content: pregunta + hint, components: [row], embeds: [] });
  const resp = await interaction.channel.awaitMessageComponent({
    filter: i => i.user.id === userId && i.customId === customId,
    time: 120000
  }).catch(() => null);
  if (!resp) return null;
  await resp.deferUpdate();
  return resp.values;
}

async function configurarJuego(interaction, userId, juego) {
  const config = JUEGOS_CONFIG[juego];
  const resultado = { juego };

  await interaction.editReply({ content: `────୨ৎ────\nconfigurando **${juego}**\n────୨ৎ────`, components: [], embeds: [] });

  const modos = await selectMenu(interaction, userId, `${juego}_modos`, `**${juego}** — ¿qué modos jugás?`, config.modos, true);
  if (!modos) return null;
  resultado.modos = modos;

  if (config.roles) {
    const rol = await selectMenu(interaction, userId, `${juego}_rol`, `**${juego}** — ¿cuáles son tus roles?`, config.roles, config.multiRol);
    if (!rol) return null;
    resultado.rol = rol;
  }

  if (config.rangos && modos.includes('ranked')) {
    const rango = await selectMenu(interaction, userId, `${juego}_rango`, `**${juego}** — ¿en qué rango estás?`, config.rangos);
    if (!rango) return null;
    resultado.rango = rango[0];
  }

  const servidor = await selectMenu(interaction, userId, `${juego}_servidor`, `**${juego}** — ¿en qué servidor${config.multiServidor ? 'es' : ''} jugás?`, config.servidores, config.multiServidor);
  if (!servidor) return null;
  resultado.servidor = servidor;

  return resultado;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('registrar')
    .setDescription('mrrp~ armá tu perfil de Mewmi ♡'),

  async execute(interaction) {
    const userId = interaction.user.id;

    if (db.prepare('SELECT user_id FROM perfiles WHERE user_id = ?').get(userId)) {
      return interaction.reply({ content: 'paw! ya tenés perfil ♡ usá `/perfil` para verlo o `/editar` para cambiarlo.', flags: 64 });
    }

    const nick = interaction.member?.displayName || interaction.user.username;
    await interaction.reply({ content: 'mrrp~ vamos a armar tu perfil ♡', flags: 64 });

    const state = { nick, juegos_config: [] };
    const timeout = () => interaction.editReply({ content: 'mewmi se durmió esperando… intentá `/registrar` de nuevo 🐾', components: [] });

    // PAÍS
    const pais = await selectMenu(interaction, userId, 'pais', '**paso 1/4** — ¿de dónde sos?', PAISES);
    if (!pais) return timeout();
    state.pais = pais[0];

    // EDAD
    const edad = await selectMenu(interaction, userId, 'edad', '**paso 2/4** — ¿qué edad tenés?', EDADES);
    if (!edad) return timeout();
    state.edad = edad[0];

    // HORARIO
    const horario = await selectMenu(interaction, userId, 'horario', '**paso 3/4** — ¿en qué horarios solés jugar?', HORARIOS, true);
    if (!horario) return timeout();
    state.horario = horario;

    // JUEGOS
    await interaction.editReply({ content: '**paso 4/4** — ¿qué jugás? vamos a configurar cada juego', components: [], embeds: [] });

    do {
      const disponibles = JUEGOS_DISPONIBLES.filter(j => !state.juegos_config.find(jc => jc.juego === j));
      if (!disponibles.length) break;

      const juego = await selectMenu(
        interaction, userId,
        `elegir_juego_${state.juegos_config.length}`,
        state.juegos_config.length > 0 ? '¿agregás otro juego?' : '¿qué juego configuramos?',
        disponibles
      );
      if (!juego) return timeout();

      const configJuego = await configurarJuego(interaction, userId, juego[0]);
      if (!configJuego) return timeout();
      state.juegos_config.push(configJuego);

      const restantes = JUEGOS_DISPONIBLES.filter(j => !state.juegos_config.find(jc => jc.juego === j));
      if (!restantes.length) break;

      const otro = await selectMenu(interaction, userId, `otro_juego_${state.juegos_config.length}`, '¿jugás algo más?', ['sí, agrego otro ♡', 'no, listo ✦']);
      if (!otro || otro[0] === 'no, listo ✦') break;
    } while (true);

    // GUARDAR
    const juegosNombres = state.juegos_config.map(j => j.juego);

    db.prepare('INSERT INTO perfiles (user_id, username, nick, pais, edad, horario, juegos) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(userId, interaction.user.username, state.nick, state.pais, state.edad, JSON.stringify(state.horario), JSON.stringify(juegosNombres));

    for (const jc of state.juegos_config) {
      db.prepare('INSERT INTO juegos_config (user_id, juego, modo, rango, rol, servidor) VALUES (?, ?, ?, ?, ?, ?)')
        .run(userId, jc.juego, JSON.stringify(jc.modos), jc.rango || null, JSON.stringify(jc.rol || []), JSON.stringify(jc.servidor || []));
    }

    const resumenJuegos = state.juegos_config.map(jc => {
      let l = `**${jc.juego}** — ${jc.modos.join('/')}`;
      if (jc.rol?.length)      l += ` · ${jc.rol.join('/')}`;
      if (jc.rango)            l += ` · ${jc.rango}`;
      if (jc.servidor?.length) l += ` · ${jc.servidor.join('/')}`;
      return l;
    }).join('\n');

    await interaction.editReply({
      content: '',
      components: [],
      embeds: [new EmbedBuilder()
        .setColor('#ffbfdc')
        .setTitle('perfil creado ♡')
        .setDescription(`mrrp~ ya estás en el lobby de Mewmi, **${state.nick}**!\nusá \`/buscar\` para encontrar tu próximo duo ✦\n\n────୨ৎ────`)
        .addFields(
          { name: 'pais',    value: state.pais,               inline: true },
          { name: 'edad',    value: state.edad,               inline: true },
          { name: 'horario', value: state.horario.join(', '), inline: true },
          { name: 'juegos',  value: resumenJuegos,            inline: false }
        )
        .setFooter({ text: 'powered by tuna & affection 🐟' })]
    });

    // MATCH AUTOMÁTICO AL REGISTRARSE
    const juegoPrincipal = state.juegos_config[0]?.juego;
    if (!juegoPrincipal) return;

    const perfilNuevo = { user_id: userId, ...state, juegos_config: state.juegos_config };
    const todas = db.prepare('SELECT * FROM perfiles WHERE user_id != ?').all(userId);

    const matches = todas
      .map(c => ({ ...c, score: puntajeCompatibilidad(perfilNuevo, c, juegoPrincipal, []) }))
      .filter(c => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 1);

    if (!matches.length) return;

    const match = matches[0];
    const matchUser = await interaction.client.users.fetch(match.user_id).catch(() => null);
    if (!matchUser) return;

    await interaction.followUp({
      flags: 64,
      embeds: [new EmbedBuilder()
        .setColor('#ff87bc')
        .setTitle('✦ mewmi detectó compatibilidad ♡')
        .setDescription(`mrrp~ parece que encontré alguien compatible con vos 🐾\n\n♡ **${match.nick || matchUser.username}**\njuega ${juegoPrincipal} · horarios parecidos\n\n¡capaz encontraste tu próximo duo!`)
        .setThumbnail(matchUser.displayAvatarURL())
        .setFooter({ text: 'powered by tuna & affection 🐟' })]
    });

    const dm = await matchUser.createDM().catch(() => null);
    if (dm) await dm.send({
      embeds: [new EmbedBuilder()
        .setColor('#ff87bc')
        .setTitle('✦ nueva compatibilidad detectada ♡')
        .setDescription(`paw~ alguien nuevo acaba de unirse a Mewmi 🐾\n\n♡ **${state.nick}**\njuega ${juegoPrincipal}\n\nmewmi cree que podrían llevarse bien ✨`)
        .setThumbnail(interaction.user.displayAvatarURL())
        .setFooter({ text: 'powered by tuna & affection 🐟' })]
    }).catch(() => null);
  }
};
