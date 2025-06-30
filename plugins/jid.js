const { cmd } = require('../lib/command');

cmd({
  pattern: "jid",
  desc: "Show full JID information including names and types",
  react: "⚜️",
  category: "info",
  filename: __filename
}, async (conn, mek, m, { from }) => {
  try {
    const msg = mek;
    const sock = conn;
    const remoteJid = msg.key.remoteJid;
    const senderJid = msg.key.participant || remoteJid;
    const botJid = sock.user.id;
    const isGroup = remoteJid.endsWith("@g.us");

    let groupName = "N/A";
    let senderName = "N/A";

    if (isGroup) {
      const metadata = await sock.groupMetadata(remoteJid);
      groupName = metadata.subject || "Unnamed Group";

      const sender = metadata.participants.find(p => p.id === senderJid);
      senderName = sender?.admin ? `👑 ${sender.id}` : sender?.id || senderJid;
    } else {
      const contact = await sock.onWhatsApp(senderJid);
      senderName = contact?.[0]?.notify || senderJid;
    }

    const fullText = `🔍 *JID FULL DETAILS*

👥 *Group Name:* ${isGroup ? groupName : "❌ Not a Group"}
👥 *Group JID:* ${isGroup ? remoteJid : "❌"}

👤 *Sender Name:* ${senderName}
👤 *Sender JID:* ${senderJid}

🤖 *Bot JID:* ${botJid}

💬 *Chat Type:* ${isGroup ? "Group" : "Private"}
🕐 *Message ID:* ${msg.key.id}
`;

    const buttons = [
      {
        buttonId: ".jid",
        buttonText: { displayText: "🔁 jid" },
        type: 1
      },
      {
        buttonId: ".menu",
        buttonText: { displayText: "🏠 Main Menu" },
        type: 1
      }
    ];

    await sock.sendMessage(from, {
      text: fullText,
      footer: "© JID Info Tool | Powered by Gojo",
      buttons: buttons,
      headerType: 1
    }, { quoted: mek });

  } catch (err) {
    console.error("Error in .jid command:", err);
    await conn.sendMessage(from, {
      text: "❌ JID විස්තර ලබාගැනීමට අසමත් විය!"
    }, { quoted: mek });
  }
});
