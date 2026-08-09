/**
 * Dynamic Daily Horoscope Engine powered by Swiss Ephemeris Transits
 */

const ZODIAC_SIGNS = [
    'Aries', 'Taurus', 'Gemini', 'Cancer',
    'Leo', 'Virgo', 'Libra', 'Scorpio',
    'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
  ];
  
  const SIGN_ELEMENTS = {
    Aries: 'Fire', Taurus: 'Earth', Gemini: 'Air', Cancer: 'Water',
    Leo: 'Fire', Virgo: 'Earth', Libra: 'Air', Scorpio: 'Water',
    Sagittarius: 'Fire', Capricorn: 'Earth', Aquarius: 'Air', Pisces: 'Water'
  };
  
  const PLANETARY_RULERS = {
    Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
    Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Mars',
    Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Saturn', Pisces: 'Jupiter'
  };
  
  /**
   * Calculates transit impact for all 12 signs based on current Moon degree
   */
  function calculateDailyHoroscope(moonDegree, sunDegree) {
    const moonSignIndex = Math.floor((moonDegree % 360) / 30);
    const moonSign = ZODIAC_SIGNS[moonSignIndex];
    const moonDegInSign = (moonDegree % 30).toFixed(1);
  
    const sunSignIndex = Math.floor((sunDegree % 360) / 30);
    const sunSign = ZODIAC_SIGNS[sunSignIndex];
  
    const forecasts = {};
  
    ZODIAC_SIGNS.forEach((sign, index) => {
      // Calculate house position of transiting Moon relative to user's sign
      const housePosition = ((moonSignIndex - index + 12) % 12) + 1;
  
      let theme = '';
      let luckScore = 70;
      let color = 'Cosmic Gold';
  
      switch (housePosition) {
        case 1:
          theme = 'Emotional clarity, high vitality, and focus on personal well-being.';
          luckScore = 92; color = 'Ruby Red'; break;
        case 2:
          theme = 'Financial opportunities and grounded decision-making in personal assets.';
          luckScore = 85; color = 'Emerald Green'; break;
        case 3:
          theme = 'Enhanced communication, intellectual energy, and short trips.';
          luckScore = 78; color = 'Sky Blue'; break;
        case 4:
          theme = 'Focus on domestic peace, family matters, and emotional security.';
          luckScore = 80; color = 'Moonlight White'; break;
        case 5:
          theme = 'Creative outbursts, romantic sparks, and high decision-making confidence.';
          luckScore = 95; color = 'Saffron Gold'; break;
        case 6:
          theme = 'Attention to health routines, overcoming minor obstacles, and organizing work.';
          luckScore = 68; color = 'Olive Green'; break;
        case 7:
          theme = 'Harmonious partnerships, business discussions, and social connections.';
          luckScore = 88; color = 'Rose Pink'; break;
        case 8:
          theme = 'Deep introspection, unexpected insights, and spiritual transformation.';
          luckScore = 62; color = 'Deep Violet'; break;
        case 9:
          theme = 'Auspicious fortune, higher learning, and philosophical clarity.';
          luckScore = 96; color = 'Royal Purple'; break;
        case 10:
          theme = 'Career recognition, leadership opportunities, and public success.';
          luckScore = 90; color = 'Navy Blue'; break;
        case 11:
          theme = 'Social popularity, fulfilling desires, and gains through network circles.';
          luckScore = 94; color = 'Bright Orange'; break;
        case 12:
          theme = 'Restful energy, subconscious healing, and avoiding unnecessary expenditures.';
          luckScore = 65; color = 'Indigo'; break;
      }
  
      forecasts[sign.toLowerCase()] = {
        sign,
        element: SIGN_ELEMENTS[sign],
        ruler: PLANETARY_RULERS[sign],
        transitingMoonIn: moonSign,
        moonHouse: housePosition,
        luckScore,
        luckyColor: color,
        summary: `With the Moon transiting through ${moonSign} at ${moonDegInSign}°, ${sign} experiences energy in the ${housePosition}th House. ${theme}`
      };
    });
  
    return {
      currentTransits: {
        moonSign,
        moonDegree: (moonDegree % 360).toFixed(2),
        sunSign,
        sunDegree: (sunDegree % 360).toFixed(2)
      },
      forecasts
    };
  }
  
  module.exports = { calculateDailyHoroscope };