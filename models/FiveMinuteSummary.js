// models/FiveMinuteSummary.js
const mongoose = require('mongoose');

const FiveMinuteSummarySchema = new mongoose.Schema({
  city: String,
  date: String,
  time: String,
  main_weather: String,
  temperature: {
    current: Number,
    feels_like: Number,
    min: Number,
    max: Number,
  },
  humidity: Number,
  wind_speed: Number,
});

module.exports = mongoose.model('FiveMinuteSummary', FiveMinuteSummarySchema);
