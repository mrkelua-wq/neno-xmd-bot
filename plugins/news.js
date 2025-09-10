// news.js
const { cmd } = require("../command");
const DYXT_NEWS = require("@dark-yasiya/news-scrap");
const news = new DYXT_NEWS();

const CACHE_TTL = 1000 * 60 * 5; // 5 minutes
const cache = {};
const FIXED_IMAGE = "https://files.catbox.moe/b4n7y4.jpg"; // always attach this image
const FOOTER = "𝗣𝗼𝘄𝗲𝗿𝗲𝗱 𝗯𝘆 𝗡𝗲𝗻𝗼 𝗫𝗠𝗗";

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

const AVAILABLE_CATEGORIES = ["politics", "sports", "tech", "entertainment"];

async function fetchSource(src) {
  try {
    if (typeof news[src] === "function") {
      return await news[src]();
    } else {
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

function formatItemsFromResult(res, limit = 3, query = "", category = "") {
  let items = [];
  if (!res) return items;

  let results = [];
  if (Array.isArray(res.result)) results = res.result;
  else if (res.result?.items) results = res.result.items;
  else if (res.result?.title) results = [res.result];
  else if (res.articles) results = res.articles;

  if (!Array.isArray(results)) return items;

  // filter by query/category
  if (query) {
    results = results.filter(x =>
      (x.title || "").toLowerCase().includes(query.toLowerCase()) ||
      (x.desc || "").toLowerCase().includes(query.toLowerCase())
    );
  }
  if (category && AVAILABLE_CATEGORIES.includes(category)) {
    results = results.filter(x =>
      (x.category || "").toLowerCase().includes(category)
    );
  }

  for (let i = 0; i < Math.min(limit, results.length); i++) items.push(results[i]);
  return items;
}

function buildCaption(srcPretty, item) {
  const title = item.title || item.header || item.name || "No title";
  const desc = item.desc || item.description || item.summary || "";
  const url = item.url || item.link || item.href || "";
  return `📰 *${srcPretty}*\n\n*${title}*\n\n${desc ? desc + "\n\n" : ""}${url ? `🔗 ${url}\n\n` : ""}${FOOTER}`;
}

cmd(
  {
    pattern: "news",
    react: "📰",
    desc: "Get latest Sinhala news. Usage: .news [source|all|random] [query/category]",
    category: "main",
    filename: __filename,
    fromMe: false,
  },
  async (malvin, mek, m, { reply }) => {
    try {
      const from = mek.key.remoteJid;
      await malvin.sendPresenceUpdate("composing", from);

      const body =
        (mek.message?.conversation ||
          mek.message?.extendedTextMessage?.text) || "";
      const args = body.trim().split(/\s+/).slice(1);
      let cmdArg = args[0]?.toLowerCase() || "";
      let query = args[1] || "";

      // if no args -> show help text
      if (!cmdArg) {
        return reply(
`📰 *Sinhala News Command Help* 📰

Usage:
.news ada
.news derana
.news lankadeepa
.news sirasa
.news all
.news random

👉 You can also filter:
.news ada cricket
.news all sports
.news sirasa politics`
        );
      }

      cmdArg = cmdArg.replace(/\W/g, "").toLowerCase();

      let sourcesToFetch = [];
      if (cmdArg === "all") {
        sourcesToFetch = Object.keys(AVAILABLE_SOURCES);
      } else if (cmdArg === "random") {
        const srcKeys = Object.keys(AVAILABLE_SOURCES);
        sourcesToFetch = [srcKeys[Math.floor(Math.random() * srcKeys.length)]];
      } else if (AVAILABLE_CATEGORIES.includes(cmdArg)) {
        sourcesToFetch = Object.keys(AVAILABLE_SOURCES);
        query = cmdArg;
      } else if (Object.keys(AVAILABLE_SOURCES).includes(cmdArg)) {
        sourcesToFetch = [cmdArg];
      } else {
        return reply("❌ Unknown source. Type `.news` to see help.");
      }

      const cacheKey = `${from}::${sourcesToFetch.join(",")}::${query}`;
      const cached = getCache(cacheKey);
      if (cached) {
        for (const msgObj of cached) {
          await malvin.sendMessage(from, msgObj, { quoted: mek });
        }
        return;
      }

      const results = await Promise.all(sourcesToFetch.map(s => fetchSource(s)));
      const outgoing = [];

      for (let i = 0; i < sourcesToFetch.length; i++) {
        const srcKey = sourcesToFetch[i];
        const pretty = AVAILABLE_SOURCES[srcKey];
        const items = formatItemsFromResult(results[i], sourcesToFetch.length === 1 ? 3 : 2, query);

        if (!items.length) {
          outgoing.push({
            image: { url: FIXED_IMAGE },
            caption: `⚠️ *${pretty}* — No matching news found.\n\n${FOOTER}`,
          });
          continue;
        }

        for (const item of items) {
          const caption = buildCaption(pretty, item);
          outgoing.push({ image: { url: FIXED_IMAGE }, caption });
        }
      }

      for (const msgObj of outgoing) {
        await malvin.sendMessage(from, msgObj, { quoted: mek });
      }
      setCache(cacheKey, outgoing);
    } catch (e) {
      console.error("❌ Error in .news command:", e);
      reply("⚠️ Error fetching news. Try again later.");
    }
  }
);
