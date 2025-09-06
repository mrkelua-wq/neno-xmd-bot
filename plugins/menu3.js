// plugins/menu.js
const { cmd } = require("../command");

cmd(
  {
    pattern: "menu",
    desc: "Main Menu",
    category: "main",
    filename: __filename,
  },
  async (conn, mek) => {
    let menuText = `
*⟦✦⟧  Wᴇʟᴄᴏᴍᴇ Tᴏ 𝗡𝗘𝗢𝗡 𝗫𝗠𝗗  ⟦✦⟧*

╔═══《 🛠 STATUS DETAILS 》═══╗
║ ⚡  *Bot*     : 𝗡𝗘𝗢𝗡 𝗫𝗠𝗗
║ 👤  *User*    : ${mek.pushName}
║ 📱  *Owner*   : NIMESHKA
║ ⏳  *Uptime*  : ${process.uptime().toFixed(0)}s
║ 💽  *RAM*     : ${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB
║ 🔹  *Prefix*  : .
╚════════════════════════════╝

╔═══《 📜 MENU CATEGORIES 》═══╗
║ 1️⃣  MAIN COMMANDS
║ 2️⃣  DOWNLOAD COMMANDS
║ 3️⃣  OWNER COMMANDS
║ 4️⃣  FUN COMMANDS
║ 5️⃣  ANIME COMMANDS
║ 6️⃣  OUTHER COMMANDS
║ 7️⃣  CONVERT COMMANDS
║ 8️⃣  IMAGE COMMAND
║ 9️⃣  AI GIRLFRIEND
║ 🔟  STATUS SAVE
╚════════════════════════════╝

⟦⚡⟧  *Reply with number to view sub-menu*  ⟦⚡⟧
    `;

    await conn.sendMessage(mek.chat, {
      image: { url: "https://files.catbox.moe/0mf3hg.webp" },
      caption: menuText,
    });
  }
);

// Handle replies for sub-menus
cmd(
  {
    on: "text",
  },
  async (conn, mek, m) => {
    if (!m.body) return;
    let reply = m.body.trim();

    let subMenu = "";
    if (reply === "1") {
      subMenu = `
╔═══《 ⚙️ MAIN COMMANDS 》═══╗
✧ .alive
✧ .menu
✧ .ai <text>
✧ .dev
► .about
╚═══════════════════════════╝
`;
    } else if (reply === "2") {
      subMenu = `
╔═══《 📥 DOWNLOAD COMMANDS 》═══╗
✧ .song <text>
✧ .video <text>
✧ .fb <link>
✧ .tiktok <link>
◈ .dvideo <url>
╚══════════════════════════════╝
`;
    } else if (reply === "3") {
      subMenu = `
╔═══《 👑 OWNER COMMANDS 》═══╗
✧ .block
✧ .join
✧ .add
✧ .kick
✧ .left
✧ .mute / .unmute
✧ .promote / .demote
◈ .shutdown
◈ .gjid / .jid
◈ .broadcast
◈ .clearchats
◆ .getdp
◈ .update
◈ .settings
◈ .groupinfo
◈ .gmdp
╚═════════════════════════════╝
`;
    } else if (reply === "4") {
      subMenu = `
╔═══《 🤣 FUN COMMANDS 》═══╗
✧ .joke
✧ .fact
✧ .flirt
✧ .truth
✧ .dare
✧ .pickupline
✧ .char
✧ .spam
✧ .rm
╚════════════════════════════╝
`;
    } else if (reply === "5") {
      subMenu = `
╔═══《 🩵 ANIME COMMANDS 》═══╗
◈ .loli
◈ .anime
◈ .animegirl
╚═════════════════════════════╝
`;
    } else if (reply === "6") {
      subMenu = `
╔═══《 ❤️‍🔥 OUTHER COMMANDS 》═══╗
◈ .play2
◈ .drama
◈ .movie
◈ .dog
◆ .save
╚═════════════════════════════╝
`;
    } else if (reply === "7") {
      subMenu = `
╔═══《 🔁 CONVERT COMMANDS 》═══╗
✧ .sticker <reply img>
✧ .img <reply sticker>
✧ .tr <lang> <text>
✧ .tts <text>
╚═════════════════════════════╝
`;
    } else if (reply === "8") {
      subMenu = `
╔═══《 💖 IMAGE COMMAND 》═══╗
◈ .fluxai <prompt>
╚════════════════════════════╝
`;
    } else if (reply === "9") {
      subMenu = `
╔═══《 💞 AI GIRLFRIEND 》═══╗
◈ .gf <what you ask>
╚════════════════════════════╝
`;
    } else if (reply === "10" || reply === "🔟") {
      subMenu = `
╔═══《 ☠️ STATUS SAVE COMMAND 》═══╗
[reply save with statuse save text]
╚════════════════════════════════╝
`;
    }

    if (subMenu) {
      await conn.sendMessage(mek.chat, {
        image: { url: "https://files.catbox.moe/0mf3hg.webp" },
        caption: subMenu,
      });
    }
  }
);
