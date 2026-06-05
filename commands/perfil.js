const {
  SlashCommandBuilder,
  EmbedBuilder,
} = require('discord.js');

const db = require('../database');
const { getHito } = require('../services/hitos');

// ── emojis juegos ─────────────────────────────────────────
const GAME_EMOJI = {
  valorant: '<:valorant:1476627453249065151>',
  lol: '<:lol:1476627472270491658>',
  fortnite: '<:fortnite:1476627435947556986>',
};

const GAME_NAME = {
  valorant: 'valorant',
  lol: 'league of legends',
  fortnite: 'fortnite',
};

// ── helpers ───────────────────────────────────────────────
function parseArr(val) {
  if (!val) return [];

  try {
    const p = JSON.parse(val);
    return Array.isArray(p) ? p : [p];
  } catch {
    return [val];
  }
}

function sanitizeName(str) {
  if (!str) return '';

  const map = {
    '𝗮':'a','𝗯':'b','𝗰':'c','𝗱':'d','𝗲':'e','𝗳':'f','𝗴':'g','𝗵':'h','𝗶':'i','𝗷':'j',
    '𝗸':'k','𝗹':'l','𝗺':'m','𝗻':'n','𝗼':'o','𝗽':'p','𝗾':'q','𝗿':'r','𝘀':'s','𝘁':'t',
    '𝘂':'u','𝘃':'v','𝘄':'w','𝘅':'x','𝘆':'y','𝘇':'z','𝗔':'A','𝗕':'B','𝗖':'C','𝗗':'D',
    '𝗘':'E','𝗙':'F','𝗚':'G','𝗛':'H','𝗜':'I','𝗝':'J','𝗞':'K','𝗟':'L','𝗠':'M','𝗡':'N',
    '𝗢':'O','𝗣':'P','𝗤':'Q','𝗥':'R','𝗦':'S','𝗧':'T','𝗨':'U','𝗩':'V','𝗪':'W','𝗫':'X',
    '𝗬':'Y','𝗭':'Z',
  };

  return [...str]
    .map(c => map[c] || c)
    .join('')
    .replace(/[♡♥︎]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── descripcion ───────────────────────────────────────────
function buildDescription(perfil, juegos) {
  const lines = [];

  // ── apertura ────────────────────────────────────────
  lines.push('♡ ︵︵୨୧︵︵ ♡');
  lines.push('');

  // ── datos personales ───────────────────────────────
  const datos = [];

  if (perfil.edad) {
    datos.push(`✦ **edad:** ${perfil.edad}`);
  }

  if (perfil.pais) {
    datos.push(`✦ **pais:** ${perfil.pais}`);
  }

  const horarios = parseArr(perfil.horario);

  if (horarios.length) {
    datos.push(`✦ **horario:** ${horarios.join(', ')}`);
  }

  if (datos.length) {
    lines.push(datos.join('\n'));
    lines.push('');
  }

  // ── bio ────────────────────────────────────────────
  if (perfil.bio) {
    lines.push(`> ${perfil.bio}`);
    lines.push('');
  }

  // ── juegos ─────────────────────────────────────────
  for (const j of juegos) {
    const emoji = GAME_EMOJI[j.juego] || '🎮';
    const nombre = GAME_NAME[j.juego] || j.juego;

    lines.push(`${emoji} **${nombre}**`);

    if (j.rango) {
      lines.push(`> **rango** ${j.rango}`);
    }

    const modos = parseArr(j.modo);
    if (modos.length) {
      lines.push(`> **modos** ${modos.join(', ')}`);
    }

    const roles = parseArr(j.rol);
    if (roles.length) {
      lines.push(`> **rol** ${roles.join(', ')}`);
    }

    const servers = parseArr(j.servidor);
    if (servers.length) {
      lines.push(`> **server** ${servers.join(', ')}`);
    }

    lines.push('');
  }

  // ── cierre ─────────────────────────────────────────
  lines.push('♡ ︶︶୨୧︶︶ ♡');

  return lines.join('\n');
}

function buildInsignias(userId) {
  const hitos = db.prepare('SELECT hito_id FROM hitos WHERE user_id = ? ORDER BY fecha ASC LIMIT 12').all(userId);
  if (!hitos.length) return null;

  return hitos
    .map(h => {
      const data = getHito(h.hito_id);
      return `${data.emoji} ${data.nombre}`;
    })
    .join('\n');
}

// ── comando ────────────────────────────────────────────
module.exports = {
  data: new SlashCommandBuilder()
    .setName('perfil')
    .setDescription('mira tu perfil o el de otra ♡')
    .addUserOption(opt =>
      opt
        .setName('usuario')
        .setDescription('ver perfil de otra chica')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const target =
      interaction.options.getUser('usuario') || interaction.user;

    const perfil = db
      .prepare('SELECT * FROM perfiles WHERE user_id = ?')
      .get(target.id);

    if (!perfil) {
      return interaction.editReply(
        target.id === interaction.user.id
          ? 'mrrp~ todavia no tenes perfil. usa `/registrar` ♡'
          : 'paw! esa chica todavia no tiene perfil en mewmi 🐾'
      );
    }

    const juegos = db
      .prepare('SELECT * FROM juegos_config WHERE user_id = ?')
      .all(perfil.user_id);

    const nick = sanitizeName(
      perfil.nick || target.displayName
    );

    const embed = new EmbedBuilder()
      .setColor('#f7a8bd')
      .setTitle(`## ${nick}`)
      .setDescription(
        `(@${target.username})\n\n${buildDescription(perfil, juegos)}`
      )
      .setThumbnail(
        target.displayAvatarURL({ size: 256 })
      )
      .setFooter({
        text: 'mewmi ♡ cozy duo finder',
      });

    const insignias = buildInsignias(target.id);
    if (insignias) {
      embed.addFields({ name: 'insignias', value: insignias, inline: false });
    }

    await interaction.editReply({
      embeds: [embed],
    });
  },
};
