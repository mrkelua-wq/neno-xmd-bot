// plugins/menu2.js
const { cmd } = require("../command");

let sessions = {}; // track menu sessions

const menuImageUrl = "https://files.catbox.moe/l0ixpu.jpg";

// Sub-menu images (ඔයාට වෙනත් images දාන්න පුළුවන්)
const subMenuImages = {
  "1": "https://files.catbox.moe/submenu1.jpg",
  "2": "https://files.catbox.moe/submenu2.jpg",
  "3": "https://files.catbox.moe/submenu3.jpg",
  "4": "https://files.catbox.moe/submenu4.jpg",
  "5": "https://files.catbox.moe/submenu5.jpg",
  "6": "https://files.catbox.moe/submenu6.jpg",
  "7": "https://files.catbox.moe/submenu7.jpg",
  "8": "https://files.catbox.moe/submenu8.jpg",
  "9": "https://files.catbox.moe/submenu9.jpg",
  "10": "https://files.catbox.moe/submenu10.jpg",
};

const getMenuText = (user) => `
╔════════════════════╗
║ 𝐘𝐨𝐨  ${user}
║ Wᴇʟᴄᴏᴍᴇ Tᴏ 𝗡𝗘𝗢𝗡 𝗫𝗠𝗗
╚════════════════════╝

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

👉 Reply with number (1-10) to view sub-menu
`;

// Sub-menu texts
const subMenuTexts = {
  "1": `
╔════════《 ⚙️ MAIN COMMANDS 》════════╗
┃ ✧ .alive
┃ ✧ .menu
┃ ✧ .ai <text>
┃ ✧ .dev
┃ ► .about
╚═════════════════════════════════════╝`,
  "2": `
╔════════《 📥 DOWNLOAD COMMANDS 》════════╗
┃ ✧ .song <text>
┃ ✧ .video <text>
┃ ✧ .fb <link>
┃ ✧ .tiktok <link>
┃ ◈ .dvideo <url>
╚═════════════════════════════════════════╝`,
  "3": `
╔════════《 👑 OWNER COMMANDS 》════════╗
┃ ✧ .block
┃ ✧ .join
┃ ✧ .add
┃ ✧ .kick
┃ ✧ .left
┃ ✧ .mute / .unmute
┃ ✧ .promote / .demote
┃ ◈ .shutdown
┃ ◈ .jid / .gjid
┃ ◈ .broadcast
┃ ◈ .clearchats
┃ ◆ .getdp
┃ ◈ .update
┃ ◈ .settings
┃ ◈ .groupinfo
┃ ◈ .gmdp
╚══════════════════════════════════════╝`,
  "4": `
╔════════《 🤣 FUN COMMANDS 》════════╗
┃ ✧ .joke
┃ ✧ .fact
┃ ✧ .flirt
┃ ✧ .truth
┃ ✧ .dare
┃ ✧ .pickupline
┃ ✧ .char
┃ ✧ .spam
┃ ✧ .rm
╚═════════════════════════════════╝`,
  "5": `
╔════════《 🩵 ANIME COMMANDS 》════════╗
┃ ◈ .loli
┃ ◈ .anime
┃ ◈ .animegirl
╚══════════════════════════════════╝`,
  "6": `
╔════════《 ❤️‍🔥 OTHER COMMANDS 》════════╗
┃ ◈ .play2
┃ ◈ .drama
┃ ◈ .movie
┃ ◈ .dog
┃ ◆ .save
╚═════════════════════════════════════╝`,
  "7": `
╔════════《 🔁 CONVERT COMMANDS 》════════╗
┃ ✧ .sticker <reply img>
┃ ✧ .img <reply sticker>
┃ ✧ .tr <lang> <text>
┃ ✧ .tts <text>
╚═════════════════════════════════════╝`,
  "8": `
╔════════《 💖 IMAGE COMMAND 》════════╗
┃ ◈ .fluxai <prompt>
╚═════════════════════════════════╝`,
  "9": `
╔════════《 💞 AI GIRLFRIEND 》════════╗
┃ ◈ .gf <ask anything>
╚═════════════════════════════════╝`,
  "10": `
╔════════《 ☠️ STATUS SAVE 》════════╗
┃ [Reply to status with "status save"]
╚═════════════════════════════════╝`,
};

// Send main menu
cmd(
  {
    pattern: "menu2",
    desc: "Menu with image, react & sub-menu image",
    category: "main",
    filename: __filename,
  },
  async (conn, mek, m, { pushname }) => {
    try {
      const user = pushname || mek.sender.split("@")[0];

      const sent = await conn.sendMessage(mek.chat, {
        image: { url: menuImageUrl },
        caption: getMenuText(user),
      });

      // react to image
      await conn.sendMessage(mek.chat, {
        react: { text: "♻️", key: sent.key },
      });

      sessions[mek.sender] = true; // track session
    } catch (err) {
      console.log("Menu2 send error:", err);
    }
  }
);

// Handle number replies
cmd(
  { on: "text" },
  async (conn, mek) => {
    try {
      if (!sessions[mek.sender]) return;
      const reply = mek.body.trim();

      if (!subMenuTexts[reply]) {
        return await conn.sendMessage(mek.chat, { text: "❌ Invalid number. Type 1-10 only." });
      }

      // send sub-menu image + text
      await conn.sendMessage(mek.chat, {
        image: { url: subMenuImages[reply] || menuImageUrl }, // default image if not set
        caption: subMenuTexts[reply],
      });

      // react to sub-menu image
      await conn.sendMessage(mek.chat, {
        react: { text: "✅", key: mek.key },
      });
    } catch (err) {
      console.log("Sub-menu error:", err);
    }
  }
);
