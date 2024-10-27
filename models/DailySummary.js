// models/DailySummary.js
const mongoose = require('mongoose');

const DailySummarySchema = new mongoose.Schema({
  city: String,
  date: String,
  temperature: {
    avg: Number,
    max: Number,
    min: Number,
  },
  dominant_weather: String,
  humidity_avg: Number,
  wind_speed_avg: Number,
});

module.exports = mongoose.model('DailySummary', DailySummarySchema);
