const { cmd } = require('../lib/command');

let connRef = null;
const cache = new Map(); // chat → url list

cmd({
  pattern: "download",
  alias: ["durl"],
  desc: "Send list of direct URLs to download as document",
  react: "🔰",
  category: "download",
  filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
  try {
    connRef = conn;

    if (args.length === 0) {
      return reply("❗ Please provide one or more direct URLs separated by space.\n*Example:* `.downloadurl https://example.com/file1.pdf https://example.com/file2.mp4`");
    }

    const urls = args.filter(link => link.startsWith("http"));
    if (urls.length === 0) return reply("❗ No valid URLs detected.");

    const rows = urls.map((link, i) => ({
      title: `File ${i + 1}`,
      description: link.length > 40 ? link.slice(0, 40) + "…" : link,
      rowId: `dlurl_${i}`
    }));

    cache.set(from, urls);

    const listMsg = {
      text: `*📥 URL List*\n\nSelect a file to download.`,
      footer: "© Gojo-MD | Downloader",
      title: "🔗 Your Download Links",
      buttonText: "📂 View URLs",
      sections: [{
        title: "URL List",
        rows
      }]
    };

    await conn.sendMessage(from, listMsg, { quoted: mek });
    await conn.sendMessage(from, { react: { text: "✅", key: mek.key }});

  } catch (e) {
    console.error("downloadurl error:", e);
    await conn.sendMessage(from, { react: { text: "❌", key: mek.key }});
    reply("❌ Error processing URLs.");
  }
});

// List handler
if (!global.__downloadurl_handler) {
  global.__downloadurl_handler = true;

  const { setTimeout } = require('timers');

  function wait() {
    if (!connRef) return setTimeout(wait, 500);

    connRef.ev.on("messages.upsert", async ({ messages }) => {
      const msg = messages?.[0];
      if (!msg?.key || !msg.message) return;

      const sel = msg.message.listResponseMessage?.singleSelectReply?.selectedRowId;
      if (!sel || !sel.startsWith("dlurl_")) return;

      const chat = msg.key.remoteJid;
      const index = Number(sel.replace("dlurl_", ""));
      const list = cache.get(chat);
      if (!list || !list[index]) {
        await connRef.sendMessage(chat, { text: "❌ Session expired. Please try again." }, { quoted: msg });
        return;
      }

      const url = list[index];
      try {
        await connRef.sendMessage(chat, { react: { text: "⏬", key: msg.key }});
        await connRef.sendMessage(chat, {
          document: { url },
          mimetype: "application/octet-stream",
          fileName: `File_${index + 1}`,
          caption: `*📥 Downloaded File*\n\nSource: ${url}`
        }, { quoted: msg });
        await connRef.sendMessage(chat, { react: { text: "✅", key: msg.key }});
      } catch (e) {
        console.error("downloadurl send error:", e);
        await connRef.sendMessage(chat, { text: "❌ Failed to send file." }, { quoted: msg });
        await connRef.sendMessage(chat, { react: { text: "❌", key: msg.key }});
      }
    });
  }

  wait();
}
