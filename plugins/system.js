// plugins/system.js
const { cmd } = require('../lib/command');
const os       = require('os');
const util     = require('util');
const exec     = util.promisify(require('child_process').exec);
const config = require('../settings');
// bytes → MB
const fmtMB = (b) => (b / 1024 / 1024).toFixed(2) + ' MB';

cmd({
  pattern : 'system',
  react   : '🖥️',
  desc    : 'Show system info + quick-action list',
  category: 'owner',
  filename: __filename
}, async (conn, mek, m, { from, prefix }) => {
  try {
    /* 1️⃣ react first */
    await conn.sendMessage(from, { react: { text: '🖥️', key: mek.key } });

    /* 2️⃣ gather stats */
    const upSec   = process.uptime();
    const h       = Math.floor(upSec / 3600);
    const min     = Math.floor((upSec % 3600) / 60);
    const s       = Math.floor(upSec % 60);
    const usedRam = os.totalmem() - os.freemem();

    let disk = 'N/A';
    try {
      const { stdout } = await exec('df -h / | awk "NR==2"');
      disk = stdout.trim();
    } catch {}

    const caption =
`*🖥️ SYSTEM STATUS*

├ *Uptime:* ${h}h ${min}m ${s}s
├ *RAM:* ${fmtMB(usedRam)} / ${fmtMB(os.totalmem())}
├ *Disk:* ${disk}
└ *CPU:* ${os.cpus()[0].model}

_Node ${process.version}_`;

    /* 3️⃣ single-select list buttons */
    const rows = [
      { title: '🏓 Ping', description: 'Check bot latency', id: `${prefix || '.'}ping` },
      { title: '📜 Menu', description: 'Open main menu',   id: `${prefix || '.'}menu` }
    ];

    const buttons = [{
      buttonId: 'action',
      buttonText: { displayText: 'Select Action' },
      type: 4,
      nativeFlowInfo: {
        name: 'single_select',
        paramsJson: JSON.stringify({
          title   : 'Choose Action ⚙️',
          sections: [{ title: 'Quick Actions', rows }]
        })
      }
    }];

    /* 4️⃣ send message */
    await conn.sendMessage(from, {
      caption,
      image: { url: 'https://raw.githubusercontent.com/gojo18888/Photo-video-/refs/heads/main/file_000000003a2861fd8da00091a32a065a.png' },
      buttons,
      headerType: 4,
      viewOnce : true
    }, { quoted: mek });

  } catch (err) {
    console.error(err);
    await conn.sendMessage(from, { text: '❌ *Failed to fetch system info.*' }, { quoted: mek });
  }
});

/* ─────────────────────────────
   Optional: simple ping command
───────────────────────────────*/
cmd({
  pattern : 'ping',
  react   : '🏓',
  desc    : 'Check bot latency',
  category: 'misc',
  filename: __filename
}, async (conn, mek, m, { from }) => {
  const t0 = Date.now();
  await conn.sendMessage(from, { react: { text: '🏓', key: mek.key } });
  const ping = Date.now() - t0;
  await conn.sendMessage(from, { text: `🏓 *Pong!* _${ping} ms_` }, { quoted: mek });
});
