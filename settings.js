const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });
function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}

module.exports = {    
SESSION_ID: process.env.SESSION_ID || '𝐆𝐎𝐉𝐎-𝐌𝐃=2R1XVLAT#m_94RWzt2gbJjrj0cyIhIr55GYPN1i7PYUNUco1jDWI',
OWNER_NUMBER: process.env.OWNER_NUMBER || "94742697499",
ALIVE: process.env.ALIVE || `default`,
OWNER_NAME: process.env.OWNER_NAME || 'sayura' ,     
POSTGRESQL_URL: process.env.POSTGRESQL_URL || 'postgres://izumimd_meje_user:0Vhm5vKGZ7ORt2FlJBQf4d6EtRdeuE8z@dpg-cn0o2imn7f5s73fa46q0-a.frankfurt-postgres.render.com/izumimd_meje',
PREFIX:  process.env.PREFIX || ['.'] ,
MODE: process.env.MODE || "public",
FOOTER: '> ᴘᴏᴡᴇʀᴇᴅ ʙʏ GOJO MD',
DIRECTION: true,
IMAGE: process.env.IMAGE || `https://i.ibb.co/B25Ws4nf/temp-image.jpg`,
LOGO: process.env.LOGO || `https://i.ibb.co/B25Ws4nf/temp-image.jpg`,
BUTTON: process.env.BUTTON || "true",
};
