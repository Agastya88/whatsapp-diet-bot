// app.js (Entry Point)
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { MessagingResponse } = require('twilio').twiml;
const { handleMessage } = require('./controllers/messageHandler');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

app.post('/webhook', async (req, res) => {
  const twiml = new MessagingResponse();
  await handleMessage(req, twiml);
  res.set('Content-Type', 'text/xml');
  res.send(twiml.toString());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
