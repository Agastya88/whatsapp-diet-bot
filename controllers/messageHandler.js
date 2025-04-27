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

async function handleMessage(req) {
  const phone  = req.body.From;
  const rawMsg = (req.body.Body || '').trim();
  const lower  = rawMsg.toLowerCase();

  const replies = [];
  const pushText  = body             => replies.push({ type:'text',  body });
  const pushImage = (link, caption='') => replies.push({ type:'image', link, caption });

  console.log(`[Handler] Received message from ${phone}: "${rawMsg}"`);

  // 1. Ensure user exists & log the incoming message
  try { await initUser(phone); } catch (err) { console.error('initUser', err); }
  try { await addToChatHistory(phone,'user',rawMsg); }
  catch(err){ console.error('chatHistory', err); }

  // 2. Handle any pending yes/no confirmations
  if (pendingConfirmations[phone]) {
    const { intent, payload } = pendingConfirmations[phone];
    delete pendingConfirmations[phone];

    if (['yes','y'].includes(lower)) {
      try {
        let reply;
        if (intent === 'food-logging') {
          await logMeal(phone, payload);
          reply = `✅ Logged meal: "${payload.label}" (${payload.calories} cal).`;
        } else {
          await logWeight(phone, payload);
          reply = `✅ Logged weight: ${payload} lbs.`;
        }
        pushText(reply);
        await addToChatHistory(phone,'assistant',reply);
      } catch (err) {
        const errorMsg = "😕 Couldn't log your data, please try again.";
        pushText(errorMsg);
        await addToChatHistory(phone,'assistant',errorMsg);
      }
    } else {
      const reply = `❌ Okay, not logging that ${intent}.`;
      pushText(reply);
      await addToChatHistory(phone,'assistant',reply);
    }
    return replies;
  }

  // 3. Built-in slash commands
  if (lower === '/progress') {
    try {
      const wUrl = await makeWeightChartUrl(phone,14);
      const cUrl = await makeCalorieChartUrl(phone,14);
      pushImage(wUrl,'📈 Here’s your weight trend:');
      pushImage(cUrl,'🔥 Here’s your calorie intake trend:');
    } catch (err) {
      const errorMsg = "😕 Couldn't generate charts right now.";
      pushText(errorMsg);
      await addToChatHistory(phone,'assistant',errorMsg);
    }
    return replies;
  }

  if (lower === '/help' || lower === '/start') {
    const menu =
`👋 Hi! I’m your WhatsApp Diet Coach:
• Log food by typing what you ate (e.g., “2 rotis and dal”)
• Log weight by typing your weight (e.g., “170 lbs”)
• /progress → see your charts
• Ask questions like “what’s a good protein source?”
• /help → show this menu`;
    pushText(menu);
    await addToChatHistory(phone,'assistant',menu);
    return replies;
  }

  // 4. Detect intent
  let intentResult;
  try {
    intentResult = await detectIntent(rawMsg, phone);
  } catch (err) {
    intentResult = { intent:'other', payload:rawMsg, confirmationRequired:false };
  }
  const { intent, payload, confirmationRequired } = Array.isArray(intentResult)
        ? intentResult[0] : intentResult;

  // 5. Route based on intent
  try {
    switch (intent) {
      case 'food-logging':
        if (confirmationRequired) {
          let estimation;
          try { estimation = await getMealEstimation(rawMsg); }
          catch (e) {
            const fallback = await guideUser(rawMsg, phone);
            pushText(fallback);
            await addToChatHistory(phone,'assistant',fallback);
            return replies;
          }

          const msg =
              `🍽️ I estimate: "${estimation.label}" = \
              ${estimation.calories} cal, ${estimation.protein}g P, \
              ${estimation.carbs}g C, ${estimation.fat}g F.
              Log this meal? (yes/no)`;
          pendingConfirmations[phone] = { intent:'food-logging', payload:estimation };
          pushText(msg);
          await addToChatHistory(phone,'assistant',msg);
          return replies;
        }
        break;

      case 'weight-logging':
        if (confirmationRequired) {
          const msg = `⚖️ I detected your weight as ${payload} lbs. Log it? (yes/no)`;
          pendingConfirmations[phone] = { intent:'weight-logging', payload };
          pushText(msg);
          await addToChatHistory(phone,'assistant',msg);
          return replies;
        }
        break;

      case 'feedback':
        const feedback = await getUserFeedback(phone);
        pushText(feedback);
        await addToChatHistory(phone,'assistant',feedback);
        return replies;

      case 'info':
        const info = await getNutritionInfo(payload, phone);
        pushText(info);
        await addToChatHistory(phone,'assistant',info);
        return replies;

      default:
        const guide = await guideUser(rawMsg, phone);
        pushText(guide);
        await addToChatHistory(phone,'assistant',guide);
        return replies;
    }
  } catch (err) {
    const errorMsg = "😕 Something went wrong. Please try again.";
    pushText(errorMsg);
    await addToChatHistory(phone,'assistant',errorMsg);
  }

  return replies;   // always return the queue
}

module.exports = { handleMessage };
