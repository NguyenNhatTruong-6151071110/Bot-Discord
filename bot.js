const { google } = require('googleapis');
const ytStream = require('yt-stream');
const { Client, GatewayIntentBits, SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, Events, EmbedBuilder } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const googleTTS = require('google-tts-api');
const play = require('play-dl');
const axios = require("axios");
const fs = require('fs');
require('dotenv').config();

// -----------------------------------------KHAI BÁO CHUNG
// Initialize Discord client and YouTube API
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ],
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

    new SlashCommandBuilder()
        .setName('batdau')
        .setDescription("Bắt đầu trò chơi Cao thủ nhanh tay"),

    new SlashCommandBuilder()
        .setName('diemso')
        .setDescription("Xem bảng xếp hạng điểm số"),

    new SlashCommandBuilder()
        .setName('themtu')
        .setDescription("Thêm từ vào trò chơi")
        .addStringOption(option => 
            option.setName('word')
                .setDescription('Từ thêm vào trò chơi')
                .setRequired(true)
            ),

    new SlashCommandBuilder()
        .setName('blackjack')
        .setDescription("Bắt đầu chơi Black jack"),
    
    new SlashCommandBuilder()
        .setName('join')
        .setDescription("Tham gia vào trò chơi Black jack"),

    new SlashCommandBuilder()
        .setName('hit')
        .setDescription("Rút thêm bài"),

    new SlashCommandBuilder()
        .setName('stand')
        .setDescription('Dừng rút bài, so điểm với nhà cái'),

    new SlashCommandBuilder()
        .setName('reset')
        .setDescription('Reset game Black jack'),

    new SlashCommandBuilder()
        .setName('banword')
        .setDescription('Thêm từ cần ban')
        .addStringOption(option => 
            option.setName('word')
                .setDescription('Từ cần cấm')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('bridge')
        .setDescription('Bắt đầu game xây cầu'),

    new SlashCommandBuilder()
        .setName('build')
        .setDescription('Xây cầu'),

    new SlashCommandBuilder()
        .setName('tarot')
        .setDescription('Xem bài Tarot để dự đoán tương lai!')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Chọn loại bài')
                .setRequired(true)
                .addChoices(
                    { name: 'Quá khứ', value: 'past' },
                    { name: 'Hiện tại', value: 'present' },
                    { name: 'Tương lai', value: 'future' }
                )),

    new SlashCommandBuilder()
        .setName('2048')
        .setDescription('Bắt đầu game 2048'),

    new SlashCommandBuilder()
        .setName('tictactoe')
        .setDescription('Bắt đầu game tictactoe'),

    new SlashCommandBuilder()
        .setName('doanso')
        .setDescription('Bắt đầu game đoán số'),

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
        } else if (commandName ==='lofi') {
            await handleLofiCommand(interaction);
        } else if (commandName === 'noichu') {
            await handleNoiChuCommand(interaction);
        } else if (commandName === 'diem') {
            await handleDiemCommand(interaction);
        } else if (commandName === "batdau") {
            await handleBatDauCommand(interaction);
        } else if (commandName === "diemso") {
            await handleScoreCommand(interaction);
        }else if (commandName === "themtu") {
            await handleAddWordCommand(interaction);
        } else if (commandName === "blackjack") {
            await handleBlackjackCommand(interaction);
        } else if (commandName === "join") {
            await handleJoinCommand(interaction);
        } else if (commandName === "hit") {
            await handleHitCommand(interaction);
        }else if (commandName === "stand") {
            await handleStandCommand(interaction);
        } else if (commandName === "reset") {
            await handleResetGameCommand(interaction);
        } else if (commandName === "banword") {
            await handleBanWordCommand(interaction);
        } else if (commandName === "build") {
            await handleBridgeBuild(interaction);
        } else if (commandName === "bridge") {
            await handleBridgeStart(interaction);
        } else if (commandName === "tarot") {
            await handleTarotCommand(interaction);
        } else if (commandName === "2048") {
            await handleStart2048Command(interaction);
        } else if (commandName === "tictactoe") {
            await handleTicTacToeCommand(interaction);
        }
        
    } else if (interaction.isButton()) {
        await handleButtonInteraction(interaction);
    }
    
});

// ----------------------------------NHẠC YOUTUBE
const queue = new Map();
// Configure YouTube API
const youtube = google.youtube({
    version: 'v3',
    auth: process.env.YOUTUBE_API_KEY, // Add your API key
});
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

//-------------------------------------------GAME TÀI XỈU
// Lưu điểm của người chơi tài xỉu
const userPointstaixiu = {};
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

//------------------------------------------GAME NỐI CHỮ
//Lưu điểm của người chơi nối chứ
const scores = {};
let ongoingGames = {};
const lastBotWord = {}; // Lưu từ cuối cùng bot đã gửi cho từng người chơi
const API_URL = 'https://vi.wiktionary.org/w/api.php';

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

//-------------------------------------GAME CAO THỦ NHANH TAY
//cao thu nhanh tay
let gameActive = false;
let words = [];
let currentWord = "";
let startTime = 0;
let wordInProgress = false; // Tránh bot gọi nextWord() nhiều lần cùng lúc
let currentTimeout = null; // Dùng để hủy timeout trước đó
const SCORE_FILE = "scores.json";// lưu điểm
const WORDS_FILE = "words.json"; // Lưu danh sách từ
const DEFAULT_WORDS = ["discord", "javascript", "bot", "fast", "game", "challenge", "speed", "react", "typescript", "coding"];

// Đọc điểm từ file JSON
function loadWords() {
    if (!fs.existsSync(WORDS_FILE)) {
      fs.writeFileSync(WORDS_FILE, JSON.stringify(DEFAULT_WORDS, null, 2));
      return [...DEFAULT_WORDS];
    }
    try {
      return JSON.parse(fs.readFileSync(WORDS_FILE, "utf8"));
    } catch {
      return [...DEFAULT_WORDS];
    }
  }
  
  // Lưu danh sách từ vào file
  function saveWords(newWords) {
    fs.writeFileSync(WORDS_FILE, JSON.stringify(newWords, null, 2));
  }
  
  // Đọc điểm số từ file
  function loadScores() {
    if (!fs.existsSync(SCORE_FILE)) {
      fs.writeFileSync(SCORE_FILE, "{}");
      return {};
    }
    try {
      return JSON.parse(fs.readFileSync(SCORE_FILE, "utf8"));
    } catch {
      return {};
    }
  }
  
  // Lưu điểm số vào file
  function saveScores(scores) {
    fs.writeFileSync(SCORE_FILE, JSON.stringify(scores, null, 2));
  }
  
  // Tạo từ khó hơn (ngẫu nhiên viết hoa hoặc thêm số)
  function modifyWord(word) {
    let newWord = word.split("")
      .map(char => (Math.random() > 0.5 ? char.toUpperCase() : char))
      .join("");
    if (Math.random() > 0.5) newWord += Math.floor(Math.random() * 10); // Thêm số
    return newWord;
  }
  
  // Chọn từ tiếp theo và tiếp tục game
  async function nextWord(channel) {
    if (!gameActive || words.length === 0) {
      gameActive = false;
      await channel.send("🏁 **Trò chơi kết thúc! Hết từ để chơi.**");
  
      // Hiển thị leaderboard sau khi kết thúc
      setTimeout(() => {
        handleScoreCommand(channel);
      }, 1000);
  
      return;
    }
  
    if (wordInProgress) return;
    wordInProgress = true;
  
    startTime = Date.now();
    currentWord = modifyWord(words.shift());
    await channel.send(`⚡ Ai gõ nhanh nhất? Hãy nhập từ sau: **${currentWord}**`);
  
    if (currentTimeout) clearTimeout(currentTimeout);
  
    currentTimeout = setTimeout(() => {
      if (gameActive && words.length > 0) {
        wordInProgress = false;
        nextWord(channel);
      } else {
        gameActive = false;
        channel.send("🏁 **Trò chơi kết thúc! Hết từ để chơi.**");
  
        // Gọi bảng xếp hạng
        setTimeout(() => {
          handleScoreCommand(channel);
        }, 1000);
      }
    }, 10000);
  }
  
  
  // Xử lý lệnh bắt đầu game
  async function handleBatDauCommand(interaction) {
    if (gameActive) {
      return interaction.reply({ content: "⚠️ Trò chơi đang diễn ra!", ephemeral: true });
    }
  
    gameActive = true;
    words = Array.isArray(loadWords()) ? [...loadWords()] : [...DEFAULT_WORDS]; // Lấy danh sách từ từ file
    await interaction.reply("🚀 **Bắt đầu trò chơi Cao thủ nhanh tay!**");
  
    nextWord(interaction.channel);
  }
  
  // Hiển thị bảng xếp hạng
  async function handleScoreCommand(target) {
    const scores = loadScores();
    if (!scores || Object.keys(scores).length === 0) {
      return target.send("🏆 **Bảng xếp hạng trống!** Hãy chơi để có điểm.");
    }
  
    // Sắp xếp và hiển thị top điểm
    const leaderboard = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .map(([id, score], index) => `**${index + 1}. <@${id}>** - ${score} điểm`)
      .join("\n");
  
    if (target.reply) {
      // Nếu target là interaction
      await target.reply(`🏆 **Bảng xếp hạng:**\n${leaderboard}`);
    } else {
      // Nếu target là channel (khi gọi từ game)
      await target.send(`🏆 **Bảng xếp hạng:**\n${leaderboard}`);
    }
  }
  
  // Thêm từ mới vào danh sách
  async function handleAddWordCommand(interaction) {
    const newWord = interaction.options.getString("word")?.toLowerCase();
    if (!newWord) return interaction.reply({ content: "⚠️ Bạn cần nhập một từ!", ephemeral: true });
  
    let wordList = loadWords();
    if (wordList.includes(newWord)) {
      return interaction.reply({ content: "⚠️ Từ này đã có trong danh sách!", ephemeral: true });
    }
  
    wordList.push(newWord);
    saveWords(wordList);
    await interaction.reply(`✅ Đã thêm từ **${newWord}** vào danh sách!`);
  }
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !gameActive) return;
  
    if (message.content === currentWord) {
      wordInProgress = false; // Cho phép gọi nextWord() tiếp theo
  
      const reactionTime = ((Date.now() - startTime) / 1000).toFixed(2);
      const scores = loadScores();
      scores[message.author.id] = (scores[message.author.id] || 0) + 1;
      saveScores(scores);
  
      await message.channel.send(`🎉 **${message.author.username}** nhập đúng trong **${reactionTime}s**! (+1 điểm)`);
  
      // Hủy timeout cũ để tránh gọi nextWord() thêm lần nữa
      if (currentTimeout) clearTimeout(currentTimeout);
      nextWord(message.channel);
    }
});

//-------------------------------------------MỞ NHẠC LOFI
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

//-----------------------------------BOT TTS
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

// -------------------------------------------BLACK JACK
const suits = ['♠️', '♥️', '♦️', '♣️'];
const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function getDeck() {
    let deck = [];
    for (let suit of suits) {
        for (let value of values) {
            deck.push({ value, suit });
        }
    }
    return deck.sort(() => Math.random() - 0.5);
}

function calculateHand(hand) {
    let sum = 0;
    let aceCount = 0;
    for (let card of hand) {
        if (['J', 'Q', 'K'].includes(card.value)) sum += 10;
        else if (card.value === 'A') {
            sum += 11;
            aceCount++;
        } else sum += parseInt(card.value);
    }
    if (hand.length >= 4) {
        while (aceCount > 0) {
            sum -= 10;
            aceCount--;
        }
    }
    while (sum > 21 && aceCount > 0) {
        sum -= 10;
        aceCount--;
    }
    return sum;
}

let game = { active: false, players: {} };

async function handleBlackjackCommand(interaction) {
    if (game.active) {
        return await interaction.reply('Ván chơi đang diễn ra! Hãy chờ đến lượt mới.');
    }
    resetGame(); // Reset trước khi bắt đầu
    game.active = true; // Đảm bảo game được kích hoạt
    game.dealerHand = [game.deck.pop(), game.deck.pop()]; // Bắt đầu game mới
    await interaction.reply('🎰 **Ván Xì Dách VIP đã bắt đầu!** Dùng `/join` để tham gia.');
}

function resetGame() {
    game = { active: false, players: {}, deck: getDeck(), dealerHand: [] };
}


async function handleJoinCommand(interaction) {
    if (!game.active) return await interaction.reply('Chưa có ván chơi nào! Hãy dùng `/blackjack` để bắt đầu.');
    let userId = interaction.user.id;
    if (game.players[userId]) return await interaction.reply('Bạn đã tham gia ván này rồi!');
    game.players[userId] = { hand: [game.deck.pop(), game.deck.pop()], stand: false };
    let playerHand = game.players[userId].hand;
    let playerScore = calculateHand(playerHand);
    await interaction.reply(`🎉 **${interaction.user.username} đã tham gia!** Bài của bạn: ${playerHand.map(c => `${c.value}${c.suit}`).join(' ')} (${playerScore})`);
}

async function handleHitCommand(interaction) {
    let userId = interaction.user.id;
    if (!game.players[userId]) return await interaction.reply('Bạn chưa tham gia! Dùng `/join` để vào.');
    let player = game.players[userId];
    if (player.stand) return await interaction.reply('Bạn đã chọn "Stand", không thể rút thêm!');
    player.hand.push(game.deck.pop());
    let playerScore = calculateHand(player.hand);
    let embed = new EmbedBuilder()
        .setTitle(`🃏 Xì Dách VIP - ${interaction.user.username}`)
        .setDescription(`**Bài của bạn:** ${player.hand.map(c => `${c.value}${c.suit}`).join(' ')} (${playerScore})`)
        .setColor('#FFD700');
    if (playerScore > 21) {
        embed.setDescription(`💥 **Bạn quắc! Bạn thua!**\n**Bài của bạn:** ${player.hand.map(c => `${c.value}${c.suit}`).join(' ')} (${playerScore})`);
        player.stand = true;
    }
    await interaction.reply({ embeds: [embed] });
}

async function handleStandCommand(interaction) {
    let userId = interaction.user.id;
    if (!game.players[userId]) return await interaction.reply('Bạn chưa tham gia! Dùng `/join` để vào.');
    game.players[userId].stand = true;
    await interaction.reply(`${interaction.user.username} đã chọn "Stand"!`);
    if (Object.values(game.players).every(p => p.stand)) await handleDealerTurn(interaction);
}

async function handleDealerTurn(interaction) {
    let dealerScore = calculateHand(game.dealerHand);
    while (dealerScore < 17) {
        game.dealerHand.push(game.deck.pop());
        dealerScore = calculateHand(game.dealerHand);
    }

    let embed = new EmbedBuilder()
        .setTitle('🏆 Kết quả ván Xì Dách')
        .setDescription(`**Bài của Dealer:** ${game.dealerHand.map(c => `${c.value}${c.suit}`).join(' ')} (${dealerScore})`)
        .setColor('#FFD700');

    for (let userId in game.players) {
        let player = game.players[userId];
        let playerScore = calculateHand(player.hand);
        let result;

        if (playerScore > 21 || (dealerScore <= 21 && dealerScore > playerScore)) result = '💥 Thua';
        else if (playerScore === dealerScore) result = '🤝 Hòa';
        else result = '🎉 Thắng';

        embed.addFields({ name: `<@${userId}>`, value: `**Bài của bạn:** ${player.hand.map(c => `${c.value}${c.suit}`).join(' ')} (${playerScore})\n${result}`, inline: true });
    }

    game.active = false;

    try {
        await interaction.editReply({ embeds: [embed] });  // Sử dụng editReply thay vì reply
    } catch (error) {
        console.error('Lỗi khi gửi kết quả:', error);
    }

    setTimeout(resetGame, 2000); // Đặt delay để đảm bảo game reset đúng
}

async function handleResetGameCommand(interaction) {
    resetGame();
    await interaction.reply('🔄 **Game đã được reset!** Sử dụng `/blackjack` để bắt đầu ván mới.');
}

// -----------------------------------GAME BAN WORD
const defaultBannedWords = ['ngu', 'gà', 'cặc', 'lồn'];
let bannedWords = [...defaultBannedWords]; // Kết hợp với từ người dùng thêm

async function handleBanWordCommand(interaction) {
    console.log('Nhận lệnh /banword');
    try {
        const word = interaction.options.getString('word');
        if (!word) {
            console.log('Không có từ được nhập!');
            return await interaction.reply('⚠️ Bạn phải nhập một từ để cấm!');
        }
        bannedWords.push(word.toLowerCase());
        console.log(`Đã thêm từ cấm: ${word}`);
        await interaction.reply(`🚫 Từ "${word}" đã được thêm vào danh sách cấm!`);
    } catch (error) {
        console.error('Lỗi khi xử lý /banword:', error);
        await interaction.reply('⚠️ Đã xảy ra lỗi khi xử lý lệnh.');
    }
}

async function handleMessage(message) {
    if (message.author.bot) return;
    console.log(`Tin nhắn nhận được: ${message.content}`);

    if (bannedWords.some(word => message.content.toLowerCase().includes(word))) {
        try {
            const botMember = await message.guild.members.fetch(client.user.id);
            const targetMember = message.member;

            // Kiểm tra xem bot có quyền đổi tên không
            // if (!botMember.permissions.has("ManageNicknames")) {
            //     console.log("❌ Bot không có quyền đổi tên!");
            //     return await message.reply("⚠️ Bot không có quyền đổi tên thành viên.");
            // }

            // Kiểm tra xem bot có vai trò cao hơn không
            // if (targetMember.roles.highest.position >= botMember.roles.highest.position) {
            //     console.log("❌ Bot không thể đổi tên người có vai trò cao hơn!");
            //     return await message.reply("⚠️ Bot không thể đổi tên bạn do vai trò của bạn cao hơn bot.");
            // }

            // Đổi tên thành "Gà Mờ"
            await targetMember.setNickname('Thằng Ngu 🤣');
            //await message.reply('⚠️ Bạn đã vi phạm từ cấm và bị đổi tên thành "Thằng Ngu 🤣"!');
        } catch (error) {
            console.error('Lỗi khi đổi tên:', error);
            //await message.reply("⚠️ Đã xảy ra lỗi khi đổi tên.");
        }
    }
}
client.on('messageCreate', handleMessage);

//-----------------------------------------GAME XÂY CẦU
const bridges = new Map(); // Lưu trạng thái của trò chơi theo từng guild

async function handleBridgeStart(interaction) {
    const guildId = interaction.guildId;
    
    if (bridges.has(guildId)) {
        return interaction.reply({ content: '🚧 Một cây cầu đã được xây! Dùng /build để tiếp tục.', ephemeral: true });
    }
    
    bridges.set(guildId, { progress: 0, failed: false });
    return interaction.reply('🌉 Trò chơi bắt đầu! Dùng /build để chọn vật liệu xây cầu.');
}

async function handleBridgeBuild(interaction) {
    const guildId = interaction.guildId;
    if (!bridges.has(guildId)) {
        return interaction.reply({ content: '❌ Chưa có trò chơi nào đang diễn ra. Dùng /bridge để bắt đầu!', ephemeral: true });
    }

    const game = bridges.get(guildId);
    if (game.failed) {
        return interaction.reply({ content: '💥 Cây cầu đã sập! Dùng /bridge để bắt đầu lại.', ephemeral: true });
    }

    // Chọn ngẫu nhiên kết quả thành công hoặc thất bại
    const success = Math.random() > 0.3;
    if (success) {
        game.progress += 1;
        if (game.progress >= 5) {
            bridges.delete(guildId);
            return interaction.reply('🎉 Bạn đã xây xong cây cầu thành công!');
        }
        return interaction.reply(`✅ Bạn đã thêm một phần vào cầu! Tiến độ: ${game.progress}/5`);
    } else {
        game.failed = true;
        return interaction.reply('💀 Bạn đã chọn vật liệu sai! Cầu sập! Dùng /bridge để thử lại.');
    }
}

//-------------------------------------COI TAROT
const tarotCards = [
    { name: 'The Fool', meaning: 'Khởi đầu mới, sự ngây thơ, tiềm năng.' },
    { name: 'The Magician', meaning: 'Sáng tạo, tập trung, biến ước mơ thành hiện thực.' },
    { name: 'The High Priestess', meaning: 'Trực giác, bí ẩn, sự khôn ngoan.' },
    { name: 'The Empress', meaning: 'Nuôi dưỡng, sáng tạo, tràn đầy năng lượng.' },
    { name: 'The Emperor', meaning: 'Lãnh đạo, quyền lực, kiểm soát.' },
    { name: 'The Hierophant', meaning: 'Truyền thống, niềm tin, học hỏi.' },
    { name: 'The Lovers', meaning: 'Tình yêu, sự gắn kết, lựa chọn khó khăn.' },
    { name: 'The Chariot', meaning: 'Chiến thắng, ý chí mạnh mẽ, sự tiến bộ.' },
    { name: 'Strength', meaning: 'Sức mạnh nội tại, kiên nhẫn, kiểm soát bản thân.' },
    { name: 'The Hermit', meaning: 'Sự cô độc, tìm kiếm ý nghĩa, soi sáng tâm hồn.' },
    { name: 'Wheel of Fortune', meaning: 'Số phận, thay đổi, cơ hội bất ngờ.' },
    { name: 'Justice', meaning: 'Công lý, sự cân bằng, nhân quả.' },
    { name: 'The Hanged Man', meaning: 'Hi sinh, thay đổi quan điểm, nhìn nhận khác đi.' },
    { name: 'Death', meaning: 'Kết thúc, sự thay đổi lớn, tái sinh.' },
    { name: 'Temperance', meaning: 'Sự hòa hợp, cân bằng, kiên nhẫn.' },
    { name: 'The Devil', meaning: 'Cám dỗ, bị trói buộc, dục vọng.' },
    { name: 'The Tower', meaning: 'Sụp đổ bất ngờ, thay đổi mạnh mẽ, cú sốc.' },
    { name: 'The Star', meaning: 'Hy vọng, niềm tin, sự phục hồi.' },
    { name: 'The Moon', meaning: 'Ảo tưởng, sợ hãi, trực giác.' },
    { name: 'The Sun', meaning: 'Hạnh phúc, thành công, sự rõ ràng.' },
    { name: 'Judgement', meaning: 'Sự thức tỉnh, đánh giá lại, bước ngoặt.' },
    { name: 'The World', meaning: 'Hoàn thành, trọn vẹn, thành tựu.' }
];


// Hàm xử lý lệnh Tarot
async function handleTarotCommand(interaction) {
    const type = interaction.options.getString('type');
    const card = tarotCards[Math.floor(Math.random() * tarotCards.length)];

    let typeText = '';
    if (type === 'past') typeText = '🔙 Quá khứ';
    if (type === 'present') typeText = '🔰 Hiện tại';
    if (type === 'future') typeText = '🔮 Tương lai';

    await interaction.reply(`🃏 **Lá bài của bạn:** **${card.name}**\n${typeText}: ${card.meaning}`);
}

//----------------------------------------ĐOÁN SỐ
let gameActives = false;
let targetNumber = 0;

client.on("interactionCreate", async interaction => {
    if (!interaction.isCommand()) return;
    
    if (interaction.commandName === "doanso") {
        if (gameActives) {
            return interaction.reply({ content: "🎮 Trò chơi đang diễn ra! Hãy đoán số.", ephemeral: true });
        }

        gameActives = true;
        targetNumber = Math.floor(Math.random() * 100) + 1;
        
        await interaction.reply("🔢 Tôi đã chọn một số từ **1 đến 100**. Hãy gửi số bạn đoán!");

        const filter = msg => !isNaN(msg.content) && msg.author.id === interaction.user.id;
        const collector = interaction.channel.createMessageCollector({ filter, time: 60000 });

        collector.on("collect", async msg => {
            const guess = parseInt(msg.content);
            if (guess < 1 || guess > 100) {
                msg.reply("⚠️ Vui lòng đoán số từ **1 đến 100**.");
                return;
            }

            if (guess < targetNumber) {
                msg.reply("🔼 **Lớn hơn!**");
            } else if (guess > targetNumber) {
                msg.reply("🔽 **Nhỏ hơn!**");
            } else {
                await interaction.channel.send(`🎉 **Chúc mừng ${msg.author.username}, bạn đã đoán đúng số ${targetNumber}!** 🏆`);
                gameActives = false;
                collector.stop();
            }
        });

        collector.on("end", () => {
            if (gameActives) {
                interaction.channel.send(`⏳ Hết thời gian! Số đúng là **${targetNumber}**.`);
                gameActives = false;
            }
        });
    }
});

client.login(process.env.DISCORD_TOKEN); 
