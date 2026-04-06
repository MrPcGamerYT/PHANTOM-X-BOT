const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

const admin = require('firebase-admin');
const express = require('express'); // Add Express for web server
const app = express();

// 🔒 ENV CONFIG (Render)
const TOKEN = process.env.TOKEN;
const ROLE_ID = "1486399127683203163";
const CHANNEL_ID = "1490730773710635059";
const GUILD_ID = "1380048834876674108";

// 🔥 FIREBASE FROM ENV
const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// 🔹 EXPRESS ROUTE
app.get('/', (req, res) => res.send('Bot is running!'));

// 🔹 PORT BINDING REQUIRED FOR RENDER FREE
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Web server listening on port ${PORT}`));

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

// 🔥 READY
client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  try {
    const channel = await client.channels.fetch(CHANNEL_ID);

    const messages = await channel.messages.fetch({ limit: 10 });
    const alreadyExists = messages.some(msg =>
      msg.author.id === client.user.id &&
      msg.components.length > 0
    );

    if (alreadyExists) {
      console.log("⚠️ Button already exists, skipping...");
      return;
    }

    const button = new ButtonBuilder()
      .setCustomId("create_account")
      .setLabel("Create A New User And Pass")
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);

    await channel.send({
      content: "# 🔥 To Create A New User And Pass Click 'Create A New User And Pass' Button 🔥",
      components: [row]
    });

  } catch (err) {
    console.log("Channel error:", err);
  }
});

// 🔥 INTERACTIONS
client.on('interactionCreate', async interaction => {

  // 🔒 SERVER LOCK
  if (interaction.guild && interaction.guild.id !== GUILD_ID) {
    return interaction.reply({
      content: "❌ This bot is private.",
      ephemeral: true
    });
  }

  // BUTTON
  if (interaction.isButton()) {
    if (interaction.customId === "create_account") {

      const modal = new ModalBuilder()
        .setCustomId("account_modal")
        .setTitle("Create Account");

      const email = new TextInputBuilder()
        .setCustomId("email")
        .setLabel("Email")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const password = new TextInputBuilder()
        .setCustomId("password")
        .setLabel("Password")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(email),
        new ActionRowBuilder().addComponents(password)
      );

      await interaction.showModal(modal);
    }
  }

  // MODAL SUBMIT
  if (interaction.isModalSubmit()) {
    if (interaction.customId === "account_modal") {

      // 🔒 ROLE CHECK
      if (!interaction.member.roles.cache.has(ROLE_ID)) {
        return interaction.reply({
          content: "❌ You don't have permission.",
          ephemeral: true
        });
      }

      const email = interaction.fields.getTextInputValue("email");
      const password = interaction.fields.getTextInputValue("password");

      if (password.length < 6) {
        return interaction.reply({
          content: "❌ Password must be at least 6 characters.",
          ephemeral: true
        });
      }

      try {
        await admin.auth().createUser({ email, password });

        await interaction.reply({
          content: "✅ Account created successfully!",
          ephemeral: true
        });

      } catch (err) {
        console.log(err);

        let msg = "❌ Error creating account.";

        if (err.code === 'auth/email-already-exists') {
          msg = "❌ Email already exists.";
        }

        await interaction.reply({
          content: msg,
          ephemeral: true
        });
      }
    }
  }
});

client.login(TOKEN);
