// app.js  –  Nutribot on WhatsApp Cloud API (final version)
require('dotenv').config();
const express = require('express');
const axios   = require('axios');
const { handleMessage } = require('./controllers/messageHandler');

const app = express();
app.use(express.json());  // WhatsApp sends JSON

/* ───────── 1) Webhook verification ───────── */
app.get('/webhook', (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    return res.status(200).send(challenge);      // plain-text echo
  }
  res.sendStatus(403);
});

/* ───────── helpers to hit Cloud API ───────── */
const wa = axios.create({
  baseURL: `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}`,
  headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` }
});

const sendText  = (to, body)               =>
  wa.post('/messages', { messaging_product:'whatsapp', to, type:'text',
                         text:{ body } });

const sendImage = (to, link, caption='')   =>
  wa.post('/messages', { messaging_product:'whatsapp', to, type:'image',
                         image:{ link, caption } });

/* ───────── 2) Incoming messages ───────── */
app.post('/webhook', async (req, res) => {
  try {
    const change  = req.body.entry?.[0]?.changes?.[0]?.value;
    const message = change?.messages?.[0];
    if (!message) return res.sendStatus(200);      // nothing to do

    const from      = message.from;
    const wamid     = message.id;

    /* 2a. mark read + typing */
    wa.post('/messages', {
      messaging_product:'whatsapp',
      to: from,
      status:'read',
      message_id: wamid,
      typing_indicator:{ type:'text' }
    }).catch(()=>{}); // fire-and-forget

    /* 2b. get Nutribot replies */
    const replies = await handleMessage(req);      // NEW signature

    /* 2c. send each reply */
    for (const r of replies) {
      if (r.type === 'text')      await sendText(from, r.body);
      else if (r.type === 'image')await sendImage(from, r.link, r.caption);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error:', err.response?.data || err);
    res.sendStatus(500);
  }
});

/* ───────── 3) Boot server ───────── */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Nutribot server running on ${PORT}`));
