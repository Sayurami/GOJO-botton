// modern cinesubzt command with button UI
const { cmd } = require('../lib/command');
const axios = require('axios');
const config = require('../settings');

const BRAND = '🍿 CineSubz Sinhala Movie Bot';
const cache = new Map();
let connRef = null;

cmd({
  pattern: "cinesubzt",
  alias: ["cine"],
  desc: "Search & download Sinhala Movies from cinesubz",
  react: "🎥",
  category: "media",
  filename: __filename,
}, async (conn, mek, m, { from, args, reply }) => {
  try {
    connRef = conn;
    const query = args.join(" ").trim();
    if (!query) {
      await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
      return reply("*🎬 කරුණාකර චිත්‍රපටයේ නම ටයිප් කරන්න!*");
    }

    await conn.sendMessage(from, { react: { text: "🔍", key: mek.key } });

    const res = await axios.get(`https://darkyasiya-new-movie-api.vercel.app/api/movie/cinesubz/search?q=${encodeURIComponent(query)}`);
    const movies = res.data?.data?.movies || [];

    if (!movies.length) {
      await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
      return reply("❌ කිසිවක් හමු නොවුණා.");
    }

    const rows = movies.map((v, i) => ({
      title: v.title.replace(/Sinhala Subtitles? \| සිංහල උපසිරැසි සමඟ/g, '').trim(),
      description: `🎥 Source: cinesubz.lk`,
      rowId: `cine_${i}`
    }));

    cache.set(from, movies);

    const listMsg = {
      text: `*📽️ CineSubz Search Results*\n\nඔබට අවශ්‍ය චිත්‍රපටය තෝරන්න.`,
      footer: BRAND,
      title: "🔍 සෙවුම් ප්‍රතිඵල",
      buttonText: "🎬 චිත්‍රපට තෝරන්න",
      sections: [{ title: "📂 Movies", rows }]
    };

    await conn.sendMessage(from, listMsg, { quoted: mek });
    await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
  } catch (e) {
    console.error("cine search error:", e);
    await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
    reply("❌ දෝෂයකි. නැවත උත්සාහ කරන්න.");
  }
});

// Global message handler (stateless)
if (!global.__cine_list_handler) {
  global.__cine_list_handler = true;

  const { setTimeout } = require('timers');

  function wait() {
    if (!connRef) return setTimeout(wait, 500);

    connRef.ev.on("messages.upsert", async ({ messages }) => {
      const msg = messages?.[0];
      if (!msg?.key || !msg.message) return;

      const sel = msg.message.listResponseMessage?.singleSelectReply?.selectedRowId;
      if (!sel || !sel.startsWith("cine_")) return;

      const chat = msg.key.remoteJid;
      const index = Number(sel.replace("cine_", ""));
      const list = cache.get(chat);

      if (!list || !list[index]) {
        await connRef.sendMessage(chat, { text: "❌ Session expired. Please search again." }, { quoted: msg });
        return;
      }

      const info = list[index];
      await connRef.sendMessage(chat, { react: { text: "⏬", key: msg.key } });

      try {
        const res = await axios.get(`https://darkyasiya-new-movie-api.vercel.app/api/movie/cinesubz/movie?url=${encodeURIComponent(info.link)}`);
        const data = res.data?.data;

        if (!data) {
          await connRef.sendMessage(chat, { text: "❌ Movie not found." }, { quoted: msg });
          return;
        }

        const picks = data.downloadUrl.map((d, i) => ({
          title: `${d.quality} (${d.size})`,
          description: "⬇️ Tap to download",
          rowId: `cineq_${Buffer.from(JSON.stringify({ ...d, title: data.title })).toString("base64")}`
        }));

        const qList = {
          text: `🎬 *${data.title}*\n\n*Quality තෝරන්න:*`,
          footer: BRAND,
          title: "🎥 Quality Options",
          buttonText: "⬇️ Download",
          sections: [{ title: "Available Qualities", rows: picks }]
        };

        await connRef.sendMessage(chat, qList, { quoted: msg });

      } catch (e) {
        console.error("cine movie fetch error:", e);
        await connRef.sendMessage(chat, { text: "❌ Data fetch failed." }, { quoted: msg });
      }
    });

    connRef.ev.on("messages.upsert", async ({ messages }) => {
      const msg = messages?.[0];
      if (!msg?.key || !msg.message) return;

      const sel = msg.message.listResponseMessage?.singleSelectReply?.selectedRowId;
      if (!sel || !sel.startsWith("cineq_")) return;

      const chat = msg.key.remoteJid;
      const raw = Buffer.from(sel.replace("cineq_", ""), "base64").toString();
      const pick = JSON.parse(raw);

      try {
        await connRef.sendMessage(chat, { react: { text: "⬇", key: msg.key } });

        const dl = await axios.get(`https://darkyasiya-new-movie-api.vercel.app/api/movie/cinesubz/download?url=${encodeURIComponent(pick.link)}`);
        const link = dl.data?.data?.download?.gdrive || dl.data?.data?.download?.direct;

        if (!link) {
          return connRef.sendMessage(chat, { text: "❌ Valid download link not found." }, { quoted: msg });
        }

        const fname = `${pick.title} • ${pick.quality}.mp4`;
        await connRef.sendMessage(chat, {
          document: { url: link },
          mimetype: "video/mp4",
          fileName: fname,
          caption: `📥 *Download Completed*\n🎬 ${pick.title} | ${pick.quality}`
        }, { quoted: msg });

        await connRef.sendMessage(chat, { react: { text: "✅", key: msg.key } });

      } catch (e) {
        console.error("cine download error:", e);
        await connRef.sendMessage(chat, { text: "❌ Failed to send file." }, { quoted: msg });
      }
    });
  }
  wait();
}
