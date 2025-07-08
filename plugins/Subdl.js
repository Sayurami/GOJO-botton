const { cmd } = require('../lib/command');
const axios = require('axios');
const config = require('../settings');

// Store search and detail results per stanzaId
let subdlInfoMap = {};
let subdlDetailMap = {};
let subdlLastMsgKey = null;
let subdlConnRef = null;

cmd({
    pattern: "subdl",
    desc: "Search and download Sinhala movie subtitles + torrents!",
    react: "🎬",
    category: "media",
    filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
    try {
        subdlConnRef = conn;
        const query = args.join(" ");
        if (!query) {
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key }});
            return reply('Type a movie or series name to search Sinhala subtitles!\nEx: `.subdl Deadpool`');
        }

        await conn.sendMessage(from, { react: { text: "🔍", key: mek.key } });

        // 1. Search subtitles
        const { data } = await axios.get(`https://sinhalasub-api-gamma.vercel.app/api/search?q=${encodeURIComponent(query)}`);
        if (!Array.isArray(data) || data.length === 0) {
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key }});
            return reply("❌ *No subtitles found for your search. Try another name!*");
        }

        // Build rows and numbered list
        const rows = data.map((item, i) => ({
            title: item.title.length > 32 ? item.title.substring(0, 32) + "..." : item.title,
            rowId: `.subdllist_${i}`,
            description: item.link
        }));

        if (config.BUTTON === 'true') {
            // Send as list message with buttons
            let sendObj = {
                image: { url: data[0].img },
                footer: "© Thenux-AI | SinhalaSub Search",
                headerType: 4,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    externalAdReply: {
                        title: "Thenux-AI | SinhalaSubs",
                        body: "Powered by Thenux-AI | darkhackersl",
                        thumbnailUrl: data[0].img,
                        image: data[0].img,
                        mediaType: 1,
                        sourceUrl: 'https://github.com/darkhackersl',
                        renderLargerThumbnail: true
                    }
                },
                text: `*🎬 Sinhala Subtitle Search Results*\n━━━━━━━━━━━━━━━━━━\nSelect a subtitle to download or get torrent link:\n━━━━━━━━━━━━━━━━━━\n_Powered by @Thenux-ai_`,
                sections: [
                    {
                        title: "Search Results",
                        rows: rows
                    }
                ],
                buttonText: "Select Subtitle 🎬"
            };

            // Send as list message
            const sentMsg = await conn.sendMessage(from, sendObj, { quoted: mek });
            subdlLastMsgKey = sentMsg?.key?.id ?? null;
            if (subdlLastMsgKey) subdlInfoMap[subdlLastMsgKey] = data;
            await conn.sendMessage(from, { react: { text: "✅", key: sentMsg.key }});
        } else {
            // Show as numbered list
            let numbered = `*🎬 Sinhala Subtitle Search Results*\n━━━━━━━━━━━━━━━━━━\n`;
            numbered += data.map((item, i) =>
                `*${i+1}.* ${item.title.length > 32 ? item.title.substring(0, 32) + "..." : item.title}`
            ).join('\n');
            numbered += "\n━━━━━━━━━━━━━━━━━━\n_Reply with the number to select._";

            const sentMsg = await conn.sendMessage(from, {
                image: { url: data[0].img },
                caption: numbered
            }, { quoted: mek });

            subdlLastMsgKey = sentMsg?.key?.id ?? null;
            if (subdlLastMsgKey) subdlInfoMap[subdlLastMsgKey] = data;
            await conn.sendMessage(from, { react: { text: "✅", key: sentMsg.key }});
        }
    } catch (e) {
        console.log(e);
        await subdlConnRef.sendMessage(from, { react: { text: "❌", key: mek.key }});
        reply("*ERROR ❗❗*");
    }
});

// List/number reply handler
if (!global.__subdlListHandler) {
    global.__subdlListHandler = true;
    const { setTimeout } = require('timers');
    function waitForSubdlConn() {
        if (!subdlConnRef) return setTimeout(waitForSubdlConn, 500);
        subdlConnRef.ev.on('messages.upsert', async (msgUpdate) => {
            const msg = msgUpdate.messages?.[0];
            if (!msg || !msg.key) return;

            // BUTTON/LIST MODE (as before)
            if (config.BUTTON === 'true' && msg.message && msg.message.listResponseMessage) {
                // ... (original handler as in your code for listResponseMessage) ...
                // [keep your original list handler code here]
            }

            // NUMBERED MODE
            if (config.BUTTON !== 'true' && msg.message && msg.message.extendedTextMessage) {
                const stanzaId = msg.message.extendedTextMessage.contextInfo?.stanzaId || subdlLastMsgKey;
                if (!stanzaId || !subdlInfoMap[stanzaId]) return;
                const results = subdlInfoMap[stanzaId];
                const userInput = (msg.message.extendedTextMessage.text || '').trim();
                const idx = parseInt(userInput) - 1;
                if (isNaN(idx) || !results[idx]) {
                    await subdlConnRef.sendMessage(msg.key.remoteJid, { text: "❌ Invalid number. Please reply with a valid number for the search result!" }, { quoted: msg });
                    return;
                }
                // Re-use your list handler logic for the selected result
                // Simulate the same as if listResponseMessage.singleSelectReply.selectedRowId called
                const info = results[idx];
                try {
                    await subdlConnRef.sendMessage(msg.key.remoteJid, { react: { text: "⏬", key: msg.key }});
                    const { data: detail } = await axios.get(`https://sinhalasub-api-gamma.vercel.app/api/subtitle?url=${encodeURIComponent(info.link)}`);
                    let caption = `*${detail.title || info.title}*\n\n${detail.description || ""}`;
                    if (detail.torrents && detail.torrents.length)
                        caption += `\n\n*Torrent Links Available!*`;
                    const imageMsg = detail.image ? {
                        image: { url: detail.image },
                        caption
                    } : { text: caption };

                    // Second layer options as numbered
                    let numbered = "*Choose what to download/view:*\n";
                    let options = [];
                    if (detail.subtitleLink) {
                        numbered += `1. ⬇️ Download Subtitle ZIP\n`;
                        options.push({ type: 'subdldl', idx: 0 });
                    }
                    (detail.torrents || []).forEach((t, i) => {
                        numbered += `${options.length + 1}. 🎞️ Download ${t.label}\n`;
                        options.push({ type: 'subdltor', idx: i });
                    });
                    numbered += "_Reply with the number to download subtitle/torrent._";

                    await subdlConnRef.sendMessage(msg.key.remoteJid, imageMsg, { quoted: msg });
                    await subdlConnRef.sendMessage(msg.key.remoteJid, { text: numbered }, { quoted: msg });

                    subdlDetailMap[msg.key.id] = detail;
                    subdlInfoMap[msg.key.id] = options; // map option numbers to actions
                } catch (e) {
                    await subdlConnRef.sendMessage(msg.key.remoteJid, { text: "❌ Failed to fetch subtitle details." }, { quoted: msg });
                }
            }

            // NUMBERED SECOND LAYER DOWNLOAD/TORRENT
            if (config.BUTTON !== 'true' && msg.message && msg.message.extendedTextMessage) {
                const stanzaId = msg.message.extendedTextMessage.contextInfo?.stanzaId || msg.key.id;
                if (!stanzaId || !subdlInfoMap[stanzaId] || !subdlDetailMap[stanzaId]) return;
                const options = subdlInfoMap[stanzaId];
                const detail = subdlDetailMap[stanzaId];
                const userInput = (msg.message.extendedTextMessage.text || '').trim();
                const optionIdx = parseInt(userInput) - 1;
                if (isNaN(optionIdx) || !options[optionIdx]) {
                    await subdlConnRef.sendMessage(msg.key.remoteJid, { text: "❌ Invalid number. Please reply with the number for download/torrent option!" }, { quoted: msg });
                    return;
                }
                const opt = options[optionIdx];
                if (opt.type === 'subdldl' && detail.subtitleLink) {
                    try {
                        const response = await axios.get(detail.subtitleLink, { responseType: 'arraybuffer' });
                        await subdlConnRef.sendMessage(msg.key.remoteJid, {
                            document: Buffer.from(response.data),
                            mimetype: 'application/zip',
                            fileName: (detail.title || "subtitle") + ".zip",
                            caption: `🎬 *${detail.title || ""}*\n> Downloaded by Thenux-MD`
                        }, { quoted: msg });
                    } catch (e) {
                        await subdlConnRef.sendMessage(msg.key.remoteJid, { text: "❌ Failed to download subtitle file." }, { quoted: msg });
                    }
                }
                if (opt.type === 'subdltor' && detail.torrents && detail.torrents[opt.idx]) {
                    const tor = detail.torrents[opt.idx];
                    try {
                        const response = await axios.get(tor.link, { responseType: 'arraybuffer' });
                        await subdlConnRef.sendMessage(msg.key.remoteJid, {
                            document: Buffer.from(response.data),
                            mimetype: 'application/x-bittorrent',
                            fileName: (tor.label.replace(/\s+/g, "_").replace(/[^\w\-\.]/g,"") || "movie") + ".torrent",
                            caption: `🎞️ *${detail.title}*\n*Torrent:* ${tor.label}\n> Downloaded by Thenux-AI`
                        }, { quoted: msg });
                    } catch (e) {
                        await subdlConnRef.sendMessage(msg.key.remoteJid, {
                            text: `🎞️ *${detail.title}*\n*Torrent:* ${tor.label}\n${tor.link}\n\n_You can open this link with your torrent app._\n❌ *Direct file download failed, here is the link!*`
                        }, { quoted: msg });
                    }
                }
            }
        });
    }
    waitForSubdlConn();
}
