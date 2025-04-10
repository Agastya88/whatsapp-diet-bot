// controllers/messageHandler.js
const { getToday, initUser, getUser } = require('../utils/dataStore');
const { getMealEstimation, getNutritionInfo } = require('../services/openaiService');

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
  const msg = req.body.Body.trim();
  const today = getToday();

  const user = getUser(phone);
  initUser(phone);

  if (msg === '/start' || msg === '/help') {
    twiml.message(mainMenu);
    return;
  }

  if (msg.startsWith('/weight')) {
    const weight = parseFloat(msg.split(' ')[1]);
    if (!isNaN(weight)) {
      user.weights[today] = weight;
      twiml.message(`✅ Logged your weight: ${weight} lbs`);
    } else {
      twiml.message(`❌ Please provide a valid number. Example: /weight 172.4`);
    }
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

  try {
    const meal = await getMealEstimation(msg);
    if (!user.meals[today]) user.meals[today] = [];
    user.meals[today].push(meal);
    twiml.message(`🍽️ Logged: ${meal.label}\nCalories: ${meal.calories}\nProtein: ${meal.protein}g | Carbs: ${meal.carbs}g | Fat: ${meal.fat}g`);
  } catch (err) {
    twiml.message("❌ Sorry, I couldn't understand that meal. Try again with a different description.");
  }
}

module.exports = { handleMessage };
