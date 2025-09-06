// plugins/antidelete.js
// Advanced Anti-Delete (Recover deleted messages) plugin
// Usage: .antidel on  OR  .antidel off   (only owner in config.js can use)
const { cmd } = require("../command");
const fs = require("fs");
const path = require("path");
const util = require("util");

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

const ROOT = path.join(__dirname, "..");
const CONFIG_FILE = path.join(ROOT, "antidel_config.json");
const MEDIA_DIR = path.join(ROOT, "antidel_media");

// ensure dirs
if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true });

// load owner config
let OWNER_NUM = "94726228243";
try {
  // expects ../config.js exporting OWNER_NUM or fallback to env
  // Example config.js: module.exports = { OWNER_NUM: process.env.OWNER_NUM || "94721584279" }
  // Make sure your config file path is correct for your project
  // If you don't have config.js, plugin will fallback to process.env.OWNER_NUM
  // and final fallback is the default above.
  // Adjust the require path if your config is placed elsewhere.
  // require('../config') should export { OWNER_NUM: '...'}
  const cfg = require("../config");
  if (cfg && cfg.OWNER_NUM) OWNER_NUM = String(cfg.OWNER_NUM);
} catch (e) {
  // fallback to env or default
  if (process.env.OWNER_NUM) OWNER_NUM = process.env.OWNER_NUM;
}

const OWNER_JID = `${OWNER_NUM}@s.whatsapp.net`;

// persistent enabled chats
let enabledChats = new Set();
try {
  if (fs.existsSync(CONFIG_FILE)) {
    const raw = fs.readFileSync(CONFIG_FILE, "utf8") || "[]";
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) arr.forEach((c) => enabledChats.add(c));
  }
} catch (e) {
  console.warn("antidel: failed to read config file", e);
}
async function saveEnabledChats() {
  try {
    await writeFile(CONFIG_FILE, JSON.stringify([...enabledChats], null, 2), "utf8");
  } catch (e) {
    console.error("antidel: failed to save config", e);
  }
}

// in-memory message store: Map<chatId, Map<msgId, meta>>
if (!global._antidel_store) {
  global._antidel_store = new Map();
}
const store = global._antidel_store;

// settings
const MAX_MSG_PER_CHAT = 300; // keep last N messages per chat
const RECOVER_COOLDOWN_MS = 2000; // avoid double-sending

// helper get text content
function extractTextFromMessage(msg) {
  if (!msg) return "";
  return (
    msg.conversation ||
    msg.extendedTextMessage?.text ||
    msg.imageMessage?.caption ||
    msg.videoMessage?.caption ||
    msg.documentMessage?.caption ||
    msg.buttonsResponseMessage?.selectedDisplayText ||
    ""
  );
}

// helper to save buffer from stream to file
async function streamToFile(stream, filepath) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const buf = Buffer.concat(chunks);
  await writeFile(filepath, buf);
  return filepath;
}

// helper to download media if possible. Returns local path or null.
async function tryDownloadMedia(malvin, msgNode, msgId) {
  try {
    // detect media node and type
    let mediaNode = msgNode.imageMessage || msgNode.videoMessage || msgNode.documentMessage || msgNode.stickerMessage || msgNode.audioMessage || null;
    if (!mediaNode) return null;

    let downloadType = "image";
    if (msgNode.videoMessage) downloadType = "video";
    else if (msgNode.documentMessage) downloadType = "document";
    else if (msgNode.audioMessage) downloadType = "audio";
    else if (msgNode.stickerMessage) downloadType = "sticker";

    // extension from mimetype if possible
    let ext = "bin";
    if (mediaNode.mimetype) {
      const parts = String(mediaNode.mimetype).split("/");
      if (parts[1]) ext = parts[1].split(";")[0].split("+")[0];
    } else if (mediaNode.fileName) {
      ext = path.extname(mediaNode.fileName).replace(".", "") || ext;
    }

    const filename = `${msgId}.${ext}`;
    const filepath = path.join(MEDIA_DIR, filename);

    // Strategy A: malvin.downloadContentFromMessage (Baileys-like)
    if (typeof malvin.downloadContentFromMessage === "function") {
      try {
        const stream = await malvin.downloadContentFromMessage(mediaNode, downloadType);
        await streamToFile(stream, filepath);
        return filepath;
      } catch (e) {
        // continue
      }
    }

    // Strategy B: if mediaNode.url is present and malvin.fetch / global.fetch exists
    if (mediaNode.url) {
      const fetchFn = malvin.fetch || global.fetch;
      if (fetchFn) {
        const res = await fetchFn(mediaNode.url);
        const arrayBuffer = await res.arrayBuffer();
        await writeFile(filepath, Buffer.from(arrayBuffer));
        return filepath;
      }
    }

    // Strategy C: some frameworks attach direct base64 in mediaNode.data
    if (mediaNode.data) {
      const buf = Buffer.isBuffer(mediaNode.data) ? mediaNode.data : Buffer.from(mediaNode.data, "base64");
      await writeFile(filepath, buf);
      return filepath;
    }

    // fallback: no download method available
    return null;
  } catch (e) {
    console.warn("antidel: download failed", e);
    return null;
  }
}

// store message into in-memory store
async function storeMessage(malvin, m) {
  try {
    if (!m || !m.message || !m.key) return;
    const chatId = m.key.remoteJid;
    const msgId = m.key.id;
    if (!chatId || !msgId) return;

    if (!store.has(chatId)) store.set(chatId, new Map());
    const chatMap = store.get(chatId);

    // build meta
    const sender = m.key.participant || m.key.remoteJid;
    const text = extractTextFromMessage(m.message);
    const t = (m.messageTimestamp && Number(m.messageTimestamp)) || Date.now();

    // decide type
    let type = "text";
    if (m.message.imageMessage) type = "image";
    else if (m.message.videoMessage) type = "video";
    else if (m.message.documentMessage) type = "document";
    else if (m.message.stickerMessage) type = "sticker";
    else if (m.message.audioMessage) type = "audio";
    else if (m.message.conversation || m.message.extendedTextMessage) type = "text";

    const meta = {
      id: msgId,
      chatId,
      from: sender,
      type,
      text,
      timestamp: t,
      mimetype: (m.message.imageMessage?.mimetype) || (m.message.videoMessage?.mimetype) || (m.message.documentMessage?.mimetype) || null,
      // mediaPath will be added below if media exists
    };

    // if media, try download (best-effort)
    if (type !== "text") {
      try {
        const mediaPath = await tryDownloadMedia(malvin, m.message, msgId);
        if (mediaPath) meta.mediaPath = mediaPath;
      } catch (e) {
        // ignore
      }
    }

    // store and enforce limit
    chatMap.set(msgId, meta);
    if (chatMap.size > MAX_MSG_PER_CHAT) {
      // delete oldest
      const firstKey = chatMap.keys().next().value;
      chatMap.delete(firstKey);
    }
  } catch (e) {
    console.error("antidel: storeMessage error", e);
  }
}

// recover deleted message
async function recoverMessage(malvin, chatId, deletedId) {
  try {
    const chatMap = store.get(chatId);
    if (!chatMap) return false;
    const original = chatMap.get(deletedId);
    if (!original) return false;

    // avoid double recover spam: attach last recovery timestamp
    if (!global._antidel_last_recover) global._antidel_last_recover = {};
    const last = global._antidel_last_recover[chatId] || 0;
    if (Date.now() - last < RECOVER_COOLDOWN_MS) return false;
    global._antidel_last_recover[chatId] = Date.now();

    const senderMention = original.from ? [original.from] : [];
    const senderShort = original.from ? original.from.split("@")[0] : "unknown";

    let header = `🚨 Recovered deleted message\nFrom: @${senderShort}\nType: ${original.type}\n\n`;

    if (original.type === "text") {
      const body = original.text || "(no text)";
      await malvin.sendMessage(chatId, { text: header + body, mentions: senderMention });
      return true;
    }

    // if media present, re-send with caption + mention
    if (original.mediaPath && fs.existsSync(original.mediaPath)) {
      const fileBuf = await readFile(original.mediaPath);
      const caption = header + (original.text ? original.text : "");

      if (original.type === "image") {
        await malvin.sendMessage(chatId, { image: fileBuf, caption }, { mentions: senderMention });
        return true;
      } else if (original.type === "video") {
        await malvin.sendMessage(chatId, { video: fileBuf, caption }, { mentions: senderMention });
        return true;
      } else if (original.type === "audio") {
        await malvin.sendMessage(chatId, { audio: fileBuf, ptt: false }, { mentions: senderMention });
        return true;
      } else if (original.type === "sticker") {
        await malvin.sendMessage(chatId, { sticker: fileBuf }, { mentions: senderMention });
        return true;
      } else {
        // document fallback
        const fileName = path.basename(original.mediaPath);
        await malvin.sendMessage(chatId, { document: fileBuf, fileName, mimetype: original.mimetype || "application/octet-stream", caption }, { mentions: senderMention });
        return true;
      }
    }

    // if no media saved, but text exists
    if (original.text) {
      await malvin.sendMessage(chatId, { text: header + original.text }, { mentions: senderMention });
      return true;
    }

    return false;
  } catch (e) {
    console.error("antidel: recoverMessage error", e);
    return false;
  }
}

/**
 * Command handler
 * .antidel on  OR  .antidel off
 * only OWNER_JID can run
 */
cmd(
  {
    pattern: "antidel",
    react: "🕵️",
    desc: "Toggle Anti-Delete for this chat (owner only)",
    category: "main",
    filename: __filename,
    fromMe: false,
  },
  async (malvin, mek, m, { reply }) => {
    try {
      const chatId = mek.key.remoteJid;
      const sender = mek.key.participant || mek.key.remoteJid;

      // check owner
      if (String(sender) !== OWNER_JID && String(mek.sender?.id || mek.key?.participant || mek.key?.remoteJid) !== OWNER_JID) {
        return reply("❌ Only the main owner can use this command.");
      }

      // get message text/argument
      let text = "";
      if (m?.message?.conversation) text = m.message.conversation.trim();
      else if (m?.message?.extendedTextMessage?.text) text = m.message.extendedTextMessage.text.trim();

      // parse args after command keyword
      // e.g. ".antidel on" => args[1] = 'on'
      const parts = text.split(/\s+/);
      const arg = (parts[1] || "").toLowerCase();

      if (arg === "on") {
        enabledChats.add(chatId);
        await saveEnabledChats();
        return reply("✅ Anti-Delete enabled for this chat.");
      } else if (arg === "off") {
        enabledChats.delete(chatId);
        await saveEnabledChats();
        return reply("❌ Anti-Delete disabled for this chat.");
      } else if (arg === "status") {
        const status = enabledChats.has(chatId) ? "enabled" : "disabled";
        return reply(`Anti-Delete is currently *${status}* for this chat.`);
      } else {
        return reply("Usage: .antidel on  |  .antidel off  |  .antidel status\n(only owner can toggle)");
      }
    } catch (e) {
      console.error("antidel command error:", e);
      try { reply("❌ Error running antidel command."); } catch {}
    }
  }
);

/**
 * Hook: capture incoming messages and deletion events
 * The framework should call this `before` hook for each incoming update
 * Signature: async before(m, { malvin }) { ... }  (matches earlier plugin style)
 */
module.exports = {
  async before(m, { malvin }) {
    try {
      // When a real message arrives, store it
      if (m && m.message && m.key && !m.messageStubType) {
        // store only non-system messages (not group metadata updates)
        await storeMessage(malvin, m);
      }

      // Detect delete stub (Baileys uses messageStubType === 68 for delete)
      if (m && (m.messageStubType === 68 || (m.message && m.message.protocolMessage && m.message.protocolMessage.type === 0))) {
        // some frameworks use messageStubParameters[0] as message ID or participant
        const chatId = m.key.remoteJid;
        if (!enabledChats.has(chatId)) return;

        // messageStubParameters can be array; usually first param is deleted message id
        const params = m.messageStubParameters || (m.message && m.message.protocolMessage && m.message.protocolMessage.key ? [m.message.protocolMessage.key.id] : []);
        const deletedId = params && params[0] ? String(params[0]) : null;
        if (!deletedId) {
          // fallback: some frameworks send participant and other params; try to extract from protocolMessage
          // nothing more to do
          return;
        }

        // attempt recovery
        const recovered = await recoverMessage(malvin, chatId, deletedId);
        if (!recovered) {
          // fallback message (if not recoverable)
          const who = (m.messageStubParameters && m.messageStubParameters[1]) || (m.message && m.message.protocolMessage && m.message.protocolMessage.key && m.message.protocolMessage.key.participant) || null;
          const mention = who ? [who] : [];
          await malvin.sendMessage(chatId, { text: `🚨 A message was deleted but could not be recovered.`, mentions: mention });
        }
      }
    } catch (e) {
      console.error("antidel before hook error:", e);
    }
  },
};
