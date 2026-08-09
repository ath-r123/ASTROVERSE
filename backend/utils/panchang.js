/**
 * Daily Panchang Calculation Engine powered by Swiss Ephemeris
 */

const TITHIS = [
    'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shasthi',
    'Saptami', 'Ashtami', 'Navami', 'Dashami', 'Ekadashi', 'Dwadashi',
    'Trayodashi', 'Chaturdashi', 'Purnima / Amavasya'
  ];
  
  const NAKSHATRAS = [
    'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
    'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
    'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
    'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
    'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
  ];
  
  const YOGAS = [
    'Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana', 'Atiganda',
    'Sukarma', 'Dhriti', 'Shula', 'Ganda', 'Vriddhi', 'Dhruva',
    'Vyaghat', 'Harshana', 'Vajra', 'Siddhi', 'Vyatipata', 'Variyan',
    'Parigha', 'Shiva', 'Siddha', 'Sadhya', 'Shubha', 'Shukla',
    'Brahma', 'Indra', 'Vaidhriti'
  ];
  
  const KARANAS = [
    'Bava', 'Balava', 'Kaulava', 'Taitila', 'Garaja', 'Vanija', 'Vishti (Bhadra)',
    'Shakuni', 'Chatushpada', 'Naga', 'Kintughna'
  ];
  
  /**
   * Calculates complete Panchang details for a given date & location
   */
  function calculatePanchang(sunDegree, moonDegree, dateStr) {
    // Normalize longitudes (0 - 360)
    const sun = (sunDegree % 360 + 360) % 360;
    const moon = (moonDegree % 360 + 360) % 360;
  
    // 1. Tithi (Moon degree - Sun degree) / 12
    const diff = (moon - sun + 360) % 360;
    const tithiNum = Math.floor(diff / 12);
    const paksha = tithiNum < 15 ? 'Shukla Paksha' : 'Krishna Paksha';
    const tithiName = `${TITHIS[tithiNum % 15]} (${paksha})`;
  
    // 2. Nakshatra (Moon degree / 13.3333)
    const nakshatraIndex = Math.floor(moon / (360 / 27));
    const nakshatraName = NAKSHATRAS[nakshatraIndex];
  
    // 3. Yoga (Sun degree + Moon degree) / 13.3333
    const sumDegrees = (sun + moon) % 360;
    const yogaIndex = Math.floor(sumDegrees / (360 / 27));
    const yogaName = YOGAS[yogaIndex];
  
    // 4. Karana (Half of Tithi)
    const karanaNum = Math.floor(diff / 6);
    let karanaName = KARANAS[karanaNum % 7];
    if (karanaNum === 0) karanaName = 'Kintughna';
    else if (karanaNum >= 57) karanaName = KARANAS[7 + (karanaNum - 57)];
  
    // 5. Rahu Kaal Approximation (Standard Day Divisions)
    const dateObj = new Date(dateStr);
    const dayOfWeek = dateObj.getDay(); // 0: Sun, 1: Mon, ..., 6: Sat
    const rahuKaalSlots = [
      '04:30 PM - 06:00 PM', // Sun
      '07:30 AM - 09:00 AM', // Mon
      '03:00 PM - 04:30 PM', // Tue
       me = '12:00 PM - 01:30 PM', // Wed
      '01:30 PM - 03:00 PM', // Thu
      '10:30 AM - 12:00 PM', // Fri
      '09:00 AM - 10:30 AM'  // Sat
    ];
  
    return {
      tithi: tithiName,
      nakshatra: nakshatraName,
      yoga: yogaName,
      karana: karanaName,
      rahuKaal: rahuKaalSlots[dayOfWeek],
      sunDegree: sun.toFixed(2),
      moonDegree: moon.toFixed(2)
    };
  }
  
  module.exports = { calculatePanchang };