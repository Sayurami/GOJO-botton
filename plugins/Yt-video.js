const { cmd } = require('../lib/command');
const axios = require('axios');
const yts = require('yt-search');

let connRef = null;
const cache = new Map(); // session: chat → video list

cmd({
    pattern: "video2",
    alias: ["mp4", "ytv"],
    react: "🎥",
    desc: "Search & download YouTube videos!",
    category: "download",
    filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
    try {
        connRef = conn;

        const query = args.join(" ").trim();
        if (!query) {
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
            return reply("Type a video name or YouTube link to search!\nExample: `.video2 santhush songs`");
        }

        await conn.sendMessage(from, { react: { text: "🔍", key: mek.key } });

        let search;
        if (query.match(/(youtube\.com|youtu\.be)/)) {
            const videoId = query.split(/[=/]/).pop();
            search = { videos: [{ title: "Requested Video", url: query }] };
        } else {
            search = await yts(query);
            if (!search.videos.length) {
                await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
                return reply("❌ No results found for your search.");
            }
        }

        const rows = search.videos.slice(0, 10).map((v, i) => ({
            title: v.title.length > 40 ? v.title.slice(0, 40) + "…" : v.title,
            description: `⏱ ${v.timestamp} | 👁 ${v.views}`,
            rowId: `vid_${i}`
        }));

        cache.set(from, search.videos);

        const listMsg = {
            text: `*🎬 YouTube Search Results*\n\nSelect a video to download.`,
            footer: "© Gojo | Video Downloader",
            title: "🔍 Your Search Result",
            buttonText: "📂 View Videos",
            sections: [{
                title: "Search Results",
                rows
            }]
        };

        await conn.sendMessage(from, listMsg, { quoted: mek });
        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (e) {
        console.error("video2 search error:", e);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
        reply("*ERROR ❗ Something went wrong.*");
    }
});

// List click handler
if (!global.__video2_list_handler) {
    global.__video2_list_handler = true;

    const { setTimeout } = require('timers');

    function wait() {
        if (!connRef) return setTimeout(wait, 500);

        connRef.ev.on("messages.upsert", async ({ messages }) => {
            const msg = messages?.[0];
            if (!msg?.key || !msg.message) return;

            const sel = msg.message.listResponseMessage?.singleSelectReply?.selectedRowId;
            if (!sel || !sel.startsWith("vid_")) return;

            const chat = msg.key.remoteJid;
            const index = Number(sel.replace("vid_", ""));
            const list = cache.get(chat);
            if (!list || !list[index]) {
                await connRef.sendMessage(chat, { text: "❌ Session expired. Please search again." }, { quoted: msg });
                return;
            }

            const video = list[index];

            try {
                await connRef.sendMessage(chat, { react: { text: "⏬", key: msg.key } });

                const api = `https://apis.davidcyriltech.my.id/download/ytmp4?url=${encodeURIComponent(video.url)}`;
                const res = await axios.get(api);
                const data = res.data;

                if (!data?.success || !data?.result?.download_url) {
                    return connRef.sendMessage(chat, { text: "❌ Failed to get video download link." }, { quoted: msg });
                }

                await connRef.sendMessage(chat, {
                    video: { url: data.result.download_url },
                    mimetype: 'video/mp4',
                    caption: `*🎬 ${video.title}*\n\nDownloaded via Gojo Bot`
                }, { quoted: msg });

                await connRef.sendMessage(chat, { react: { text: "✅", key: msg.key } });

            } catch (e) {
                console.error("video2 download error:", e);
                await connRef.sendMessage(chat, { text: "❌ Failed to download the video." }, { quoted: msg });
                await connRef.sendMessage(chat, { react: { text: "❌", key: msg.key } });
            }
        });
    }

    wait();
}
