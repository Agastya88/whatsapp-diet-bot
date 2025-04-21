// services/intentService.js  – context‑aware intent detection with JSON cleanup
const { OpenAI } = require('openai');
const { getRecentChatContext } = require('../utils/chatContext');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Strip Markdown code fences if present.
 */
function cleanJsonResponse(text) {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/, '')
    .replace(/\s*```$/, '');
}

/**
 * detectIntent analyzes the user's latest message within their recent chat context
 * and returns an intent object: { intent, payload, confirmationRequired }.
 * @param {string} userMessage - the current user message
 * @param {string} phone       - user's phone number for retrieving chat context
 */
async function detectIntent(userMessage, phone) {
  // 1. Fetch recent chat turns for context
  const chatCtx = await getRecentChatContext(phone, 6);
  const historyString = chatCtx.length
    ? 'Chat history:\n' +
      chatCtx.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: "${m.content}"`).join('\n') +
      '\n\n'
    : '';

  // 2. Build prompt (explicitly forbid markdown fences)
  const prompt =
    `You are a concise intent detection system for a nutrition coach bot.\n\n` +
    `${historyString}` +
    `Determine the user's intent from the following message, choosing one of: food, weight, goals, info, other.\n` +
    `- For 'food', payload should describe what they want to log or estimate (e.g. calories for meal).\n` +
    `- For 'weight', payload must be ONLY the weight number in lbs.\n` +
    `- For 'goals', payload describes the goal action.\n` +
    `- For 'info', payload is the topic they are asking about.\n` +
    `- For 'other', payload can be a short explanation.\n\n` +
    `Return ONLY raw JSON with keys: intent, payload, confirmationRequired.\n` +
    `Do NOT include any markdown code fences, annotations, or extra text.\n\n` +
    `User: "${userMessage}"`;

  // 3. Call the LLM
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are an intelligent nutrition coach bot intent parser.' },
      { role: 'user',   content: prompt }
    ],
    temperature: 0.3
  });

  // 4. Clean and parse JSON
  const raw = completion.choices[0].message.content;
  const cleaned = cleanJsonResponse(raw);

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Intent parsing error:', err, 'raw response:', raw);
    return { intent: 'other', payload: userMessage, confirmationRequired: false };
  }
}

module.exports = { detectIntent };
