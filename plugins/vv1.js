// vv_viewonce_save_plugin.js
// Advanced "View Once" unlock + save + resend plugin
// Compatible with a command framework that exposes cmd({...}, handler)
// Assumes client (here named malvin) is a Baileys WASocket-like instance
// and that m.quoted is the quoted message object when user replies to view-once media.

const { cmd } = require("../command");
const fs = require("fs");
const path = require("path");
const { pipeline } = require("stream");
const { promisify } = require("util");
const pump = promisify(pipeline);

// Optional: try to import Baileys helper if available (used as fallback)
let baileysDownloadFn = null;
try {
  const baileys = require("@adiwajshing/baileys");
  baileysDownloadFn = baileys.downloadContentFromMessage;
} catch (e) {
  // not installed - we'll try to use client provided helpers instead
}

// Config - change to suit your project
const DOWNLOAD_DIR = path.join(__dirname, "..", "downloaded_media");
const META_FILE = path.join(DOWNLOAD_DIR, "media_metadata.json");

if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

// helper: write metadata (append)
function saveMetadata(obj) {
  let arr = [];
  try {
    if (fs.existsSync(META_FILE))
      arr = JSON.parse(fs.readFileSync(META_FILE, "utf8") || "[]");
  } catch (e) {
    // ignore parse errors
  }
  arr.push(obj);
  fs.writeFileSync(META_FILE, JSON.stringify(arr, null, 2));
}

// helper: accumulate stream to buffer
async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

cmd(
  {
    pattern: "vv",
    react: "📸",
    desc: "Unlock & save View-Once image/video (reply to a view-once message)",
    category: "main",
    filename: __filename,
    fromMe: false,
  },
  async (malvin, mek, m, { reply }) => {
    try {
      const chatId = mek.key.remoteJid;

      // Make sure user replied to a message
      if (!m.quoted)
        return reply("❌ Please reply to a *View Once* image or video using .vv");

      const quoted = m.quoted;

      let buffer = null;
      let mimetype = null;
      let fileExt = "bin";
      let isViewOnce = false;
      let originalMsgData = null;

      // Case A: quoted object has a helper download()
      if (typeof quoted.download === "function") {
        try {
          buffer = await quoted.download();
          mimetype = quoted.mimetype || quoted.mediaType || null;
        } catch (e) {
          buffer = null;
        }
      }

      // Case B: viewOnce wrapper
      if (!buffer) {
        const raw = quoted.message || quoted;

        if (raw && raw.viewOnceMessage) {
          isViewOnce = true;
          originalMsgData = raw.viewOnceMessage.message || raw.viewOnceMessage;
        } else if (raw && raw.ephemeralMessage && raw.ephemeralMessage.message) {
          originalMsgData = raw.ephemeralMessage.message;
          if (originalMsgData.viewOnceMessage) {
            isViewOnce = true;
            originalMsgData =
              originalMsgData.viewOnceMessage.message ||
              originalMsgData.viewOnceMessage;
          }
        } else {
          originalMsgData = raw;
        }

        if (originalMsgData) {
          const mediaNode =
            originalMsgData.imageMessage ||
            originalMsgData.videoMessage ||
            originalMsgData.documentMessage ||
            originalMsgData.stickerMessage ||
            null;

          if (mediaNode) {
            mimetype =
              mediaNode.mimetype ||
              mediaNode.type ||
              mediaNode.m ||
              null;

            let downloadType = "image";
            if (originalMsgData.videoMessage) downloadType = "video";
            else if (originalMsgData.documentMessage) downloadType = "document";

            // Strategy 1: client helper
            if (typeof malvin.downloadContentFromMessage === "function") {
              try {
                const stream = await malvin.downloadContentFromMessage(
                  mediaNode,
                  downloadType
                );
                buffer = await streamToBuffer(stream);
              } catch (e) {
                buffer = null;
              }
            }

            // Strategy 2: baileys helper
            if (!buffer && baileysDownloadFn) {
              try {
                const stream = await baileysDownloadFn(
                  mediaNode,
                  downloadType
                );
                buffer = await streamToBuffer(stream);
              } catch (e) {
                buffer = null;
              }
            }

            // Strategy 3: direct url
            if (!buffer && mediaNode.url) {
              try {
                const fetchFn = malvin.fetch || global.fetch;
                if (fetchFn) {
                  const res = await fetchFn(mediaNode.url);
                  buffer = Buffer.from(await res.arrayBuffer());
                }
              } catch (e) {
                buffer = null;
              }
            }

            // Strategy 4: whatsapp-web.js style
            if (!buffer && typeof quoted.downloadMedia === "function") {
              try {
                const media = await quoted.downloadMedia();
                if (media && media.data) {
                  buffer = Buffer.from(media.data, "base64");
                  mimetype = mimetype || media.mimetype;
                }
              } catch (e) {
                buffer = null;
              }
            }
          }
        }
      }

      if (!buffer)
        return reply(
          "❌ Failed to download the media. The library may not expose view-once content, or the message expired."
        );

      // Determine extension
      if (mimetype) {
        const parts = mimetype.split("/");
        if (parts[1]) fileExt = parts[1].split(";")[0];
        if (fileExt.includes("+")) fileExt = fileExt.split("+")[0];
      }

      // Build filename
      const fromJid = mek.key.participant || mek.key.remoteJid || "unknown";
      const safeFrom = String(fromJid).replace(/[^0-9a-zA-Z_.-]/g, "_");
      const timestamp = Date.now();
      const postfix = isViewOnce ? "_viewonce" : "";
      const filename = `${safeFrom}_${timestamp}${postfix}.${fileExt}`;
      const filepath = path.join(DOWNLOAD_DIR, filename);

      // save buffer
      fs.writeFileSync(filepath, buffer);

      // save metadata
      const meta = {
        saved_at: new Date().toISOString(),
        chat: chatId,
        from: fromJid,
        message_id: mek.key.id || null,
        filename: filename,
        path: filepath,
        mimetype: mimetype || null,
        viewOnce: !!isViewOnce,
        quoted_key: m.quoted && m.quoted.key ? m.quoted.key : null,
      };
      saveMetadata(meta);

      // confirm + resend media
      const caption = `🔓 Unlocked & saved${
        isViewOnce ? " (view-once)" : ""
      }\nFile: ${filename}`;

      const sendOpts = { quoted: mek };
      if (mimetype && mimetype.startsWith("image/")) {
        await malvin.sendMessage(
          chatId,
          { image: fs.readFileSync(filepath), caption },
          sendOpts
        );
      } else if (mimetype && mimetype.startsWith("video/")) {
        await malvin.sendMessage(
          chatId,
          { video: fs.readFileSync(filepath), caption },
          sendOpts
        );
      } else {
        await malvin.sendMessage(
          chatId,
          {
            document: fs.readFileSync(filepath),
            mimetype: mimetype || "application/octet-stream",
            fileName: filename,
            caption,
          },
          sendOpts
        );
      }
    } catch (err) {
      console.error("Error in .vv plugin:", err);
      try {
        reply("❌ Could not unlock/save this view-once media. Check logs.");
      } catch (e) {}
    }
  }
);

// End of plugin
