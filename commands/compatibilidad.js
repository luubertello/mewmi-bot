const {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder
} = require('discord.js');

const db = require('../database');
const {
  createCanvas,
  loadImage
} = require('@napi-rs/canvas');

function safeParseArray(val) {
  if (!val) return [];

  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed)
      ? parsed
      : [parsed];
  } catch {
    return [val];
  }
}

function incluyeVariaMucho(arr) {
  return arr.some(h =>
    h
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') === 'varia mucho'
  );
}

function horariosCompatibles(a, b) {

  if (incluyeVariaMucho(a)) return true;
  if (incluyeVariaMucho(b)) return true;

  return a.some(h => b.includes(h));
}

async function generarImagen(user1, user2, porcentaje) {

  const canvas = createCanvas(700, 250);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#2b2336';
  ctx.fillRect(0, 0, 700, 250);

  const avatar1 = await loadImage(
    user1.displayAvatarURL({
      extension: 'png',
      size: 256
    })
  );

  const avatar2 = await loadImage(
    user2.displayAvatarURL({
      extension: 'png',
      size: 256
    })
  );

  function drawCircle(img, x) {

    ctx.save();

    ctx.beginPath();

    ctx.arc(x, 120, 70, 0, Math.PI * 2);

    ctx.clip();

    ctx.drawImage(img, x - 70, 50, 140, 140);

    ctx.restore();

    ctx.strokeStyle = '#ff87bc';
    ctx.lineWidth = 5;

    ctx.beginPath();

    ctx.arc(x, 120, 70, 0, Math.PI * 2);

    ctx.stroke();
  }

  drawCircle(avatar1, 170);
  drawCircle(avatar2, 530);

  ctx.fillStyle = '#fff7f2';
  ctx.font = 'bold 52px sans-serif';
  ctx.textAlign = 'center';

  ctx.fillText(
    `${porcentaje}%`,
    350,
    125
  );

  ctx.font = '24px sans-serif';

  let texto = 'good vibes';

  if (porcentaje >= 90) {
    texto = 'duo perfecto';
  } else if (porcentaje >= 70) {
    texto = 'super compatibles';
  } else if (porcentaje >= 50) {
    texto = 'buenas vibes';
  } else {
    texto = 'mewmi tiene dudas 🌙';
  }

  ctx.fillText(texto, 350, 170);

  return new AttachmentBuilder(
    canvas.toBuffer('image/png'),
    { name: 'compatibilidad.png' }
  );
}

module.exports = {

  data: new SlashCommandBuilder()
    .setName('compatibilidad')
    .setDescription(
      'mide tu compatibilidad con alguien ♡'
    )
    .addUserOption(option =>
      option
        .setName('usuario')
        .setDescription('persona')
        .setRequired(true)
    ),

  async execute(interaction) {

    const target =
      interaction.options.getUser('usuario');

    if (target.id === interaction.user.id) {

      return interaction.reply({
        content:
          'mrrp~ no podés medirte con vos misma 🐾',
        flags: 64
      });
    }

    const perfil1 = db.prepare(
      'SELECT * FROM perfiles WHERE user_id = ?'
    ).get(interaction.user.id);

    const perfil2 = db.prepare(
      'SELECT * FROM perfiles WHERE user_id = ?'
    ).get(target.id);

    if (!perfil1 || !perfil2) {

      return interaction.reply({
        content:
          'paw… una de las dos no tiene perfil 🌙',
        flags: 64
      });
    }

    let puntos = 0;
    let max = 100;

    // juegos

    const juegos1 =
      safeParseArray(perfil1.juegos);

    const juegos2 =
      safeParseArray(perfil2.juegos);

    const juegosComun =
      juegos1.filter(j => juegos2.includes(j));

    puntos +=
      Math.min(juegosComun.length * 18, 35);

    // horarios

    const horarios1 =
      safeParseArray(
        perfil1.horario || perfil1.horarios
      );

    const horarios2 =
      safeParseArray(
        perfil2.horario || perfil2.horarios
      );

    if (
      horariosCompatibles(
        horarios1,
        horarios2
      )
    ) {
      puntos += 15;
    }

    // revisar configs juegos

    let serverMatch = false;
    let modosMatch = 0;
    let rangoMatch = 0;

    for (const juego of juegosComun) {

      const cfg1 = db.prepare(
        'SELECT * FROM juegos_config WHERE user_id = ? AND juego = ?'
      ).get(interaction.user.id, juego);

      const cfg2 = db.prepare(
        'SELECT * FROM juegos_config WHERE user_id = ? AND juego = ?'
      ).get(target.id, juego);

      if (!cfg1 || !cfg2) continue;

      const s1 = safeParseArray(cfg1.servidor);
      const s2 = safeParseArray(cfg2.servidor);

      if (s1.some(s => s2.includes(s))) {
        serverMatch = true;
      }

      const m1 = safeParseArray(cfg1.modo);
      const m2 = safeParseArray(cfg2.modo);

      modosMatch +=
        m1.filter(m => m2.includes(m)).length;

      if (
        cfg1.rango &&
        cfg2.rango &&
        cfg1.rango === cfg2.rango
      ) {
        rangoMatch += 1;
      }
    }

    if (serverMatch) puntos += 30;

    puntos += Math.min(modosMatch * 3, 10);

    puntos += Math.min(rangoMatch * 4, 7);

    // roles

    puntos += 3;

    // limitar

    if (
      juegosComun.length === 0
    ) {
      puntos = Math.min(puntos, 25);
    }

    if (!serverMatch) {
      puntos = Math.min(puntos, 45);
    }

    if (puntos > 100) puntos = 100;

    const attachment =
      await generarImagen(
        interaction.user,
        target,
        puntos
      );

    const embed = new EmbedBuilder()

      .setColor('#ff87bc')

      .setTitle(
        '✦ compatibilidad detectada ♡'
      )

      .setDescription(
`♡ ${interaction.user} + ${target}

🎮 juegos en común: ${
  juegosComun.length || 0
}

✨ compatibilidad total:
# ${puntos}%`
      )

      .setImage(
        'attachment://compatibilidad.png'
      )

      .setFooter({
        text:
          'powered by tuna & affection 🐟'
      });

    await interaction.reply({
      embeds: [embed],
      files: [attachment]
    });
  }
};