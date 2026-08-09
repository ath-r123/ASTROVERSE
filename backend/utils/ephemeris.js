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
  const normalized = (longitude % 360 + 360) % 360;
  const rashiIndex = Math.floor(normalized / 30);
  const degreeInRashi = normalized % 30;
  const nakshatraIndex = Math.floor(normalized / (360 / 27));

  return {
    rashi: RASHIS[rashiIndex],
    degree: Number(degreeInRashi.toFixed(2)),
    totalDegree: Number(normalized.toFixed(2)),
    nakshatra: NAKSHATRAS[nakshatraIndex]
  };
}

function calculateKundaliChart({ year, month, day, hour, minute, latitude, longitude, timezoneOffset = 5.5 }) {
  return new Promise((resolve, reject) => {
    try {
      const hourUT = hour + (minute / 60) - timezoneOffset;
      const julianDay = sweph.julday(year, month, day, hourUT, sweph.SE_GREG_CAL);

      sweph.set_sid_mode(sweph.SE_SIDM_LAHIRI, 0, 0);
      const flags = sweph.SEFLG_SPEED | sweph.SEFLG_SIDEREAL;

      const planetsToCalculate = [
        { id: sweph.SE_SUN, name: 'Sun' },
        { id: sweph.SE_MOON, name: 'Moon' },
        { id: sweph.SE_MARS, name: 'Mars' },
        { id: sweph.SE_MERCURY, name: 'Mercury' },
        { id: sweph.SE_JUPITER, name: 'Jupiter' },
        { id: sweph.SE_VENUS, name: 'Venus' },
        { id: sweph.SE_SATURN, name: 'Saturn' },
        { id: sweph.SE_TRUE_NODE, name: 'Rahu' }
      ];

      const planetResults = [];

      planetsToCalculate.forEach(p => {
        const body = sweph.calc_ut(julianDay, p.id, flags);
        const parsed = parseZodiacPosition(body.longitude);

        planetResults.push({
          name: p.name,
          rashi: parsed.rashi,
          degree: parsed.degree,
          nakshatra: parsed.nakshatra,
          retrograde: body.longitudeSpeed < 0
        });

        if (p.name === 'Rahu') {
          const ketuLong = (body.longitude + 180) % 360;
          const parsedKetu = parseZodiacPosition(ketuLong);
          planetResults.push({
            name: 'Ketu',
            rashi: parsedKetu.rashi,
            degree: parsedKetu.degree,
            nakshatra: parsedKetu.nakshatra,
            retrograde: true
          });
        }
      });

      const houses = sweph.houses(julianDay, latitude, longitude, 'P');
      const ascendantParsed = parseZodiacPosition(houses.ascendant[0]);

      resolve({
        julianDay,
        ascendant: ascendantParsed,
        planets: planetResults
      });
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { calculateKundaliChart, ephePath };