const axios = require('axios');
const { cmd } = require('../lib/command');

cmd({
  pattern: "weather",
  desc: "🌤 Get weather information for a location",
  react: "🌤",
  category: "other",
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) {
      await conn.sendMessage(from, { react: { text: "❗", key: mek.key } });
      return reply("🌍 *ඔයාලා නගරයක් දාන්නකෝ!*\n\n_Usage:_ `.weather colombo`");
    }

    await conn.sendMessage(from, { react: { text: "🔍", key: mek.key } });

    const apiKey = '2d61a72574c11c4f36173b627f8cb177'; 
    const city = q;
    const url = `http://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
    const response = await axios.get(url);
    const data = response.data;

    const text = `🌤️ *Weather Report – ${data.name}, ${data.sys.country}*

> 🌡️ *Temperature:* ${data.main.temp}°C  
> 🤗 *Feels Like:* ${data.main.feels_like}°C  
🔽 *Min:* ${data.main.temp_min}°C | 🔼 Max: ${data.main.temp_max}°C

💨 *Wind:* ${data.wind.speed} m/s  
💦 *Humidity:* ${data.main.humidity}%  
☁️ *Condition:* ${data.weather[0].main}  
🌫️ *Description:* ${data.weather[0].description}  
📊 *Pressure:* ${data.main.pressure} hPa  

🛰 *Powered by OpenWeatherMap*
`;

    const buttons = [
      {
        buttonId: `.weather ${city}`,
        buttonText: { displayText: "🔁 Refresh" },
        type: 1
      },
      {
        buttonId: ".menu",
        buttonText: { displayText: "🏠 Main Menu" },
        type: 1
      }
    ];

    await conn.sendMessage(from, {
      text,
      footer: "📍 Weather Lookup | Gojo MD",
      buttons,
      headerType: 1
    }, { quoted: mek });

    await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

  } catch (e) {
    console.error("weather error:", e);
    await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });

    if (e.response?.status === 404) {
      return reply("🚫 *City not found!*");
    }

    return reply("⚠️ *Error occurred!*");
  }
});
