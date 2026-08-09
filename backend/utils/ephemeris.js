const sweph = require('sweph');
const path = require('path');

const { constants } = sweph;

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
  const nakshatraArc = 360 / 27;
  const pada = Math.floor((normalized % nakshatraArc) / (nakshatraArc / 4)) + 1;

  return {
    rashi: RASHIS[rashiIndex] || RASHIS[0],
    degree: Number(degreeInRashi.toFixed(6)),
    totalDegree: Number(normalized.toFixed(6)),
    nakshatra: NAKSHATRAS[nakshatraIndex] || NAKSHATRAS[0],
    pada
  };
}

const AYANAMSA_MODES = {
  lahiri: constants.SE_SIDM_LAHIRI,
  raman: constants.SE_SIDM_RAMAN,
  krishnamurti: constants.SE_SIDM_KRISHNAMURTI
};

function validNumber(value, minimum, maximum) {
  const number = Number(value);
  return Number.isFinite(number) && number >= minimum && number <= maximum;
}

function calculateKundaliChart({
  year,
  month,
  day,
  hour = 0,
  minute = 0,
  latitude = 19.0760,
  longitude = 72.8777,
  timezoneOffset = 5.5,
  ayanamsa = 'lahiri'
}) {
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
      const ayanamsaKey = String(ayanamsa || 'lahiri').toLowerCase();

      if (!Number.isInteger(numYear) || !Number.isInteger(numMonth) || !Number.isInteger(numDay) ||
          !validNumber(numHour, 0, 23) || !validNumber(numMin, 0, 59) ||
          !validNumber(numLat, -90, 90) || !validNumber(numLng, -180, 180) || !Number.isFinite(numTz)) {
        return reject(new Error('Invalid birth date parameters provided.'));
      }
      if (numYear < 1800 || numYear > 2399) {
        return reject(new Error('Precise Swiss Ephemeris files in this service support birth years from 1800 to 2399.'));
      }
      if (!['lahiri', 'raman', 'krishnamurti', 'sayana'].includes(ayanamsaKey)) {
        return reject(new Error('Unsupported ayanamsa system.'));
      }

      // 1. Local Time -> UTC Hours
      const decimalLocalHours = numHour + (numMin / 60);
      const decimalUtcHours = decimalLocalHours - numTz;

      // 2. Compute Julian Day in UTC
      const julianDay = sweph.julday(numYear, numMonth, numDay, decimalUtcHours, constants.SE_GREG_CAL);

      if (typeof julianDay !== 'number' || isNaN(julianDay)) {
        return reject(new Error('Failed to compute Julian Day from birth details.'));
      }

      // Indian defaults: IST (+05:30) and Lahiri (Chitra Paksha) sidereal zodiac.
      // Swiss Ephemeris keeps this setting process-wide, so set it for every chart.
      const sidereal = ayanamsaKey !== 'sayana';
      if (sidereal) sweph.set_sid_mode(AYANAMSA_MODES[ayanamsaKey], 0, 0);

      const ayanamsaVal = sidereal ? sweph.get_ayanamsa_ut(julianDay) : 0;

      const flags = constants.SEFLG_SWIEPH | constants.SEFLG_SPEED | (sidereal ? constants.SEFLG_SIDEREAL : 0);

      // 4. Calculate Planetary Positions
      const planetsToCalculate = [
        { id: constants.SE_SUN, name: 'Sun' },
        { id: constants.SE_MOON, name: 'Moon' },
        { id: constants.SE_MARS, name: 'Mars' },
        { id: constants.SE_MERCURY, name: 'Mercury' },
        { id: constants.SE_JUPITER, name: 'Jupiter' },
        { id: constants.SE_VENUS, name: 'Venus' },
        { id: constants.SE_SATURN, name: 'Saturn' },
        { id: constants.SE_TRUE_NODE, name: 'Rahu' }
      ];

      const planetResults = [];

      for (const p of planetsToCalculate) {
        const body = sweph.calc_ut(julianDay, p.id, flags);
        if (body.error) throw new Error(`Swiss Ephemeris failed for ${p.name}: ${body.error}`);

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
          pada: parsed.pada,
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
            pada: parsedKetu.pada,
            retrograde: true
          });
        }
      }

      // Whole-sign houses are the conventional Vedic presentation. houses_ex()
      // returns a sidereal Ascendant directly in data.points[0] when given the
      // sidereal flag; no manual ayanamsa subtraction is required.
      const houseResult = sweph.houses_ex(julianDay, sidereal ? constants.SEFLG_SIDEREAL : 0, numLat, numLng, 'W');
      if (houseResult.error || !Number.isFinite(houseResult.data?.points?.[0])) {
        throw new Error(`Swiss Ephemeris failed to calculate the ascendant: ${houseResult.error || 'missing ascendant'}`);
      }
      const ascendantParsed = parseZodiacPosition(houseResult.data.points[0]);

      resolve({
        julianDay,
        ayanamsa: Number(ayanamsaVal.toFixed(6)),
        ayanamsaSystem: ayanamsaKey,
        timezoneOffset: numTz,
        houseSystem: 'whole-sign',
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
