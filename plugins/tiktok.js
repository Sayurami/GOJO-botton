const { cmd } = require('../lib/command');
const axios = require('axios');
const config = require('../settings');

let connRef = null;
const cache = new Map(); // chat-based cache

cmd({
    pattern: "tiktok",
    alias: ["ttdl", "tt", "tiktokdl"],
    desc: "Download TikTok video with quality select",
    category: "downloader",
    react: "📥",
    filename: __filename
},
async (conn, mek, m, { from, args, q, reply }) => {
    try {
        connRef = conn;

        if (!q) return reply("🔗 Please provide a TikTok video link.");
        if (!q.includes("tiktok.com")) return reply("❌ Invalid TikTok link.");

        await conn.sendMessage(from, { react: { text: '🔍', key: mek.key } });

        const apiUrl = `https://delirius-apiofc.vercel.app/download/tiktok?url=${q}`;
        const { data } = await axios.get(apiUrl);

        if (!data.status || !data.data || !data.data.meta?.media?.length) {
            return reply("❌ Failed to fetch TikTok video.");
        }

        const { author, like, comment, share } = data.data;
        const videos = data.data.meta.media.filter(v => v.type === "video");

        if (!videos.length) return reply("❌ No video versions found.");

        // Prepare quality list
        const rows = videos.map((v, i) => ({
            title: `Quality ${i + 1}`,
            description: `${v.quality || "Unknown Quality"} • ${v.formate || "MP4"}`,
            rowId: `tt_${i}`
        }));

        cache.set(from, videos);

        const listMsg = {
            text: `*🎵 TikTok Video Found*\n👤 *User:* ${author.nickname}\n♥️ *Likes:* ${like}   💬 *Comments:* ${comment}   ♻️ *Shares:* ${share}\n\nSelect your preferred quality:`,
            footer: "⚡ Gojo TikTok Downloader",
            title: "📥 Available Qualities",
            buttonText: "🎬 Select Quality",
            sections: [{
                title: "Video Qualities",
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

if (!global.__tt_list_handler) {
    global.__tt_list_handler = true;

    const { setTimeout } = require('timers');

    function wait() {
        if (!connRef) return setTimeout(wait, 500);

        connRef.ev.on("messages.upsert", async ({ messages }) => {
            const msg = messages?.[0];
            if (!msg?.key || !msg.message) return;

            const sel = msg.message.listResponseMessage?.singleSelectReply?.selectedRowId;
            if (!sel || !sel.startsWith("tt_")) return;

            const chat = msg.key.remoteJid;
            const index = Number(sel.replace("tt_", ""));
            const list = cache.get(chat);

            if (!list || !list[index]) {
                await connRef.sendMessage(chat, { text: "❌ Session expired. Please search again." }, { quoted: msg });
                return;
            }

            const video = list[index];

            try {
                await connRef.sendMessage(chat, { react: { text: "⏬", key: msg.key } });

                await connRef.sendMessage(chat, {
                    video: { url: video.org },
                    caption: `🎬 *TikTok Video*\n💡 *Quality:* ${video.quality || "Unknown"}\n\n⚡ _Powered by GOJO_`,
                }, { quoted: msg });

                await connRef.sendMessage(chat, { react: { text: "✅", key: msg.key } });

            } catch (e) {
                console.error(e);
                await connRef.sendMessage(chat, { text: "❌ Failed to send video." }, { quoted: msg });
                await connRef.sendMessage(chat, { react: { text: '❌', key: msg.key } });
            }
        });
    }

    wait();
}
