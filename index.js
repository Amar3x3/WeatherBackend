require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cron = require('node-cron');
const axios = require('axios');
const cors = require('cors');


const app = express();
app.use(cors()); 
app.use(express.json());

// MongoDB Models
const FiveMinuteSummary = require('./models/FiveMinuteSummary');
const DailySummary = require('./models/DailySummary');

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB'));

// Cities to monitor
const cities = ['Delhi', 'Mumbai', 'Chennai', 'Bangalore', 'Kolkata', 'Hyderabad'];

// Helper functions
const convertKelvinToCelsius = (kelvin) => kelvin - 273.15;

// Fetch weather data and save 5-minute summaries
const fetchWeatherData = async () => {
  try {
    for (const city of cities) {
      const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${process.env.API_KEY}`);
      const data = response.data;

      const summary = {
        city: city,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toISOString().split('T')[1].slice(0, 5),
        main_weather: data.weather[0].main,
        temperature: {
          current: convertKelvinToCelsius(data.main.temp),
          feels_like: convertKelvinToCelsius(data.main.feels_like),
          min: convertKelvinToCelsius(data.main.temp_min),
          max: convertKelvinToCelsius(data.main.temp_max),
        },
        humidity: data.main.humidity,
        wind_speed: data.wind.speed,
      };

      await FiveMinuteSummary.create(summary);
    }
    console.log('Weather data fetched and stored successfully.');
  } catch (error) {
    console.error('Error fetching weather data:', error);
  }
};

// Schedule to run every 5 minutes
cron.schedule('*/5 * * * *', fetchWeatherData);

// Daily summary calculation at midnight
cron.schedule('0 0 * * *', async () => {
  for (const city of cities) {
    const summaries = await FiveMinuteSummary.find({ city, date: new Date().toISOString().split('T')[0] });
    if (summaries.length === 0) return;

    const tempAvg = summaries.reduce((acc, s) => acc + s.temperature.current, 0) / summaries.length;
    const tempMax = Math.max(...summaries.map(s => s.temperature.max));
    const tempMin = Math.min(...summaries.map(s => s.temperature.min));
    const dominantWeather = summaries.reduce((acc, s) => {
      acc[s.main_weather] = (acc[s.main_weather] || 0) + 1;
      return acc;
    }, {});
    const mostFrequentWeather = Object.keys(dominantWeather).reduce((a, b) => dominantWeather[a] > dominantWeather[b] ? a : b);

    const dailySummary = {
      city,
      date: summaries[0].date,
      temperature: {
        avg: tempAvg,
        max: tempMax,
        min: tempMin,
      },
      dominant_weather: mostFrequentWeather,
      humidity_avg: summaries.reduce((acc, s) => acc + s.humidity, 0) / summaries.length,
      wind_speed_avg: summaries.reduce((acc, s) => acc + s.wind_speed, 0) / summaries.length,
    };

    await DailySummary.create(dailySummary);
    console.log(`Daily summary for ${city} stored.`);
  }
});

// API Routes
app.get('/api/weather/summaries', async (req, res) => {
  const { city, date } = req.query;
  const summaries = await FiveMinuteSummary.find({ city, date });
  res.json(summaries);
});

app.get('/api/weather/daily-summary', async (req, res) => {
  const { city, date } = req.query;
  const summary = await DailySummary.findOne({ city, date });
  res.json(summary);
});

// Start Server
const PORTT = process.env.PORT || 5000;
app.listen(PORTT, () => console.log(`Server running on port ${PORTT}`));
