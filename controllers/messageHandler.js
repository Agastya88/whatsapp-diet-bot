// controllers/messageHandler.js

const {
  initUser,
  getUser,
  addToChatHistory,
  getRecentChatHistory,
  logWeight,
  logMeal,
  getUserFeedback
} = require('../utils/firebaseDataStore');
const { detectIntent } = require('../services/intentService');
const { getMealEstimation, getNutritionInfo } = require('../services/openaiService');

// Global object to store pending confirmation for actions like meal or weight logging.
const pendingConfirmations = {};

async function handleMessage(req, twiml) {
  const phone = req.body.From;
  const msg = req.body.Body.trim();

  // Ensure the user exists and record their incoming message.
  await initUser(phone);
  const user = await getUser(phone);
  await addToChatHistory(phone, 'user', req.body.Body);

  // First, check if there's a pending confirmation for this phone.
  if (pendingConfirmations[phone]) {
    const { intent, payload } = pendingConfirmations[phone];
    if (msg.toLowerCase() === 'yes' || msg.toLowerCase() === 'y') {
      if (intent === 'food') {
        // User confirmed the meal logging.
        await logMeal(phone, payload);
        const confirmResponse = `✅ Your meal "${payload.label}" has been logged.`;
        await addToChatHistory(phone, 'assistant', confirmResponse);
        twiml.message(confirmResponse);
      } else if (intent === 'weight') {
        // User confirmed the weight logging.
        await logWeight(phone, payload);
        const confirmResponse = `✅ Your weight of ${payload} lbs has been logged.`;
        await addToChatHistory(phone, 'assistant', confirmResponse);
        twiml.message(confirmResponse);
      }
    } else {
      // User did not confirm.
      const cancelResponse = `❌ Got it. I won't log that ${intent === 'food' ? 'meal' : 'weight'}.`;
      await addToChatHistory(phone, 'assistant', cancelResponse);
      twiml.message(cancelResponse);
    }
    // Clear the pending confirmation.
    delete pendingConfirmations[phone];
    return;
  }

  // Retrieve recent conversation history to provide context.
  const chatHistory = await getRecentChatHistory(phone, 5);

  // Call the intent service using the current message and chat history.
  const detected = await detectIntent(msg, chatHistory);
  console.log("Detected:", detected);
  const { intent, payload } = detected;

  let response = '';

  if (intent === 'weight') {
    // Instead of immediately logging the weight, ask for confirmation.
    response = `I detected that your weight is ${payload} lbs. Would you like to log this weight? (yes/no)`;
    // Save pending weight log confirmation.
    pendingConfirmations[phone] = { intent: 'weight', payload };
    await addToChatHistory(phone, 'assistant', response);
    twiml.message(response);
  } else if (intent === 'food') {
    // Obtain meal estimation (nutrition information) using the provided meal description.
    const estimation = await getMealEstimation(payload.meal || payload);
    console.log("Meal Estimation:", estimation);
    // Ask for confirmation before logging the meal.
    response =
      `I estimated that "${estimation.label}" contains about ${estimation.calories} calories, ` +
      `${estimation.protein}g protein, ${estimation.carbs}g carbs, and ${estimation.fat}g fat. ` +
      `Would you like to log this meal? (yes/no)`;
    // Store the meal estimation details in pending confirmations.
    pendingConfirmations[phone] = { intent: 'food', payload: estimation };
    await addToChatHistory(phone, 'assistant', response);
    twiml.message(response);
  } else if (intent === 'goals') {
    // Provide user feedback based on their current data.
    const feedback = await getUserFeedback(user);
    response = feedback;
    await addToChatHistory(phone, 'assistant', response);
    twiml.message(response);
  } else if (intent === 'info') {
    info = await getNutritionInfo(payload)
    response = info.info
    await addToChatHistory(phone, 'assistant', response);
    twiml.message(response);
  }
  else {
    // Fallback if the intent is not recognized.
    response = await guideUser();
    await addToChatHistory(phone, 'assistant', response);
    twiml.message(response);
  }
}

module.exports = { handleMessage };
