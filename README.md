# 📱 WhatsApp Diet Coach

A conversational AI nutrition coach for Indian users — powered by Twilio, OpenAI, and Firebase.

This bot lives on WhatsApp and allows users to log food, track weight, get personalized meal plans, and learn about nutrition using natural language.

---

## ✨ Features

- 🧠 **Conversational GPT Flow**
  Users can message naturally — the bot detects intent and routes messages accordingly (no need to memorize commands).

- 🍽️ **Food Logging**
  Log meals like `2 rotis, paneer, and chai` and get estimated calories/macros using GPT.

- ⚖️ **Weight Tracking**
  Send “I weigh 172.3” and the bot asks for confirmation before logging.

- 🎯 **Goal Setting**
  Use `/goal cut`, `/goal bulk`, or `/goal maintain` to adjust your objective.

- 📚 **Indian Nutrition Assistant**
  Use `/info protein` or `/mealplan` to learn and get custom Indian meal plans.

- 🧾 **Daily Summaries**
  Use `/summary` to see what you’ve eaten today and your total intake.

- 💬 **Persistent Chat History**
  All messages are stored in Firestore and can be used for advanced GPT summarization and feedback.

- 🔐 **Firebase Integration**
  Firestore stores users, meals, weights, and chats — fully cloud-based and scalable.

---

## 🛠 Tech Stack

| Layer       | Tech                  |
|------------|------------------------|
| Messaging  | Twilio WhatsApp API    |
| AI Engine  | OpenAI GPT-3.5 Turbo   |
| Backend    | Node.js + Express      |
| DB         | Firebase Firestore     |
| Hosting    | Render.com             |

---

## 🔮 Roadmap

- `/history` – view recent messages
- `/feedback` – GPT feedback on progress
- `/trend` – see weight trends and analysis
- Custom GPT coach personalities
- Weekly auto summaries

---

Built with 💚 for the Indian fitness community.

