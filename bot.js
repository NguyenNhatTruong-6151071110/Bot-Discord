const ytdl = require('ytdl-core'); // Đảm bảo đã cập nhật
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

client.once('ready', () => {
    console.log(`Bot đã sẵn sàng với tên: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const args = message.content.split(' ');
    const command = args.shift().toLowerCase();

    if (command === '%play') {
        if (!args[0]) {
            return message.reply('Vui lòng cung cấp liên kết YouTube!');
        }

        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {
            return message.reply('Bạn cần tham gia kênh thoại để phát nhạc!');
        }

        const permissions = voiceChannel.permissionsFor(message.client.user);
        if (!permissions.has('Connect') || !permissions.has('Speak')) {
            return message.reply('Bot không có quyền kết nối hoặc phát nhạc trong kênh này!');
        }

        try {
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator,
            });

            const stream = ytdl(args[0], { filter: 'audioonly', quality: 'highestaudio' });
            const resource = createAudioResource(stream);
            const player = createAudioPlayer();

            player.play(resource);
            connection.subscribe(player);

            player.on('error', (error) => {
                console.error('Lỗi phát nhạc:', error);
                message.channel.send('Đã xảy ra lỗi khi phát nhạc.');
            });

            message.reply(`🎶 Đang phát: ${args[0]}`);
        } catch (error) {
            console.error('Lỗi khi phát nhạc:', error);
            message.reply('Không thể phát nhạc. Đảm bảo rằng liên kết YouTube hợp lệ.');
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
