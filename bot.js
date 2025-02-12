const { google } = require('googleapis');
const ytStream = require('yt-stream');
const { Client, GatewayIntentBits, SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
require('dotenv').config();

// Initialize Discord client and YouTube API
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

const queue = new Map();

// Configure YouTube API
const youtube = google.youtube({
    version: 'v3',
    auth: process.env.YOUTUBE_API_KEY, // Add your API key
});

// Register slash commands
const commands = [
    new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play music from YouTube. Supports multiple links or song names separated by commas.')
        .addStringOption(option =>
            option
                .setName('url')
                .setDescription('YouTube link or song name.')
                .setRequired(true)
        ),
].map(command => command.toJSON());

const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('🔄 Registering slash commands...');
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );
        console.log('✅ Slash commands registered!');
    } catch (error) {
        console.error('❌ Error registering slash commands:', error);
    }
})();

client.once('ready', () => {
    console.log(`✅ Bot is ready as: ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
    if (interaction.isCommand() && interaction.commandName === 'play') {
        await handlePlayCommand(interaction);
    } else if (interaction.isButton()) {
        await handleButtonInteraction(interaction);
    }
});

async function handlePlayCommand(interaction) {
    const input = interaction.options.getString('url');
    const inputs = input.split(',').map(i => i.trim()).filter(Boolean);
    const { guildId, member } = interaction;
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
        return interaction.reply('⚠️ You need to join a voice channel first!');
    }

    const permissions = voiceChannel.permissionsFor(interaction.client.user);
    if (!permissions.has('Connect') || !permissions.has('Speak')) {
        return interaction.reply('⚠️ I need permissions to join and speak in your voice channel!');
    }

    let serverQueue = queue.get(guildId);
    if (!serverQueue || !serverQueue.connection) {
        serverQueue = {
            voiceChannel,
            connection: null,
            songs: [],
            player: createAudioPlayer(),
        };

        queue.set(guildId, serverQueue);

        try {
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId,
                adapterCreator: interaction.guild.voiceAdapterCreator,
            });

            serverQueue.connection = connection;
            connection.subscribe(serverQueue.player);
        } catch (error) {
            console.error('❌ Error connecting to voice channel:', error);
            queue.delete(guildId);
            return interaction.reply('❌ Unable to connect to voice channel!');
        }
    }

    const songs = [];

    for (const query of inputs) {
        if (!query) continue;
        try {
            let songInfo;
            if (query.startsWith('http')) {
                const videoId = query.split('v=')[1].split('&')[0];
                songInfo = await youtube.videos.list({
                    part: 'snippet,contentDetails',
                    id: videoId,
                });
                const video = songInfo.data.items[0];
                const streamInfo = await ytStream.stream(query);
                songs.push({
                    title: video.snippet.title || query,
                    url: query,
                    stream: streamInfo.stream,
                    type: streamInfo.type,
                });
            } else {
                const searchResult = await youtube.search.list({
                    part: 'snippet',
                    q: query,
                    maxResults: 1,
                    type: 'video',
                });

                if (searchResult.data.items.length > 0) {
                    const video = searchResult.data.items[0];
                    const streamInfo = await ytStream.stream(`https://www.youtube.com/watch?v=${video.id.videoId}`);
                    songs.push({
                        title: video.snippet.title,
                        url: `https://www.youtube.com/watch?v=${video.id.videoId}`,
                        stream: streamInfo.stream,
                        type: streamInfo.type,
                    });
                } else {
                    interaction.channel.send(`❌ No songs found for: "${query}"`);
                    continue;
                }
            }
        } catch (error) {
            console.error(`❌ Error processing input "${query}":`, error);
        }
    }

    if (songs.length === 0) {
        return interaction.reply('❌ No valid songs found in the list.');
    }

    serverQueue.songs.push(...songs);

    if (serverQueue.songs.length === songs.length) {
        playNextSong(guildId, interaction);
    }

    interaction.reply(`🎶 Added ${songs.length} songs to the queue.`);
}


async function handleButtonInteraction(interaction) {
    const { guildId } = interaction;
    const serverQueue = queue.get(guildId);

    if (!serverQueue) {
        return interaction.reply({ content: '🔇 The queue is empty.', ephemeral: true });
    }

    const action = interaction.customId;

    switch (action) {
        case 'skip':
            serverQueue.player.stop();
            interaction.reply('⏭️ Skipping to the next song!');
            break;

        case 'pause':
            serverQueue.player.pause();
            interaction.reply('⏸️ Paused the current song.');
            break;

        case 'resume':
            serverQueue.player.unpause();
            interaction.reply('▶️ Resumed playing the current song.');
            break;

        case 'queue_list': {
            // Lấy số trang từ nội dung nút hoặc mặc định là 1
            const page = parseInt(interaction.message?.components?.[0]?.components?.[0]?.label.split(' ')[1]) || 1;
            const songsPerPage = 5;
            const start = (page - 1) * songsPerPage;
            const end = start + songsPerPage;

            const songList = serverQueue.songs.slice(start, end).map((song, index) => `${start + index + 1}. ${song.title}`).join('\n');

            const totalPages = Math.ceil(serverQueue.songs.length / songsPerPage);

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setCustomId('prev_page').setLabel('⬅️ Previous').setStyle(ButtonStyle.Secondary).setDisabled(page === 1),
                    new ButtonBuilder().setCustomId('next_page').setLabel('➡️ Next').setStyle(ButtonStyle.Secondary).setDisabled(page === totalPages)
                );

            interaction.update({
                content: `🎶 Song list (Page ${page}/${totalPages}):\n${songList || 'No songs available.'}`,
                components: [row],
            });
            break;
        }

        case 'prev_page': {
            const currentPage = parseInt(interaction.message?.content.match(/Page (\d+)/)?.[1]) || 1;
            const prevPage = Math.max(1, currentPage - 1);
            interaction.customId = 'queue_list';
            interaction.message.components[0].components[0].label = `Page ${prevPage}`;
            handleButtonInteraction(interaction);
            break;
        }

        case 'next_page': {
            const currentPage = parseInt(interaction.message?.content.match(/Page (\d+)/)?.[1]) || 1;
            const nextPage = currentPage + 1;
            interaction.customId = 'queue_list';
            interaction.message.components[0].components[0].label = `Page ${nextPage}`;
            handleButtonInteraction(interaction);
            break;
        }

        default:
            interaction.reply({ content: '⚠️ Invalid interaction.', ephemeral: true });
    }
}

function playNextSong(guildId, interaction) {
    const serverQueue = queue.get(guildId);

    if (!serverQueue || serverQueue.songs.length === 0) {
        //if (serverQueue?.connection) {
            //serverQueue.connection.destroy();
        //}
        queue.delete(guildId);
        return;
    }

    const currentSong = serverQueue.songs[0];
    const resource = createAudioResource(currentSong.stream, { inputType: currentSong.type });
    serverQueue.player.play(resource);

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('skip').setLabel('⏭️ Bỏ qua').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('pause').setLabel('⏸️ Tạm dừng').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('resume').setLabel('▶️ Tiếp tục').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('queue_list').setLabel('🎶 Danh sách bài hát').setStyle(ButtonStyle.Secondary)
        );

    interaction.channel.send({
        content: `🎵 Tao đang hát cho chúng mày nghe bài: ${currentSong.title}`,
        components: [row],
    });

    serverQueue.player.once(AudioPlayerStatus.Idle, () => {
        serverQueue.songs.shift();
        playNextSong(guildId, interaction);
    });
}

client.login(process.env.DISCORD_TOKEN); 
