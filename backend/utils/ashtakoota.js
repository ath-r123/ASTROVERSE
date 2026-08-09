/**
 * Ashtakoota 36 Guna Milan Calculation Engine
 */

const NAKSHATRAS = [
    'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
    'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
    'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
    'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
    'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
  ];
  
  // Helper to determine Nakshatra Index (0-26) and Pada (1-4)
  function getNakshatraAndPada(moonLongitude) {
    const normalized = (moonLongitude % 360 + 360) % 360;
    const nakshatraIndex = Math.floor(normalized / (360 / 27));
    const degreeInNakshatra = normalized % (360 / 27);
    const pada = Math.floor(degreeInNakshatra / (360 / 108)) + 1;
  
    return {
      nakshatra: NAKSHATRAS[nakshatraIndex],
      nakshatraIndex,
      pada,
      rashiIndex: Math.floor(normalized / 30)
    };
  }
  
  // 1. Varna (Max 1)
  function calcVarna(bRashi, gRashi) {
    const varnaMap = [3, 0, 1, 2, 0, 1, 2, 3, 0, 1, 2, 3]; // Brahmin, Kshatriya, Vaishya, Shudra
    const bVarna = varnaMap[bRashi];
    const gVarna = varnaMap[gRashi];
    return bVarna >= gVarna ? 1 : 0;
  }
  
  // 2. Vashya (Max 2)
  function calcVashya(bRashi, gRashi) {
    return bRashi === gRashi ? 2 : 1; // Simplified Vashya match score
  }
  
  // 3. Tara (Max 3)
  function calcTara(bNak, gNak) {
    const count1 = ((gNak - bNak + 27) % 27) % 9;
    const count2 = ((bNak - gNak + 27) % 27) % 9;
    const auspicious = [1, 2, 4, 6, 8, 0];
    if (auspicious.includes(count1) && auspicious.includes(count2)) return 3;
    if (auspicious.includes(count1) || auspicious.includes(count2)) return 1.5;
    return 0;
  }
  
  // 4. Yoni (Max 4)
  function calcYoni(bNak, gNak) {
    const yoniMatchMatrix = [
      [4,2,2,3,2,2,2,1,0,1,3,3,2,1,2,2,1,2,1,2,2,2,1,2,2,2,4],
      [2,4,3,2,1,2,1,0,2,2,2,2,1,2,1,2,2,1,2,1,2,2,2,1,2,4,2]
    ];
    const row = bNak % 2;
    return yoniMatchMatrix[row][gNak] || 2;
  }
  
  // 5. Graha Maitri (Max 5)
  function calcGrahaMaitri(bRashi, gRashi) {
    const lords = [4, 3, 2, 1, 0, 2, 3, 4, 5, 6, 6, 5]; // Sun, Moon, Mars, Merc, Jup, Ven, Sat
    return lords[bRashi] === lords[gRashi] ? 5 : 3;
  }
  
  // 6. Gana (Max 6)
  function calcGana(bNak, gNak) {
    const ganaMap = [0, 1, 2, 1, 0, 2, 0, 0, 2, 2, 1, 1, 0, 2, 0, 2, 0, 2, 2, 1, 1, 0, 2, 2, 1, 1, 0]; // 0: Deva, 1: Manushya, 2: Rakshasa
    const bGana = ganaMap[bNak];
    const gGana = ganaMap[gNak];
  
    if (bGana === gGana) return 6;
    if ((bGana === 0 && gGana === 1) || (bGana === 1 && gGana === 0)) return 5;
    if ((bGana === 0 && gGana === 2) || (bGana === 2 && gGana === 0)) return 1;
    return 0;
  }
  
  // 7. Bhakoot (Max 7)
  function calcBhakoot(bRashi, gRashi) {
    const diff = Math.abs(bRashi - gRashi);
    const badPositions = [1, 5]; // 2/12 or 6/8 positions
    return badPositions.includes(diff) ? 0 : 7;
  }
  
  // 8. Nadi (Max 8)
  function calcNadi(bNak, gNak) {
    const bNadi = bNak % 3; // 0: Adi, 1: Madhya, 2: Antya
    const gNadi = gNak % 3;
    return bNadi !== gNadi ? 8 : 0; // Nadi Dosha if same
  }
  
  /**
   * Calculates complete 36 Guna Ashtakoota Matching
   */
  function calculateAshtakoota(boyMoonLong, girlMoonLong) {
    const boy = getNakshatraAndPada(boyMoonLong);
    const girl = getNakshatraAndPada(girlMoonLong);
  
    const varna = calcVarna(boy.rashiIndex, girl.rashiIndex);
    const vashya = calcVashya(boy.rashiIndex, girl.rashiIndex);
    const tara = calcTara(boy.nakshatraIndex, girl.nakshatraIndex);
    const yoni = calcYoni(boy.nakshatraIndex, girl.nakshatraIndex);
    const maitri = calcGrahaMaitri(boy.rashiIndex, girl.rashiIndex);
    const gana = calcGana(boy.nakshatraIndex, girl.nakshatraIndex);
    const bhakoot = calcBhakoot(boy.rashiIndex, girl.rashiIndex);
    const nadi = calcNadi(boy.nakshatraIndex, girl.nakshatraIndex);
  
    const totalObtained = varna + vashya + tara + yoni + maitri + gana + bhakoot + nadi;
  
    return {
      boy,
      girl,
      scores: {
        varna: { obtained: varna, max: 1 },
        vashya: { obtained: vashya, max: 2 },
        tara: { obtained: tara, max: 3 },
        yoni: { obtained: yoni, max: 4 },
        maitri: { obtained: maitri, max: 5 },
        gana: { obtained: gana, max: 6 },
        bhakoot: { obtained: bhakoot, max: 7 },
        nadi: { obtained: nadi, max: 8 }
      },
      totalPoints: totalObtained,
      maxPoints: 36,
      isCompatible: totalObtained >= 18
    };
  }
  
  module.exports = { calculateAshtakoota, getNakshatraAndPada };