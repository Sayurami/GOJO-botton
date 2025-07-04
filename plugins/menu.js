const { cmd } = require('../lib/command');
const os = require('os');
const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, fetchJson , runtime ,sleep } = require('../lib/functions')
const config = require('../settings');


cmd({
    pattern: "menu",
    react: "📂",
    prefix: "/",
    desc: "Check bot Commands.",
    category: "main",
    filename: __filename
}, async (conn, mek, m, { reply, prefix }) => {
    try {

        let teksnya = `
 Hello  Ｉ ａｍ   𝗚𝗢𝗝𝗢 𝗠𝗗 𝗩1 ❯❯  
╭────────────────────●●►
| *🛠️  𝙑𝙀𝙍𝙎𝙄𝙊𝙉:* ${require("../package.json").version}
| *📡  𝙈𝙀𝙈𝙊𝙍𝙔:* ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB / ${Math.round(require('os').totalmem / 1024 / 1024)}MB
| *⏱️  𝗥𝗨𝗡𝗧𝗜𝗠𝗘:* ${runtime(process.uptime())}
╰─────────────────────●●►
 *║  🎥❮❮  𝗚𝗢𝗝𝗢 𝗠𝗗 𝗩1 𝗠𝗘𝗡𝗨 𝗟𝗜𝗦𝗧❯❯  🎥 ║*`;

        let imageUrl = "https://raw.githubusercontent.com/gojo18888/Photo-video-/refs/heads/main/file_000000003a2861fd8da00091a32a065a.png";

        let vpsOptions = [
            { title: "ᴏᴡɴᴇʀ menu 🇱🇰", description: "Bot Owner Only Commands", id: `${prefix}ownermenu` },
            { title: "ᴅᴏᴡɴʟᴏᴀᴅ menu 🇱🇰", description: "Get Bot Download Menu", id: `${prefix}dlmenu` },
            { title: "LOGO MENU 🇱🇰", description: "Get Bot logo Menu", id: `${prefix}logomenu` },
            { title: "ᴄᴏɴᴠᴇʀᴛ menu 🇱🇰", description: "Get Bot Convert Menu", id: `${prefix}convertmenu` },
            { title: "ɢʀᴏᴜᴘ ᴍᴇɴᴜ 🇱🇰", description: "Get Group Only Commands", id: `${prefix}groupmenu` },
            { title: "ᴀɪ ᴍᴇɴᴜ 🇱🇰", description: "Get Bot AI Commands List", id: `${prefix}aimenu` },
            { title: "𝙰𝙽𝙸𝙼𝙴 menu 🇱🇰", description: "Get Bot Search Menu", id: `${prefix}animemenu` },
            { title: "ꜰᴜɴ menu 🇱🇰", description: "Fun Joke Menu Bot", id: `${prefix}funmenu` },
            { title: "𝙼𝙰𝙸𝙽 menu 🇱🇰", description: "Owner Only Bug Menu", id: `${prefix}mainmenu` },
            { title: "𝙾𝚃𝙷𝙴𝚁 ᴍᴇɴᴜ️ 🇱🇰", description: "Random Commands Menu", id: `${prefix}othermenu` }
        ];

        let buttonSections = [
            {
                title: "List of GOJO MOVIE X Bot Commands",
                highlight_label: "GOJO MOVIE X",
                rows: vpsOptions
            }
        ];

cmd({
    pattern: "dlmenu",
    react: "🎬",
    desc: "Download Menu Text List",
    category: "download",
    filename: __filename
}, async (conn, mek, m, { reply, prefix }) => {
    try {
        const text = `🎬 *GOJO DOWNLOAD MENU* 🎬

ඔබට පහත commands භාවිතා කර download කරගන්න පුළුවන්:

╭─────────────⭓
│ 📥 YouTube Video 
│ ➤ ${prefix}ytv <link or search>
│
│ 🎵 YouTube Song 
│ ➤ ${prefix}song <link or search>
│
│ 🎯 TikTok Video 
│ ➤ ${prefix}tt <link>
│
│ 🎬 Instagram Reel 
│ ➤ ${prefix}instagram <link>
│ 
│ 📽️ Sinhalasub.lk movie
│ ➤ ${prefix}movie <search>
│
│ ⚜️ Sinhala dubbed movie 
│ ➤ ${prefix}mv <search>
│
│ 🧾 Sri Lanka school past papers
│ ➤ ${prefix}pastpp <search>
│
│ 📺 Facebook videos 
│ ➤ ${prefix}fb <link>
╰─────────────⭓

_ඔබට අවශ්‍ය link එකක් හෝ keyword එකක් එක්කර command එක යොදන්න_`;

        await reply(text);
    } catch (e) {
        console.error(e);
        reply(`Error: ${e.message}`);
    }
});

        let buttons = [
            {
                buttonId: "action",
                buttonText: { displayText: "Select Menu" },
                type: 4,
                nativeFlowInfo: {
                    name: "single_select",
                    paramsJson: JSON.stringify({
                        title: "Choose Menu Tab 📖",
                        sections: buttonSections
                    })
                }
            }
        ];

        conn.sendMessage(m.chat, {
            buttons,
            headerType: 1,
            viewOnce: true,
            caption: teksnya,
            image: { url: imageUrl },
            contextInfo: {
                mentionedJid: [m.sender], 
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    
                    newsletterName: `GOJO💗`,
                    serverMessageId: 143
                }
            }
        }, { quoted: mek });

    } catch (e) {
        console.error(e);
        reply(`Error: ${e.message}`);
    }
});
