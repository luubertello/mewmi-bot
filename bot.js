const {
  Client,
  GatewayIntentBits,
  Collection,
  ActivityType
} = require('discord.js');

const fs = require('fs');

require('dotenv').config();
require('./database');

const { iniciarEventos } = require('./events');
const {
  handleJoinButton,
  handleLeaveButton,
  handleCloseButton,
  cerrarLobbiesExpirados
} = require('./services/lobbies');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages
  ]
});

client.commands = new Collection();

const files =
  fs.readdirSync('./commands')
    .filter(f => f.endsWith('.js'));

for (const file of files) {

  const cmd =
    require(`./commands/${file}`);

  client.commands.set(
    cmd.data.name,
    cmd
  );
}

client.once('ready', () => {

  console.log(
    `mrrp~ ${client.user.tag} está en línea ♡`
  );

  client.user.setActivity(
    'armando lobbies y partys',
    { type: ActivityType.Playing }
  );

  cerrarLobbiesExpirados(client)
    .then(n => {
      if (n) console.log(`mewmi cerro ${n} lobbies viejos`);
    })
    .catch(console.error);

  iniciarEventos(client);
});

client.on(
  'interactionCreate',
  async interaction => {

    if (interaction.isButton()) {
      try {
        if (interaction.customId.startsWith('join_lobby_')) {
          return await handleJoinButton(interaction, client);
        }

        if (interaction.customId.startsWith('leave_lobby_')) {
          return await handleLeaveButton(interaction, client);
        }

        if (interaction.customId.startsWith('close_lobby_')) {
          return await handleCloseButton(interaction, client);
        }
      } catch (err) {
        console.error(err);
        return interaction.reply({
          content: 'mewmi tuvo un error con ese boton... intenta de nuevo',
          flags: 64
        }).catch(() => {});
      }
    }

    if (!interaction.isChatInputCommand()) return;

    const cmd =
      client.commands.get(
        interaction.commandName
      );

    if (!cmd) return;

    try {

      await cmd.execute(interaction);

    } catch (err) {

      console.error(err);

      await interaction.reply({
        content:
          'mewmi tuvo un error… intentá de nuevo 🐾',
        ephemeral: true
      }).catch(() => {});
    }
  }
);

client.login(process.env.TOKEN);
