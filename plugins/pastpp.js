const { cmd } = require('../lib/command');
const axios = require('axios');
const config = require('../settings');

let connRef = null;
const cache = new Map(); // session: chat → result list

cmd({
  pattern: "pastpp",
  alias: ["pastpaper", "pastpapers"],
  desc: "Search and download Sri Lanka school past papers!",
  react: "📄",
  category: "education",
  filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
  try {
    connRef = conn;

    const query = args.join(" ").trim();
    if (!query) {
      await conn.sendMessage(from, { react: { text: "❌", key: mek.key }});
      return reply("Type a past paper name, grade or subject to search!\nExample: `.pastpp grade 11 science`");
    }

    await conn.sendMessage(from, { react: { text: "🔍", key: mek.key } });

    const res = await axios.get(`https://api-pass.vercel.app/api/search?query=${encodeURIComponent(query)}&page=1`);
    const results = res.data.results;

    if (!Array.isArray(results) || results.length === 0) {
      await conn.sendMessage(from, { react: { text: "❌", key: mek.key }});
      return reply("❌ No past papers found for your search.");
    }

    const rows = results.map((v, i) => ({
      title: v.title.length > 35 ? v.title.slice(0, 35) + "…" : v.title,
      description: v.description?.length > 40 ? v.description.slice(0, 40) + "…" : v.description || "",
      rowId: `pp_${i}`
    }));

    cache.set(from, results); // store result session

    const listMsg = {
      text: `*📄 Past Paper Search Results*\n\nSelect one to download below.`,
      footer: "© Gojo | Past Paper Finder",
      title: "🔍 Your Search Result",
      buttonText: "📂 View Papers",
      sections: [{
        title: "Search Results",
        rows
      }]
    };

    await conn.sendMessage(from, listMsg, { quoted: mek });
    await conn.sendMessage(from, { react: { text: "✅", key: mek.key }});
  } catch (e) {
    console.error("pastpp error:", e);
    await conn.sendMessage(from, { react: { text: "❌", key: mek.key }});
    reply("*ERROR ❗ Something went wrong.*");
  }
});

if (!global.__pastpp_list_handler) {
  global.__pastpp_list_handler = true;

  const { setTimeout } = require('timers');

  function wait() {
    if (!connRef) return setTimeout(wait, 500);

    connRef.ev.on("messages.upsert", async ({ messages }) => {
      const msg = messages?.[0];
      if (!msg?.key || !msg.message) return;

      const sel = msg.message.listResponseMessage?.singleSelectReply?.selectedRowId;
      if (!sel || !sel.startsWith("pp_")) return;

      const chat = msg.key.remoteJid;
      const index = Number(sel.replace("pp_", ""));
      const list = cache.get(chat);
      if (!list || !list[index]) {
        await connRef.sendMessage(chat, { text: "❌ Session expired. Please search again." }, { quoted: msg });
        return;
      }

      const info = list[index];

      try {
        await connRef.sendMessage(chat, { react: { text: "⏬", key: msg.key }});
        const dl = await axios.get(`https://api-pass.vercel.app/api/download?url=${encodeURIComponent(info.url)}`);

        const file = dl.data?.download_info;
        if (!file?.download_url) {
          return connRef.sendMessage(chat, { text: "❌ Download link not found!" }, { quoted: msg });
        }

        await connRef.sendMessage(chat, {
          document: { url: file.download_url },
          mimetype: 'application/pdf',
          fileName: file.file_name || "pastpaper.pdf",
          caption: `*📄 ${file.file_title || info.title}*\n\nSource: ${info.url}\n_Powered by sayura_`
        }, { quoted: msg });

        await connRef.sendMessage(chat, { react: { text: "✅", key: msg.key }});
      } catch (e) {
        console.error("pastpp download error:", e);
        await connRef.sendMessage(chat, { text: "❌ Failed to download the file." }, { quoted: msg });
        await connRef.sendMessage(chat, { react: { text: "❌", key: msg.key }});
      }
    });
  }

  wait();
}
