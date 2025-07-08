const { cmd } = require('../lib/command');
const config = require('../settings');
const { runtime } = require('../lib/functions');

let menuInfoMap = {};
let menuLastMsgKey = null;
let menuConnRef = null;

const imageUrl = "https://raw.githubusercontent.com/Sayurami/GOJO-botton/refs/heads/main/file_00000000f76c61f88a35663bb55c3102.png";

const sections = [
    { title: "ᴏᴡɴᴇʀ menu 🇱🇰", id: "ownermenu" },
    { title: "ᴅᴏᴡɴʟᴏᴀᴅ menu 🇱🇰", id: "dlmenu" },
    { title: "LOGO MENU 🇱🇰", id: "logomenu" },
    { title: "ᴄᴏɴᴠᴇʀᴛ menu 🇱🇰", id: "convertmenu" },
    { title: "ɢʀɔʋρ ɱɛɴʎ 🇱🇰", id: "groupmenu" },
    { title: "ᴀɪ ɱɛɴʎ 🇱🇰", id: "aimenu" },
    { title: "𝐸𝐯𝐢𝐬𝐞 menu 🇱🇰", id: "animemenu" },
    { title: "ꜰᴜɴ menu 🇱🇰", id: "funmenu" },
    { title: "𝐶𝐞𝐧𝐞 menu 🇱🇰", id: "mainmenu" },
    { title: "𝐾𝐟𝐭𝐞𝐫 ɱɛɴʎ️ 🇱🇰", id: "othermenu" }
];

cmd({
    pattern: "menu",
    prefix: "/",
    react: "📂",
    desc: "GOJO full Menu List",
    category: "main",
    filename: __filename
}, async (conn, mek, m, { prefix, reply }) => {
    try {
        menuConnRef = conn;

        const caption = `
𝐝𝐨𝐫𝐞 𝐀𝐜 𝐘𝐮 𝐚𝐞 𝐌𝐨 𝐏𝐨 𝐵𝐫 ❯❯
╭────────────────────●●►
| *👷 VERSION:* ${require("../package.json").version}
| *📡 MEMORY:* ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB
| *⏱️ RUNTIME:* ${runtime(process.uptime())}
╰─────────────────────●●►
*🎥 GOJO MENU LIST 🎥*`;

        const rows = sections.map((item, i) => ({
            title: item.title,
            rowId: `.${item.id}`
        }));

        if (config.BUTTON === 'true') {
            const sendObj = {
                image: { url: imageUrl },
                text: caption,
                footer: "© Thenux-AI | GOJO MD V2",
                buttonText: "Select Menu 🏟️",
                headerType: 4,
                sections: [
                    {
                        title: "GOJO Bot Menu Categories",
                        rows: rows
                    }
                ]
            };
            const sentMsg = await conn.sendMessage(m.chat, sendObj, { quoted: mek });
            menuLastMsgKey = sentMsg?.key?.id;
            if (menuLastMsgKey) menuInfoMap[menuLastMsgKey] = sections;
        } else {
            let numbered = `${caption}\n━━━━━━━━━━━━━━\n`;
            numbered += sections.map((s, i) => `*${i + 1}.* ${s.title}`).join('\n');
            numbered += `\n━━━━━━━━━━━━━━\n_Reply with number to select menu_`;

            const sentMsg = await conn.sendMessage(m.chat, {
                image: { url: imageUrl },
                caption: numbered
            }, { quoted: mek });

            menuLastMsgKey = sentMsg?.key?.id;
            if (menuLastMsgKey) menuInfoMap[menuLastMsgKey] = sections;
        }
    } catch (e) {
        console.log(e);
        reply("❌ Error showing menu");
    }
});

// Global reply handler
if (!global.__menuListHandler) {
    global.__menuListHandler = true;
    const { setTimeout } = require("timers");

    function waitForMenuConn() {
        if (!menuConnRef) return setTimeout(waitForMenuConn, 500);

        menuConnRef.ev.on("messages.upsert", async (msgUpdate) => {
            const msg = msgUpdate.messages?.[0];
            if (!msg || !msg.key) return;

            if (config.BUTTON === 'true' && msg.message?.listResponseMessage) {
                const rowId = msg.message.listResponseMessage.singleSelectReply?.selectedRowId;
                if (rowId) {
                    menuConnRef.ev.emit('command', {
                        ...msg,
                        message: { conversation: rowId }
                    });
                }
            }

            if (config.BUTTON !== 'true' && msg.message?.extendedTextMessage) {
                const stanzaId = msg.message.extendedTextMessage.contextInfo?.stanzaId || menuLastMsgKey;
                if (!menuInfoMap[stanzaId]) return;

                const input = msg.message.extendedTextMessage.text.trim();
                const idx = parseInt(input) - 1;
                if (isNaN(idx) || !menuInfoMap[stanzaId][idx]) {
                    return await menuConnRef.sendMessage(msg.key.remoteJid, {
                        text: "❌ Invalid number!"
                    }, { quoted: msg });
                }

                const cmdId = menuInfoMap[stanzaId][idx].id;
                menuConnRef.ev.emit('command', {
                    ...msg,
                    message: { conversation: `.${cmdId}` }
                });
            }
        });
    }

    waitForMenuConn();
}
