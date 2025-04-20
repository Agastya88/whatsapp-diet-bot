// utils/chatContext.js
const db = require('./firebase');

/**
 * Returns the last `limit` chat messages for a user in chronological order.
 * Shape: [{ role: 'user'|'assistant', content: '...' }]
 */
async function getRecentChatContext(phone, limit = 8) {
  const snap = await db
    .collection('users')
    .doc(phone)
    .collection('chat')
    .orderBy('ts', 'desc')
    .limit(limit)
    .get();

  return snap.docs.reverse().map(d => ({
    role: d.data().role,
    content: d.data().content
  }));
}

module.exports = { getRecentChatContext };
