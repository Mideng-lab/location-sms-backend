const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// 🔐 Replace these with your Twilio credentials and phone numbers
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_NUMBER;
const destinationNumber = process.env.DESTINATION_NUMBER;

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
