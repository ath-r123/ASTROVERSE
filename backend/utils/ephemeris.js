const sweph = require('sweph');
const path = require('path');

const ephePath = path.join(__dirname, '../ephe');
sweph.set_ephe_path(ephePath);

console.log(`[SwissEph] Ephemeris path initialized to: ${ephePath}`);

const RASHIS = [
  'Mesha (Aries)', 'Vrishabha (Taurus)', 'Mithuna (Gemini)', 'Karka (Cancer)',
  'Simha (Leo)', 'Kanya (Virgo)', 'Tula (Libra)', 'Vrischika (Scorpio)',
  'Dhanu (Sagittarius)', 'Makara (Capricorn)', 'Kumbha (Aquarius)', 'Meena (Pisces)'
];

const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
];

function parseZodiacPosition(longitude) {
  const numLong = Number(longitude) || 0;
  // Guaranteed positive modulo between 0 and 359.9999
  let normalized = numLong % 360;
  if (normalized < 0) normalized += 360;

  const rashiIndex = Math.floor(normalized / 30);
  const degreeInRashi = normalized % 30;
  const nakshatraIndex = Math.floor(normalized / (360 / 27));

  return {
    rashi: RASHIS[rashiIndex] || RASHIS[0],
    degree: Number(degreeInRashi.toFixed(2)),
    totalDegree: Number(normalized.toFixed(2)),
    nakshatra: NAKSHATRAS[nakshatraIndex] || NAKSHATRAS[0]
  };
}

function calculateKundaliChart({ year, month, day, hour = 0, minute = 0, latitude = 19.0760, longitude = 72.8777, timezoneOffset = 5.5 }) {
  return new Promise((resolve, reject) => {
    try {
      const numYear = Number(year);
      const numMonth = Number(month);
      const numDay = Number(day);
      const numHour = Number(hour);
      const numMin = Number(minute);
      const numLat = Number(latitude);
      const numLng = Number(longitude);
      const numTz = Number(timezoneOffset);

      if ([numYear, numMonth, numDay].some(v => isNaN(v))) {
        return reject(new Error('Invalid birth date parameters provided.'));
      }

      // 1. Local Time -> UTC Hours
      const decimalLocalHours = numHour + (numMin / 60);
      const decimalUtcHours = decimalLocalHours - numTz;

      // 2. Compute Julian Day in UTC
      const gregFlag = typeof sweph.SE_GREG_CAL === 'number' ? sweph.SE_GREG_CAL : 1;
      const julianDay = sweph.julday(numYear, numMonth, numDay, decimalUtcHours, gregFlag);

      if (typeof julianDay !== 'number' || isNaN(julianDay)) {
        return reject(new Error('Failed to compute Julian Day from birth details.'));
      }

      // 3. Set Lahiri Sidereal Mode
      const sidMode = typeof sweph.SE_SIDM_LAHIRI === 'number' ? sweph.SE_SIDM_LAHIRI : 1;
      sweph.set_sid_mode(sidMode, 0, 0);

      // Get exact Lahiri Ayanamsa
      let ayanamsaVal = 0;
      if (typeof sweph.get_ayanamsa_ut === 'function') {
        ayanamsaVal = sweph.get_ayanamsa_ut(julianDay);
      } else if (typeof sweph.get_ayanamsa === 'function') {
        ayanamsaVal = sweph.get_ayanamsa(julianDay);
      }

      // Bitwise flags: SPEED (256) | SIDEREAL (65536)
      const flags = (sweph.SEFLG_SPEED || 256) | (sweph.SEFLG_SIDEREAL || 65536);

      // 4. Calculate Planetary Positions
      const planetsToCalculate = [
        { id: sweph.SE_SUN ?? 0, name: 'Sun' },
        { id: sweph.SE_MOON ?? 1, name: 'Moon' },
        { id: sweph.SE_MARS ?? 4, name: 'Mars' },
        { id: sweph.SE_MERCURY ?? 2, name: 'Mercury' },
        { id: sweph.SE_JUPITER ?? 5, name: 'Jupiter' },
        { id: sweph.SE_VENUS ?? 3, name: 'Venus' },
        { id: sweph.SE_SATURN ?? 6, name: 'Saturn' },
        { id: sweph.SE_TRUE_NODE ?? 11, name: 'Rahu' }
      ];

      const planetResults = [];

      for (const p of planetsToCalculate) {
        const body = sweph.calc_ut(julianDay, p.id, flags);

        let pLong = 0;
        let pSpeed = 0;

        if (Array.isArray(body)) {
          pLong = body[0] || 0;
          pSpeed = body[3] || 0;
        } else if (body && typeof body === 'object') {
          pLong = body.longitude ?? body.data?.[0] ?? 0;
          pSpeed = body.longitudeSpeed ?? body.data?.[3] ?? 0;
        }

        const parsed = parseZodiacPosition(pLong);

        planetResults.push({
          name: p.name,
          rashi: parsed.rashi,
          degree: parsed.degree,
          totalDegree: parsed.totalDegree,
          nakshatra: parsed.nakshatra,
          retrograde: pSpeed < 0
        });

        if (p.name === 'Rahu') {
          const ketuLong = (pLong + 180) % 360;
          const parsedKetu = parseZodiacPosition(ketuLong);
          planetResults.push({
            name: 'Ketu',
            rashi: parsedKetu.rashi,
            degree: parsedKetu.degree,
            totalDegree: parsedKetu.totalDegree,
            nakshatra: parsedKetu.nakshatra,
            retrograde: true
          });
        }
      }

      // 5. Compute Lagna (Ascendant)
      // Standard Tropical House Calculation
      const houses = sweph.houses(julianDay, numLat, numLng, 'P');
      let tropicalAscendant = 0;

      if (houses) {
        if (Array.isArray(houses.ascendant)) {
          tropicalAscendant = houses.ascendant[0] || 0;
        } else if (houses.ascendant !== undefined) {
          tropicalAscendant = houses.ascendant;
        } else if (Array.isArray(houses.house)) {
          tropicalAscendant = houses.house[0] || 0;
        }
      }

      // Convert Tropical Ascendant -> Sidereal Ascendant by subtracting Ayanamsa
      let siderealAscendantLong = (tropicalAscendant - ayanamsaVal) % 360;
      if (siderealAscendantLong < 0) {
        siderealAscendantLong += 360;
      }

      const ascendantParsed = parseZodiacPosition(siderealAscendantLong);

      resolve({
        julianDay,
        ayanamsa: Number(ayanamsaVal.toFixed(2)),
        ascendant: ascendantParsed,
        planets: planetResults
      });
    } catch (err) {
      console.error('[Ephemeris Engine Error]', err);
      reject(err);
    }
  });
}

module.exports = { calculateKundaliChart, ephePath };