// services/openaiService.js
const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function getMealEstimation(mealText) {
  const prompt = `Estimate the calories, protein, carbs, and fat for this meal: "${mealText}".
Respond ONLY in valid JSON with no additional commentary.
The JSON must be exactly in the following format without any extra text:
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
      { role: 'system', content: 'You are a nutrition assistant who estimates food calories and macros.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.4
  });

  const json = JSON.parse(completion.choices[0].message.content);
  console.log(json);
  return json;
}

async function getNutritionInfo(userCuriosity) {
  const prompt = `${userCuriosity}. You are a helpful Indian nutrition assistant. Provide the user with relevant information to assist them.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are an Indian nutritionist assistant.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.5
  });

  return completion.choices[0].message.content;
}

async function guideUser(userIntent) {
  const prompt = `You are a helpful nutrition assistant. The user has done something outside of your known intents. It's intent was ${userIntent}.
  Use the user's intent message to create a witty response that guides the user back to using the app for food logging, weight tracking,
  managing their fitness goals or general nutrition info.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are an Indian nutritionist assistant.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.5
  });

  return completion.choices[0].message.content;
}

/**
 * generateUserFeedback accepts an aggregated prompt as input and returns feedback from OpenAI.
 * This function follows a similar pattern as the other OpenAI calls in this file.
 */
async function generateUserFeedback(prompt) {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful nutrition coach.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7
    });
    const feedback = completion.choices[0].message.content;
    return feedback;
  } catch (error) {
    console.error("Error generating feedback:", error);
    return "I'm sorry, I'm having trouble generating feedback right now. Please try again later.";
  }
}

module.exports = {
  getMealEstimation,
  getNutritionInfo,
  generateUserFeedback,
  guideUser
};
