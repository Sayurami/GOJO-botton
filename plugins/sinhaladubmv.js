const { cmd } = require('../lib/command');
const { fetchJson } = require('../lib/functions');
const axios = require('axios');
const config = require('../settings');

let connRef = null;
const cache = new Map(); // chat-based session cache

const API = 'https://api-vishwa.vercel.app';
const BRAND = '🔰 *GOJO-MD* 🔰';

cmd({
  pattern: "movis5",
  alias: ["smovie", "sinhaladub", "mv"],
  react: "🎬",
  category: "movie",
  desc: "Search SinhalaDub movies and download",
  filename: __filename
}, async (conn, mek, m, { from, q, isOwner, reply }) => {
  try {
    connRef = conn;

    if (!q) return reply('*.movis <title>* ලෙස දාන්න.');
    if (!isOwner) return reply('Owner only.');

    let { data: list = [] } = await fetchJson(`${API}/sinhaladub?q=${encodeURIComponent(q)}`);

    if (!list.length && q.includes(' ')) {
      const alt = q.replace(/\s+/g, '');
      ({ data: list = [] } = await fetchJson(`${API}/sinhaladub?q=${encodeURIComponent(alt)}`));
    }

    if (!list.length) return reply('❌ No results.');

    const movies = list.slice(0, 10);

    const rows = movies.map((v, i) => ({
      title: v.title.length > 35 ? v.title.slice(0, 35) + '…' : v.title,
      description: 'Tap to view download options',
      rowId: `mv_${i}`
    }));

    cache.set(from, movies);

    const listMsg = {
      text: `🎬 *SinhalaDub Movie Search*\n\nSelect a movie below to download.\n\n${BRAND}`,
      footer: BRAND,
      title: "🔍 Your Search Result",
      buttonText: "🎥 View Movies",
      sections: [{
        title: "Search Results",
        rows
      }]
    };

    await conn.sendMessage(from, listMsg, { quoted: mek });
    await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

  } catch (e) {
    console.error(e);
    await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
    reply(`Error: ${e.message}`);
  }
});

/* ─── Handle Movie Selection ─── */
if (!global.__movis_list_handler) {
  global.__movis_list_handler = true;

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

      const movie = list[index];
      try {
        await connRef.sendMessage(chat, { react: { text: '⏳', key: msg.key } });

        const { data: info = {} } = await fetchJson(`${API}/sinhaladub-info?url=${encodeURIComponent(movie.link)}`);
        const links = info.links || [];

        if (!links.length) {
          return connRef.sendMessage(chat, { text: "❌ No download links found." }, { quoted: msg });
        }

        const rows = links.map((l, i) => ({
          title: l.quality,
          description: l.fileSize,
          rowId: `mvdl_${i}`
        }));

        cache.set(`${chat}_links`, links);
        cache.set(`${chat}_info`, info);

        const qualityList = {
          text: `🎬 *${info.title}*\n\nSelect video quality to download.\n\n${BRAND}`,
          footer: BRAND,
          title: "🎥 Choose Quality",
          buttonText: "⬇️ Download",
          sections: [{
            title: "Available Qualities",
            rows
          }]
        };

        await connRef.sendMessage(chat, qualityList, { quoted: msg });

      } catch (e) {
        console.error(e);
        await connRef.sendMessage(chat, { text: "❌ Failed to process movie details." }, { quoted: msg });
      }
    });

    /* ─── Handle Quality Selection ─── */
    connRef.ev.on("messages.upsert", async ({ messages }) => {
      const msg = messages?.[0];
      if (!msg?.key || !msg.message) return;

      const sel = msg.message.listResponseMessage?.singleSelectReply?.selectedRowId;
      if (!sel || !sel.startsWith("mvdl_")) return;

      const chat = msg.key.remoteJid;
      const index = Number(sel.replace("mvdl_", ""));
      const links = cache.get(`${chat}_links`);
      const info = cache.get(`${chat}_info`);

      if (!links || !links[index]) {
        await connRef.sendMessage(chat, { text: "❌ Session expired. Please search again." }, { quoted: msg });
        return;
      }

      const link = links[index];

      try {
        await connRef.sendMessage(chat, { react: { text: "⬇️", key: msg.key } });

        await connRef.sendMessage(chat, {
          document: { url: link.link },
          mimetype: 'video/mp4',
          fileName: `${info.title}-${link.quality}-GOJO-MD.mp4`,
          caption: `🎬 *${info.title} – ${link.quality}*\n\n${BRAND}`
        }, { quoted: msg });

        await connRef.sendMessage(chat, { react: { text: "✅", key: msg.key } });
      } catch (e) {
        console.error(e);
        await connRef.sendMessage(chat, { text: "❌ Failed to send the video." }, { quoted: msg });
      }
    });
  }

  wait();
}
