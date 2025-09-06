// vv_viewonce_save_plugin.js
'use strict';

/**
 * Advanced .vv plugin
 * - Download view-once / ephemeral media using many strategies
 * - Save files to downloaded_media/ with correct extension
 * - Resend media preserving original type (image/video), not .bin
 *
 * Works with: whatsapp-web.js style objects OR Baileys (WASocket) style objects.
 *
 * Place in plugins/ and ensure your cmd loader imports it.
 */

const { cmd } = require('../command'); // your command loader
const fs = require('fs');
const path = require('path');

const DOWNLOAD_DIR = path.join(__dirname, '..', 'downloaded_media');
const META_FILE = path.join(DOWNLOAD_DIR, 'media_metadata.json');
if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

// optional helpers
let baileysDownloadFn = null;
try {
  const baileys = require('@adiwajshing/baileys');
  baileysDownloadFn = baileys.downloadContentFromMessage;
} catch (e) {
  // no baileys installed - ok
}

// whatsapp-web.js detection
let WWebJS = null;
try {
  WWebJS = require('whatsapp-web.js');
} catch (e) {
  WWebJS = null;
}

// helper: append metadata
function saveMetadata(obj) {
  let arr = [];
  try {
    if (fs.existsSync(META_FILE)) arr = JSON.parse(fs.readFileSync(META_FILE, 'utf8') || '[]');
  } catch (e) { /* ignore */ }
  arr.push(obj);
  fs.writeFileSync(META_FILE, JSON.stringify(arr, null, 2));
}

// helper: stream -> buffer
async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

// Try many download strategies, return { buffer, mimetype } or null
async function downloadQuotedMedia(client, quoted) {
  // 1) whatsapp-web.js style: quoted.downloadMedia() -> { data: base64, mimetype }
  try {
    if (typeof quoted.downloadMedia === 'function') {
      const media = await quoted.downloadMedia();
      if (media && media.data) {
        return { buffer: Buffer.from(media.data, 'base64'), mimetype: media.mimetype || quoted.mimetype || null };
      }
    }
  } catch (e) { /* continue */ }

  // 2) generic download() -> Buffer
  try {
    if (typeof quoted.download === 'function') {
      const buf = await quoted.download();
      if (buf && Buffer.isBuffer(buf)) return { buffer: buf, mimetype: quoted.mimetype || null };
    }
  } catch (e) { /* continue */ }

  // 3) Baileys-like raw node
  try {
    const raw = quoted.message || quoted;
    let inner = null;
    if (raw.viewOnceMessage) inner = raw.viewOnceMessage.message || raw.viewOnceMessage;
    else if (raw.ephemeralMessage && raw.ephemeralMessage.message) {
      inner = raw.ephemeralMessage.message;
      if (inner.viewOnceMessage) inner = inner.viewOnceMessage.message || inner.viewOnceMessage;
    } else inner = raw;

    const mediaNode = inner && (inner.imageMessage || inner.videoMessage || inner.documentMessage || inner.stickerMessage || null);
    if (mediaNode) {
      const mime = mediaNode.mimetype || mediaNode.m || mediaNode.type || null;

      // 3a) client.downloadContentFromMessage (Baileys WASocket style)
      if (typeof client.downloadContentFromMessage === 'function') {
        try {
          const type = inner.imageMessage ? 'image' : inner.videoMessage ? 'video' : inner.documentMessage ? 'document' : 'stream';
          const stream = await client.downloadContentFromMessage(mediaNode, type);
          const buf = await streamToBuffer(stream);
          if (buf) return { buffer: buf, mimetype: mime || null };
        } catch (e) { /* continue */ }
      }

      // 3b) baileys helper if installed
      if (baileysDownloadFn) {
        try {
          const type = inner.imageMessage ? 'image' : inner.videoMessage ? 'video' : inner.documentMessage ? 'document' : 'stream';
          const stream = await baileysDownloadFn(mediaNode, type);
          const buf = await streamToBuffer(stream);
          if (buf) return { buffer: buf, mimetype: mime || null };
        } catch (e) { /* continue */ }
      }

      // 3c) direct url field
      if (mediaNode.url) {
        try {
          const fetchFn = client.fetch || global.fetch;
          if (fetchFn) {
            const res = await fetchFn(mediaNode.url);
            const arr = await res.arrayBuffer();
            return { buffer: Buffer.from(arr), mimetype: mime || res.headers.get('content-type') || null };
          }
        } catch (e) { /* continue */ }
      }
    }
  } catch (e) { /* continue */ }

  // 4) whatsapp-web.js fallback: hasMedia + downloadMedia
  try {
    if (quoted.hasMedia === true && typeof quoted.downloadMedia === 'function') {
      const media = await quoted.downloadMedia();
      if (media && media.data) return { buffer: Buffer.from(media.data, 'base64'), mimetype: media.mimetype || null };
    }
  } catch (e) { /* continue */ }

  // nothing worked
  return null;
}

// extension from mimetype or magic bytes
function detectExtensionFromBuffer(buffer, mimetype) {
  if (mimetype) {
    const parts = mimetype.split('/');
    if (parts[1]) return parts[1].split(';')[0].split('+')[0];
  }
  // magic bytes common checks
  try {
    const head = buffer.slice(0, 12);
    const hex = head.toString('hex');
    if (hex.startsWith('ffd8ff')) return 'jpg';
    if (hex.startsWith('89504e47')) return 'png';
    // mp4: '00000018ftyp' or contains 'ftyp' in bytes 4-8
    if (buffer.slice(4, 8).toString('ascii') === 'ftyp') return 'mp4';
    if (hex.startsWith('47494638')) return 'gif';
  } catch (e) {}
  return 'bin';
}

// Main command
cmd({
  pattern: 'vv',
  react: '📸',
  desc: 'Unlock & save View-Once image/video (reply to view-once)',
  category: 'main',
  filename: __filename,
  fromMe: false,
}, async (malvin, mek, m, { reply }) => {
  try {
    const chatId = mek.key.remoteJid;

    if (!m.quoted) return reply('❌ Please reply to a *View Once* image or video using .vv');

    // Try to download quoted media
    const result = await downloadQuotedMedia(malvin, m.quoted);
    if (!result || !result.buffer) return reply('❌ Failed to download media. The library may not expose view-once content, or the message expired.');

    const buffer = result.buffer;
    const mimetype = (result.mimetype || '').toString();

    // Determine extension
    const ext = detectExtensionFromBuffer(buffer, mimetype);
    // Build filename
    const fromJid = mek.key.participant || mek.key.remoteJid || 'unknown';
    const safeFrom = String(fromJid).replace(/[^0-9a-zA-Z_.-]/g, '_');
    const timestamp = Date.now();
    const isViewOnce = (() => {
      try {
        const raw = m.quoted.message || m.quoted;
        return !!(raw && (raw.viewOnceMessage || (raw.ephemeralMessage && raw.ephemeralMessage.message && raw.ephemeralMessage.message.viewOnceMessage)));
      } catch (e) { return false; }
    })();
    const postfix = isViewOnce ? '_viewonce' : '';
    const filename = `${safeFrom}_${timestamp}${postfix}.${ext}`;
    const filepath = path.join(DOWNLOAD_DIR, filename);

    // Save to disk
    fs.writeFileSync(filepath, buffer);

    // Save metadata
    const meta = {
      saved_at: new Date().toISOString(),
      chat: chatId,
      from: fromJid,
      message_id: mek.key.id || null,
      filename,
      path: filepath,
      mimetype: mimetype || null,
      viewOnce: !!isViewOnce,
      quoted_key: (m.quoted && m.quoted.key) ? m.quoted.key : null
    };
    saveMetadata(meta);

    const caption = `🔓 Unlocked & saved${isViewOnce ? ' (view-once)' : ''}\nFile: ${filename}`;
    const sendOpts = { quoted: mek };

    // Resend — ensure correct front-end type (not .bin)
    try {
      // whatsapp-web.js specific send using MessageMedia (ensures proper display)
      if (WWebJS && malvin && malvin.constructor && (malvin.constructor.name === 'Client' || malvin.constructor.name === 'WhatsAppWebClient')) {
        try {
          const MessageMedia = WWebJS.MessageMedia;
          const base64 = buffer.toString('base64');
          const media = new MessageMedia(mimetype || 'application/octet-stream', base64, filename);
          // sendMessage(chat, media, { caption }) OR malvin.sendMessage(chatId, media, { caption })
          await malvin.sendMessage(chatId, media, { caption });
          return;
        } catch (e) {
          // continue to generic fallback
          console.warn('whatsapp-web.js send failed, falling back:', e && e.message ? e.message : e);
        }
      }

      // Generic: Baileys or other libs — use proper keys
      if (mimetype && mimetype.startsWith('image/')) {
        await malvin.sendMessage(chatId, { image: buffer, caption }, sendOpts);
      } else if (mimetype && mimetype.startsWith('video/')) {
        await malvin.sendMessage(chatId, { video: buffer, caption }, sendOpts);
      } else if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'gif') {
        // fallback by extension
        await malvin.sendMessage(chatId, { image: buffer, caption }, sendOpts);
      } else if (ext === 'mp4') {
        await malvin.sendMessage(chatId, { video: buffer, caption }, sendOpts);
      } else {
        // last resort: send as document with correct filename and mimetype
        await malvin.sendMessage(chatId, { document: buffer, mimetype: mimetype || 'application/octet-stream', fileName: filename, caption }, sendOpts);
      }
    } catch (e) {
      // some libs expect { image: { data: Buffer } } format
      try {
        if (mimetype && mimetype.startsWith('image/')) {
          await malvin.sendMessage(chatId, { image: { data: buffer }, caption }, sendOpts);
        } else if (mimetype && mimetype.startsWith('video/')) {
          await malvin.sendMessage(chatId, { video: { data: buffer }, caption }, sendOpts);
        } else {
          await malvin.sendMessage(chatId, { document: { data: buffer }, mimetype: mimetype || 'application/octet-stream', fileName: filename, caption }, sendOpts);
        }
      } catch (e2) {
        console.error('Resend failed after fallbacks:', e2);
        return reply('❌ Saved locally but failed to resend. Check bot logs.');
      }
    }

  } catch (err) {
    console.error('Error in .vv plugin:', err);
    try { reply('❌ Could not unlock/save this view-once media. See logs.'); } catch (e) {}
  }
});
