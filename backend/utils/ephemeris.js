const sweph = require('sweph');
const path = require('path');

const ephePath = path.join(__dirname, '../ephe');
sweph.set_ephe_path(ephePath);

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
  let numLong = Number(longitude);
  if (isNaN(numLong)) numLong = 0;

  // Guarantee strictly positive modulo between 0 and 359.999
  numLong = ((numLong % 360) + 360) % 360;

  const rashiIndex = Math.floor(numLong / 30);
  const degreeInRashi = numLong % 30;
  const nakshatraIndex = Math.floor(numLong / (360 / 27));

  return {
    rashiIndex: rashiIndex + 1, // 1 = Aries, 9 = Sagittarius
    rashi: RASHIS[rashiIndex] || RASHIS[0],
    degree: Number(degreeInRashi.toFixed(2)),
    totalDegree: Number(numLong.toFixed(2)),
    nakshatra: NAKSHATRAS[nakshatraIndex] || NAKSHATRAS[0]
  };
}

function calculateKundaliChart({ year, month, day, hour = 0, minute = 0, latitude = 21.0963, longitude = 77.0588, timezoneOffset = 5.5 }) {
  return new Promise((resolve, reject) => {
    try {
      const numYear = Number(year);
      const numMonth = Number(month);
      const numDay = Number(day);
      const numHour = Number(hour);
      const numMin = Number(minute);
      const numLat = Number(latitude);
      const numLng = Number(longitude);
      
      // Force positive IST timezone offset (5.5)
      const numTz = 5.5;

      if ([numYear, numMonth, numDay].some(v => isNaN(v))) {
        return reject(new Error('Invalid birth date parameters provided.'));
      }

      // 1. Convert Local Time -> Decimal UTC Hours
      // 14:51 IST -> 09:21 UTC (9.35 hours)
      const decimalLocalHours = numHour + (numMin / 60);
      const decimalUtcHours = decimalLocalHours - numTz;

      // 2. Compute Julian Day in UTC
      const gregFlag = typeof sweph.SE_GREG_CAL === 'number' ? sweph.SE_GREG_CAL : 1;
      const julianDay = sweph.julday(numYear, numMonth, numDay, decimalUtcHours, gregFlag);

      // 3. Set Lahiri Sidereal Mode
      const sidMode = typeof sweph.SE_SIDM_LAHIRI === 'number' ? sweph.SE_SIDM_LAHIRI : 1;
      sweph.set_sid_mode(sidMode, 0, 0);

      // Extract exact Lahiri Ayanamsa
      const ayanamsaVal = typeof sweph.get_ayanamsa_ut === 'function' 
        ? sweph.get_ayanamsa_ut(julianDay) 
        : sweph.get_ayanamsa(julianDay);

      // Bitwise Flags: MOSEPH (1) | SPEED (256) | SIDEREAL (65536)
      const flags = (sweph.SEFLG_MOSEPH || 1) | (sweph.SEFLG_SPEED || 256) | (sweph.SEFLG_SIDEREAL || 65536);

      // 4. Calculate Sidereal Ascendant (Lagna)
      // Call standard houses with Julian Day in UTC and coordinates
      const houseData = sweph.houses(julianDay, numLat, numLng, 'P');
      
      let rawTropicalAscendant = 0;
      if (houseData) {
        if (typeof houseData.ascendant === 'number') {
          rawTropicalAscendant = houseData.ascendant;
        } else if (Array.isArray(houseData.ascendant)) {
          rawTropicalAscendant = houseData.ascendant[0];
        } else if (Array.isArray(houseData.house)) {
          rawTropicalAscendant = houseData.house[0];
        }
      }

      // Convert Tropical Ascendant -> Sidereal Ascendant (Lahiri)
      let siderealAscendantLong = ((rawTropicalAscendant - ayanamsaVal) % 360 + 360) % 360;

      const ascendantParsed = parseZodiacPosition(siderealAscendantLong);

      // 5. Compute Planetary Positions
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

        let pLong = Array.isArray(body) ? body[0] : (body.longitude ?? body.data?.[0] ?? 0);
        let pSpeed = Array.isArray(body) ? body[3] : (body.longitudeSpeed ?? body.data?.[3] ?? 0);

        const parsed = parseZodiacPosition(pLong);

        planetResults.push({
          name: p.name,
          rashiIndex: parsed.rashiIndex,
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
            rashiIndex: parsedKetu.rashiIndex,
            rashi: parsedKetu.rashi,
            degree: parsedKetu.degree,
            totalDegree: parsedKetu.totalDegree,
            nakshatra: parsedKetu.nakshatra,
            retrograde: true
          });
        }
      }

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