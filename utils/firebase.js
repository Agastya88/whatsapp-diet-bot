// utils/firebase.js
const admin = require('firebase-admin');
const serviceAccount = require('../whatsapp-diet-coach-firebase-adminsdk-fbsvc-7340aff977.json'); // replace with your key path

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

module.exports = db;
