// utils/firebaseDataStore.js
const admin = require('firebase-admin'); // Ensure admin is imported and initialized in your firebase.js
const db = require('./firebase');
const { generateUserFeedback } = require('../services/openaiService');

// Validate that the document path is a valid non-empty string.
const getUserRef = (phone) => {
  if (!phone || typeof phone !== 'string' || phone.trim() === "") {
    throw new Error('Invalid phone number provided to getUserRef.');
  }
  return db.collection('users').doc(phone);
};

async function initUser(phone) {
  try {
    const userRef = getUserRef(phone);
    const doc = await userRef.get();
    if (!doc.exists) {
      // Store phone so it's available in the user document.
      await userRef.set({
        phone,
        goal: 'maintain',
        meals: {},
        weights: {},
        createdAt: new Date()
      });
    }
  } catch (err) {
    console.error('Error in initUser:', err);
    throw err;
  }
}

async function getUser(phone) {
  try {
    const doc = await getUserRef(phone).get();
    const data = doc.exists ? doc.data() : null;
    // If the user exists but the "phone" property is missing, add it.
    if (data && !data.phone) {
      data.phone = phone;
    }
    return data;
  } catch (err) {
    console.error('Error in getUser:', err);
    throw err;
  }
}

async function logMeal(phone, meal) {
  try {
    const userRef = getUserRef(phone);
    const today = new Date().toISOString().split('T')[0];
    await userRef.set(
      { [`meals.${today}`]: admin.firestore.FieldValue.arrayUnion(meal) },
      { merge: true }
    );
  } catch (err) {
    console.error('Error in logMeal:', err);
    throw err;
  }
}

async function logWeight(phone, weight) {
  try {
    const userRef = getUserRef(phone);
    const today = new Date().toISOString().split('T')[0];
    await userRef.set(
      { [`weights.${today}`]: weight },
      { merge: true }
    );
  } catch (err) {
    console.error('Error in logWeight:', err);
    throw err;
  }
}

// Add a message to the chat history sub-collection.
async function addToChatHistory(phone, role, content) {
  try {
    const chatRef = getUserRef(phone).collection('chat');
    await chatRef.add({
      role,
      content,
      timestamp: new Date()
    });
  } catch (err) {
    console.error('Error in addToChatHistory:', err);
    throw err;
  }
}

// Retrieve the most recent N messages from the user's chat history.
async function getRecentChatHistory(phone, limit = 5) {
  try {
    const chatRef = getUserRef(phone).collection('chat');
    const snapshot = await chatRef.orderBy('timestamp', 'desc').limit(limit).get();
    const messages = [];
    snapshot.forEach(doc => messages.push(doc.data()));
    return messages.reverse(); // Return in chronological order.
  } catch (err) {
    console.error('Error in getRecentChatHistory:', err);
    throw err;
  }
}

/**
 * Retrieve recent chat history for feedback generation.
 */
async function getRecentChatFeedback(phone) {
  try {
    const userRef = getUserRef(phone);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const snapshot = await userRef
      .collection('chat')
      .where('timestamp', '>=', sevenDaysAgo)
      .orderBy('timestamp', 'asc')
      .get();
    let chatHistory = '';
    snapshot.forEach(doc => {
      const data = doc.data();
      chatHistory += `${data.role}: ${data.content}\n`;
    });
    return chatHistory || "No recent conversation history.";
  } catch (err) {
    console.error('Error in getRecentChatFeedback:', err);
    throw err;
  }
}

/**
 * getUserFeedback aggregates the user's meal, weight logs, and recent chat history,
 * then constructs a prompt and calls the OpenAI service to generate personalized feedback.
 */
async function getUserFeedback(user) {
  if (!user.phone) {
    throw new Error('User object does not have a valid phone property.');
  }

  const phone = user.phone;
  const chatHistory = await getRecentChatFeedback(phone);

  console.log (user)

  // Build a summary for meals.
  let mealSummary = '';
  if (user.meals) {
    const dates = Object.keys(user.meals).sort();
    dates.forEach(date => {
      const mealsForDate = user.meals[date].map(meal => meal.label || JSON.stringify(meal)).join(', ');
      mealSummary += `${date}: ${mealsForDate}\n`;
    });
  } else {
    mealSummary = "No meal logs found.";
  }

  // Build a summary for weight logs.
  let weightSummary = '';
  if (user.weights) {
    const dates = Object.keys(user.weights).sort();
    dates.forEach(date => {
      weightSummary += `${date}: ${user.weights[date]} lbs\n`;
    });
  } else {
    weightSummary = "No weight logs found.";
  }

  const prompt = `You are a friendly and constructive nutrition coach.

Here is the summary of the user's recent interactions:

Chat History (last 7 days):
---------------------------
${chatHistory}

Meal Logs:
-----------
${mealSummary}

Weight Logs:
-------------
${weightSummary}

Based on the above information, please provide personalized, constructive feedback and suggestions to help the user improve their nutrition and progress towards their goals. Your response should be concise, encouraging, and actionable.`;

  console.log ("The Prompt being sent to generate user feedback:"+prompt)
  return await generateUserFeedback(prompt);
}

module.exports = {
  initUser,
  getUser,
  logMeal,
  logWeight,
  addToChatHistory,
  getRecentChatHistory,
  getUserFeedback
};
