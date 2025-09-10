const { cmd } = require("../command");
const DYXT_NEWS = require("@dark-yasiya/news-scrap");
const news = new DYXT_NEWS();

cmd(
  {
    pattern: "news",
    react: "📰",
    desc: "Get latest Sinhala news from Ada.lk",
    category: "main",
    filename: __filename,
    fromMe: false,
  },
  async (malvin, mek, m, { reply }) => {
    try {
      const from = mek.key.remoteJid;
      await malvin.sendPresenceUpdate("composing", from);

      // Get news
      const adaNews = await news.ada();

      if (adaNews && adaNews.result) {
        const message = `📰 *Latest Sinhala News* 📰\n\n` +
          `*${adaNews.result.title}*\n\n` +
          `${adaNews.result.desc}\n\n` +
          `🔗 Read More: ${adaNews.result.url}`;

        await malvin.sendMessage(from, { text: message }, { quoted: mek });
      } else {
        reply("❌ Sorry, no news found at the moment.");
      }

    } catch (e) {
      console.error("❌ Error in .news command:", e);
      reply("⚠️ Error fetching news!");
    }
  }
);
