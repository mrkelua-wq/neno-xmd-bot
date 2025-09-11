const fetch = require("node-fetch");
const cheerio = require("cheerio");
const { cmd } = require("../command"); // oyage botge command handler eka

async function animeVideo2() {
  const url = "https://mobstatus.com/anime-whatsapp-status-video/";
  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);

  const videos = [];
  const title = $("strong").text();

  $("a.mb-button.mb-style-glass.mb-size-tiny.mb-corners-pill.mb-text-style-heavy").each((index, element) => {
    const href = $(element).attr("href");
    videos.push({
      title,
      source: href,
    });
  });

  if (videos.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * videos.length);
  return videos[randomIndex];
}

// === Command Bind Karanna ===
cmd(
  {
    pattern: "animevideo",
    react: "🎥",
    desc: "Send random anime status video",
    category: "fun",
    filename: __filename,
    fromMe: false,
  },
  async (conn, mek, m, { reply }) => {
    try {
      const video = await animeVideo2();

      if (!video) {
        return reply("❌ Sorry, no anime videos found.");
      }

      await conn.sendMessage(
        mek.key.remoteJid,
        {
          video: { url: video.source },
          caption: `🎬 Random Anime Video\n\n📌 ${video.title}`,
        },
        { quoted: mek }
      );
    } catch (err) {
      console.error(err);
      reply("⚠️ Error fetching anime video.");
    }
  }
);
