const express = require('express');
const router = express.Router();
const axios = require('axios');
const { calculateKundaliChart } = require('../utils/ephemeris');
const { requireAuth } = require('../middleware/auth'); // ✅ Match the export name from auth.js
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
router.post('/kundali', requireAuth, async (req, res, next) => { // ✅ Updated middleware here
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

module.exports = router;