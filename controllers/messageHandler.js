// controllers/messageHandler.js
const { getToday, initUser, getUser, logMeal, logWeight } = require('../utils/dataStore');
const { getMealEstimation, getNutritionInfo } = require('../services/openaiService');
const { detectIntent } = require('../services/intentService');

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

async function handleMessage(req, twiml) {
  const phone = req.body.From;
  const msg = req.body.Body.trim().toLowerCase();
  const today = getToday();
  initUser(phone);
  const user = getUser(phone);

  // ✅ Handle confirmation replies
  if (pendingConfirmations[phone]) {
    const { intent, payload } = pendingConfirmations[phone];
    if (msg === 'yes' || msg === 'y') {
      if (intent === 'log_food') {
        logMeal(phone, payload);
        twiml.message(`✅ Logged: ${payload.label}\nCalories: ${payload.calories} | Protein: ${payload.protein}g | Carbs: ${payload.carbs}g | Fat: ${payload.fat}g`);
      } else if (intent === 'log_weight') {
        logWeight(phone, payload.weight);
        twiml.message(`✅ Logged weight: ${payload.weight} lbs`);
      }
    } else {
      twiml.message(`❌ Got it — not logging anything.`);
    }
    delete pendingConfirmations[phone];
    return;
  }

  // Static command routes
  if (msg === '/start' || msg === '/help') {
    twiml.message(mainMenu);
    return;
  }

  if (msg === '/summary') {
    const logs = user.meals[today] || [];
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
    return;
  }

  if (msg.startsWith('/goal')) {
    const goal = msg.split(' ')[1]?.toLowerCase();
    if (["cut", "bulk", "maintain"].includes(goal)) {
      user.goal = goal;
      twiml.message(`🎯 Goal set to: ${goal}`);
    } else {
      twiml.message(`❌ Invalid goal. Use /goal cut | bulk | maintain`);
    }
    return;
  }

  if (msg.startsWith('/info')) {
    const topic = msg.split(' ').slice(1).join(' ');
    if (!topic) {
      twiml.message("ℹ️ Please ask about a topic. Example: /info protein");
    } else {
      const info = await getNutritionInfo(topic);
      twiml.message(`📚 ${info}`);
    }
    return;
  }

  if (msg === '/mealplan') {
    const info = await getNutritionInfo(`Create a 1-day Indian meal plan for someone with a goal to ${user.goal}. Include estimated calories and macros.`);
    twiml.message(`📋 ${info}`);
    return;
  }

  // 🔍 Detect intent for freeform message
  const { intent, payload, confirmationRequired } = await detectIntent(req.body.Body);

  if (intent === 'log_food' && confirmationRequired) {
    twiml.message(`🍽️ This looks like a food log:
${payload.label} – ${payload.calories} cal
Log this? (yes/no)`);
    pendingConfirmations[phone] = { intent, payload };
    return;
  }

  if (intent === 'log_weight' && confirmationRequired) {
    twiml.message(`⚖️ Log your weight as ${payload.weight} lbs? (yes/no)`);
    pendingConfirmations[phone] = { intent, payload };
    return;
  }

  if (intent === 'mealplan') {
    const info = await getNutritionInfo(`Create a 1-day Indian meal plan for someone with a goal to ${user.goal}. Include estimated calories and macros.`);
    twiml.message(`📋 ${info}`);
    return;
  }

  if (intent === 'info') {
    const info = await getNutritionInfo(payload.topic);
    twiml.message(`📚 ${info}`);
    return;
  }

  if (intent === 'summary') {
    return handleMessage({ body: { From: phone, Body: '/summary' } }, twiml);
  }

  twiml.message("🤖 I'm not sure what you meant — try again or type /help for options.");
}

module.exports = { handleMessage };
