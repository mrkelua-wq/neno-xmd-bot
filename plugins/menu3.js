// plugins/menu2.js
const { cmd } = require("../command");

let sessions = {}; // track user sessions

// MAIN MENU COMMAND
cmd(
  {
    pattern: "menu2",
    desc: "Main Menu with react",
    category: "main",
    filename: __filename,
  },
  async (conn, mek, m, { pushname }) => {
    try {
      let user = pushname || mek.sender.split("@")[0];
      let menuText = `
𝐘𝐨𝐨 ${user}
*⟦✦⟧  Wᴇʟᴄᴏᴍᴇ Tᴏ 𝗡𝗘𝗢𝗡 𝗫𝗠𝗗  ⟦✦⟧*

╔═══《 📜 MENU CATEGORIES 》═══╗
║ 1️⃣ MAIN COMMANDS
║ 2️⃣ DOWNLOAD COMMANDS
║ 3️⃣ OWNER COMMANDS
║ 4️⃣ FUN COMMANDS
║ 5️⃣ ANIME COMMANDS
║ 6️⃣ OTHER COMMANDS
║ 7️⃣ CONVERT COMMANDS
║ 8️⃣ IMAGE COMMAND
║ 9️⃣ AI GIRLFRIEND
║ 🔟 STATUS SAVE
╚════════════════════════════╝

👉 Reply with number (1-10) to view that sub-menu
`;

      // send menu with react
      let sent = await conn.sendMessage(mek.chat, {
        text: menuText,
        react: { text: "♻️", key: mek.key }, // react on sending
      });

      // save session for reply tracking
      sessions[mek.sender] = sent.key.id;
    } catch (e) {
      console.log("Menu2 error:", e);
    }
  }
);

// SUB MENU HANDLER
cmd(
  {
    on: "text",
  },
  async (conn, mek, m) => {
    try {
      if (!m.body) return;
      let reply = m.body.trim();

      // check if user has session
      if (!sessions[mek.sender]) return;

      // check if reply is to the menu message
      if (!mek.quoted || mek.quoted.id !== sessions[mek.sender]) return;

      let subMenu = "";
      switch (reply) {
        case "1":
          subMenu = `
╔═══《 ⚙️ MAIN COMMANDS 》═══╗
✧ .alive
✧ .menu
✧ .ai <text>
✧ .dev
► .about
╚═══════════════════════════╝`;
          break;
        case "2":
          subMenu = `
╔═══《 📥 DOWNLOAD COMMANDS 》═══╗
✧ .song <text>
✧ .video <text>
✧ .fb <link>
✧ .tiktok <link>
✧ .dvideo <url>
╚════════════════════════════╝`;
          break;
        case "3":
          subMenu = `
╔═══《 👑 OWNER COMMANDS 》═══╗
✧ .block
✧ .join
✧ .add
✧ .kick
✧ .left
✧ .mute / .unmute
✧ .promote / .demote
✧ .shutdown
✧ .jid / .gjid
✧ .broadcast
✧ .clearchats
✧ .getdp
✧ .update
✧ .settings
✧ .groupinfo
✧ .gmdp
╚════════════════════════════╝`;
          break;
        case "4":
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
╚═══════════════════════════╝`;
          break;
        case "5":
          subMenu = `
╔═══《 🩵 ANIME COMMANDS 》═══╗
◈ .loli
◈ .anime
◈ .animegirl
╚════════════════════════════╝`;
          break;
        case "6":
          subMenu = `
╔═══《 ❤️‍🔥 OTHER COMMANDS 》═══╗
◈ .play2
◈ .drama
◈ .movie 
◈ .dog
◈ .save 
╚════════════════════════════╝`;
          break;
        case "7":
          subMenu = `
╔═══《 🔁 CONVERT COMMANDS 》═══╗
✧ .sticker <reply img>
✧ .img <reply sticker>
✧ .tr <lang> <text>
✧ .tts <text>
╚════════════════════════════╝`;
          break;
        case "8":
          subMenu = `
╔═══《 💖 IMAGE COMMAND 》═══╗
◈ .fluxai <prompt>
╚════════════════════════════╝`;
          break;
        case "9":
          subMenu = `
╔═══《 💞 AI GIRLFRIEND 》═══╗
◈ .gf <ask anything>
╚════════════════════════════╝`;
          break;
        case "10":
          subMenu = `
╔═══《 ☠️ STATUS SAVE 》═══╗
[Reply to status with "status save"]
╚══════════════════════════╝`;
          break;
        default:
          subMenu = "❌ Invalid number. Reply 1-10.";
      }

      // send sub-menu with react
      await conn.sendMessage(mek.chat, {
        text: subMenu,
        react: { text: "✅", key: mek.key },
      }, { quoted: mek });

    } catch (e) {
      console.log("Menu2 reply error:", e);
    }
  }
);
