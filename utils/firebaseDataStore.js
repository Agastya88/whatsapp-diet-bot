const admin = require('firebase-admin');
const db    = require('./firebase');
const { generateUserFeedback } = require('../services/openaiService');
const { getRecentChatContext } = require('./chatContext');

/* helpers */
const getUserRef = phone => {
  if (!phone || typeof phone !== 'string' || !phone.trim()) {
    throw new Error('Invalid phone number');
  }
  return db.collection('users').doc(phone);
};
const todayISO = () => new Date().toISOString().split('T')[0];

/* user CRUD */
async function initUser(phone) {
  const ref = getUserRef(phone);
  if (!(await ref.get()).exists) {
    await ref.set({ phone, goal: 'maintain', createdAt: new Date() });
  }
}
const getUser = async phone => (await getUserRef(phone).get()).data();

/* logging */
async function logMeal(phone, meal) {
  await getUserRef(phone)
    .collection('meals')
    .doc(todayISO())
    .set({ items: admin.firestore.FieldValue.arrayUnion(meal) }, { merge: true });
}

async function logWeight(phone, value) {
  await getUserRef(phone)
    .collection('weights')
    .doc(todayISO())
    .set({ value }, { merge: true });
}

/* chat logging */
async function addToChatHistory(phone, role, content) {
  await getUserRef(phone)
    .collection('chat')
    .add({ role, content, ts: admin.firestore.FieldValue.serverTimestamp() });
}
async function getRecentChatHistory(phone, limit = 5) {
  const snap = await getUserRef(phone)
    .collection('chat')
    .orderBy('ts', 'desc')
    .limit(limit)
    .get();
  return snap.docs.reverse().map(d => d.data());
}

/* summaries */
async function buildSummaries(phone, days = 14) {
  const sinceIso = (() => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  })();

  const toLines = (snap, fmt) =>
    snap.docs.map(fmt).join('\n') || 'No logs found.';

  /* meals */
  const mealSnap = await getUserRef(phone)
    .collection('meals')
    .where(admin.firestore.FieldPath.documentId(), '>=', sinceIso)
    .orderBy(admin.firestore.FieldPath.documentId())
    .get();
  const mealSummary = toLines(mealSnap, d =>
    `${d.id}: ${(d.data().items || []).map(m => m.label).join(', ')}`
  );

  /* weights */
  const weightSnap = await getUserRef(phone)
    .collection('weights')
    .where(admin.firestore.FieldPath.documentId(), '>=', sinceIso)
    .orderBy(admin.firestore.FieldPath.documentId())
    .get();
  const weightSummary = toLines(weightSnap, d =>
    `${d.id}: ${d.data().value} lbs`
  );

  return { mealSummary, weightSummary };
}

/* feedback */
async function getUserFeedback(phone, days = 14) {
  const { mealSummary, weightSummary } = await buildSummaries(phone, days);
  const chatCtx = (await getRecentChatContext(phone, 6))
    .map(m => `${m.role}: ${m.content}`)
    .join('\n');

  const prompt = `
You are a friendly Indian nutrition coach.

Recent conversation:
${chatCtx}

Meal logs (last ${days} days):
${mealSummary}

Weight logs:
${weightSummary}

Provide three actionable tips. Do NOT invent numbers. (≤3000 chars)`;

  return generateUserFeedback(prompt);
}

/* exports */
module.exports = {
  initUser,
  getUser,
  logMeal,
  logWeight,
  addToChatHistory,
  getRecentChatHistory,
  getRecentChatContext,
  getUserFeedback
};
