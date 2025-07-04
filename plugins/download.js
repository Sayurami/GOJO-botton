const { cmd } = require('../lib/command');
const config = require('../settings');

// Map<chat, { urls: string[], expires: number }>
const sessionCache = new Map();

cmd({
  pattern: "download",
  alias: ["durl"],
  desc: "🔰 Direct URL එකකින් File එකක් Download කරන්න",
  react: "🔰",
  category: "download",
  filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
  try {
    if (!args.length) {
      return reply("❗ කරුණාකර URL එකක් හෝ කිහිපයක් space වලින් වෙන්කර සපයන්න.\n\n*උදාහරණයක්:* `.download https://example.com/video1.mp4 https://example.com/video2.mp4`");
    }

    const urls = args.filter(x => x.startsWith("http"));
    if (!urls.length) return reply("❗ වලංගු URL කිසිවක් සොයාගත නොහැක.");

    // Session එක 5 minutes වලට expire වෙයි
    sessionCache.set(from, {
      urls,
      expires: Date.now() + 5 * 60 * 1000
    });

    const rows = urls.map((link, i) => ({
      title: `📄 File ${i + 1}`,
      description: link.length > 40 ? link.slice(0, 40) + "…" : link,
      rowId: `download_select_${i}`
    }));

    await conn.sendMessage(from, {
      text: "*📥 Download URLs List*",
      footer: "ඔබට බාගත කිරීමට අවශ්‍ය File එක තෝරන්න.",
      title: "🔗 URLs List",
      buttonText: "📂 File එකක් තෝරන්න",
      sections: [{ title: "📁 Available Files", rows }]
    }, { quoted: mek });

    await conn.sendMessage(from, { react: { text: "✅", key: mek.key }});
  } catch (err) {
    console.error("Download command error:", err);
    await conn.sendMessage(from, { react: { text: "❌", key: mek.key }});
    reply("❌ වැරදික් ඇති වුණා. නැවත උත්සාහ කරන්න.");
  }
});

// 🟢 Handle list response
cmd({
  on: "message"
}, async (conn, mek, m) => {
  const listResp = m.message?.listResponseMessage;
  if (!listResp) return;

  const chat = m.key.remoteJid;
  const sel = listResp.singleSelectReply?.selectedRowId;
  if (!sel?.startsWith("download_select_")) return;

  const index = Number(sel.split("_").pop());
  const session = sessionCache.get(chat);

  if (!session || !session.urls[index] || Date.now() > session.expires) {
    return await conn.sendMessage(chat, {
      text: "❗ Session එක කල් ඉකුත් වී ඇත. කරුණාකර `.download` command එක නැවත භාවිතා කරන්න."
    }, { quoted: mek });
  }

  const url = session.urls[index];
  try {
    await conn.sendMessage(chat, { react: { text: "⏬", key: mek.key }});

    await conn.sendMessage(chat, {
      document: { url },
      mimetype: "video/mp4", // 🟣 Assume MP4
      fileName: `Video_${index + 1}.mp4`,
      caption: `*📥 MP4 Video File*\n\n🔗 Source: ${url}`
    }, { quoted: mek });

    await conn.sendMessage(chat, { react: { text: "✅", key: mek.key }});
  } catch (err) {
    console.error("File send error:", err);
    await conn.sendMessage(chat, {
      text: "❌ File එක යැවීමේදී දෝෂයක් ඇතිවුණා.",
      quoted: mek
    });
    await conn.sendMessage(chat, { react: { text: "❌", key: mek.key }});
  }
});
