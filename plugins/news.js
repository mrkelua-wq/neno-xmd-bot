// news.js
const { cmd } = require("../command");
const DYXT_NEWS = require("@dark-yasiya/news-scrap");
const news = new DYXT_NEWS();

const CACHE_TTL = 1000 * 60 * 5; // 5 minutes
const cache = {}; // { key: { ts: Date.now(), data: ... } }

function setCache(key, data) {
  cache[key] = { ts: Date.now(), data };
}
function getCache(key) {
  const entry = cache[key];
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    delete cache[key];
    return null;
  }
  return entry.data;
}

const AVAILABLE_SOURCES = {
  ada: "Ada",
  derana: "Derana",
  lankadeepa: "LankaDeepa",
  sirasa: "Sirasa",
};

async function fetchSource(src) {
  // try to call method from package; be robust if method missing
  try {
    if (typeof news[src] === "function") {
      const res = await news[src]();
      return res;
    } else {
      // try lowercase method name
      const method = Object.keys(news).find(k => k.toLowerCase() === src.toLowerCase());
      if (method && typeof news[method] === "function") {
        return await news[method]();
      }
    }
  } catch (e) {
    console.error(`Error fetching ${src}:`, e);
  }
  return null;
}

function formatItemsFromResult(res, limit = 3) {
  // res.result might be a single object or array; normalize
  const items = [];
  if (!res) return items;

  // If result is an array of articles:
  if (Array.isArray(res.result)) {
    for (let i = 0; i < Math.min(limit, res.result.length); i++) {
      items.push(res.result[i]);
    }
    return items;
  }

  // If the package returns a single 'result' object with 'title' and maybe 'others' or 'items'
  if (res.result && res.result.items && Array.isArray(res.result.items)) {
    for (let i = 0; i < Math.min(limit, res.result.items.length); i++) {
      items.push(res.result.items[i]);
    }
    return items;
  }

  // If it's only one article, return that
  if (res.result && res.result.title) {
    items.push(res.result);
    return items;
  }

  // Fallback: try properties
  if (res.articles && Array.isArray(res.articles)) {
    for (let i = 0; i < Math.min(limit, res.articles.length); i++) items.push(res.articles[i]);
    return items;
  }

  return items;
}

function buildCaption(srcPretty, item) {
  const title = item.title || item.header || item.name || "No title";
  const desc = item.desc || item.description || item.summary || "";
  const url = item.url || item.link || item.href || "";
  const caption = `📰 *${srcPretty}*\n\n*${title}*\n\n${desc ? desc + "\n\n" : ""}${url ? `🔗 ${url}` : ""}`;
  return caption;
}

// command
cmd(
  {
    pattern: "news",
    react: "📰",
    desc: "Get latest Sinhala news (Ada, Derana, LankaDeepa, Sirasa). Usage: .news [ada|derana|lankadeepa|sirasa|all|random]",
    category: "main",
    filename: __filename,
    fromMe: false,
  },
  async (malvin, mek, m, { reply }) => {
    try {
      const from = mek.key.remoteJid;
      await malvin.sendPresenceUpdate("composing", from);

      const body = (mek.message && (mek.message.conversation || mek.message.extendedTextMessage && mek.message.extendedTextMessage.text)) || "";
      const text = body.toString().trim();
      // Accept patterns:
      // ".news", ".news ada", "news_ada" (button id), "news:ada"
      // If the framework strips leading dot when matching, adjust. We'll parse after the command.
      const after = text.split(/\s+/).slice(1).join(" ").trim().toLowerCase(); // args after .news
      let cmdArg = after || ""; // e.g., "ada"

      // Support button callback style like "news_ada"
      if (!cmdArg && text.toLowerCase().startsWith("news_")) {
        cmdArg = text.split("_")[1] || "";
      }
      if (!cmdArg && text.toLowerCase().startsWith("news:")) {
        cmdArg = text.split(":")[1] || "";
      }

      // If no arg -> send a button menu
      if (!cmdArg) {
        const buttons = [
          { buttonId: "news_ada", buttonText: { displayText: "Ada" }, type: 1 },
          { buttonId: "news_derana", buttonText: { displayText: "Derana" }, type: 1 },
          { buttonId: "news_lankadeepa", buttonText: { displayText: "LankaDeepa" }, type: 1 },
          { buttonId: "news_sirasa", buttonText: { displayText: "Sirasa" }, type: 1 },
          { buttonId: "news_all", buttonText: { displayText: "All" }, type: 1 },
          { buttonId: "news_random", buttonText: { displayText: "Random" }, type: 1 },
        ];

        const buttonMessage = {
          text:
            "📰 *Choose news source* 📰\n\nUse the buttons below or send `.news ada` / `.news derana` / `.news lankadeepa` / `.news sirasa` / `.news all` / `.news random`",
          buttons,
          headerType: 1,
        };
        await malvin.sendMessage(from, buttonMessage, { quoted: mek });
        return;
      }

      // normalize argument
      cmdArg = cmdArg.replace(/\W/g, "").toLowerCase();

      // handle random/all
      let sourcesToFetch = [];
      if (cmdArg === "all") {
        sourcesToFetch = Object.keys(AVAILABLE_SOURCES);
      } else if (cmdArg === "random") {
        const srcKeys = Object.keys(AVAILABLE_SOURCES);
        const pick = srcKeys[Math.floor(Math.random() * srcKeys.length)];
        sourcesToFetch = [pick];
      } else if (Object.keys(AVAILABLE_SOURCES).includes(cmdArg)) {
        sourcesToFetch = [cmdArg];
      } else {
        // unknown arg -> reply with usage
        return reply("❌ Unknown source. Use: `.news ada` / `.news derana` / `.news lankadeepa` / `.news sirasa` / `.news all` / `.news random`");
      }

      // Build a cache key per chat + sources
      const cacheKey = `${from}::${sourcesToFetch.join(",")}`;
      const cached = getCache(cacheKey);
      if (cached) {
        // Send cached response (text + images)
        for (const msgObj of cached) {
          if (msgObj.type === "image") {
            await malvin.sendMessage(from, { image: { url: msgObj.url }, caption: msgObj.caption }, { quoted: mek });
          } else {
            await malvin.sendMessage(from, { text: msgObj.text }, { quoted: mek });
          }
        }
        return;
      }

      // fetch all sources in parallel
      const promises = sourcesToFetch.map(s => fetchSource(s));
      const results = await Promise.all(promises);

      const outgoing = []; // collect messages to cache & send

      for (let i = 0; i < sourcesToFetch.length; i++) {
        const srcKey = sourcesToFetch[i];
        const pretty = AVAILABLE_SOURCES[srcKey] || srcKey;
        const res = results[i];
        const items = formatItemsFromResult(res, sourcesToFetch.length === 1 ? 3 : 2); // if single source -> 3 items, if multiple -> 2

        if (!items || items.length === 0) {
          const txt = `⚠️ *${pretty}* — No news available right now.`;
          outgoing.push({ type: "text", text: txt });
          continue;
        }

        for (const item of items) {
          // try to find an image
          const imageUrl = item.image || item.thumb || item.thumbnail || item.photo || item.img || null;
          const caption = buildCaption(pretty, item);

          if (imageUrl) {
            outgoing.push({ type: "image", url: imageUrl, caption });
          } else {
            outgoing.push({ type: "text", text: caption });
          }
        }
      }

      // send messages sequentially (to avoid rate issues)
      for (const msgObj of outgoing) {
        if (msgObj.type === "image") {
          try {
            await malvin.sendMessage(from, { image: { url: msgObj.url }, caption: msgObj.caption }, { quoted: mek });
          } catch (e) {
            // if image send fails, fallback to text
            await malvin.sendMessage(from, { text: msgObj.caption }, { quoted: mek });
          }
        } else {
          await malvin.sendMessage(from, { text: msgObj.text }, { quoted: mek });
        }
      }

      // cache short result
      setCache(cacheKey, outgoing);
    } catch (e) {
      console.error("❌ Error in .news command:", e);
      reply("⚠️ Error fetching news. Try again later.");
    }
  }
);
