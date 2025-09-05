const { cmd } = require("../command");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

// ----------------- CONFIG (change if needed) -----------------
const GEMINI_API_KEY = "AIzaSyC4chj4aorec4aX4UIO3STqEFXnsrJP6Cs";

// Typical Imagen/Gemini image endpoint — if this doesn't work for your key/project,
// replace with the exact endpoint from your Google Cloud/Vertex AI or Gemini docs.
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict";
// --------------------------------------------------------------

// helper: try to save base64 image and return file path
async function saveBase64Image(base64Str, chatId) {
  const buf = Buffer.from(base64Str, "base64");
  const fileName = `img_${chatId}_${Date.now()}.jpg`;
  const filePath = path.join(__dirname, "..", "tmp", fileName);

  // ensure tmp folder exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(filePath, buf);
  return filePath;
}

// Main command: .img <prompt>
cmd({
  pattern: "imgg (.+)",
  react: "🦚",
  desc: "Generate an image from text prompt (Imagen / Gemini)",
  category: "ai",
  filename: __filename,
}, async (bot, mek, m, { from, q, reply }) => {
  try {
    if (!q) return reply("❓ Please provide a prompt. Example: `.img A cute puppy sitting on a sofa`");

    await reply("🖌️ Generating image... please wait.");

    // Build request body — many Google image endpoints accept different payload shapes.
    // This payload follows a common "predict" style; if your endpoint is different,
    // change `payload` to match the docs for your model.
    const payload = {
      // Some endpoints expect `instances` or `input` or `prompt` — try the common shapes.
      // Here we provide a few candidate top-level fields; only one may be used by the server.
      prompt: q,
      // fallback field many Vertex AI imagen examples use:
      input: { text: q },
      instances: [{ prompt: q }],
      // For generativelanguage-style Imagen predict endpoints sometimes they accept:
      // { "text": q } or nested JSON — adjust if needed.
    };

    // Make the request (we try to be tolerant of minor schema differences)
    const headers = { "Content-Type": "application/json" };

    // Use axios post
    const response = await axios.post(`${ENDPOINT}?key=${GEMINI_API_KEY}`, payload, { headers, timeout: 60000 });

    // --- Parse response: handle several possible formats ---
    // 1) generativelanguage/imagen-style: response.data?.predictions[0]?.image
    // 2) response.data?.predictions[0]?.content (base64)
    // 3) response.data?.candidates[0]?.content?.[0]?.image?.imageBytes
    // 4) response.data?.output[0]?.content (some APIs)
    // 5) response.data?.images[0]?.b64_json
    // Try common locations:
    let b64;
    try {
      // common Vertex/Imagen style
      if (response.data?.predictions?.[0]?.image) {
        // maybe already binary? or object with b64
        const img = response.data.predictions[0].image;
        if (typeof img === "string") b64 = img;
        else if (img?.imageBytes) b64 = img.imageBytes;
        else if (img?.b64_json) b64 = img.b64_json;
      }

      // generic 'output' style
      if (!b64 && Array.isArray(response.data?.output)) {
        for (const o of response.data.output) {
          if (o?.image) { b64 = o.image; break; }
          if (o?.content && typeof o.content === "string" && o.content.length > 100) {
            // sometimes content is base64 directly
            b64 = o.content; break;
          }
        }
      }

      // generativelanguage "candidates" style
      if (!b64 && response.data?.candidates?.[0]?.content?.[0]?.image?.imageBytes) {
        b64 = response.data.candidates[0].content[0].image.imageBytes;
      }

      // some responses put base64 in .images array
      if (!b64 && response.data?.images?.[0]?.b64_json) {
        b64 = response.data.images[0].b64_json;
      }

      // fallback: sometimes the API returns data.data[0].b64 -> check deep
      if (!b64) {
        const jsonStr = JSON.stringify(response.data);
        const match = jsonStr.match(/"([A-Za-z0-9+/=]{200,})"/);
        if (match) b64 = match[1];
      }
    } catch (err) {
      console.error("Parse image response error:", err);
    }

    if (!b64) {
      console.error("Image response (raw):", JSON.stringify(response.data).slice(0, 2000));
      return reply("❌ Image generation returned no image. Check your endpoint/key or try a different prompt.");
    }

    // Save base64 -> file
    const filePath = await saveBase64Image(b64, from);

    // Send image to chat (works with baileys style sendMessage)
    const imageBuffer = fs.readFileSync(filePath);
    await bot.sendMessage(from, { image: imageBuffer, caption: `🖼️ Here you go — prompt: ${q}` }, { quoted: mek });

    // Optionally delete temp file after a short time
    setTimeout(() => {
      try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) {}
    }, 30_000);

  } catch (err) {
    console.error("Image gen error:", err?.response?.data || err.message || err);
    const msg = err?.response?.data?.error?.message || err.message || "Unknown error during image generation.";
    reply(`❌ Image generation failed:\n${msg}`);
  }
});
