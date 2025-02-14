const { google } = require('googleapis');
const ytStream = require('yt-stream');
const { Client, GatewayIntentBits, SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const googleTTS = require('google-tts-api');
const play = require('play-dl');
const axios = require("axios");
const fs = require('fs');
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

// Lưu điểm của người chơi tài xỉu
const userPointstaixiu = {};

//Lưu điểm của người chơi nối chứ
const scores = {};
let ongoingGames = {};
const lastBotWord = {}; // Lưu từ cuối cùng bot đã gửi cho từng người chơi
const API_URL = 'https://vi.wiktionary.org/w/api.php';


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

    new SlashCommandBuilder()
        .setName('lofi')
        .setDescription('Play Lofi 24/24'),

    new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip to the next song in the queue.'),

    new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pause the current song.'),

    new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Resume playing the paused song.'),

    new SlashCommandBuilder()
        .setName('list')
        .setDescription('Show the current queue of songs.'),

    new SlashCommandBuilder()
        .setName('say')
        .setDescription('Bot say')
        .addStringOption(option =>
            option.setName('input')
                .setDescription('Nội dung bạn muốn bot đọc')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('taixiu')
        .setDescription('Chơi tài xỉu')
        .addStringOption(option =>
            option.setName('bet')
                .setDescription('Chọn Tài hoặc Xỉu')
                .setRequired(true)
                .addChoices(
                    { name: 'Tài', value: 'tai' },
                    { name: 'Xỉu', value: 'xiu' }
                )
        )
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Số tiền cược')
                .setRequired(true)
        ),
        new SlashCommandBuilder()
        .setName('noichu')
        .setDescription('Chơi nối chữ với bot!')
        .addStringOption(option =>
            option.setName('input')
                .setDescription('Nhập từ của bạn')
                .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName('diem')
        .setDescription('Xem điểm của bạn'),

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
    if (interaction.isCommand()) {
        const { commandName } = interaction;

        if (commandName === 'play') {
            await handlePlayCommand(interaction);
        } else if (commandName === 'skip') {
            await handleSkipCommand(interaction);
        } else if (commandName === 'pause') {
            await handlePauseCommand(interaction);
        } else if (commandName === 'resume') {
            await handleResumeCommand(interaction);
        } else if (commandName === 'list') {
            await handleListCommand(interaction);
        } else if (commandName === 'say') {
            await handleTTSCommand(interaction);
        } else if (commandName === 'taixiu') {
            await handleTaiXiuCommand(interaction);
        } else if (commandName ==='lofi'){
            await handleLofiCommand(interaction);
        } else if (commandName === 'noichu'){
            await handleNoiChuCommand(interaction);
        } else if (commandName === 'diem'){
            await handleDiemCommand(interaction);
        }
    } else if (interaction.isButton()) {
        await handleButtonInteraction(interaction);
    }

    
});

//noichu
// Hàm tìm từ từ Google
async function fetchWordList(startingWord) {
    try {
        const response = await axios.get(API_URL, {
            params: {
                action: 'query',
                list: 'allpages',
                apfrom: startingWord,
                aplimit: 10,
                format: 'json'
            }
        });
        return response.data.query.allpages.map(page => page.title);
    } catch (error) {
        console.error('Error fetching word list:', error);
        return [];
    }
}

async function handleNoiChuCommand(interaction) {
    const userId = interaction.user.id;
    const userInput = interaction.options.getString('input').trim().toLowerCase();
    
    if (!ongoingGames[userId]) {
        ongoingGames[userId] = [];
    }
    
    ongoingGames[userId].push(userInput);
    const words = userInput.split(' ');
    const lastWord = words[words.length - 1];
    const wordList = await fetchWordList(lastWord);
    
    if (wordList.length === 0) {
        scores[userId] = (scores[userId] || 0) + 10;
        delete ongoingGames[userId];
        return interaction.reply(`Bạn đã nhập: **${userInput}**\nBot không tìm được từ nào! Bạn thắng và được cộng 10 điểm. Điểm hiện tại: ${scores[userId]}`);
    }
    
    const botWords = wordList.find(word => word.split(' ').length === 2) || (wordList[0] + ' gì đó');
    ongoingGames[userId].push(botWords);
    
    await interaction.reply(`Bạn đã nhập: **${userInput}**\nBot nối: **${botWords}**. Hãy tiếp tục!`);
}

async function handleDiemCommand(interaction) {
    const userId = interaction.user.id;
    scores[userId] = scores[userId] || 0;
    await interaction.reply(`Điểm của bạn: ${scores[userId]}`);
}

//mo nhac lofi
async function handleLofiCommand(interaction) {
    try {
        if (!interaction.member.voice.channel) {
            return interaction.reply({ content: 'Bạn cần tham gia kênh thoại trước!', ephemeral: true });
        }

        await interaction.deferReply();

        const connection = joinVoiceChannel({
            channelId: interaction.member.voice.channel.id,
            guildId: interaction.guild.id,
            adapterCreator: interaction.guild.voiceAdapterCreator,
        });

        const player = createAudioPlayer();
        connection.subscribe(player);

        async function playLofi() {
            const stream = await play.stream('https://www.youtube.com/watch?v=jfKfPfyJRdk');
            const resource = createAudioResource(stream.stream, { inputType: stream.type });
            player.play(resource);
        }

        await playLofi();

        player.on(AudioPlayerStatus.Idle, async () => {
            console.log('🔄 Phát lại nhạc Lofi...');
            await playLofi();
        });

        interaction.followUp('🎵 Đang phát Lofi 24/24!');
    } catch (error) {
        console.error('Lỗi khi xử lý lệnh lofi:', error);
        interaction.followUp('❌ Đã xảy ra lỗi khi phát nhạc lofi.');
    }
}

//nho bot noi chuyen
async function handleTTSCommand(interaction) {
    const text = interaction.options.getString('input');
    if (!text) {
        await interaction.reply('❌ Vui lòng nhập nội dung để đọc!');
        return;
    }

    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
        await interaction.reply('❌ Bạn cần tham gia một kênh thoại trước!');
        return;
    }

    try {
        const url = googleTTS.getAudioUrl(text, { lang: 'vi', slow: false });
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        });

        const player = createAudioPlayer();
        const resource = createAudioResource(url);
        player.play(resource);
        connection.subscribe(player);

        await interaction.reply(`🔊 Đọc: "${text}"`);
    } catch (error) {
        console.error(error);
        await interaction.reply('❌ Lỗi khi phát TTS.');
    }
}

// game tai xiu
async function handleTaiXiuCommand(interaction) {
    const userId = interaction.user.id;
    const betChoice = interaction.options.getString('bet');
    const betAmount = interaction.options.getInteger('amount');

    // Kiểm tra điểm của người chơi
    if (!userPointstaixiu[userId]) {
        userPointstaixiu[userId] = 1000; // Mặc định có 1000 điểm
    }

    if (betAmount <= 0 || betAmount > userPointstaixiu[userId]) {
        await interaction.reply('❌ Bạn không có đủ điểm để cược hoặc nhập số tiền cược không hợp lệ!');
        return;
    }

    // Tung xúc xắc
    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    const dice3 = Math.floor(Math.random() * 6) + 1;
    const total = dice1 + dice2 + dice3;

    const result = total >= 11 ? 'tai' : 'xiu';
    let message = `🎲 Kết quả: ${dice1} + ${dice2} + ${dice3} = **${total}** → ${result === 'tai' ? '🔴 Tài' : '🔵 Xỉu'}`;

    if (betChoice === result) {
        userPointstaixiu[userId] += betAmount;
        message += `
🎉 Bạn thắng! +${betAmount} điểm
💰 Số dư hiện tại: ${userPointstaixiu[userId]} điểm`;
    } else {
        userPointstaixiu[userId] -= betAmount;
        message += `
😢 Bạn thua! -${betAmount} điểm
💰 Số dư hiện tại: ${userPointstaixiu[userId]} điểm`;
    }

    await interaction.reply(message);
}

// mo nhac youtube
async function handlePlayCommand(interaction) {
    const input = interaction.options.getString('url');
    const inputs = input.split(',').map(i => i.trim()).filter(Boolean);
    const { guildId, member } = interaction;
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
        return interaction.reply('⚠️ Bạn cần tham gia một kênh thoại trước!');
    }

    const permissions = voiceChannel.permissionsFor(interaction.client.user);
    if (!permissions.has('Connect') || !permissions.has('Speak')) {
        return interaction.reply('⚠️ Tôi cần quyền kết nối và nói trong kênh thoại này!');
    }

    let serverQueue = queue.get(guildId);

    // Kiểm tra nếu bot đã bị kick, xóa hàng đợi cũ để đảm bảo bot có thể vào lại
    if (serverQueue && !voiceChannel.members.has(client.user.id)) {
        queue.delete(guildId);
        serverQueue = null;
    }

    if (!serverQueue) {
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
                selfDeaf: false, // Không tự động mute bot
                selfMute: false, // Không tự động tắt mic
            });

            serverQueue.connection = connection;
            connection.subscribe(serverQueue.player);
        } catch (error) {
            console.error('❌ Lỗi khi kết nối lại kênh thoại:', error);
            queue.delete(guildId);
            return interaction.reply('❌ Không thể kết nối lại kênh thoại!');
        }
    }

    const songs = [];

    for (const query of inputs) {
        if (!query) continue;
        try {
            let songInfo;
            if (query.startsWith('http')) {
                const videoId = query.split('v=')[1]?.split('&')[0];
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
                    interaction.channel.send(`❌ Không tìm thấy bài hát nào cho: "${query}"`);
                    continue;
                }
            }
        } catch (error) {
            console.error(`❌ Lỗi khi xử lý input "${query}":`, error);
        }
    }

    if (songs.length === 0) {
        return interaction.reply('❌ Không có bài hát hợp lệ nào trong danh sách.');
    }

    serverQueue.songs.push(...songs);

    if (serverQueue.songs.length === songs.length) {
        playNextSong(guildId, interaction);
    }

    interaction.reply(`🎶 Đã thêm ${songs.length} bài hát vào danh sách.`);
}

async function handleSkipCommand(interaction) {
    const { guildId } = interaction;
    const serverQueue = queue.get(guildId);

    if (!serverQueue || serverQueue.songs.length === 0) {
        return interaction.reply('🔇 Không có bài hát nào để bỏ qua.');
    }

    serverQueue.player.stop();
    interaction.reply('⏭️ Đã bỏ qua bài hát hiện tại!');
}
async function handlePauseCommand(interaction) {
    const { guildId } = interaction;
    const serverQueue = queue.get(guildId);

    if (!serverQueue || serverQueue.songs.length === 0) {
        return interaction.reply('🔇 Không có bài hát nào để tạm dừng.');
    }

    serverQueue.player.pause();
    interaction.reply('⏸️ Đã tạm dừng bài hát.');
}
async function handleResumeCommand(interaction) {
    const { guildId } = interaction;
    const serverQueue = queue.get(guildId);

    if (!serverQueue || serverQueue.songs.length === 0) {
        return interaction.reply('🔇 Không có bài hát nào để tiếp tục phát.');
    }

    serverQueue.player.unpause();
    interaction.reply('▶️ Đã tiếp tục phát bài hát.');
}
async function handleListCommand(interaction) {
    const { guildId } = interaction;
    const serverQueue = queue.get(guildId);

    if (!serverQueue || serverQueue.songs.length === 0) {
        return interaction.reply('📭 Hàng đợi trống.');
    }

    const songList = serverQueue.songs
        .map((song, index) => `${index + 1}. ${song.title}`)
        .join('\n');

    interaction.reply(`🎶 Danh sách bài hát:\n${songList}`);
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
