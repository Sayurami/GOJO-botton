const { cmd } = require('../lib/command');
const axios = require("axios");
const config = require('../settings');

let connRef = null;
const cache = new Map(); // session: chat → result list

cmd({
  pattern: "fb",
  alias: ["facebook", "fbdl"],
  desc: "Download Facebook videos with button UI",
  category: "download",
  filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
  try {
    connRef = conn;

    const query = args.join(" ").trim();
    if (!query.startsWith("https://")) {
      await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
      return reply("*Need a valid Facebook video URL!*");
    }

    await conn.sendMessage(from, { react: { text: "🔍", key: mek.key } });

    const apiUrl = `https://lance-frank-asta.onrender.com/api/downloader?url=${encodeURIComponent(query)}`;
    const response = await axios.get(apiUrl);
    const data = response.data;

    if (!data?.content?.status || !data?.content?.data?.result?.length) {
      await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
      return reply("❌ No downloadable videos found.");
    }

    const results = data.content.data.result.filter(v => v.url);
    if (!results.length) {
      return reply("❌ No valid video links available.");
    }

    cache.set(from, results); // store session for that chat

    const rows = results.map((v, i) => ({
      title: `${v.quality} Quality`,
      description: v.size || "Facebook Video",
      rowId: `fb_${i}`
    }));

    const listMsg = {
      text: `*📥 Facebook Video Downloader*\n\nSelect the quality below to download:`,
      footer: "⚡ GOJO FB DOWNLOADER",
      title: "🎬 Available Video Qualities",
      buttonText: "📂 View Options",
      sections: [{
        title: "Select Quality",
        rows
      }]
    };

    await conn.sendMessage(from, listMsg, { quoted: mek });
    await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

  } catch (e) {
    console.error("FB Download Error:", e);
    await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
    reply("❌ Failed to fetch video. Try again later.");
  }
});

if (!global.__fb_list_handler) {
  global.__fb_list_handler = true;

  const { setTimeout } = require("timers");

  function wait() {
    if (!connRef) return setTimeout(wait, 500);

    connRef.ev.on("messages.upsert", async ({ messages }) => {
      const msg = messages?.[0];
      if (!msg?.key || !msg.message) return;

      const sel = msg.message.listResponseMessage?.singleSelectReply?.selectedRowId;
      if (!sel || !sel.startsWith("fb_")) return;

      const chat = msg.key.remoteJid;
      const index = Number(sel.replace("fb_", ""));
      const list = cache.get(chat);

      if (!list || !list[index]) {
        await connRef.sendMessage(chat, { text: "❌ Session expired. Please use `.fb` again." }, { quoted: msg });
        return;
      }

      const info = list[index];

      try {
        await connRef.sendMessage(chat, { react: { text: "⏬", key: msg.key } });

        await connRef.sendMessage(chat, {
          video: { url: info.url },
          caption: `📥 *Downloaded in ${info.quality} Quality*\n\n⚡ _Powered by GOJO_`
        }, { quoted: msg });

        await connRef.sendMessage(chat, { react: { text: "✅", key: msg.key } });

      } catch (e) {
        console.error("FB send video error:", e);
        await connRef.sendMessage(chat, { text: "❌ Failed to send video. Try again." }, { quoted: msg });
      }
    });
  }

  wait();
}
