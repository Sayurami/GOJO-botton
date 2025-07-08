const { cmd } = require('../lib/command');
const axios = require('axios');
const config = require('../settings');

let pastppConnRef = null;
const pastppCache = new Map(); // chat → results
const pastppDetailMap = new Map(); // messageId → details/options

cmd({
  pattern: "pastpp",
  alias: ["pastpaper", "pastpapers"],
  desc: "Search and download Sri Lanka school past papers!",
  react: "📄",
  category: "education",
  filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
  try {
    pastppConnRef = conn;
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

    pastppCache.set(from, results);

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
    await pastppConnRef.sendMessage(from, { react: { text: "❌", key: mek.key }});
    reply("*ERROR ❗ Something went wrong.*");
  }
});

if (!global.__pastppListHandler) {
  global.__pastppListHandler = true;

  const { setTimeout } = require('timers');

  function waitForConn() {
    if (!pastppConnRef) return setTimeout(waitForConn, 500);

    pastppConnRef.ev.on("messages.upsert", async ({ messages }) => {
      const msg = messages?.[0];
      if (!msg || !msg.key || !msg.message) return;

      const from = msg.key.remoteJid;

      // Button list selection
      if (config.BUTTON === 'true' && msg.message.listResponseMessage) {
        const selectedId = msg.message.listResponseMessage.singleSelectReply.selectedRowId;
        if (!selectedId || !selectedId.startsWith("pp_")) return;

        const index = Number(selectedId.replace("pp_", ""));
        const results = pastppCache.get(from);
        if (!results || !results[index]) {
          await pastppConnRef.sendMessage(from, { text: "❌ Session expired or invalid selection. Please search again." }, { quoted: msg });
          return;
        }

        const info = results[index];

        try {
          await pastppConnRef.sendMessage(from, { react: { text: "⏬", key: msg.key }});
          const dl = await axios.get(`https://api-pass.vercel.app/api/download?url=${encodeURIComponent(info.url)}`);

          const file = dl.data?.download_info;
          if (!file?.download_url) {
            return pastppConnRef.sendMessage(from, { text: "❌ Download link not found!" }, { quoted: msg });
          }

          await pastppConnRef.sendMessage(from, {
            document: { url: file.download_url },
            mimetype: 'application/pdf',
            fileName: file.file_name || "pastpaper.pdf",
            caption: `*📄 ${file.file_title || info.title}*\n\nSource: ${info.url}\n_Powered by sayura_`
          }, { quoted: msg });

          await pastppConnRef.sendMessage(from, { react: { text: "✅", key: msg.key }});
        } catch (e) {
          console.error("pastpp download error:", e);
          await pastppConnRef.sendMessage(from, { text: "❌ Failed to download the file." }, { quoted: msg });
          await pastppConnRef.sendMessage(from, { react: { text: "❌", key: msg.key }});
        }
        return;
      }

      // NUMBERED MODE for button=false, user replies with number to download
      if (config.BUTTON !== 'true' && msg.message.extendedTextMessage) {
        const userInput = (msg.message.extendedTextMessage.text || '').trim();
        const results = pastppCache.get(from);
        if (!results) return;

        const idx = parseInt(userInput) - 1;
        if (isNaN(idx) || !results[idx]) {
          await pastppConnRef.sendMessage(from, { text: "❌ Invalid number. Please reply with a valid number for the past paper!" }, { quoted: msg });
          return;
        }

        const info = results[idx];

        try {
          await pastppConnRef.sendMessage(from, { react: { text: "⏬", key: msg.key }});
          const dl = await axios.get(`https://api-pass.vercel.app/api/download?url=${encodeURIComponent(info.url)}`);

          const file = dl.data?.download_info;
          if (!file?.download_url) {
            return pastppConnRef.sendMessage(from, { text: "❌ Download link not found!" }, { quoted: msg });
          }

          await pastppConnRef.sendMessage(from, {
            document: { url: file.download_url },
            mimetype: 'application/pdf',
            fileName: file.file_name || "pastpaper.pdf",
            caption: `*📄 ${file.file_title || info.title}*\n\nSource: ${info.url}\n_Powered by sayura_`
          }, { quoted: msg });

          await pastppConnRef.sendMessage(from, { react: { text: "✅", key: msg.key }});
        } catch (e) {
          console.error("pastpp download error:", e);
          await pastppConnRef.sendMessage(from, { text: "❌ Failed to download the file." }, { quoted: msg });
          await pastppConnRef.sendMessage(from, { react: { text: "❌", key: msg.key }});
        }
        return;
      }
    });
  }

  waitForConn();
}
