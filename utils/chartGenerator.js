const db = require('./firebase');
const admin = require('firebase-admin');

const QUICKCHART_BASE = 'https://quickchart.io/chart?c=';

function buildQuickChartUrl(config) {
  return `${QUICKCHART_BASE}${encodeURIComponent(JSON.stringify(config))}`;
}

async function getWeightData(phone, days = 14) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceDate = since.toISOString().split('T')[0];

  const snap = await db
    .collection('users')
    .doc(phone)
    .collection('weights')
    .where(admin.firestore.FieldPath.documentId(), '>=', sinceDate)
    .orderBy(admin.firestore.FieldPath.documentId())
    .get();

  const labels = [];
  const values = [];
  snap.forEach(doc => {
    labels.push(doc.id);
    values.push(doc.data().value);
  });

  return { labels, values };
}

async function getCalorieData(phone, days = 14) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceDate = since.toISOString().split('T')[0];

  const ref = db.collection('users').doc(phone).collection('meals');
  const snap = await ref
    .where(admin.firestore.FieldPath.documentId(), '>=', sinceDate)
    .orderBy(admin.firestore.FieldPath.documentId())
    .get();

  const labels = [];
  const totals = [];
  snap.forEach(doc => {
    const date = doc.id;
    const items = doc.data().items || [];
    const totalCalories = items.reduce((sum, item) => sum + (item.calories || 0), 0);
    labels.push(date);
    totals.push(totalCalories);
  });

  return { labels, values: totals };
}

async function makeWeightChartUrl(phone, days = 14) {
  const { labels, values } = await getWeightData(phone, days);

  const config = {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Weight (lbs)',
          data: values,
          borderColor: 'blue',
          fill: false,
        },
      ],
    },
    options: {
      title: {
        display: true,
        text: `Your Weight Over Last ${days} Days`,
      },
      scales: {
        yAxes: [{ ticks: { beginAtZero: false } }],
      },
    },
  };

  return buildQuickChartUrl(config);
}

async function makeCalorieChartUrl(phone, days = 14) {
  const { labels, values } = await getCalorieData(phone, days);

  const config = {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Calories per Day',
          data: values,
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
        },
      ],
    },
    options: {
      title: {
        display: true,
        text: `Your Calories Over Last ${days} Days`,
      },
      scales: {
        yAxes: [{ ticks: { beginAtZero: true } }],
      },
    },
  };

  return buildQuickChartUrl(config);
}

module.exports = {
  makeWeightChartUrl,
  makeCalorieChartUrl,
};
