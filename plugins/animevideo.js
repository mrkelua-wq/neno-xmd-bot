// animevideo.js
const { cmd } = require("../command");
const cheerio = require("cheerio");
const fetch = require("node-fetch");

async function animeVideo2() {
  const url = 'https://mobstatus.com/anime-whatsapp-status-video/'; 
  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);

  const videos = [];
  const title = $('strong').first().text() || "Anime Video";

  $('a.mb-button.mb-style-glass.mb-size-tiny.mb-corners-pill.mb-text-style-heavy').each((index, element) => {
    const href = $(element).attr('href');
    if (href) {
      videos.push({
        title,
        source: href
      });
    }
  });

  if (!videos.length) return null;

  const randomIndex = Math.floor(Math.random() * videos.length);
  return videos[randomIndex];
}

cmd(
  {
    pattern: "animevideo",
    react: "🎬",
    desc: "Get a random anime WhatsApp status video",
    category: "fun",
    filename: __filename,
    fromMe: false,
  },
  async (malvin, mek, m, { reply }) => {
    try {
      await malvin.sendPresenceUpdate("composing", mek.key.remoteJid);

      const video = await animeVideo2();
      if (!video) return reply("⚠️ No anime video found. Try again later!");

      await malvin.sendMessage(
        mek.key.remoteJid,
        {
          video: { url: video.source },
          caption: `🎬 *${video.title}*\n\n𝗣𝗼𝘄𝗲𝗿𝗲𝗱 𝗯𝘆 𝗡𝗲𝗻𝗼 𝗫𝗠𝗗`
        },
        { quoted: mek }
      );
    } catch (e) {
      console.error("❌ Error in animevideo command:", e);
      reply("⚠️ Error fetching anime video.");
    }
  }
);
