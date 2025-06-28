const { cmd } = require("../lib/command");
const yts = require("yt-search");
const { ytmp3 } = require("@vreden/youtube_scraper");
const config = require('../settings');
const cache = new Map();
let connRef = null;

cmd({
  pattern: "song",
  alias: ["songs", "music"],
  desc: "Search and download songs with button UI.",
  react: "🎵",
  category: "music",
  filename: __filename,
}, async (conn, mek, m, { from, args, reply }) => {
  try {
    connRef = conn;

    const query = args.join(" ").trim();
    if (!query) {
      await conn.sendMessage(from, { react: { text: "❌", key: mek.key }});
      return reply("🎶 *Song Name Denna!* \nตัวอย่างเช่น: `.song Believer`");
    }

    await conn.sendMessage(from, { react: { text: "🔍", key: mek.key }});

    const search = await yts(query);
    const results = search.videos.slice(0, 10);

    if (!results || results.length === 0) {
      await conn.sendMessage(from, { react: { text: "❌", key: mek.key }});
      return reply("❌ *Song එකක් හමු නොවුණා!*");
    }

    const rows = results.map((v, i) => ({
      title: v.title.length > 35 ? v.title.slice(0, 35) + "…" : v.title,
      description: `${v.timestamp} | ${v.author.name}`,
      rowId: `song_${i}`
    }));

    cache.set(from, results);

    const listMsg = {
      text: "*🎵 Song Search Results*\n\nSelect a song to download below.",
      footer: "© Gojo | Song Downloader",
      title: "🔍 Your Search Result",
      buttonText: "🎧 View Songs",
      sections: [{
        title: "Search Results",
        rows
      }]
    };

    await conn.sendMessage(from, listMsg, { quoted: mek });
    await conn.sendMessage(from, { react: { text: "✅", key: mek.key }});
  } catch (e) {
    console.error("song error:", e);
    await conn.sendMessage(from, { react: { text: "❌", key: mek.key }});
    reply("*❌ ERROR: Something went wrong!*");
  }
});

if (!global.__song_list_handler) {
  global.__song_list_handler = true;

  const { setTimeout } = require("timers");

  function wait() {
    if (!connRef) return setTimeout(wait, 500);

    connRef.ev.on("messages.upsert", async ({ messages }) => {
      const msg = messages?.[0];
      if (!msg?.key || !msg.message) return;

      const sel = msg.message.listResponseMessage?.singleSelectReply?.selectedRowId;
      if (!sel || !sel.startsWith("song_")) return;

      const chat = msg.key.remoteJid;
      const index = Number(sel.replace("song_", ""));
      const list = cache.get(chat);

      if (!list || !list[index]) {
        await connRef.sendMessage(chat, { text: "❌ Session expired. Search again." }, { quoted: msg });
        return;
      }

      const info = list[index];

      try {
        await connRef.sendMessage(chat, { react: { text: "⏬", key: msg.key }});

        const songData = await ytmp3(info.url, "128");

        if (!songData?.download?.url) {
          return connRef.sendMessage(chat, { text: "❌ Download link not found!" }, { quoted: msg });
        }

        await connRef.sendMessage(chat, {
          audio: { url: songData.download.url },
          mimetype: "audio/mpeg",
          fileName: `${info.title}.mp3`,
          caption: `*🎶 ${info.title}*\n\nSource: ${info.url}\n_Powered by Gojo_`
        }, { quoted: msg });

        await connRef.sendMessage(chat, { react: { text: "✅", key: msg.key }});
      } catch (e) {
        console.error("song download error:", e);
        await connRef.sendMessage(chat, { text: "❌ Failed to download the song." }, { quoted: msg });
        await connRef.sendMessage(chat, { react: { text: "❌", key: msg.key }});
      }
    });
  }

  wait();
}
