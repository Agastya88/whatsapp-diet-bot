// services/intentService.js
const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function detectIntent(userMessage) {
  const prompt = `You are a WhatsApp-based Indian nutrition coach. Interpret the user's message and determine their intent.
Respond ONLY in valid JSON with this format:

{
  "intent": "log_food" | "log_weight" | "mealplan" | "info" | "summary" | "progress" | "unknown",
  "payload": { ... },
  "confirmationRequired": true | false
}

User: "${userMessage}"`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: 'You are an intent-detection agent for a nutrition chatbot.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.4
  });

  try {
    const parsed = JSON.parse(completion.choices[0].message.content);
    return parsed;
  } catch (err) {
    return {
      intent: 'unknown',
      payload: {},
      confirmationRequired: false
    };
  }
}

module.exports = { detectIntent };