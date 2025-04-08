// server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const twilio = require('twilio');
const { verifyToken } = require('@clerk/clerk-sdk-node');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Env vars (set these in Render or .env)
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_NUMBER;
const w3wApiKey = process.env.W3W_API_KEY;

const client = twilio(accountSid, authToken);

// In-memory store for demo purposes (replace with DB in prod)
const activeSubscribers = new Set();

// Stripe checkout session creation
app.post('/create-checkout-session', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const session = await verifyToken(token);
  const email = session.email_address;

  const checkoutSession = await stripe.checkout.sessions.create({
    customer_email: email,
    line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
    mode: 'subscription',
    success_url: 'https://your-frontend.com/success',
    cancel_url: 'https://your-frontend.com/cancel'
  });

  res.json({ url: checkoutSession.url });
});

// Stripe webhook for subscription status
app.post('/stripe/webhook', express.raw({ type: 'application/json' }), (request, response) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(request.body, request.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return response.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const email = event.data.object.customer_email;
    activeSubscribers.add(email);
  }

  response.json({ received: true });
});

// Location to SMS endpoint
app.post('/send-location', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const session = await verifyToken(token);
  const email = session.email_address;

  if (!activeSubscribers.has(email)) {
    return res.status(403).json({ success: false, message: 'Subscription required' });
  }

  const { latitude, longitude, name, reason, to } = req.body;
  const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
  let what3wordsAddress = '';

  try {
    const w3wRes = await axios.get('https://api.what3words.com/v3/convert-to-3wa', {
      params: { coordinates: `${latitude},${longitude}`, key: w3wApiKey }
    });
    what3wordsAddress = w3wRes.data.words;
  } catch (e) {
    console.error('w3w API error:', e.message);
  }

  const message = `${name || 'Someone'} just ${reason || 'shared their location'}.
📍 Google Maps: ${mapsLink}
🗺️ what3words: https://what3words.com/${what3wordsAddress}`;

  try {
    await client.messages.create({
      body: message,
      from: twilioNumber,
      to: to // use validated number
    });
    res.json({ success: true, message: 'SMS sent with location' });
  } catch (error) {
    console.error('SMS error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
