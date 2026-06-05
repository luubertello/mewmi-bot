const {
  SlashCommandBuilder,
  PermissionFlagsBits
} = require('discord.js');

const {
  lanzarEvento
} = require('../events');

module.exports = {

  data: new SlashCommandBuilder()

    .setName('evento')

    .setDescription(
      'lanza un evento manualmente'
    )

    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator
    ),

  async execute(interaction) {

    await interaction.reply({
      content:
        '✦ lanzando evento...',
      ephemeral: true
    });

    await lanzarEvento(
      interaction.client
    );
  }
};