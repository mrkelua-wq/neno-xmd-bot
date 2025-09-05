const { cmd } = require("../command");
const fetch = require("node-fetch");
const os = require('os');
const moment = require('moment');

cmd(
  {
    pattern: "menu",
    alias: ["getmenu"],
    react: "😏",
    desc: "Interactive menu with 2 buttons only",
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

      const listMessage = {
        text: teks,
        footer: 'Click a button!',
        title: '📜 MENU OPTIONS',
        buttonText: 'Main Commands',
        sections: [
          {
            title: 'Main Commands',
            rows: [
              { title: '.alive', rowId: '.alive' },
              { title: '.menu', rowId: '.menu' }
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
