// utils/dataStore.js

// In-memory user database (replace with MongoDB later)
const users = {};

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function initUser(phone) {
  if (!users[phone]) {
    users[phone] = {
      meals: {},
      weights: {},
      goal: 'maintain'
    };
  }
}

function getUser(phone) {
  return users[phone];
}

function logMeal(phone, meal) {
  const today = getToday();
  if (!users[phone].meals[today]) {
    users[phone].meals[today] = [];
  }
  users[phone].meals[today].push(meal);
}

function logWeight(phone, weight) {
  const today = getToday();
  users[phone].weights[today] = weight;
}

module.exports = {
  getToday,
  initUser,
  getUser,
  logMeal,
  logWeight
};