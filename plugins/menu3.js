const { cmd } = require("../command");
const fetch = require("node-fetch");
const os = require('os');
const moment = require('moment');

cmd(
  {
    pattern: "menu2",
    alias: ["getmenu"],
    react: "🥵",
    desc: "Interactive menu with buttons",
    category: "main",
    filename: __filename,
  },
  async (malvin, mek, m, { from, pushname, reply }) => {
    try {
      const thumb = 'https://files.catbox.moe/l0ixpu.jpg';
      const user = pushname || m.sender.split("@")[0];
      const uptime = moment.duration(process.uptime() * 1000).humanize();
      const usedRam = (process.memoryUsage().rss / 1024 / 1024).toFixed(2) + " MB";
      const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2) + " GB";

      // Menu message text
      let teks = `
𝐘𝐨𝐨  ${user}
*⟦✦⟧  Wᴇʟᴄᴏᴍᴇ Tᴏ 𝗡𝗘𝗢𝗡 𝗫𝗠𝗗  ⟦✦⟧*

╔═══《 🛠 STATUS DETAILS 》═══╗
║ ⚡  *Bot*     : 𝗡𝗘𝗢𝗡 𝗫𝗠𝗗
║ 👤  *User*    : ${user}
║ 📱  *Owner*   : NIMESHKA
║ ⏳  *Uptime*  : ${uptime}
║ 💽  *RAM*     : ${usedRam} / ${totalRam}
║ 🔹  *Prefix*  : .
╚════════════════════════════╝

⟦⚡⟧  *POWERED BY 𝗡𝗜𝗠𝗘𝗦𝗛𝗞𝗔 𝗠𝗜𝗛𝗜𝗥𝗔𝗡*  ⟦⚡⟧*
`;

      // Sections & rows for interactive list
      const listMessage = {
        text: teks,
        footer: 'Click a button to see commands!',
        title: '📜 MENU OPTIONS',
        buttonText: 'View All Menu',
        sections: [
          {
            title: 'Main Commands',
            rows: [
              { title: '.alive', rowId: '.alive' },
              { title: '.menu', rowId: '.menu' },
              { title: '.ai <text>', rowId: '.ai' },
              { title: '.dev', rowId: '.dev' },
              { title: '.about', rowId: '.about' }
            ]
          },
          {
            title: 'Download Commands',
            rows: [
              { title: '.song <text>', rowId: '.song' },
              { title: '.video <text>', rowId: '.video' },
              { title: '.fb <link>', rowId: '.fb' },
              { title: '.tiktok <link>', rowId: '.tiktok' },
              { title: '.dvideo <url>', rowId: '.dvideo' }
            ]
          },
          {
            title: 'Owner Commands',
            rows: [
              { title: '.block', rowId: '.block' },
              { title: '.join', rowId: '.join' },
              { title: '.add', rowId: '.add' },
              { title: '.kick', rowId: '.kick' },
              { title: '.left', rowId: '.left' },
              { title: '.mute', rowId: '.mute' },
              { title: '.unmute', rowId: '.unmute' },
              { title: '.demote', rowId: '.demote' },
              { title: '.promote', rowId: '.promote' },
              { title: '.shutdown', rowId: '.shutdown' },
              { title: '.broadcast', rowId: '.broadcast' },
              { title: '.clearchats', rowId: '.clearchats' },
              { title: '.getdp', rowId: '.getdp' },
              { title: '.update', rowId: '.update' },
              { title: '.settings', rowId: '.settings' },
              { title: '.groupinfo', rowId: '.groupinfo' },
              { title: '.gmdp', rowId: '.gmdp' }
            ]
          },
          {
            title: 'Fun Commands',
            rows: [
              { title: '.joke', rowId: '.joke' },
              { title: '.fact', rowId: '.fact' },
              { title: '.flirt', rowId: '.flirt' },
              { title: '.truth', rowId: '.truth' },
              { title: '.dare', rowId: '.dare' },
              { title: '.pickupline', rowId: '.pickupline' },
              { title: '.char', rowId: '.char' },
              { title: '.spam', rowId: '.spam' },
              { title: '.rm', rowId: '.rm' }
            ]
          },
          {
            title: 'Anime Commands',
            rows: [
              { title: '.loli', rowId: '.loli' },
              { title: '.anime', rowId: '.anime' },
              { title: '.animegirl', rowId: '.animegirl' }
            ]
          },
          {
            title: 'Other Commands',
            rows: [
              { title: '.play2', rowId: '.play2' },
              { title: '.drama', rowId: '.drama' },
              { title: '.movie', rowId: '.movie' },
              { title: '.dog', rowId: '.dog' },
              { title: '.save', rowId: '.save' }
            ]
          },
          {
            title: 'Convert & AI Commands',
            rows: [
              { title: '.sticker <reply img>', rowId: '.sticker' },
              { title: '.img <reply sticker>', rowId: '.img' },
              { title: '.tr <lang> <text>', rowId: '.tr' },
              { title: '.tts <text>', rowId: '.tts' },
              { title: '.fluxai <prompt>', rowId: '.fluxai' },
              { title: '.gf <ask>', rowId: '.gf' }
            ]
          }
        ],
        jpegThumbnail: await (await fetch(thumb)).arrayBuffer()
      };

      // Send interactive list menu
      await malvin.sendMessage(from, listMessage, { quoted: mek });

    } catch (e) {
      console.error(e);
      reply("❌ Menu error:\n" + e.message);
    }
  }
);
