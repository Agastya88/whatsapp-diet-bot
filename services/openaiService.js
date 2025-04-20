// services/openaiService.js
const { OpenAI } = require('openai');
const { getRecentChatContext } = require('../utils/chatContext');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ───────── constants ───────── */

const SYSTEM_PROMPT =
  'You are a nutritionist assistant who chats with users on WhatsApp. ' +
  'All replies must be concise, friendly and NEVER exceed 3000 characters.';

/* ───────── calorie / macro estimator ───────── */

async function getMealEstimation(mealText) {
  const prompt = `Estimate calories, protein, carbs and fat for: "${mealText}".
Respond ONLY as raw JSON exactly like:
{
  "label": "...",
  "calories": ...,
  "protein": ...,
  "carbs": ...,
  "fat": ...
}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: prompt }
    ],
    temperature: 0.3
  });

  return JSON.parse(completion.choices[0].message.content);
}

/* ───────── context‑aware Q&A ───────── */

async function getNutritionInfo(question, phone) {
  const ctx = await getRecentChatContext(phone, 6);       // last 6 turns
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...ctx,
      { role: 'user',   content: question }
    ],
    temperature: 0.5
  });
  return completion.choices[0].message.content.trim();
}

/* ───────── context‑aware nudge / redirect ───────── */

async function guideUser(userIntent, phone) {
  const ctx = await getRecentChatContext(phone, 6);
  const prompt =
    `User just sent: "${userIntent}". ` +
    'Reply in a witty, friendly tone and steer them back to logging meals, ' +
    'tracking weight or asking nutrition questions.';

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...ctx,
      { role: 'user',   content: prompt }
    ],
    temperature: 0.7
  });
  return completion.choices[0].message.content.trim();
}

/* ───────── feedback generator (chat context already in prompt) ───────── */

async function generateUserFeedback(prompt) {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: prompt }
      ],
      temperature: 0.6
    });
    return completion.choices[0].message.content.trim();
  } catch (err) {
    console.error('Feedback generation error:', err);
    return '⚠️  Sorry, I had trouble generating feedback. Please try again later.';
  }
}

/* ───────── exports ───────── */

module.exports = {
  getMealEstimation,   // (mealText)
  getNutritionInfo,    // (question, phone)
  guideUser,           // (userIntent, phone)
  generateUserFeedback // (prompt)
};
