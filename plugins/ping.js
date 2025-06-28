const { cmd } = require("../lib/command");
const config = require('../settings');

cmd(
  {
    pattern: "ping",
    desc: "Check bot response speed",
    react: "🏓",
    type: "main",
    filename: __filename,
  },
  async (conn, mek, m, { from }) => {
    const start = Date.now();

    const sentMsg = await conn.sendMessage(from, { text: "🏓 *Pong!* Measuring..." }, { quoted: mek });
    const end = Date.now();
    const ping = end - start;

    await conn.sendMessage(from, {
      text: `✅ *Bot Active!*\n📶 Response Time: *${ping}ms*`,
    }, { quoted: mek });
  }
);
