import { Client, GatewayIntentBits, Partials, EmbedBuilder } from "discord.js";
import fs from "fs";
import path from "path";
import botConfig from "./config/botConfig.js"; // ← your big config file

// Load config.json
const config = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "config.json"))
);

const token = config.token;
const prefix = config.prefix;
const delay = parseInt(config.delay);
const log_dms = config.log_dms;

// Bot instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel]
});

// Ready event
client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// Message handler
client.on("messageCreate", async (message) => {
    if (!message.content.startsWith(prefix)) return;
    if (message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    // SEND / DMALL
    if (cmd === "send" || cmd === "dmall") {
        const text = args.join(" ").trim();
        if (!text) return message.reply("Please provide a message.");

        const members = await message.guild.members.fetch();
        let count = members.size;

        await message.reply(`${count} members detected, this might take a while`);

        for (const [id, member] of members) {
            if (member.user.id === client.user.id || member.user.bot) {
                if (log_dms.toLowerCase() === "on") {
                    await message.channel.send(`❌ Skipped ${member.user.username}`);
                }
                count--;
                continue;
            }

            try {
                await member.send(text);
                if (log_dms.toLowerCase() === "on") {
                    await message.channel.send(`✔️ Sent message to ${member.user.username}`);
                }
            } catch {
                if (log_dms.toLowerCase() === "on") {
                    await message.channel.send(`✔️ Could not DM ${member.user.username}`);
                }
                count--;
            }

            await new Promise(res => setTimeout(res, delay));
        }

        await message.reply(`✔️ DM sent to ${count} members`);
    }

    // DM SPECIFIC USER
    if (cmd === "dm" || cmd === "idm") {
        const user = message.mentions.users.first();
        const text = args.slice(1).join(" ");

        if (!user || !text) {
            return message.reply(`Usage: \`${prefix}dm <user> <message>\``);
        }

        try {
            await user.send(text.replace(`<@${user.id}>`, ""));
            await message.reply(`Message sent to ${user.tag} ✔️`);
        } catch {
            await message.reply(`Could not send message to ${user.tag} ❌`);
        }
    }

    // LATENCY / PING
    if (cmd === "latency" || cmd === "ping" || cmd === "ltc") {
        const ms = Math.round(client.ws.ping);
        let color = 0x000000;

        if (ms <= 50) color = 0x000000;
        else if (ms <= 100) color = 0x00FF00;
        else if (ms <= 300) color = 0x00FFFF;
        else color = 0xFF0000;

        const embed = new EmbedBuilder()
            .setTitle(cmd === "ping" ? "Ping" : "Latency")
            .setDescription(`Latency: ${ms}ms`)
            .setColor(color);

        await message.reply({ embeds: [embed] });
    }

    // HELP
    if (cmd === "help" || cmd === "helpme" || cmd === "how") {
        const embed = new EmbedBuilder()
            .setTitle(client.user.username)
            .addFields(
                {
                    name: "Send",
                    value: `DMs all members\nUsage: \`${prefix}send <message>\``,
                },
                {
                    name: "DM",
                    value: `DMs a specific member\nUsage: \`${prefix}dm <user> <message>\``,
                },
                {
                    name: "Latency",
                    value: `Shows bot latency\nUsage: \`${prefix}latency\``,
                },
                {
                    name: "Help",
                    value: `Shows all commands\nUsage: \`${prefix}help\``,
                }
            )
            .setFooter({ text: "Made by INVADER <3" })
            .setColor(0x00FFFF);

        await message.reply({ embeds: [embed] });
    }
});

// Login
client.login(token);
