// controllers/messageHandler.js

const {
  initUser,
  getUser,
  addToChatHistory,
  logWeight,
  logMeal,
  getUserFeedback,
} = require('../utils/firebaseDataStore');
const { detectIntent } = require('../services/intentService');
const {
  getMealEstimation,
  getNutritionInfo,
  guideUser,
} = require('../services/openaiService');
const {
  makeWeightChartUrl,
  makeCalorieChartUrl,
} = require('../utils/chartGenerator');

const pendingConfirmations = {}; // { [phone]: { intent, payload } }

async function handleMessage(req, twiml) {
  const phone = req.body.From;
  const rawMsg = (req.body.Body || '').trim();
  const lower = rawMsg.toLowerCase();

  console.log(`[Handler] Received message from ${phone}: "${rawMsg}"`);

  // 1. Ensure user exists & log the incoming message
  try {
    await initUser(phone);
    console.log(`[Handler] initUser succeeded for ${phone}`);
  } catch (err) {
    console.error(`[Handler] initUser failed for ${phone}:`, err);
  }

  try {
    await addToChatHistory(phone, 'user', rawMsg);
    console.log(`[Handler] addToChatHistory (user) succeeded for ${phone}`);
  } catch (err) {
    console.error(`[Handler] addToChatHistory (user) failed for ${phone}:`, err);
  }

  // 2. Handle any pending yes/no confirmations
  if (pendingConfirmations[phone]) {
    const { intent, payload } = pendingConfirmations[phone];
    console.log(`[Handler] Found pending confirmation for ${phone}: intent=${intent}`, payload);
    delete pendingConfirmations[phone];

    if (['yes', 'y'].includes(lower)) {
      try {
        let reply;
        if (intent === 'food-logging') {
          await logMeal(phone, payload);
          reply = `✅ Logged meal: "${payload.label}" (${payload.calories} cal).`;
        } else {
          await logWeight(phone, payload);
          reply = `✅ Logged weight: ${payload} lbs.`;
        }
        twiml.message(reply);
        console.log(`[Handler] Confirmation YES handled for ${phone}: ${reply}`);
        await addToChatHistory(phone, 'assistant', reply);
      } catch (err) {
        console.error(`[Handler] Error logging confirmed ${intent} for ${phone}:`, err);
        const errorMsg = "😕 Couldn't log your data, please try again.";
        twiml.message(errorMsg);
        await addToChatHistory(phone, 'assistant', errorMsg);
      }
    } else {
      const reply = `❌ Okay, not logging that ${intent}.`;
      twiml.message(reply);
      console.log(`[Handler] Confirmation NO handled for ${phone}: ${reply}`);
      await addToChatHistory(phone, 'assistant', reply);
    }
    return;
  }

  // 3. Built-in slash commands
  if (lower === '/progress') {
    console.log(`[Handler] Processing /progress for ${phone}`);
    try {
      const wUrl = await makeWeightChartUrl(phone, 14);
      const cUrl = await makeCalorieChartUrl(phone, 14);
      twiml.message('📈 Here’s your weight trend:').media(wUrl);
      twiml.message('🔥 Here’s your calorie intake trend:').media(cUrl);
      console.log(`[Handler] Sent charts to ${phone}`);
    } catch (err) {
      console.error(`[Handler] Error generating charts for ${phone}:`, err);
      const errorMsg = "😕 Couldn't generate charts right now.";
      twiml.message(errorMsg);
      await addToChatHistory(phone, 'assistant', errorMsg);
    }
    return;
  }

  if (lower === '/help' || lower === '/start') {
    console.log(`[Handler] Processing help/start for ${phone}`);
    const menu =
      `👋 Hi! I’m your WhatsApp Diet Coach:\n` +
      `• Log food-logging by typing what you ate (e.g., “2 rotis and dal”)\n` +
      `• Log weight by typing your weight (e.g., “170 lbs”)\n` +
      `• /progress → see your charts\n` +
      `• Ask questions like “what’s a good protein source?”\n` +
      `• /help → show this menu\n`;
    twiml.message(menu);
    await addToChatHistory(phone, 'assistant', menu);
    return;
  }

  // 4. Detect intent
  let intentResult;
  try {
    intentResult = await detectIntent(rawMsg, phone);
    console.log(`[Handler] detectIntent returned for ${phone}:`, intentResult);
  } catch (err) {
    console.error(`[Handler] detectIntent error for ${phone}:`, err);
    intentResult = { intent: 'other', payload: rawMsg, confirmationRequired: false };
  }

  const { intent, payload, confirmationRequired } = Array.isArray(intentResult)
    ? intentResult[0]
    : intentResult;

  console.log(`[Handler] Routing intent for ${phone}:`, { intent, payload, confirmationRequired });

  // 5. Route based on intent
  try {
    switch (intent) {
      case 'food-logging':
        if (confirmationRequired) {
          console.log(`[Handler] Handling food-logging intent for ${phone}`);
          const mealText = rawMsg;
          let estimation;
          try {
            estimation = await getMealEstimation(mealText);
            console.log(`[Handler] getMealEstimation success for ${phone}:`, estimation);
          } catch (e) {
            console.error(`[Handler] getMealEstimation failed for ${phone}:`, e);
            const fallback = await guideUser(rawMsg, phone);
            twiml.message(fallback);
            await addToChatHistory(phone, 'assistant', fallback);
            return;
          }

          const msg =
            `🍽️ I estimate: "${estimation.label}" = ` +
            `${estimation.calories} cal, ${estimation.protein}g P, ` +
            `${estimation.carbs}g C, ${estimation.fat}g F.\n` +
            `Log this meal? (yes/no)`;
          pendingConfirmations[phone] = { intent: 'food-logging', payload: estimation };
          twiml.message(msg);
          await addToChatHistory(phone, 'assistant', msg);
          console.log(`[Handler] Sent food-logging confirmation to ${phone}`);
          return;
        }
        break;

      case 'weight-logging':
        if (confirmationRequired) {
          console.log(`[Handler] Handling weight-logging intent for ${phone}, payload=${payload}`);
          const msg = `⚖️ I detected your weight as ${payload} lbs. Log it? (yes/no)`;
          pendingConfirmations[phone] = { intent: 'weight-logging', payload };
          twiml.message(msg);
          await addToChatHistory(phone, 'assistant', msg);
          console.log(`[Handler] Sent weight-logging confirmation to ${phone}`);
          return;
        }
        break;

      case 'feedback':
        console.log(`[Handler] Handling feedback intent for ${phone}`);
        const feedback = await getUserFeedback(phone);
        twiml.message(feedback);
        await addToChatHistory(phone, 'assistant', feedback);
        console.log(`[Handler] Sent feedback to ${phone}`);
        return;

      case 'info':
        console.log(`[Handler] Handling info intent for ${phone}, topic="${payload}"`);
        const info = await getNutritionInfo(payload, phone);
        twiml.message(info);
        await addToChatHistory(phone, 'assistant', info);
        console.log(`[Handler] Sent info to ${phone}`);
        return;

      default:
        console.log(`[Handler] Handling fallback intent for ${phone}`);
        const guide = await guideUser(rawMsg, phone);
        twiml.message(guide);
        await addToChatHistory(phone, 'assistant', guide);
        console.log(`[Handler] Sent fallback guide to ${phone}`);
        return;
    }
  } catch (err) {
    console.error(`[Handler] Error in intent routing for ${phone}:`, err);
    const errorMsg = "😕 Something went wrong. Please try again.";
    twiml.message(errorMsg);
    await addToChatHistory(phone, 'assistant', errorMsg);
    return;
  }
}

module.exports = { handleMessage };
