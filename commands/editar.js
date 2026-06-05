const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder
} = require('discord.js');
const db = require('../database');

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

function safeParseArray(val) {
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch { return [val]; }
}

async function selectMenu(interaction, userId, customId, pregunta, opciones, multi = false, defaultValues = []) {
  const hint = multi ? '\n-# *(podés elegir varias)*' : '';
  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder(multi ? 'elegí una o más opciones' : 'elegí una opción')
      .setMinValues(1)
      .setMaxValues(multi ? opciones.length : 1)
      .addOptions(opciones.map(o => ({ label: o, value: o, default: defaultValues.includes(o) })))
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

async function editarJuego(interaction, userId, juego, configActual) {
  const config = JUEGOS_CONFIG[juego];
  const categorias = [
    { label: 'modos', value: 'modos' },
    ...(config.roles ? [{ label: 'rol', value: 'rol' }] : []),
    ...(config.rangos ? [{ label: 'rango', value: 'rango' }] : []),
    { label: 'server', value: 'server' },
  ];

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`categoria_${juego}`)
      .setPlaceholder('qué querés editar?')
      .addOptions(categorias)
  );

  await interaction.editReply({ content: `editando **${juego}** — ¿qué cambiamos?`, components: [row], embeds: [] });

  const categoriaResp = await interaction.channel.awaitMessageComponent({
    filter: i => i.user.id === userId && i.customId === `categoria_${juego}`,
    time: 120000
  }).catch(() => null);
  if (!categoriaResp) return null;
  await categoriaResp.deferUpdate();

  const categoria = categoriaResp.values[0];
  const resultado = {
    modos:    safeParseArray(configActual?.modo),
    rol:      safeParseArray(configActual?.rol),
    rango:    configActual?.rango || null,
    servidor: safeParseArray(configActual?.servidor)
  };

  if (categoria === 'modos') {
    const v = await selectMenu(interaction, userId, `edit_${juego}_modos`, `**${juego}** — ¿qué modos jugás?`, config.modos, true, resultado.modos);
    if (!v) return null;
    resultado.modos = v;
  }
  if (categoria === 'rol' && config.roles) {
    const v = await selectMenu(interaction, userId, `edit_${juego}_rol`, `**${juego}** — ¿cuáles son tus roles?`, config.roles, config.multiRol, resultado.rol);
    if (!v) return null;
    resultado.rol = v;
  }
  if (categoria === 'rango' && config.rangos) {
    const v = await selectMenu(interaction, userId, `edit_${juego}_rango`, `**${juego}** — ¿en qué rango estás?`, config.rangos, false, resultado.rango ? [resultado.rango] : []);
    if (!v) return null;
    resultado.rango = v[0];
  }
  if (categoria === 'server') {
    const v = await selectMenu(interaction, userId, `edit_${juego}_server`, `**${juego}** — ¿en qué servers jugás?`, config.servidores, config.multiServidor, resultado.servidor);
    if (!v) return null;
    resultado.servidor = v;
  }

  return { juego, ...resultado };
}

async function configurarJuegoCompleto(interaction, userId, juego) {
  const config = JUEGOS_CONFIG[juego];
  const resultado = { juego };

  const modos = await selectMenu(interaction, userId, `add_${juego}_modos`, `**${juego}** - ¿qué modos jugás?`, config.modos, true);
  if (!modos) return null;
  resultado.modos = modos;

  if (config.roles) {
    const rol = await selectMenu(interaction, userId, `add_${juego}_rol`, `**${juego}** - ¿cuáles son tus roles?`, config.roles, config.multiRol);
    if (!rol) return null;
    resultado.rol = rol;
  }

  if (config.rangos && modos.includes('ranked')) {
    const rango = await selectMenu(interaction, userId, `add_${juego}_rango`, `**${juego}** - ¿en qué rango estás?`, config.rangos);
    if (!rango) return null;
    resultado.rango = rango[0];
  }

  const servidor = await selectMenu(interaction, userId, `add_${juego}_server`, `**${juego}** - ¿en qué server jugás?`, config.servidores, config.multiServidor);
  if (!servidor) return null;
  resultado.servidor = servidor;

  return resultado;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('editar')
    .setDescription('editá tu perfil de Mewmi ♡'),

  async execute(interaction) {
    const userId = interaction.user.id;
    const perfil = db.prepare('SELECT * FROM perfiles WHERE user_id = ?').get(userId);
    if (!perfil) return interaction.reply({ content: 'mrrp~ todavía no tenés perfil. usá `/registrar` ♡', flags: 64 });

    await interaction.reply({ content: '¿qué querés editar? ✦', flags: 64 });

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('editar_que')
        .setPlaceholder('elegí qué editar')
        .addOptions([
          { label: 'pais',             value: 'pais',    description: `actual: ${perfil.pais || '—'}` },
          { label: 'edad',             value: 'edad',    description: `actual: ${perfil.edad || '—'}` },
          { label: 'horario',          value: 'horario', description: 'cambiar horarios de juego' },
          { label: 'configurar juego', value: 'juego',   description: 'modos, rol, rango o servidor' },
          { label: 'agregar juego',    value: 'agregar', description: 'sumar un juego al perfil' },
          { label: 'quitar juego',     value: 'quitar',  description: 'eliminar un juego del perfil' },
        ])
    );

    await interaction.editReply({ content: '¿qué querés editar? ✦', components: [row], embeds: [] });

    const sel = await interaction.channel.awaitMessageComponent({
      filter: i => i.user.id === userId && i.customId === 'editar_que',
      time: 60000
    }).catch(() => null);
    if (!sel) return interaction.editReply({ content: 'mewmi se durmió esperando… intentá `/editar` de nuevo 🐾', components: [] });
    await sel.deferUpdate();
    const opcion = sel.values[0];

    const timeout = () => interaction.editReply({ content: 'mewmi se durmió esperando… intentá `/editar` de nuevo 🐾', components: [] });

    // ─── PAÍS ────────────────────────────────────────────────
    if (opcion === 'pais') {
      const v = await selectMenu(interaction, userId, 'edit_pais', '¿de dónde sos?', PAISES, false, perfil.pais ? [perfil.pais] : []);
      if (!v) return timeout();
      db.prepare('UPDATE perfiles SET pais = ? WHERE user_id = ?').run(v[0], userId);
      return interaction.editReply({ content: '', components: [], embeds: [new EmbedBuilder().setColor('#ffbfdc').setDescription(`✦ país actualizado a **${v[0]}** ♡`)] });
    }

    // ─── EDAD ────────────────────────────────────────────────
    if (opcion === 'edad') {
      const v = await selectMenu(interaction, userId, 'edit_edad', '¿qué edad tenés?', EDADES, false, perfil.edad ? [perfil.edad] : []);
      if (!v) return timeout();
      db.prepare('UPDATE perfiles SET edad = ? WHERE user_id = ?').run(v[0], userId);
      return interaction.editReply({ content: '', components: [], embeds: [new EmbedBuilder().setColor('#ffbfdc').setDescription(`✦ edad actualizada a **${v[0]}** ♡`)] });
    }

    // ─── HORARIO ─────────────────────────────────────────────
    if (opcion === 'horario') {
      const v = await selectMenu(interaction, userId, 'edit_horario', '¿en qué horarios solés jugar?', HORARIOS, true, safeParseArray(perfil.horario));
      if (!v) return timeout();
      db.prepare('UPDATE perfiles SET horario = ? WHERE user_id = ?').run(JSON.stringify(v), userId);
      return interaction.editReply({ content: '', components: [], embeds: [new EmbedBuilder().setColor('#ffbfdc').setDescription(`✦ horarios actualizados: **${v.join(', ')}** ♡`)] });
    }

    // ─── EDITAR JUEGO ─────────────────────────────────────────
    if (opcion === 'juego') {
      const juegosRegistrados = safeParseArray(perfil.juegos);
      if (!juegosRegistrados.length) return interaction.editReply({ content: 'paw… no tenés juegos. usá "agregar juego" ♡', components: [] });

      const juegoSel = await selectMenu(interaction, userId, 'edit_cual_juego', '¿qué juego editamos?', juegosRegistrados);
      if (!juegoSel) return timeout();

      const nombre = juegoSel[0];
      const configActual = db.prepare('SELECT * FROM juegos_config WHERE user_id = ? AND juego = ?').get(userId, nombre);
      const cfg = await editarJuego(interaction, userId, nombre, configActual);
      if (!cfg) return timeout();

      if (configActual) {
        db.prepare('UPDATE juegos_config SET modo = ?, rango = ?, rol = ?, servidor = ? WHERE user_id = ? AND juego = ?')
          .run(JSON.stringify(cfg.modos), cfg.rango || null, JSON.stringify(cfg.rol || []), JSON.stringify(cfg.servidor || []), userId, nombre);
      } else {
        db.prepare('INSERT INTO juegos_config (user_id, juego, modo, rango, rol, servidor) VALUES (?, ?, ?, ?, ?, ?)')
          .run(userId, nombre, JSON.stringify(cfg.modos), cfg.rango || null, JSON.stringify(cfg.rol || []), JSON.stringify(cfg.servidor || []));
      }

      let resumen = `**${nombre}** — ${cfg.modos.join('/')}`;
      if (cfg.rol?.length)      resumen += ` · ${cfg.rol.join('/')}`;
      if (cfg.rango)            resumen += ` · ${cfg.rango}`;
      if (cfg.servidor?.length) resumen += ` · ${cfg.servidor.join('/')}`;

      return interaction.editReply({ content: '', components: [], embeds: [new EmbedBuilder().setColor('#ffbfdc').setTitle('✦ juego actualizado ♡').setDescription(resumen)] });
    }

    // ─── AGREGAR JUEGO ────────────────────────────────────────
    if (opcion === 'agregar') {
      const juegosRegistrados = safeParseArray(perfil.juegos);
      const disponibles = JUEGOS_DISPONIBLES.filter(j => !juegosRegistrados.includes(j));
      if (!disponibles.length) return interaction.editReply({ content: 'paw~ ya tenés todos los juegos ♡', components: [] });

      const juegoSel = await selectMenu(interaction, userId, 'edit_agregar_juego', '¿qué juego agregamos?', disponibles);
      if (!juegoSel) return timeout();

      const nombre = juegoSel[0];
      const cfg = await configurarJuegoCompleto(interaction, userId, nombre);
      if (!cfg) return timeout();

      db.prepare('INSERT INTO juegos_config (user_id, juego, modo, rango, rol, servidor) VALUES (?, ?, ?, ?, ?, ?)')
        .run(userId, nombre, JSON.stringify(cfg.modos), cfg.rango || null, JSON.stringify(cfg.rol || []), JSON.stringify(cfg.servidor || []));
      db.prepare('UPDATE perfiles SET juegos = ? WHERE user_id = ?')
        .run(JSON.stringify([...juegosRegistrados, nombre]), userId);

      let resumen = `**${nombre}** — ${cfg.modos.join('/')}`;
      if (cfg.rol?.length)      resumen += ` · ${cfg.rol.join('/')}`;
      if (cfg.rango)            resumen += ` · ${cfg.rango}`;
      if (cfg.servidor?.length) resumen += ` · ${cfg.servidor.join('/')}`;

      return interaction.editReply({ content: '', components: [], embeds: [new EmbedBuilder().setColor('#ffbfdc').setTitle('✦ juego agregado ♡').setDescription(resumen)] });
    }

    // ─── QUITAR JUEGO ─────────────────────────────────────────
    if (opcion === 'quitar') {
      const juegosRegistrados = safeParseArray(perfil.juegos);
      if (!juegosRegistrados.length) return interaction.editReply({ content: 'paw… no tenés juegos para quitar ♡', components: [] });
      if (juegosRegistrados.length === 1) return interaction.editReply({ content: 'paw~ no podés quedarte sin juegos. usá "configurar juego" para cambiarlo ♡', components: [] });

      const juegoSel = await selectMenu(interaction, userId, 'edit_quitar_juego', '¿qué juego querés quitar?', juegosRegistrados);
      if (!juegoSel) return timeout();

      const nombre = juegoSel[0];
      db.prepare('DELETE FROM juegos_config WHERE user_id = ? AND juego = ?').run(userId, nombre);
      db.prepare('UPDATE perfiles SET juegos = ? WHERE user_id = ?')
        .run(JSON.stringify(juegosRegistrados.filter(j => j !== nombre)), userId);

      return interaction.editReply({ content: '', components: [], embeds: [new EmbedBuilder().setColor('#ffbfdc').setDescription(`✦ **${nombre}** quitado de tu perfil ♡`)] });
    }
  }
};
