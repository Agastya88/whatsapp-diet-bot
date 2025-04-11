// utils/firebaseDataStore.js
const db = require('./firebase');

const getUserRef = (phone) => db.collection('users').doc(phone);

async function initUser(phone) {
  const userRef = getUserRef(phone);
  const doc = await userRef.get();
  if (!doc.exists) {
    await userRef.set({ goal: 'maintain', meals: {}, weights: {}, createdAt: new Date() });
  }
}

async function getUser(phone) {
  const doc = await getUserRef(phone).get();
  return doc.exists ? doc.data() : null;
}

async function logMeal(phone, meal) {
  const userRef = getUserRef(phone);
  const today = new Date().toISOString().split('T')[0];
  await userRef.set({ [`meals.${today}`]: admin.firestore.FieldValue.arrayUnion(meal) }, { merge: true });
}

async function logWeight(phone, weight) {
  const userRef = getUserRef(phone);
  const today = new Date().toISOString().split('T')[0];
  await userRef.set({ [`weights.${today}`]: weight }, { merge: true });
}

module.exports = {
  initUser,
  getUser,
  logMeal,
  logWeight
};
