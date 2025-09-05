const { cmd } = require("../command");
const fetch = require("node-fetch");
const os = require('os');
const moment = require('moment');

cmd(
  {
    pattern: "menu3",
    alias: ["getmenu"],
    react: "💞",
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

      // Message text
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

      // List message
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
              { title: '.shutdown', rowId: '.shutdown' }
            ]
          }
        ],
        jpegThumbnail: await (await fetch(thumb)).arrayBuffer()
      };

      await malvin.sendMessage(from, listMessage, { quoted: mek });

    } catch (e) {
      console.error(e);
      reply("❌ Menu error:\n" + e.message);
    }
  }
);
