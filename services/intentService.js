// services/intentService.js

const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Helper function to format chat history for context.
function buildChatHistoryString(chatHistory) {
  return chatHistory
    .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: "${msg.content}"`)
    .join('\n');
}

async function detectIntent(userMessage, chatHistory = []) {
  const historyString = chatHistory.length
    ? `Chat history:\n${buildChatHistoryString(chatHistory)}\n`
    : '';

  const prompt = `
You are an intelligent nutrition coach bot whose only actions are to.

Your goal is to determine the user's intentions. Here are the possible user intentions:
1. The user is trying to log a meal or determine the calories of a certain food -> put this in the food category.
2. The user is trying to log their weight -> put this in the weight category.
3. The user is trying to discuss their goals -> put this in the goals category.
4. The user is trying to learn about a topic related to nutrition and wellness -> put this in the info category.
5. The user is trying to do something outside of these 4 things -> put this in the other category.

Prioritize the latest message, but also keep in account the user's chat history: ${historyString}.

Return your answer strictly as valid JSON in the following format, use the payload field to give a detailed description of the intent
you determined beyond just the category (for instance, for food you could say something like: the user is trying to determine the number of calories in a potato).
The only exception is in the case of weight, just straight up give me the weight as the payload:


{
  "intent": "food" | "weight" | "goals" | "info" | "other",
  "payload": "some string explaining intent further", //in the case of weight, this must be JUST A NUMBER representing their weight in lbs.
  "confirmationRequired": false
}

User: "${userMessage}"`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are a concise intent detection system for a nutrition coach bot.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
  });

  try {
    const result = JSON.parse(completion.choices[0].message.content);
    console.log (result)
    return result;
  } catch (error) {
    return { intent: "other", payload: "error", confirmationRequired: false };
  }
}

module.exports = { detectIntent };
