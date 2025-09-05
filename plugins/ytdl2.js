// plugins/dvideo.js
const { cmd } = require("../command");
const ytdl = require("ytdl-core");
const axios = require("axios");

cmd(
  {
    pattern: "dvideo",
    react: "♻️",
    desc: "Download YouTube Video via link",
    category: "download",
    filename: __filename,
  },
  async (malvin, mek, m, { from, args, reply }) => {
    try {
      const link = args[0];
      if (!link) return reply("*Please provide a YouTube video link.* 🎥❤️");
      if (!ytdl.validateURL(link)) return reply("❌ Invalid YouTube link!");

      // 1) Get video info
      const info = await ytdl.getInfo(link);
      const videoDetails = info.videoDetails;

      const desc = `
🧩 *𝗡𝗘𝗡𝗢 𝗫𝗠𝗗 DOWNLOADER* 🧩
📌 *Title:* ${videoDetails.title}
⏱️ *Uploaded:* ${videoDetails.uploadDate}
👀 *Views:* ${videoDetails.viewCount}
🔗 *Video URL:* ${videoDetails.video_url}
━━━━━━━━━━━━━━━━━━
*ᴺᴵᴹᴱˢᴴᴷᴬ ᴹᴵᴴᴵᴿᴬᴺ🪀*
      `.trim();

      await malvin.sendMessage(
        from,
        { image: { url: videoDetails.thumbnails[0].url }, caption: desc },
        { quoted: mek }
      );

      // 2) Download video (720p)
      const videoStream = ytdl(link, { quality: "highestvideo" });
      let chunks = [];
      videoStream.on("data", (chunk) => chunks.push(chunk));
      videoStream.on("end", async () => {
        const buffer = Buffer.concat(chunks);
        await malvin.sendMessage(
          from,
          {
            video: buffer,
            mimetype: "video/mp4",
            caption: `🎥 *${videoDetails.title}*\n\nⒸ ALL RIGHTS RESERVED 𝗡𝗘𝗡𝗢 𝗫𝗠𝗗❤️`,
          },
          { quoted: mek }
        );
        reply("*Thanks for using the bot!* 🎥");
      });
    } catch (e) {
      console.error(e);
      reply(`❌ Error: ${e.message}`);
    }
  }
);
