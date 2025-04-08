const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const twilio = require('twilio');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// 🔐 Environment variables from Render (or local `.env` for dev)
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_NUMBER;
const destinationNumber = process.env.DESTINATION_NUMBER;
const w3wApiKey = process.env.W3W_API_KEY;

const client = twilio(accountSid, authToken);

app.post('/send-location', async (req, res) => {
  const { latitude, longitude, name, reason } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).json({ success: false, message: 'Missing location data' });
  }

  const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
  let what3wordsAddress = '';

  // 🔄 Call what3words API
  try {
    const w3wRes = await axios.get('https://api.what3words.com/v3/convert-to-3wa', {
      params: {
        coordinates: `${latitude},${longitude}`,
        key: w3wApiKey
      }
    });

    what3wordsAddress = w3wRes.data.words;
  } catch (error) {
    console.error("what3words API error:", error.message);
  }

  const message = `${name || 'Someone'} just ${reason || 'shared their location'}.
📍 Google Maps: ${mapsLink}
🗺️ what3words: https://what3words.com/${what3wordsAddress}`;

  // ✅ Send SMS
  try {
    await client.messages.create({
      body: message,
      from: twilioNumber,
      to: destinationNumber
    });

    res.json({ success: true, message: 'SMS sent with location' });
  } catch (error) {
    console.error('SMS Error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
