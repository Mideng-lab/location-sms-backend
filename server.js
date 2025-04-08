const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// 🔐 Replace these with your Twilio credentials and phone numbers
const accountSid = 'YOUR_TWILIO_SID';
const authToken = 'YOUR_TWILIO_AUTH_TOKEN';
const twilioNumber = 'YOUR_TWILIO_PHONE_NUMBER';
const destinationNumber = 'YOUR_PERSONAL_PHONE_NUMBER';

const client = twilio(accountSid, authToken);

app.post('/send-location', async (req, res) => {
  const { latitude, longitude, name, reason } = req.body;

  const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
  const message = `${name || 'Someone'} just ${reason || 'shared their location'}.\n📍 ${mapsLink}`;

  try {
    await client.messages.create({
      body: message,
      from: twilioNumber,
      to: destinationNumber
    });

    res.json({ success: true, message: 'SMS sent' });
  } catch (error) {
    console.error('SMS Error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
