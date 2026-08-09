const express = require('express');
const router = express.Router();
const axios = require('axios');
const { calculateKundaliChart } = require('../utils/ephemeris');
const { calculateAshtakoota } = require('../utils/ashtakoota');
const { calculatePanchang } = require('../utils/panchang');
const { calculateDailyHoroscope } = require('../utils/horoscope');
const { requireAuth } = require('../middleware/auth');
const Calculation = require('../models/Calculation');

// Helper Function: Free OpenStreetMap Geocoding
async function geocodePlace(placeName) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(placeName)}&limit=1`;
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'ASTROVERSE-Astrology-App' }
    });

    if (response.data && response.data.length > 0) {
      return {
        latitude: parseFloat(response.data[0].lat),
        longitude: parseFloat(response.data[0].lon),
        displayName: response.data[0].display_name
      };
    }
  } catch (err) {
    console.warn(`[Geocoding Warning] Failed to geocode "${placeName}". Using fallback coordinates.`, err.message);
  }

  // Fallback coordinates if place lookup fails
  return { latitude: 19.0760, longitude: 72.8777, displayName: 'Mumbai, Maharashtra, India' };
}

// POST /api/calculations/kundali
router.post('/kundali', requireAuth, async (req, res, next) => {
  try {
    const { name, dob, tob, pob, latitude, longitude, timezoneOffset = 5.5 } = req.body;

    if (!dob || !tob) {
      return res.status(400).json({ success: false, message: 'Missing required birth date or time.' });
    }

    let coords = { latitude: Number(latitude), longitude: Number(longitude) };

    // Geocode place of birth if lat/lng are missing
    if ((!latitude || !longitude) && pob) {
      coords = await geocodePlace(pob);
    } else if (!latitude || !longitude) {
      coords = { latitude: 19.0760, longitude: 72.8777, displayName: 'Mumbai, India' };
    }

    const [year, month, day] = dob.split('-').map(Number);
    const [hour, minute] = tob.split(':').map(Number);

    // Compute chart via C/WASM Swiss Ephemeris engine
    const chartData = await calculateKundaliChart({
      year,
      month,
      day,
      hour,
      minute,
      latitude: coords.latitude,
      longitude: coords.longitude,
      timezoneOffset: Number(timezoneOffset)
    });

    // Save record to MongoDB Atlas
    const record = await Calculation.create({
      owner: req.user.id,
      type: 'kundali',
      input: { name, dob, tob, pob: pob || coords.displayName, coordinates: coords },
      result: chartData
    });

    res.status(200).json({
      success: true,
      message: 'Kundali generated with exact geocoded coordinates via Swiss Ephemeris.',
      locationUsed: coords,
      data: chartData,
      calculationId: record._id
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/calculations/matching (Ashtakoota 36 Guna Milan)
router.post('/matching', requireAuth, async (req, res, next) => {
  try {
    const { boyDetails, girlDetails } = req.body;

    if (!boyDetails?.dob || !boyDetails?.tob || !girlDetails?.dob || !girlDetails?.tob) {
      return res.status(400).json({ success: false, message: 'Missing required birth details for both partners.' });
    }

    // 1. Calculate Boy's Moon Position
    const [bYear, bMonth, bDay] = boyDetails.dob.split('-').map(Number);
    const [bHour, bMin] = boyDetails.tob.split(':').map(Number);
    const bCoords = boyDetails.pob ? await geocodePlace(boyDetails.pob) : { latitude: 19.0760, longitude: 72.8777 };

    const boyChart = await calculateKundaliChart({
      year: bYear,
      month: bMonth,
      day: bDay,
      hour: bHour,
      minute: bMin,
      latitude: bCoords.latitude,
      longitude: bCoords.longitude,
      timezoneOffset: Number(boyDetails.timezoneOffset || 5.5)
    });

    // 2. Calculate Girl's Moon Position
    const [gYear, gMonth, gDay] = girlDetails.dob.split('-').map(Number);
    const [gHour, gMin] = girlDetails.tob.split(':').map(Number);
    const gCoords = girlDetails.pob ? await geocodePlace(girlDetails.pob) : { latitude: 19.0760, longitude: 72.8777 };

    const girlChart = await calculateKundaliChart({
      year: gYear,
      month: gMonth,
      day: gDay,
      hour: gHour,
      minute: gMin,
      latitude: gCoords.latitude,
      longitude: gCoords.longitude,
      timezoneOffset: Number(girlDetails.timezoneOffset || 5.5)
    });

    const boyMoon = boyChart.planets.find(p => p.name === 'Moon');
    const girlMoon = girlChart.planets.find(p => p.name === 'Moon');

    if (!boyMoon || !girlMoon) {
      return res.status(500).json({ success: false, message: 'Could not calculate Moon positions for matching.' });
    }

    // 3. Calculate 36 Guna Ashtakoota Score
    const matchResult = calculateAshtakoota(boyMoon.degree, girlMoon.degree);

    // Save record to MongoDB Atlas
    const record = await Calculation.create({
      owner: req.user.id,
      type: 'matching',
      input: { boyDetails, girlDetails },
      result: matchResult
    });

    res.status(200).json({
      success: true,
      message: '36-Guna Ashtakoota matching calculated successfully.',
      data: matchResult,
      calculationId: record._id
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/calculations/panchang (Daily Panchang)
router.post('/panchang', async (req, res, next) => {
  try {
    const { date, pob = 'Varanasi, India', timezoneOffset = 5.5 } = req.body;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const coords = await geocodePlace(pob);
    const [year, month, day] = targetDate.split('-').map(Number);

    // Compute chart for 06:00 AM Sunrise baseline
    const chartData = await calculateKundaliChart({
      year,
      month,
      day,
      hour: 6,
      minute: 0,
      latitude: coords.latitude,
      longitude: coords.longitude,
      timezoneOffset: Number(timezoneOffset)
    });

    const sun = chartData.planets.find(p => p.name === 'Sun');
    const moon = chartData.planets.find(p => p.name === 'Moon');

    if (!sun || !moon) {
      return res.status(500).json({ success: false, message: 'Failed to calculate Sun and Moon positions for Panchang.' });
    }

    const panchangData = calculatePanchang(sun.degree, moon.degree, targetDate);

    res.status(200).json({
      success: true,
      message: 'Daily Panchang calculated via Swiss Ephemeris.',
      dateUsed: targetDate,
      locationUsed: coords,
      data: panchangData
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/calculations/horoscope (Daily Zodiac Forecasts)
router.post('/horoscope', async (req, res, next) => {
  try {
    const { date, sign } = req.body;
    const targetDate = date || new Date().toISOString().split('T')[0];
    const [year, month, day] = targetDate.split('-').map(Number);

    // Compute chart for 12:00 PM Midday transit baseline
    const chartData = await calculateKundaliChart({
      year,
      month,
      day,
      hour: 12,
      minute: 0,
      latitude: 19.0760,
      longitude: 72.8777,
      timezoneOffset: 5.5
    });

    const sun = chartData.planets.find(p => p.name === 'Sun');
    const moon = chartData.planets.find(p => p.name === 'Moon');

    if (!sun || !moon) {
      return res.status(500).json({ success: false, message: 'Could not calculate transit positions for Horoscope.' });
    }

    const dailyHoroscopeData = calculateDailyHoroscope(moon.degree, sun.degree);

    if (sign && dailyHoroscopeData.forecasts[sign.toLowerCase()]) {
      return res.status(200).json({
        success: true,
        dateUsed: targetDate,
        transits: dailyHoroscopeData.currentTransits,
        data: dailyHoroscopeData.forecasts[sign.toLowerCase()]
      });
    }

    res.status(200).json({
      success: true,
      message: 'Daily planetary transits & horoscope computed via Swiss Ephemeris.',
      dateUsed: targetDate,
      transits: dailyHoroscopeData.currentTransits,
      data: dailyHoroscopeData.forecasts
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;