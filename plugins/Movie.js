const { cmd } = require('../lib/command');
const axios = require('axios');
const config = require('../settings');

const BRAND = '✫☘𝐆𝐎𝐉𝐎 𝐌𝐎𝐕𝐈𝐄 𝐇𝐎𝐌𝐄☢️☘';
const cache = new Map();
let connRef = null;

cmd({
  pattern: "movie",
  desc: "Search & download Movies/TV with full button UI",
  react: "🎬",
  category: "media",
  filename: __filename,
}, async (conn, mek, m, { from, args, reply }) => {
  try {
    connRef = conn;

    const query = args.join(" ").trim();
    if (!query) {
      await conn.sendMessage(from, { react: { text: "❌", key: mek.key }});
      return reply("*🎬 Type movie or series name to search!*\nExample: `.movie Breaking Bad`");
    }

    await conn.sendMessage(from, { react: { text: "🔍", key: mek.key } });

    const res = await axios.get(`https://apis.davidcyriltech.my.id/movies/search?query=${encodeURIComponent(query)}`);
    const results = res.data.results;

    if (!Array.isArray(results) || results.length === 0) {
      await conn.sendMessage(from, { react: { text: "❌", key: mek.key }});
      return reply("❌ No movies or series found.");
    }

    const rows = results.map((v, i) => ({
      title: v.title.length > 35 ? v.title.slice(0, 35) + "…" : v.title,
      description: `⭐ IMDB: ${v.imdb} | 📅 Year: ${v.year}`,
      rowId: `mv_${i}`
    }));

    cache.set(from, results);

    const listMsg = {
      text: `*🎬 Movie / TV Series Results*\n\nSelect one to download below.`,
      footer: BRAND,
      title: "🔍 Your Search Result",
      buttonText: "📂 View Movies",
      sections: [{
        title: "Search Results",
        rows
      }]
    };

    await conn.sendMessage(from, listMsg, { quoted: mek });
    await conn.sendMessage(from, { react: { text: "✅", key: mek.key }});
  } catch (e) {
    console.error("movie search error:", e);
    await conn.sendMessage(from, { react: { text: "❌", key: mek.key }});
    reply("*❌ ERROR: Something went wrong.*");
  }
});

if (!global.__movie_list_handler) {
  global.__movie_list_handler = true;

  const { setTimeout } = require('timers');

  function wait() {
    if (!connRef) return setTimeout(wait, 500);

    connRef.ev.on("messages.upsert", async ({ messages }) => {
      const msg = messages?.[0];
      if (!msg?.key || !msg.message) return;

      const sel = msg.message.listResponseMessage?.singleSelectReply?.selectedRowId;
      if (!sel || !sel.startsWith("mv_")) return;

      const chat = msg.key.remoteJid;
      const index = Number(sel.replace("mv_", ""));
      const list = cache.get(chat);

      if (!list || !list[index]) {
        await connRef.sendMessage(chat, { text: "❌ Session expired. Please search again." }, { quoted: msg });
        return;
      }

      const info = list[index];

      try {
        await connRef.sendMessage(chat, { react: { text: "⏬", key: msg.key }});

        const dl = await axios.get(`https://apis.davidcyriltech.my.id/movies/download?url=${encodeURIComponent(info.link)}`);
        const links = dl.data?.movie?.download_links;

        if (!links || !links.length) {
          return connRef.sendMessage(chat, { text: "❌ No download links found." }, { quoted: msg });
        }

        const picks = [];
        const sd = links.find((x) => x.quality === 'SD 480p' && x.direct_download);
        const hd = links.find((x) => x.quality === 'HD 720p' && x.direct_download) || links.find((x) => x.quality === 'FHD 1080p' && x.direct_download);

        if (sd) picks.push({ title: 'SD 480p', description: sd.size, rowId: `q_${Buffer.from(JSON.stringify(sd)).toString("base64")}` });
        if (hd) picks.push({ title: 'HD 720p+', description: hd.size, rowId: `q_${Buffer.from(JSON.stringify(hd)).toString("base64")}` });

        if (!picks.length) {
          return connRef.sendMessage(chat, { text: "❌ No working links." }, { quoted: msg });
        }

        const qList = {
          text: `*🎬 ${info.title}*\n\nSelect Quality to download:`,
          footer: BRAND,
          title: "🎥 Quality Options",
          buttonText: "📂 View Qualities",
          sections: [{ title: "Available Qualities", rows: picks }]
        };

        await connRef.sendMessage(chat, qList, { quoted: msg });

      } catch (e) {
        console.error("movie quality fetch error:", e);
        await connRef.sendMessage(chat, { text: "❌ Failed to fetch download links." }, { quoted: msg });
      }
    });

    connRef.ev.on("messages.upsert", async ({ messages }) => {
      const msg = messages?.[0];
      if (!msg?.key || !msg.message) return;

      const sel = msg.message.listResponseMessage?.singleSelectReply?.selectedRowId;
      if (!sel || !sel.startsWith("q_")) return;

      const chat = msg.key.remoteJid;
      const raw = Buffer.from(sel.replace("q_", ""), "base64").toString();
      const pick = JSON.parse(raw);

      try {
        const size = pick.size.toLowerCase();
        const gb = size.includes("gb") ? parseFloat(size) : parseFloat(size) / 1024;
        if (gb > 2) {
          return connRef.sendMessage(chat, { text: `⚠️ File too large. Direct Link:\n${pick.direct_download}` }, { quoted: msg });
        }

        const fname = `${BRAND} • ${pick.quality || "Movie"}.mp4`;

        await connRef.sendMessage(chat, {
          document: { url: pick.direct_download },
          mimetype: "video/mp4",
          fileName: fname,
          caption: `🎬 *Download Completed*\n📊 Size: ${pick.size}\n\n🔥 ${BRAND}`
        }, { quoted: msg });

        await connRef.sendMessage(chat, { react: { text: "✅", key: msg.key }});
      } catch (e) {
        console.error("movie download error:", e);
        await connRef.sendMessage(chat, { text: "❌ Download failed. Try again." }, { quoted: msg });
      }
    });
  }

  wait();
}
