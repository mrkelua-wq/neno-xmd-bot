const { cmd } = require("../command");
const os = require("os");
const moment = require("moment");

// Node 18+ version වල fetch default තිබෙනවා
// නැත්තම්: npm install node-fetch
// const fetch = require("node-fetch");

cmd(
  {
    pattern: "menu2",
    alias: ["getmenu"],
    react: "🥳",
    desc: "Interactive menu with buttons",
    category: "main",
    filename: __filename,
  },
  async (malvin, mek, m, { from, pushname, reply }) => {
    try {
      const user = pushname || m.sender.split("@")[0];
      const uptime = moment.duration(process.uptime() * 1000).humanize();
      const usedRam = (process.memoryUsage().rss / 1024 / 1024).toFixed(2) + " MB";
      const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2) + " GB";
      const thumb = "https://files.catbox.moe/l0ixpu.jpg";

      // Send loading reaction
      await malvin.sendMessage(from, { react: { text: "⏳", key: m.key } });

      // Menu text
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

      // Interactive list message
      const listMessage = {
        text: teks,
        footer: "Click a button to see commands!",
        title: "📜 MENU OPTIONS",
        buttonText: "View All Menu",
        sections: [
          {
            title: "Main Commands",
            rows: [
              { title: ".alive", rowId: ".alive" },
              { title: ".menu", rowId: ".menu" },
              { title: ".getmenu", rowId: ".getmenu" },
            ],
          },
          {
            title: "Download Commands",
            rows: [
              { title: ".song <text>", rowId: ".song" },
              { title: ".video <text>", rowId: ".video" },
              { title: ".fb <link>", rowId: ".fb" },
              { title: ".tiktok <link>", rowId: ".tiktok" },
              { title: ".dvideo <url>", rowId: ".dvideo" },
            ],
          },
          {
            title: "Owner Commands",
            rows: [
              { title: ".block", rowId: ".block" },
              { title: ".join", rowId: ".join" },
              { title: ".add", rowId: ".add" },
              { title: ".kick", rowId: ".kick" },
              { title: ".shutdown", rowId: ".shutdown" },
            ],
          },
        ],
        // Convert image to buffer for thumbnail
        jpegThumbnail: await (await fetch(thumb)).arrayBuffer(),
      };

      // Send the list message
      await malvin.sendMessage(from, listMessage, { quoted: mek });

      // Success reaction
      await malvin.sendMessage(from, { react: { text: "✅", key: m.key } });
    } catch (e) {
      console.error(e);
      reply("❌ Menu error:\n" + e.message);
    }
  }
);
