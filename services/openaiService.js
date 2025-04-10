// services/openaiService.js
const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function getMealEstimation(mealText) {
  const prompt = `Estimate the calories, protein, carbs, and fat for this Indian meal: "${mealText}". Respond in JSON:
  {
    "label": "...",
    "calories": ...,
    "protein": ...,
    "carbs": ...,
    "fat": ...
  }`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: 'You are a nutrition assistant who estimates Indian food macros.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.4
  });

  const json = JSON.parse(completion.choices[0].message.content);
  return json;
}

async function getNutritionInfo(topic) {
  const prompt = `You are a helpful Indian nutrition assistant. Explain this topic in clear, beginner-friendly language for someone in India: ${topic}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: 'You are an Indian nutritionist assistant.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.5
  });

  return completion.choices[0].message.content;
}

module.exports = {
  getMealEstimation,
  getNutritionInfo
};
