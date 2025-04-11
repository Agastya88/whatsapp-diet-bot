// controllers/messageHandler.js
const { initUser, getUser, logMeal, logWeight } = require('../utils/firebaseDataStore');
const { getNutritionInfo } = require('../services/openaiService');
const { detectIntent } = require('../services/intentService');
const db = require('../utils/firebase');

const pendingConfirmations = {}; // Stores pending intents waiting for user confirmation

const mainMenu = `🙏 Welcome to your Indian Diet Coach Bot!
Here’s what I can help you with:

🥗 *1. Food Logging*
Just type your meal (e.g., "2 rotis, dal, and chai")

📊 *2. Track Progress*
/summary - Daily intake summary
/weight [number] - Log weight
/goal [cut|bulk|maintain] - Set your goal

📚 *3. Nutrition Education*
/info [topic] - Ask about foods, macros, or plans (e.g., /info protein)
/mealplan - Get a basic meal plan based on your goal

🛠 Type /help anytime to see this menu again.`;

function getToday() {
    return new Date().toISOString().split('T')[0];
}

async function addToChatHistory(phone, role, content) {
  const ref = db.collection('users').doc(phone).collection('chat').doc();
  await ref.set({ role, content, timestamp: new Date() });
}

async function handleMessage(req, twiml) {
  const phone = req.body.From;
  const msg = req.body.Body.trim();
  const lowerMsg = msg.toLowerCase();
  const today = getToday();

  await initUser(phone);
  const user = await getUser(phone);

  await addToChatHistory(phone, 'user', msg);

  if (pendingConfirmations[phone]) {
    const { intent, payload } = pendingConfirmations[phone];
    if (lowerMsg === 'yes' || lowerMsg === 'y') {
      if (intent === 'log_food') {
        await logMeal(phone, payload);
        const reply = `✅ Logged: ${payload.label}\nCalories: ${payload.calories} | Protein: ${payload.protein}g | Carbs: ${payload.carbs}g | Fat: ${payload.fat}g`;
        twiml.message(reply);
        await addToChatHistory(phone, 'assistant', reply);
      } else if (intent === 'log_weight') {
        await logWeight(phone, payload.weight);
        const reply = `✅ Logged weight: ${payload.weight} lbs`;
        twiml.message(reply);
        await addToChatHistory(phone, 'assistant', reply);
      }
    } else {
      const cancel = `❌ Got it — not logging anything.`;
      twiml.message(cancel);
      await addToChatHistory(phone, 'assistant', cancel);
    }
    delete pendingConfirmations[phone];
    return;
  }

  if (lowerMsg === '/start' || lowerMsg === '/help') {
    twiml.message(mainMenu);
    await addToChatHistory(phone, 'assistant', mainMenu);
    return;
  }

  if (lowerMsg === '/summary') {
    const logs = user.meals?.[today] || [];
    const total = logs.reduce((acc, meal) => {
      acc.calories += meal.calories;
      acc.protein += meal.protein;
      acc.carbs += meal.carbs;
      acc.fat += meal.fat;
      return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

    let summary = `📊 Today's Summary:\n`;
    logs.forEach((m, i) => {
      summary += `Meal ${i + 1}: ${m.label} - ${m.calories} cal\n`;
    });
    summary += `\nTotal: ${total.calories} cal | Protein: ${total.protein}g | Carbs: ${total.carbs}g | Fat: ${total.fat}g`;
    twiml.message(summary);
    await addToChatHistory(phone, 'assistant', summary);
    return;
  }

  if (lowerMsg.startsWith('/goal')) {
    const goal = lowerMsg.split(' ')[1]?.toLowerCase();
    if (["cut", "bulk", "maintain"].includes(goal)) {
      const updated = { ...user, goal };
      await db.collection('users').doc(phone).set(updated, { merge: true });
      const reply = `🎯 Goal set to: ${goal}`;
      twiml.message(reply);
      await addToChatHistory(phone, 'assistant', reply);
    } else {
      const reply = `❌ Invalid goal. Use /goal cut | bulk | maintain`;
      twiml.message(reply);
      await addToChatHistory(phone, 'assistant', reply);
    }
    return;
  }

  if (lowerMsg.startsWith('/info')) {
    const topic = msg.split(' ').slice(1).join(' ');
    if (!topic) {
      const reply = "ℹ️ Please ask about a topic. Example: /info protein";
      twiml.message(reply);
      await addToChatHistory(phone, 'assistant', reply);
    } else {
      const info = await getNutritionInfo(topic);
      twiml.message(`📚 ${info}`);
      await addToChatHistory(phone, 'assistant', info);
    }
    return;
  }

  if (lowerMsg === '/mealplan') {
    const info = await getNutritionInfo(`Create a 1-day Indian meal plan for someone with a goal to ${user.goal}. Include estimated calories and macros.`);
    twiml.message(`📋 ${info}`);
    await addToChatHistory(phone, 'assistant', info);
    return;
  }

  const { intent, payload, confirmationRequired } = await detectIntent(msg);

  if (intent === 'log_food' && confirmationRequired) {
    const reply = `🍽️ This looks like a food log:\n${payload.label} – ${payload.calories} cal\nLog this? (yes/no)`;
    twiml.message(reply);
    pendingConfirmations[phone] = { intent, payload };
    await addToChatHistory(phone, 'assistant', reply);
    return;
  }

  if (intent === 'log_weight' && confirmationRequired) {
    const reply = `⚖️ Log your weight as ${payload.weight} lbs? (yes/no)`;
    twiml.message(reply);
    pendingConfirmations[phone] = { intent, payload };
    await addToChatHistory(phone, 'assistant', reply);
    return;
  }

  if (intent === 'mealplan') {
    const info = await getNutritionInfo(`Create a 1-day Indian meal plan for someone with a goal to ${user.goal}. Include estimated calories and macros.`);
    twiml.message(`📋 ${info}`);
    await addToChatHistory(phone, 'assistant', info);
    return;
  }

  if (intent === 'info') {
    const info = await getNutritionInfo(payload.topic);
    twiml.message(`📚 ${info}`);
    await addToChatHistory(phone, 'assistant', info);
    return;
  }

  if (intent === 'summary') {
    return handleMessage({ body: { From: phone, Body: '/summary' } }, twiml);
  }

  const fallback = "🤖 I'm not sure what you meant — try again or type /help for options.";
  twiml.message(fallback);
  await addToChatHistory(phone, 'assistant', fallback);
}

module.exports = { handleMessage };
