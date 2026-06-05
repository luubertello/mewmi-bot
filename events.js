const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const MATCH_CHANNEL_ID = process.env.CANAL_PARTIDAS_ID || process.env.MATCH_CHANNEL_ID || '';
const EVENTO_MIN_HORAS = Number(process.env.EVENTO_MIN_HORAS || 3);
const EVENTO_MAX_HORAS = Number(process.env.EVENTO_MAX_HORAS || 7);
const EVENTO_DURACION_MS = 10 * 60 * 1000;

const JUEGOS = [
  {
    id: 'valorant',
    label: 'Valorant',
    emoji: '🎯',
    role: '1463688047097942056',
    color: '#ff4655'
  },
  {
    id: 'lol',
    label: 'LoL',
    emoji: '🧙',
    role: '1463699691542675575',
    color: '#c8aa6e'
  },
  {
    id: 'fortnite',
    label: 'Fortnite',
    emoji: '🚌',
    role: '1463699786120171531',
    color: '#00c8ff'
  }
];

const EVENTOS = [
  {
    title: '✦ pspsps... sale partida?',
    desc: 'mewmi detecto energia gamer dando vueltas por el server.'
  },
  {
    title: '✦ mrrp~ lobby check',
    desc: 'si estabas esperando una señal para abrir el juego, capaz era esta.'
  },
  {
    title: '✦ alguien para jugar?',
    desc: 'mewmi esta tocando timbre suavecito por si sale team.'
  },
  {
    title: '✦ una partidita y me voy',
    desc: 'frase historicamente dicha antes de jugar muchas mas partiditas.'
  },
  {
    title: '✦ duo delivery service',
    desc: 'mewmi esta repartiendo excusas para hablarle a alguien nuevo.'
  },
  {
    title: '✦ queue time',
    desc: 'capaz hoy aparece ese duo que no flamea y encima se rie.'
  },
  {
    title: '✦ actividad sospechosa',
    desc: 'hay ganas de jueguitos en el aire. mewmi no tiene pruebas, pero tampoco dudas.'
  },
  {
    title: '✦ plan anti server muerto',
    desc: 'toca un boton y mewmi intenta convertir silencio en lobby.'
  }
];

function randomMsHastaProximoEvento() {
  const min = Math.max(1, EVENTO_MIN_HORAS) * 60 * 60 * 1000;
  const max = Math.max(EVENTO_MIN_HORAS, EVENTO_MAX_HORAS) * 60 * 60 * 1000;
  return Math.floor(min + Math.random() * (max - min));
}

function buildGameButtons(disabled = false) {
  return new ActionRowBuilder().addComponents(
    JUEGOS.map(juego =>
      new ButtonBuilder()
        .setCustomId(`evento_game_${juego.id}`)
        .setLabel(juego.label)
        .setEmoji(juego.emoji)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled)
    )
  );
}

function buildEventoEmbed(evento, joined, terminado = false) {
  const conteos = JUEGOS
    .map(juego => `${juego.emoji} **${juego.label}** · ${joined[juego.id]?.size || 0}`)
    .join('\n');

  return new EmbedBuilder()
    .setColor(terminado ? '#ffbfdc' : '#ff87bc')
    .setTitle(evento.title)
    .setDescription(`${evento.desc}\n\n${terminado ? 'cerrado por ahora. gracias por tocar botoncitos.' : 'toca un juego si estas para jugar ahora.'}`)
    .addFields({ name: 'botoncitos tocados', value: conteos, inline: false })
    .setFooter({ text: terminado ? 'mewmi vuelve a intentar mas tarde' : 'queda abierto 10 minutos · sin compromiso' });
}

function iniciarEventos(client) {
  async function loop() {
    const delay = randomMsHastaProximoEvento();
    console.log(`proximo evento random en ${Math.floor(delay / 60000)} minutos`);

    setTimeout(async () => {
      try {
        await lanzarEvento(client);
      } catch (err) {
        console.error(err);
      }

      loop();
    }, delay);
  }

  loop();
}

async function lanzarEvento(client) {
  if (!MATCH_CHANNEL_ID) {
    console.warn('No hay CANAL_PARTIDAS_ID/MATCH_CHANNEL_ID para eventos random.');
    return;
  }

  const channel = await client.channels.fetch(MATCH_CHANNEL_ID).catch(() => null);
  if (!channel) return;

  const evento = EVENTOS[Math.floor(Math.random() * EVENTOS.length)];
  const joined = {};
  for (const juego of JUEGOS) joined[juego.id] = new Set();

  const rolesPing = JUEGOS.map(j => `<@&${j.role}>`).join(' ');
  const msg = await channel.send({
    content: `${rolesPing}\n\n✦ mewmi esta viendo si sale algo`,
    embeds: [buildEventoEmbed(evento, joined)],
    components: [buildGameButtons()],
    allowedMentions: { roles: JUEGOS.map(j => j.role) }
  });

  const collector = msg.createMessageComponentCollector({
    time: EVENTO_DURACION_MS
  });

  collector.on('collect', async interaction => {
    const juegoId = interaction.customId.replace('evento_game_', '');
    const juego = JUEGOS.find(j => j.id === juegoId);
    if (!juego) return;

    joined[juego.id].add(interaction.user.id);

    await interaction.reply({
      content: `mrrp~ te anote para **${juego.label}**. si aparece otra, mewmi las junta ♡`,
      flags: 64
    }).catch(() => null);

    await msg.edit({
      embeds: [buildEventoEmbed(evento, joined)],
      components: [buildGameButtons()]
    }).catch(() => null);
  });

  collector.on('end', async () => {
    await msg.edit({
      embeds: [buildEventoEmbed(evento, joined, true)],
      components: [buildGameButtons(true)]
    }).catch(() => null);

    for (const juego of JUEGOS) {
      const ids = [...joined[juego.id]];
      if (!ids.length) continue;

      if (ids.length === 1) {
        await channel.send({
          content: `<@&${juego.role}>`,
          allowedMentions: { roles: [juego.role] },
          embeds: [new EmbedBuilder()
            .setColor(juego.color)
            .setTitle(`✦ alguien busca ${juego.label}`)
            .setDescription(`${ids.map(id => `<@${id}>`).join(', ')} se anoto sola.\n\nmewmi pregunta con mucha educacion: no la dejen colgada ♡`)
            .setFooter({ text: 'pueden armar lobby con /buscar' })]
        }).catch(() => null);

        continue;
      }

      await channel.send({
        content: ids.map(id => `<@${id}>`).join(' '),
        embeds: [new EmbedBuilder()
          .setColor(juego.color)
          .setTitle(`✦ sale ${juego.label}`)
          .setDescription(`mewmi encontro gente para jugar:\n\n${ids.map(id => `<@${id}>`).join(', ')}\n\narmen party antes de que se enfrie la energia ♡`)
          .setFooter({ text: 'si necesitan mas gente, usen /buscar' })]
      }).catch(() => null);
    }
  });
}

module.exports = {
  iniciarEventos,
  lanzarEvento
};
