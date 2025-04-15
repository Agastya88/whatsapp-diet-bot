# 📱 WhatsApp Diet Coach

A conversational AI nutrition coach for Indian users — powered by Twilio, OpenAI, and Firebase.

This bot lives on WhatsApp and allows users to log food, track weight, get personalized meal plans, and learn about nutrition using natural language.

## Features

- **Natural Language Interactions:**  
  Leverages OpenAI's language models to interpret user messages and provide personalized nutritional advice via a conversational interface.

- **Meal & Weight Logging:**  
  Users can log meals and weight entries. The bot estimates nutritional information (calories, macros) for meals and asks for confirmation before saving the data.

- **Personalized Feedback:**  
  Aggregates user chat history, meal logs, and weight logs to generate actionable, personalized feedback and suggestions aimed at improving nutrition and tracking progress.

- **Multi-Intent Handling:**  
  Supports multiple intents including logging meals, logging weight, retrieving nutritional information, and providing goal-oriented guidance.

- **Scalable & Cloud-Based:**  
  Integrates Firebase for data storage, Twilio for messaging, and Render for hosting—ensuring that the backend scales as the user base grows.

---

## Architecture Overview

- **Messaging Interface (Twilio):**  
  Handles incoming user messages (via SMS/WhatsApp) and routes them to the backend.

- **Node.js Backend:**  
  Processes webhook requests using a centralized message handler that:
  - Logs user messages and maintains conversational context.
  - Determines the user’s intent using an intent detection service powered by OpenAI.
  - Interacts with Firebase for data storage of user logs and chat history.

- **Firebase Firestore:**  
  Serves as the database for storing user profiles, meal logs, weight logs, and chat history.

- **OpenAI API:**  
  Provides advanced natural language processing:
  - Determines user intent.
  - Generates meal estimations and nutritional information.
  - Creates personalized, constructive feedback based on aggregated user data.

- **Hosting Platform (Render):**  
  Hosts the Node.js backend and scales with the application's needs, ensuring high availability and performance.

---

## Future Improvements

- **Enhanced Conversational Flow:**  
  - Refine LLM prompts to better handle edge cases and ambiguous queries.
  - Improve multi-turn dialogue handling and contextual understanding.

- **Cost Optimization Strategies:**  
  - Implement caching and batching of API calls to reduce the frequency of OpenAI queries.
  - Explore alternative messaging channels or protocols to lower Twilio costs.
  - Optimize Firebase data access patterns to minimize read/write operations.

- **User Analytics & Reporting:**  
  - Develop a dashboard for users to visualize their progress (e.g., trend charts for weight and nutritional intake).
  - Provide periodic summaries and reports to motivate and guide users further.

- **Interactive Elements & UI Enhancements:**  
  - Add quick-reply buttons and interactive templates (where supported) to improve user engagement.
  - Consider building a companion mobile/web dashboard for richer user interactions beyond chat.

- **Compliance & Security Enhancements:**  
  - Strengthen data privacy measures and ensure compliance with regulations such as GDPR or HIPAA.
  - Improve error logging and monitoring to maintain robust and secure operations.
