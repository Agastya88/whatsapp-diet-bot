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

const pendingConfirmations = {}; // phone → { intent, payload }

async function handleMessage(req, twiml) {
  const phone = req.body.From;
  const rawMsg = (req.body.Body || '').trim();
  const lower = rawMsg.toLowerCase();

  // 1) Ensure user & log incoming
  await initUser(phone);
  const user = await getUser(phone);
  await addToChatHistory(phone, 'user', rawMsg);

  // 2) Handle “yes/no” confirmations first
  if (pendingConfirmations[phone]) {
    const { intent, payload } = pendingConfirmations[phone];
    delete pendingConfirmations[phone];

    if (['yes', 'y'].includes(lower)) {
      let reply;
      if (intent === 'food') {
        await logMeal(phone, payload);
        reply = `✅ Your meal "${payload.label}" has been logged.`;
      } else {
        await logWeight(phone, payload);
        reply = `✅ Your weight of ${payload} lbs has been logged.`;
      }
      twiml.message(reply);
      await addToChatHistory(phone, 'assistant', reply);
      return;
    } else {
      const reply = `❌ Got it. I won't log that ${intent}.`;
      twiml.message(reply);
      await addToChatHistory(phone, 'assistant', reply);
      return;
    }
  }

  // 3) Built‑in command: /progress → charts
  if (lower === '/progress') {
    const wUrl = await makeWeightChartUrl(phone, 14);
    const cUrl = await makeCalorieChartUrl(phone, 14);

    twiml.message('📈 Your weight trend:').media(wUrl);
    twiml.message('🔥 Your calorie intake:').media(cUrl);
    return;
  }

  // 4) Intent detection
  let detected;
  try {
    detected = await detectIntent(rawMsg, phone);
  } catch (err) {
    console.error('Intent detection error', err);
    detected = [{ intent: 'unknown', payload: rawMsg, confirmationRequired: false }];
  }
  // support array or single object
  const first = Array.isArray(detected) ? detected[0] : detected;
  const { intent, payload, confirmationRequired } = first;
  console.log('Detected intent:', intent, payload, confirmationRequired);

  // 5) Route based on intent
  try {
    // 5a) Weight logging
    if (intent === 'weight' && confirmationRequired) {
      const msg = `⚖️ I detected your weight is ${payload} lbs. Log it? (yes/no)`;
      pendingConfirmations[phone] = { intent: 'weight', payload };
      twiml.message(msg);
      await addToChatHistory(phone, 'assistant', msg);
      return;
    }

    // 5b) Food logging
    if (intent === 'food' && confirmationRequired) {
      // Use rawMsg as fallback if detectIntent payload isn't meal text
      const mealText = typeof payload === 'string' ? rawMsg : payload.meal || rawMsg;
      let estimation;
      try {
        estimation = await getMealEstimation(mealText);
      } catch (err) {
        console.error('Food estimation failed', err);
        const fallback = await guideUser(rawMsg, phone);
        twiml.message(fallback);
        await addToChatHistory(phone, 'assistant', fallback);
        return;
      }

      const msg =
        `🍽️ Estimated for "${estimation.label}":\n` +
        `${estimation.calories} cal | ${estimation.protein}g P | ` +
        `${estimation.carbs}g C | ${estimation.fat}g F\n` +
        `Log this meal? (yes/no)`;

      pendingConfirmations[phone] = { intent: 'food', payload: estimation };
      twiml.message(msg);
      await addToChatHistory(phone, 'assistant', msg);
      return;
    }

    // 5c) Goals / weekly feedback
    if (intent === 'goals') {
      const fb = await getUserFeedback(phone);
      twiml.message(fb);
      await addToChatHistory(phone, 'assistant', fb);
      return;
    }

    // 5d) Nutrition info Q&A
    if (intent === 'info') {
      const info = await getNutritionInfo(payload, phone);
      twiml.message(info);
      await addToChatHistory(phone, 'assistant', info);
      return;
    }

    // 5e) Fallback / guide
    const guide = await guideUser(rawMsg, phone);
    twiml.message(guide);
    await addToChatHistory(phone, 'assistant', guide);
    return;

  } catch (err) {
    // Catch any unexpected errors so Twilio still gets a response
    console.error('Handler error', err);
    const sorry = "😕 Oops, something went wrong. Please try again.";
    twiml.message(sorry);
    await addToChatHistory(phone, 'assistant', sorry);
    return;
  }
}

module.exports = { handleMessage };
