const { cmd } = require("../command");
const axios = require("axios");

const GEMINI_API_KEY = "AIzaSyC4chj4aorec4aX4UIO3STqEFXnsrJP6Cs";

cmd(
  {
    pattern: "imgs",
    react: "🖼️",
    desc: "Generate image from text",
    category: "ai",
    filename: __filename,
  },
  async (mal, mek, { args }) => {
    try {
      const prompt = args.join(" ");
      if (!prompt) {
        return await mal.sendMessage(mek.chat, { text: "⚠️ Please provide a prompt.\nUsage: `.img cute cat`" });
      }

      // Gemini API (Imagen)
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0:generateImage?key=${GEMINI_API_KEY}`,
        {
          prompt: { text: prompt }
        }
      );

      const imgBase64 = response.data.images[0].imageBytes;
      const buffer = Buffer.from(imgBase64, "base64");

      await mal.sendMessage(mek.chat, { image: buffer, caption: `🖼️ Prompt: ${prompt}` });

    } catch (err) {
      console.error(err);
      await mal.sendMessage(mek.chat, { text: "❌ Error: Could not generate image." });
    }
  }
);
