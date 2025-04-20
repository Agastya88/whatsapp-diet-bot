// controllers/messageHandler.js

const {
  initUser,
  getUser,
  addToChatHistory,
  getRecentChatHistory,
  logWeight,
  logMeal,
  getUserFeedback,
} = require('../utils/firebaseDataStore');

const {
  detectIntent
} = require('../services/intentService');

const {
  getMealEstimation,
  getNutritionInfo,
  guideUser,
} = require('../services/openaiService');

const {
  makeWeightChartUrl,
  makeCalorieChartUrl,
} = require('../utils/chartGenerator');

const pendingConfirmations = {};

async function handleMessage(req, twiml) {
  const phone = req.body.From;
  const rawMsg = req.body.Body.trim();
  const lowerMsg = rawMsg.toLowerCase();

  await initUser(phone);
  const user = await getUser(phone);
  await addToChatHistory(phone, 'user', rawMsg);

  // Handle confirmation responses
  if (pendingConfirmations[phone]) {
    const { intent, payload } = pendingConfirmations[phone];
    if (['yes', 'y'].includes(lowerMsg)) {
      let confirmResponse = '';
      if (intent === 'food') {
        await logMeal(phone, payload);
        confirmResponse = `✅ Your meal "${payload.label}" has been logged.`;
      } else if (intent === 'weight') {
        await logWeight(phone, payload);
        confirmResponse = `✅ Your weight of ${payload} lbs has been logged.`;
      }
      twiml.message(confirmResponse);
      await addToChatHistory(phone, 'assistant', confirmResponse);
    } else {
      const cancel = `❌ Got it. I won't log that ${intent === 'food' ? 'meal' : 'weight'}.`;
      twiml.message(cancel);
      await addToChatHistory(phone, 'assistant', cancel);
    }
    delete pendingConfirmations[phone];
    return;
  }

  // Check for direct commands like /progress
  if (lowerMsg === '/progress') {
    const weightChartUrl = await makeWeightChartUrl(phone, 14);
    const calChartUrl = await makeCalorieChartUrl(phone, 14);
    twiml.message('📈 Your weight trend:').media(weightChartUrl);
    twiml.message('🔥 Your calorie intake:').media(calChartUrl);
    return;
  }

  // Run LLM-based intent detection with chat context
  const chatHistory = await getRecentChatHistory(phone, 5);
  const { intent, payload } = await detectIntent(rawMsg, chatHistory);
  console.log("Detected intent:", intent);

  // Response handler
  let response = '';

  if (intent === 'weight') {
    response = `⚖️ I detected that your weight is ${payload} lbs. Log it? (yes/no)`;
    pendingConfirmations[phone] = { intent: 'weight', payload };
  } else if (intent === 'food') {
    const estimation = await getMealEstimation(payload.meal || payload);
    response = `🍽️ Estimated for "${estimation.label}":\n${estimation.calories} cal, ` +
               `${estimation.protein}g protein, ${estimation.carbs}g carbs, ${estimation.fat}g fat.\nLog this meal? (yes/no)`;
    pendingConfirmations[phone] = { intent: 'food', payload: estimation };
  } else if (intent === 'goals') {
    response = await getUserFeedback(phone);
  } else if (intent === 'info') {
    response = await getNutritionInfo(payload, phone);
  } else {
    response = await guideUser(payload, phone);
  }

  twiml.message(response);
  await addToChatHistory(phone, 'assistant', response);
}

module.exports = { handleMessage };
