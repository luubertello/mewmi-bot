const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const db = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('eliminar-perfil')
    .setDescription('eliminar tu perfil de Mewmi 🌙'),

  async execute(interaction) {
    const userId = interaction.user.id;
    const perfil = db.prepare('SELECT * FROM perfiles WHERE user_id = ?').get(userId);
    if (!perfil) return interaction.reply({ content: 'mrrp~ no tenés perfil registrado ♡', ephemeral: true });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('confirmar_eliminar').setLabel('sí, eliminar').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('cancelar_eliminar').setLabel('cancelar ♡').setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor('#ff87bc')
        .setDescription('paw… ¿estás segura? se va a borrar todo tu perfil y configuración de juegos 🌙')
        .setFooter({ text: 'powered by tuna & affection 🐟' })],
      components: [row],
      ephemeral: true
    });

    const coll = await interaction.channel.awaitMessageComponent({
      filter: i => i.user.id === userId && ['confirmar_eliminar', 'cancelar_eliminar'].includes(i.customId),
      time: 30000
    }).catch(() => null);

    if (!coll || coll.customId === 'cancelar_eliminar') {
      return interaction.editReply({ content: 'mrrp~ cancelado, tu perfil sigue acá ♡', components: [], embeds: [] });
    }

    const deletes = [
      'DELETE FROM juegos_config WHERE user_id = ?',
      'DELETE FROM lobby_miembros WHERE user_id = ?',
      'DELETE FROM hitos WHERE user_id = ?',
      'DELETE FROM partidas WHERE user_id = ?',
      'DELETE FROM duos_historial WHERE user_id = ? OR partner_id = ?',
      'DELETE FROM reputacion WHERE user_id = ?',
      'DELETE FROM favoritas WHERE user_id = ? OR favorita_id = ?',
      'DELETE FROM cumples WHERE user_id = ?',
      'DELETE FROM cuentas_vinculadas WHERE user_id = ?',
      'DELETE FROM stats_cache WHERE user_id = ?',
      'DELETE FROM coins WHERE user_id = ?',
      'DELETE FROM perfiles WHERE user_id = ?',
    ];

    for (const query of deletes) {
      const placeholders = (query.match(/\?/g) || []).length;
      db.prepare(query).run(...Array(placeholders).fill(userId));
    }

    await coll.update({ content: 'mewmi te va a extrañar… hasta la próxima 🐾', components: [], embeds: [] });
  }
};
