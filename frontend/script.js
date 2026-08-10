/**
 * =====================================================================
 *  ASTROVERSE — Main Application JavaScript
 *  Handles all interactive functionality across every page.
 * =====================================================================
 */

/* =================================================================
   SECTION 1 — UTILITY HELPERS
   ================================================================= */

/**
 * Reduce a number to a single digit by summing its digits.
 * Master numbers (11, 22, 33) are preserved when keepMaster=true.
 */
const API_BASE_URL = 'https://astroverse-q5hk.onrender.com/api';

async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem('astro_token');
    const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    if (token) headers.Authorization = 'Bearer ' + token;
    const response = await fetch(API_BASE_URL + endpoint, Object.assign({}, options, { headers }));
    const data = await response.json().catch(function () { return {}; });
    if (response.status === 401) {
        localStorage.removeItem('astro_token');
        localStorage.removeItem('astro_user');
        syncHeaderAuth();
        showNotification('Your session has ended. Please sign in again.', 'error');
    }
    if (!response.ok) {
        const error = new Error(data.message || 'Request failed.');
        error.status = response.status;
        throw error;
    }
    return data;
}

function getStoredUser() {
    try { return JSON.parse(localStorage.getItem('astro_user')); } catch (error) { return null; }
}

function saveSession(data) {
    localStorage.setItem('astro_token', data.token);
    localStorage.setItem('astro_user', JSON.stringify(data.user));
    syncHeaderAuth();
}

function requireLogin() {
    if (localStorage.getItem('astro_token')) return true;
    showNotification('Please sign in to continue.', 'error');
    window.location.href = 'sign-in-up.html';
    return false;
}

async function saveCalculation(type, input, result) {
    if (!localStorage.getItem('astro_token')) {
        showNotification('Sign in to save this result to your account.', 'info');
        return;
    }
    try { await apiFetch('/calculations', { method: 'POST', body: JSON.stringify({ type, input, result }) }); }
    catch (error) { showNotification(error.message, 'error'); }
}

function syncHeaderAuth() {
    const user = getStoredUser();
    const dropdown = Array.from(document.querySelectorAll('.nav-links > .dropdown')).find(function (item) {
        return item.firstElementChild && item.firstElementChild.textContent.includes('Sign In');
    });
    if (!dropdown || !user) return;
    const menu = dropdown.querySelector('.dropdown-content');
    if (!menu) return;
    menu.innerHTML = '';
    const profile = document.createElement('a');
    profile.href = 'sign-in-up.html';
    profile.textContent = 'Profile (' + user.name + ')';
    const logout = document.createElement('a');
    logout.href = '#';
    logout.textContent = 'Logout';
    logout.addEventListener('click', function (event) {
        event.preventDefault();
        localStorage.removeItem('astro_token');
        localStorage.removeItem('astro_user');
        window.location.href = 'index.html';
    });
    menu.append(profile, logout);
}

function reduceToSingleDigit(number, keepMaster) {
    number = Math.abs(Number(number)) || 0;
    if (keepMaster && [11, 22, 33].includes(number)) {
        return number;
    }
    while (number > 9) {
        number = String(number)
            .split('')
            .reduce((sum, digit) => sum + parseInt(digit, 10), 0);
        if (keepMaster && [11, 22, 33].includes(number)) {
            return number;
        }
    }
    return number;
}

/**
 * Show a styled alert notification at the top of the page.
//  * Falls back to browser alert if the container is missing.
 */
function showNotification(message, type) {
    var existingNotification = document.querySelector('.astroverse-notification');
    if (existingNotification) existingNotification.remove();

    var notificationBar = document.createElement('div');
    notificationBar.className = 'astroverse-notification';
    notificationBar.setAttribute('role', type === 'error' ? 'alert' : 'status');
    notificationBar.setAttribute('aria-live', 'polite');
    notificationBar.style.cssText =
        'position:fixed;top:80px;left:50%;transform:translateX(-50%);z-index:9999;' +
        'padding:16px 32px;border-radius:10px;font-family:Segoe UI,sans-serif;font-weight:600;' +
        'box-shadow:0 8px 24px rgba(0,0,0,0.18);max-width:90%;text-align:center;' +
        'animation:slideDown 0.3s ease;';

    if (type === 'success') {
        notificationBar.style.background = '#ecfdf5';
        notificationBar.style.color = '#065f46';
        notificationBar.style.border = '1px solid #a7f3d0';
    } else if (type === 'error') {
        notificationBar.style.background = '#fef2f2';
        notificationBar.style.color = '#991b1b';
        notificationBar.style.border = '1px solid #fecaca';
    } else {
        notificationBar.style.background = '#eff6ff';
        notificationBar.style.color = '#1e40af';
        notificationBar.style.border = '1px solid #bfdbfe';
    }

    notificationBar.textContent = message;
    document.body.appendChild(notificationBar);

    setTimeout(function () {
        notificationBar.style.opacity = '0';
        notificationBar.style.transition = 'opacity 0.4s ease';
        setTimeout(function () { notificationBar.remove(); }, 400);
    }, 3500);
}


/* =================================================================
   SECTION 2 — NAVIGATION (Header / Dropdowns / Mobile Menu)
   ================================================================= */
/*
function initializeNavigation() {
    // Add mobile hamburger toggle if not present
    var navContainer = document.querySelector('.nav-container');
    var navLinks = document.querySelector('.nav-links');

    if (!navContainer || !navLinks) return;

    // Check if hamburger button already exists
    if (!document.querySelector('.mobile-menu-toggle')) {
        var hamburgerButton = document.createElement('button');
        hamburgerButton.className = 'mobile-menu-toggle';
        hamburgerButton.setAttribute('aria-label', 'Toggle navigation menu');
        hamburgerButton.innerHTML = '☰';
        hamburgerButton.style.cssText =
            'display:none;background:none;border:none;color:gold;font-size:28px;cursor:pointer;padding:8px;';
        var logoContainer = navContainer.querySelector('.logo-container');
        if (logoContainer) {
            logoContainer.after(hamburgerButton);
        } else {
            navContainer.prepend(hamburgerButton);
        }
    }

    var mobileToggle = document.querySelector('.mobile-menu-toggle');

    // Show hamburger only on small screens via resize listener
    function handleMobileLayout() {
        if (window.innerWidth <= 900) {
            mobileToggle.style.display = 'block';
            navLinks.style.display = 'none';
            navLinks.style.flexDirection = 'column';
            navLinks.style.position = 'absolute';
            navLinks.style.top = '100%';
            navLinks.style.right = '0';
            navLinks.style.backgroundColor = '#000';
            navLinks.style.padding = '15px';
            navLinks.style.borderRadius = '0 0 8px 8px';
            navLinks.style.zIndex = '1001';
            navLinks.style.width = '220px';
            navLinks.style.gap = '12px';
        } else {
            mobileToggle.style.display = 'none';
            navLinks.style.display = 'flex';
            navLinks.style.position = '';
            navLinks.style.flexDirection = '';
            navLinks.style.top = '';
            navLinks.style.right = '';
            navLinks.style.backgroundColor = '';
            navLinks.style.padding = '';
            navLinks.style.borderRadius = '';
            navLinks.style.zIndex = '';
            navLinks.style.width = '';
            navLinks.style.gap = '';
        }
    }

    mobileToggle.addEventListener('click', function () {
        var isCurrentlyHidden = navLinks.style.display === 'none' || navLinks.style.display === '';
        navLinks.style.display = isCurrentlyHidden ? 'flex' : 'none';
    });

    handleMobileLayout();
    window.addEventListener('resize', handleMobileLayout);

    // Close mobile menu when a link is clicked
    var allNavLinks = navLinks.querySelectorAll('a');
    allNavLinks.forEach(function (link) {
        link.addEventListener('click', function () {
            if (window.innerWidth <= 900) {
                navLinks.style.display = 'none';
            }
        });
    });
}
*/

/* =================================================================
   SECTION 3 — ASTROLOGER SIGN IN / SIGN UP (astrologer-sign-in-up.html)
   ================================================================= */

/**
 * Toggle between Astrologer Login and Signup tabs.
 * @param {string} activeMode - Either 'login' or 'signup'
 */
function toggleAstroAuth(activeMode) {
    var tabLogin = document.getElementById('tab-astro-login');
    var tabSignup = document.getElementById('tab-astro-signup');
    var viewLogin = document.getElementById('astroLoginFormSection');
    var viewSignup = document.getElementById('astroSignupFormSection');

    if (!tabLogin || !tabSignup || !viewLogin || !viewSignup) return;

    if (activeMode === 'login') {
        tabLogin.classList.add('active');
        tabSignup.classList.remove('active');
        viewLogin.classList.add('active');
        viewSignup.classList.remove('active');
    } else {
        tabSignup.classList.add('active');
        tabLogin.classList.remove('active');
        viewSignup.classList.add('active');
        viewLogin.classList.remove('active');
    }
}


/* =================================================================
   SECTION 4 — USER SIGN IN / SIGN UP (sign-in-up.html)
   ================================================================= */

/**
 * Switch between User Login, User Signup, and Admin Login panels.
 * @param {string} targetView - One of 'user-login', 'user-signup', 'admin-login'
 */
function switchPortalView(targetView) {
    var allTabs = document.querySelectorAll('.tab-toggle-btn');
    var allPanels = document.querySelectorAll('.auth-panel-view');

    allTabs.forEach(function (tab) {
        tab.classList.remove('active');
        tab.setAttribute('aria-selected', 'false');
    });
    allPanels.forEach(function (panel) {
        panel.classList.remove('active');
    });

    var activeTab = document.getElementById('tab-' + targetView);
    var activePanel = document.getElementById('view-' + targetView);

    if (activeTab && activePanel) {
        activeTab.classList.add('active');
        activeTab.setAttribute('aria-selected', 'true');
        activePanel.classList.add('active');
    }
}


/* =================================================================
   SECTION 5 — ASTROLOGER SESSION ACTIONS (index.html / astrologers.html)
   ================================================================= */

/**
 * Start a chat or call session with an astrologer.
 * @param {string} sessionType - Either 'chat' or 'call'
 * @param {string} astrologerId - The astrologer's identifier
 */
function startSession(sessionType, astrologerId) {
    var astrologerNames = {
        '1': 'Acharya Sharma',
        '2': 'Numerologist Megha',
        '3': 'Tarot Reader Riya',
        '4': 'Swami Krishna'
    };

    var astrologerName = astrologerNames[astrologerId] || 'this astrologer';
    var sessionLabel = sessionType === 'chat' ? 'Chat' : 'Call';

    showNotification(
        'Starting ' + sessionLabel + ' session with ' + astrologerName + '… Please wait.',
        'info'
    );

    // In a real app, this would redirect to a chat/call room
    console.log('[ASTROVERSE] Starting ' + sessionType + ' with astrologer #' + astrologerId);
}

/**
 * Join the waitlist for a busy astrologer.
 * @param {string} astrologerId - The astrologer's identifier
 */
function joinWaitlist(astrologerId) {
    showNotification(
        'You have been added to the waitlist. We will notify you when the astrologer is available.',
        'success'
    );
    console.log('[ASTROVERSE] Joined waitlist for astrologer #' + astrologerId);
}


/* =================================================================
   SECTION 6 — HOROSCOPE PAGE (horoscope.html)
   ================================================================= */

/** Complete horoscope data for all 12 zodiac signs */
async function startSession(sessionType, astrologerId) {
    if (!requireLogin()) return;
    try {
        await apiFetch('/sessions', { method: 'POST', body: JSON.stringify({ type: sessionType, astrologerId }) });
        showNotification('Your ' + sessionType + ' session has been requested.', 'success');
    } catch (error) { showNotification(error.message, 'error'); }
}

async function joinWaitlist(astrologerId) {
    if (!requireLogin()) return;
    try {
        await apiFetch('/sessions/waitlist', { method: 'POST', body: JSON.stringify({ astrologerId }) });
        showNotification('You have been added to the waitlist.', 'success');
    } catch (error) { showNotification(error.message, 'error'); }
}

var zodiacHoroscopeData = {
    aries: {
        name: 'Aries',
        symbol: '♈',
        rulingPlanet: 'Mars',
        element: 'Fire',
        overview: 'The cosmic current alignment pushes you into a highly dynamic zone today. The Moon forms a pleasant sextile with your ruling planet Mars, fueling your mental reservoir with unyielding ambition. It is an extraordinary window to conquer stagnant logistical projects.',
        love: 'Vulnerability becomes your greatest charm today. Open conversations dissolve old friction. Single signs might feel a sudden attraction toward an analytical Air sign.',
        career: 'Do not shy away from leadership roles today. A pitch or conceptual proposal you lay down during afternoon transits holds a very high conversion success factor.',
        health: 'High energy levels could turn into nervous exhaustion if not grounded properly. Swap heavy stimulants for outdoor activity or physical stretches.',
        finance: 'A minor speculative delay clears up. Keep a close watch on impulse luxury checkouts, as planetary alignments hint at short-term budgetary fluctuations.',
        romanceIndex: 85,
        careerDrive: 90,
        financialInstinct: 60,
        mentalClarity: 75,
        luckyNumbers: '7, 14, 22',
        luckyColour: 'Crimson Red',
        harmoniousSigns: 'Leo, Sagittarius',
        challengingSign: 'Capricorn',
        auspiciousHours: '02:30 PM - 04:00 PM'
    },
    taurus: {
        name: 'Taurus',
        symbol: '♉',
        rulingPlanet: 'Venus',
        element: 'Earth',
        overview: 'Venus graces your sign with a calming influence today, encouraging you to slow down and savour life\'s simple pleasures. Financial matters look favourable — a pending payment or investment return may finally materialise.',
        love: 'Romance is in the air. Couples enjoy deepened intimacy, while singles may encounter someone through a shared hobby or creative pursuit.',
        career: 'Steady progress is your superpower today. Avoid rushing decisions and trust your methodical approach — it will outperform hurried competitors.',
        health: 'Indulge in nourishing comfort foods but maintain portion control. A gentle yoga session will realign your energy centres beautifully.',
        finance: 'An excellent day for long-term financial planning. That savings strategy you\'ve been considering? Start it today.',
        romanceIndex: 92,
        careerDrive: 70,
        financialInstinct: 88,
        mentalClarity: 78,
        luckyNumbers: '6, 15, 24',
        luckyColour: 'Emerald Green',
        harmoniousSigns: 'Virgo, Capricorn',
        challengingSign: 'Leo',
        auspiciousHours: '10:00 AM - 12:00 PM'
    },
    gemini: {
        name: 'Gemini',
        symbol: '♊',
        rulingPlanet: 'Mercury',
        element: 'Air',
        overview: 'Mercury\'s transit through your communication sector amplifies your natural wit. Conversations flow effortlessly, and ideas come in rapid succession. Channel this energy into creative projects or networking.',
        love: 'Your charm is at its peak. Flirtatious banter could evolve into something meaningful. Be honest about your intentions.',
        career: 'Multitasking comes naturally today. Juggle multiple projects with finesse, but prioritise the deadline that carries the highest consequence.',
        health: 'Mental restlessness may cause scattered focus. Meditation or a short walk in nature can restore your equilibrium.',
        finance: 'Avoid impulsive online shopping. That "limited time offer" can wait until tomorrow when Mercury\'s influence calms.',
        romanceIndex: 78,
        careerDrive: 82,
        financialInstinct: 55,
        mentalClarity: 90,
        luckyNumbers: '5, 14, 23',
        luckyColour: 'Yellow',
        harmoniousSigns: 'Libra, Aquarius',
        challengingSign: 'Pisces',
        auspiciousHours: '03:00 PM - 05:00 PM'
    },
    cancer: {
        name: 'Cancer',
        symbol: '♋',
        rulingPlanet: 'Moon',
        element: 'Water',
        overview: 'The Moon\'s transit through your family sector brings emotional warmth and nostalgic reflections. Home improvement projects or family gatherings bring unexpected joy today.',
        love: 'Emotional security matters most. Partnered Cancers deepen their bonds through heartfelt conversations. Singles should trust their intuition about new people.',
        career: 'Your nurturing leadership style earns recognition. A colleague you mentored may bring good news or a token of gratitude.',
        health: 'Emotional eating patterns may surface. Comfort is found in warm baths, gentle music, and meaningful conversations.',
        finance: 'Property or home-related expenses may arise. Budget carefully — the investment will be worthwhile long-term.',
        romanceIndex: 80,
        careerDrive: 65,
        financialInstinct: 72,
        mentalClarity: 70,
        luckyNumbers: '2, 11, 20',
        luckyColour: 'Silver',
        harmoniousSigns: 'Scorpio, Pisces',
        challengingSign: 'Aries',
        auspiciousHours: '06:00 AM - 08:00 AM'
    },
    leo: {
        name: 'Leo',
        symbol: '♌',
        rulingPlanet: 'Sun',
        element: 'Fire',
        overview: 'The Sun illuminates your creative sector, sparking a burst of artistic inspiration. Today favours self-expression, performance, and romantic gestures. Your natural magnetism is amplified.',
        love: 'Grand romantic gestures land perfectly. Plan something special for your partner or put yourself out there with confidence.',
        career: 'Leadership opportunities abound. Your team looks to you for direction — step up with decisiveness and warmth.',
        health: 'Your vitality is strong. Channel excess energy into physical activities like dancing, swimming, or strength training.',
        finance: 'Creative ventures could generate unexpected income. That side project or hobby has real monetisation potential.',
        romanceIndex: 95,
        careerDrive: 88,
        financialInstinct: 70,
        mentalClarity: 82,
        luckyNumbers: '1, 10, 19',
        luckyColour: 'Gold',
        harmoniousSigns: 'Aries, Sagittarius',
        challengingSign: 'Taurus',
        auspiciousHours: '11:00 AM - 01:00 PM'
    },
    virgo: {
        name: 'Virgo',
        symbol: '♍',
        rulingPlanet: 'Mercury',
        element: 'Earth',
        overview: 'Mercury\'s analytical influence sharpens your attention to detail. Today is ideal for auditing finances, organising your workspace, or tackling that backlog of tasks you\'ve been postponing.',
        love: 'Small, thoughtful gestures speak louder than grand declarations. Show love through acts of service and genuine attentiveness.',
        career: 'Your meticulous approach catches a critical error before it escalates. Document everything — your thoroughness will be rewarded.',
        health: 'Digestive sensitivity may be heightened. Opt for probiotic-rich foods, herbal teas, and regular meal timings.',
        finance: 'A budgeting review reveals areas for optimisation. Redirect saved amounts into an emergency fund or index investment.',
        romanceIndex: 65,
        careerDrive: 85,
        financialInstinct: 80,
        mentalClarity: 88,
        luckyNumbers: '6, 15, 27',
        luckyColour: 'Navy Blue',
        harmoniousSigns: 'Taurus, Capricorn',
        challengingSign: 'Sagittarius',
        auspiciousHours: '09:00 AM - 11:00 AM'
    },
    libra: {
        name: 'Libra',
        symbol: '♎',
        rulingPlanet: 'Venus',
        element: 'Air',
        overview: 'Venus blesses your social sector, making today excellent for partnerships, negotiations, and diplomatic conversations. Balance is your natural gift — use it to mediate or broker agreements.',
        love: 'Harmony in relationships is your focus. Address any unresolved tensions with grace. Singles may attract a charming intellectual type.',
        career: 'Collaborative projects gain momentum. Your ability to see all sides of a situation makes you the ideal mediator in workplace disputes.',
        health: 'Kidney and lower back areas need attention. Stay hydrated and avoid prolonged sitting without stretching breaks.',
        finance: 'Joint financial decisions should be made carefully. Consult a trusted advisor before signing any shared agreements.',
        romanceIndex: 88,
        careerDrive: 72,
        financialInstinct: 68,
        mentalClarity: 85,
        luckyNumbers: '4, 13, 22',
        luckyColour: 'Rose Pink',
        harmoniousSigns: 'Gemini, Aquarius',
        challengingSign: 'Capricorn',
        auspiciousHours: '04:00 PM - 06:00 PM'
    },
    scorpio: {
        name: 'Scorpio',
        symbol: '♏',
        rulingPlanet: 'Pluto',
        element: 'Water',
        overview: 'Pluto\'s transformative energy urges you to release what no longer serves you. Today brings powerful insights into hidden motivations — yours and others\'. Trust your penetrating intuition.',
        love: 'Deep emotional connections replace surface-level interactions. This is a day for vulnerability and profound intimacy.',
        career: 'Investigative or research-based tasks yield breakthrough results. Your ability to dig beneath the surface reveals what others miss.',
        health: 'Emotional processing may be intense. Journaling, therapy, or deep breathing exercises help channel these powerful energies constructively.',
        finance: 'Hidden financial opportunities surface. A forgotten investment or overlooked refund may appear unexpectedly.',
        romanceIndex: 82,
        careerDrive: 80,
        financialInstinct: 75,
        mentalClarity: 78,
        luckyNumbers: '8, 17, 26',
        luckyColour: 'Deep Maroon',
        harmoniousSigns: 'Cancer, Pisces',
        challengingSign: 'Leo',
        auspiciousHours: '07:00 PM - 09:00 PM'
    },
    sagittarius: {
        name: 'Sagittarius',
        symbol: '♐',
        rulingPlanet: 'Jupiter',
        element: 'Fire',
        overview: 'Jupiter\'s expansive influence opens doors to learning, travel, and philosophical exploration. Say yes to unexpected invitations — they lead to growth and meaningful connections.',
        love: 'Adventure fuels your romance today. Plan an exciting outing with your partner or explore a cultural event where new connections await.',
        career: 'International or cross-cultural projects gain traction. Your optimistic vision inspires colleagues and attracts new opportunities.',
        health: 'Your adventurous spirit needs physical outlets. Try a new sport, go hiking, or explore a fitness class you\'ve been curious about.',
        finance: 'Educational investments pay off. That course, certification, or book you\'ve been considering is worth the expenditure today.',
        romanceIndex: 80,
        careerDrive: 85,
        financialInstinct: 60,
        mentalClarity: 92,
        luckyNumbers: '3, 12, 21',
        luckyColour: 'Royal Purple',
        harmoniousSigns: 'Aries, Leo',
        challengingSign: 'Virgo',
        auspiciousHours: '01:00 PM - 03:00 PM'
    },
    capricorn: {
        name: 'Capricorn',
        symbol: '♑',
        rulingPlanet: 'Saturn',
        element: 'Earth',
        overview: 'Saturn\'s disciplined energy reinforces your already strong work ethic. Today rewards persistence and long-term planning. A career milestone may be closer than you think.',
        love: 'Stability and loyalty define your romantic interactions. Express appreciation for your partner\'s quiet consistency.',
        career: 'Professional goals come into sharper focus. Map out your next quarter targets — the cosmic alignment supports strategic planning.',
        health: 'Joint and bone health benefits from weight-bearing exercise. A structured fitness routine yields compounding benefits.',
        finance: 'Retirement planning or long-term savings strategies look particularly favourable. Think in decades, not days.',
        romanceIndex: 60,
        careerDrive: 95,
        financialInstinct: 90,
        mentalClarity: 80,
        luckyNumbers: '8, 16, 26',
        luckyColour: 'Charcoal Grey',
        harmoniousSigns: 'Taurus, Virgo',
        challengingSign: 'Aries',
        auspiciousHours: '08:00 AM - 10:00 AM'
    },
    aquarius: {
        name: 'Aquarius',
        symbol: '♒',
        rulingPlanet: 'Uranus',
        element: 'Air',
        overview: 'Uranus sparks innovation and unconventional thinking. Today favours brainstorming, technology projects, and humanitarian causes. Your unique perspective becomes your greatest asset.',
        love: 'Intellectual compatibility matters more than ever. Connect with someone who challenges your thinking and shares your vision for the future.',
        career: 'Tech-forward projects gain momentum. Propose that innovative solution you\'ve been developing — the timing is perfect.',
        health: 'Ankle and circulation areas need attention. Alternate between sitting and standing, and incorporate cardiovascular exercise.',
        finance: 'Cryptocurrency or emerging technology investments merit research. Consult experts before committing significant capital.',
        romanceIndex: 72,
        careerDrive: 88,
        financialInstinct: 65,
        mentalClarity: 95,
        luckyNumbers: '4, 11, 22',
        luckyColour: 'Electric Blue',
        harmoniousSigns: 'Gemini, Libra',
        challengingSign: 'Scorpio',
        auspiciousHours: '05:00 PM - 07:00 PM'
    },
    pisces: {
        name: 'Pisces',
        symbol: '♓',
        rulingPlanet: 'Neptune',
        element: 'Water',
        overview: 'Neptune deepens your already powerful intuition. Creative and spiritual pursuits are favoured. Dreams carry important messages today — keep a journal by your bedside.',
        love: 'Romantic idealism is beautiful but stay grounded. See your partner (or potential partner) as they truly are, not as you wish them to be.',
        career: 'Creative and artistic endeavours flourish. Music, writing, healing arts, or any water-related field brings professional satisfaction.',
        health: 'Sleep quality matters enormously. Create a calming bedtime routine and limit screen time before rest.',
        finance: 'Generosity is your nature, but set boundaries on lending money. Protect your financial energy as carefully as your emotional one.',
        romanceIndex: 90,
        careerDrive: 60,
        financialInstinct: 55,
        mentalClarity: 72,
        luckyNumbers: '7, 16, 25',
        luckyColour: 'Seafoam Green',
        harmoniousSigns: 'Cancer, Scorpio',
        challengingSign: 'Virgo',
        auspiciousHours: '09:00 PM - 11:00 PM'
    }
};

var currentSelectedSign = 'aries';

function initializeHoroscopePage() {
    var zodiacCards = document.querySelectorAll('.zodiac-card');
    var timelineTabs = document.querySelectorAll('.time-tab');

    if (zodiacCards.length === 0) return;

    // Zodiac cards already call selectZodiac() through their HTML onclick attribute.
    // Keeping one handler prevents the reading from being loaded twice per click.

    // Attach click handlers to timeline tabs
    timelineTabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
            timelineTabs.forEach(function (t) { t.classList.remove('active-today'); });
            tab.classList.add('active-today');
            showNotification('Showing ' + tab.textContent.trim() + ' horoscope readings.', 'info');
        });
    });

    // Load default sign
    selectZodiac(currentSelectedSign);
}

/**
 * Select a zodiac sign and update the horoscope display.
 * @param {string} signName - Zodiac sign key (e.g. 'aries', 'taurus')
 */
function selectZodiac(signName) {
    var signData = zodiacHoroscopeData[signName];
    if (!signData) return;

    currentSelectedSign = signName;

    // Update active card styling
    var allZodiacCards = document.querySelectorAll('.zodiac-card');
    allZodiacCards.forEach(function (card) {
        card.classList.remove('active-sign');
        var label = card.querySelector('.zodiac-name');
        if (label && label.textContent.trim().toLowerCase() === signName) {
            card.classList.add('active-sign');
        }
    });

    // Update reading header
    var readingTitle = document.querySelector('.reading-meta h2');
    if (readingTitle) {
        readingTitle.innerHTML = signData.name + ' Daily Overview <span class="badge-live">Live Reading</span>';
    }

    var transitInfo = document.querySelector('.current-transit-info');
    if (transitInfo) {
        transitInfo.innerHTML =
            'Ruling Planet: <strong>' + signData.rulingPlanet + '</strong> | Element: <strong>' + signData.element + '</strong>';
    }

    // Update overview
    var overviewText = document.querySelector('.summary-card p');
    if (overviewText) overviewText.textContent = signData.overview;

    // Update aspect readings (Love, Career, Health, Finance)
    var aspectBoxes = document.querySelectorAll('.aspect-box');
    var aspectKeys = ['love', 'career', 'health', 'finance'];
    aspectBoxes.forEach(function (box, index) {
        if (aspectKeys[index]) {
            var paragraph = box.querySelector('p');
            if (paragraph) paragraph.textContent = signData[aspectKeys[index]];
        }
    });

    // Update sidebar meters
    updateMeterBar('Romance Index', signData.romanceIndex, '.color-love');
    updateMeterBar('Career Drive', signData.careerDrive, '.color-career');
    updateMeterBar('Financial Instinct', signData.financialInstinct, '.color-wealth');
    updateMeterBar('Mental Clarity', signData.mentalClarity, '.color-health');

    // Update lucky anchors
    updateAnchorList(signData);

    showNotification('Loaded ' + signData.name + ' horoscope reading.', 'success');
}

function updateMeterBar(labelText, percentage, colorClass) {
    var meterGroups = document.querySelectorAll('.meter-group');
    meterGroups.forEach(function (group) {
        var labelSpan = group.querySelector('.meter-lbl-row span');
        if (labelSpan && labelSpan.textContent.trim() === labelText) {
            var percentageStrong = group.querySelector('.meter-lbl-row strong');
            if (percentageStrong) percentageStrong.textContent = percentage + '%';
            var fillBar = group.querySelector('.meter-fill');
            if (fillBar) fillBar.style.width = percentage + '%';
        }
    });
}

function updateAnchorList(signData) {
    var anchorItems = document.querySelectorAll('.anchor-data-list li');
    var anchorData = [
        { label: 'Lucky Numbers', value: signData.luckyNumbers },
        { label: 'Lucky Colour', value: signData.luckyColour },
        { label: 'Ideal Sign Harmony', value: signData.harmoniousSigns },
        { label: 'Challenging Sign', value: signData.challengingSign },
        { label: 'Auspicious Hours', value: signData.auspiciousHours }
    ];

    anchorItems.forEach(function (item, index) {
        if (anchorData[index]) {
            var valueElement = item.querySelector('strong');
            if (valueElement) {
                if (anchorData[index].label === 'Lucky Colour') {
                    valueElement.innerHTML =
                        '<span class="color-swatch-txt"><span class="swatch crimson-bg"></span>' + anchorData[index].value + '</span>';
                } else {
                    valueElement.textContent = anchorData[index].value;
                }
            }
        }
    });
}


/* =================================================================
   SECTION 7 — AI CHAT ASSISTANT (index.html)
   ================================================================= */

/** Pre-defined responses for the AI chat assistant */
var aiChatResponses = {
    kundali: '🔮 To generate your Free Kundali, navigate to the Free Kundali page and enter your birth details — date, time, and place of birth. Our Vedic engine will calculate your complete birth chart including Lagna, Navamsha, and Vimshottari Dasha positions.',
    horoscope: '🌟 Visit the Horoscope page to read your daily, weekly, or monthly cosmic predictions. Simply select your zodiac sign from the grid and explore readings for love, career, health, and finances.',
    compatibility: '💕 Use our Love Compatibility tool to check your relationship dynamics with any partner. Enter both your zodiac signs and we will analyse emotional, physical, and intellectual compatibility across the four elements.',
    numerology: '🔢 Our Name Numerology Calculator reveals your Expression Number, Soul Urge, and Personality Profile based on the Pythagorean or Chaldean system. You can also discover your Mulank (Root Number) using the Mulank Calculator.',
    default: '✨ I can help you with Kundali generation, horoscope readings, compatibility analysis, numerology calculations, and Panchang details. Feel free to ask about any of these topics!'
};

function initializeAIChat() {
    var chatInput = document.getElementById('chatInput');
    var sendButton = document.getElementById('sendBtn');
    var chatMessages = document.getElementById('chatMessages');
    var suggestionButtons = document.querySelectorAll('.chat-suggestions button');

    if (!chatInput || !sendButton || !chatMessages) return;

    // Handle send button click
    sendButton.addEventListener('click', function () {
        processUserMessage(chatInput.value);
    });

    // Handle Enter key in input
    chatInput.addEventListener('keypress', function (event) {
        if (event.key === 'Enter') {
            processUserMessage(chatInput.value);
        }
    });

    // Handle suggestion button clicks
    suggestionButtons.forEach(function (button) {
        button.addEventListener('click', function () {
            processUserMessage(button.textContent.trim());
        });
    });

    function processUserMessage(messageText) {
        messageText = messageText.trim();
        if (!messageText) return;

        // Append user message to chat
        var userMessageDiv = document.createElement('div');
        userMessageDiv.className = 'chat-message user-message';
        userMessageDiv.style.cssText =
            'background-color:#e8f4fd;color:#1a365d;border-top-right-radius:0;margin-left:auto;text-align:right;max-width:75%;padding:14px 16px;border-radius:12px;margin-bottom:18px;line-height:1.5;';
        userMessageDiv.innerHTML = '<span class="message-label" style="color:#2563eb;">You</span><p>' + escapeHTML(messageText) + '</p>';
        chatMessages.appendChild(userMessageDiv);

        // Clear input
        chatInput.value = '';

        // Remove suggestion buttons after first interaction
        var suggestionsContainer = chatMessages.querySelector('.chat-suggestions');
        if (suggestionsContainer) suggestionsContainer.remove();

        // Generate AI response after a brief delay
        setTimeout(function () {
            var responseText = generateAIResponse(messageText);

            var aiMessageDiv = document.createElement('div');
            aiMessageDiv.className = 'chat-message ai-message';
            aiMessageDiv.innerHTML = '<span class="message-label">AI</span><p>' + responseText + '</p>';
            chatMessages.appendChild(aiMessageDiv);

            // Scroll to bottom
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 800);
    }

    function generateAIResponse(userMessage) {
        var lowerMessage = userMessage.toLowerCase();

        if (lowerMessage.includes('kundali') || lowerMessage.includes('birth chart') || lowerMessage.includes('kundli')) {
            return aiChatResponses.kundali;
        } else if (lowerMessage.includes('horoscope') || lowerMessage.includes('daily') || lowerMessage.includes('zodiac') || lowerMessage.includes('sign')) {
            return aiChatResponses.horoscope;
        } else if (lowerMessage.includes('compatib') || lowerMessage.includes('love') || lowerMessage.includes('relationship') || lowerMessage.includes('partner')) {
            return aiChatResponses.compatibility;
        } else if (lowerMessage.includes('numerolog') || lowerMessage.includes('number') || lowerMessage.includes('mulank') || lowerMessage.includes('name')) {
            return aiChatResponses.numerology;
        } else if (lowerMessage.includes('panchang') || lowerMessage.includes('muhurat') || lowerMessage.includes('tithi')) {
            return '🕉️ The Panchang page provides today\'s Vedic calendar data including Tithi, Nakshatra, Yoga, Karana, and auspicious Muhurata timings. Enter your location for personalised calculations.';
        } else if (lowerMessage.includes('astrologer') || lowerMessage.includes('consult') || lowerMessage.includes('talk')) {
            return '🧑‍🏫 Visit our Astrologers page to browse verified Vedic experts. You can start a chat or call session directly. Online astrologers are available for instant consultations.';
        } else {
            return aiChatResponses.default;
        }
    }
}

function escapeHTML(textString) {
    var temporaryElement = document.createElement('div');
    temporaryElement.appendChild(document.createTextNode(textString));
    return temporaryElement.innerHTML;
}

// Date inputs use YYYY-MM-DD. Building the date from numbers prevents a
// timezone from changing the day when the browser reads the input value.
function parseDateInput(dateValue) {
    var parts = dateValue.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
}


/* =================================================================
   SECTION 8 — FREE KUNDALI GENERATOR (free-kundali.html)
   ================================================================= */

/** Nakshatra data for birth chart calculations */
var nakshatraNames = [
    'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
    'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
    'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
    'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
    'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
];

/** Rashi (zodiac sign in Vedic astrology) names */
var rashiNames = [
    'Mesha (Aries)', 'Vrishabha (Taurus)', 'Mithuna (Gemini)', 'Karka (Cancer)',
    'Simha (Leo)', 'Kanya (Virgo)', 'Tula (Libra)', 'Vrischika (Scorpio)',
    'Dhanu (Sagittarius)', 'Makara (Capricorn)', 'Kumbha (Aquarius)', 'Meena (Pisces)'
];

var dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function initializeFreeKundali() {
    var kundaliForm = document.querySelector('.kundali-gen-form');
    if (!kundaliForm) return;

   // In frontend/script.js inside initializeFreeKundali()
kundaliForm.addEventListener('submit', async function (event) {
    event.preventDefault();
  
    const fullName = document.getElementById('user_name').value.trim();
    const dateOfBirth = document.getElementById('user_dob').value;
    const timeOfBirth = document.getElementById('user_tob').value;
  
    if (!fullName || !dateOfBirth || !timeOfBirth) {
      showNotification('Please fill in all required fields.', 'error');
      return;
    }
  
    // Coordinates for birth place (Can be static or expanded via Geocoding API)
    const payload = {
      name: fullName,
      dob: dateOfBirth,      // YYYY-MM-DD
      tob: timeOfBirth,      // HH:MM
      latitude: 19.0760,     // Default to Mumbai or user input
      longitude: 72.8777,
      timezoneOffset: 5.5
    };
  
    try {
      showNotification('Computing Swiss Ephemeris chart...', 'info');
  
      // Send payload to Express backend API
      const response = await apiFetch('/calculations/kundali', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
  
      if (response.success) {
        renderKundaliResults(response.data, fullName);
        showNotification(`Chart calculated with C-Engine precision for ${fullName}!`, 'success');
      }
    } catch (error) {
      showNotification(error.message, 'error');
    }
  });
}


/* =================================================================
   SECTION 9 — KUNDALI MATCHING (kundali-matching.html)
   ================================================================= */

/** Ashtakoota Milan parameters with max points */
var ashtakootaParameters = [
    { name: 'Varna', maxPoints: 1, description: 'Spiritual compatibility' },
    { name: 'Vashya', maxPoints: 2, description: 'Mutual attraction' },
    { name: 'Tara', maxPoints: 3, description: 'Health & well-being' },
    { name: 'Yoni', maxPoints: 4, description: 'Physical compatibility' },
    { name: 'Grah Maitri', maxPoints: 5, description: 'Mental harmony' },
    { name: 'Gana', maxPoints: 6, description: 'Temperament alignment' },
    { name: 'Bhakoot', maxPoints: 7, description: 'Emotional connection' },
    { name: 'Nadi', maxPoints: 8, description: 'Genetic compatibility' }
];

function initializeKundaliMatching() {
    var matchingForm = document.querySelector('.matching-form');
    if (!matchingForm) return;

    matchingForm.addEventListener('submit', function (event) {
        event.preventDefault();

        var groomName = document.getElementById('p1_name').value.trim();
        var groomDOB = document.getElementById('p1_dob').value;
        var groomTOB = document.getElementById('p1_tob').value;
        var groomPOB = document.getElementById('p1_pob').value.trim();

        var brideName = document.getElementById('p2_name').value.trim();
        var brideDOB = document.getElementById('p2_dob').value;
        var brideTOB = document.getElementById('p2_tob').value;
        var bridePOB = document.getElementById('p2_pob').value.trim();

        if (!groomName || !groomDOB || !groomTOB || !groomPOB || !brideName || !brideDOB || !brideTOB || !bridePOB) {
            showNotification('Please fill in all required fields for both partners.', 'error');
            return;
        }

        // Parse birth dates for scoring
        var groomDate = parseDateInput(groomDOB);
        var brideDate = parseDateInput(brideDOB);

        // Calculate Ashtakoota scores based on birth date characteristics
        var scores = calculateAshtakootaScores(groomDate, brideDate);
        var totalScore = scores.reduce(function (sum, s) { return sum + s.earned; }, 0);
        var maxPossible = 36;

        // Determine compatibility verdict
        var verdictText, verdictColor;
        if (totalScore >= 25) {
            verdictText = '🌟 Highly Recommended Match! Exceptional harmony and cosmic alignment.';
            verdictColor = '#16a34a';
        } else if (totalScore >= 18) {
            verdictText = '✅ Acceptable Match. Stable compatibility with minor areas for growth.';
            verdictColor = '#2563eb';
        } else {
            verdictText = '⚠️ Below Threshold. Traditional remedies should be considered before proceeding.';
            verdictColor = '#ea580c';
        }

        // Build result HTML
        var resultHTML =
            '<div style="margin-top:30px;padding:30px;background:#ffffff;border:2px solid #d35400;border-radius:12px;">' +
            '<h2 style="color:#d35400;text-align:center;margin-bottom:25px;">🪐 Kundali Matching Result</h2>' +
            '<div style="text-align:center;margin-bottom:25px;">' +
            '<div style="display:inline-block;padding:20px 40px;background:linear-gradient(135deg,#fff4e6,#fff);border-radius:50%;border:4px solid ' + verdictColor + ';">' +
            '<div style="font-size:2.5rem;font-weight:bold;color:' + verdictColor + ';">' + totalScore + '/' + maxPossible + '</div>' +
            '<div style="font-size:0.9rem;color:#666;">Ashtakoota Score</div>' +
            '</div>' +
            '</div>' +
            '<p style="text-align:center;font-weight:600;color:' + verdictColor + ';font-size:1.1rem;margin-bottom:20px;">' + verdictText + '</p>' +

            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">';

        scores.forEach(function (scoreItem) {
            var percentage = (scoreItem.earned / scoreItem.maxPoints) * 100;
            var barColor = percentage >= 70 ? '#16a34a' : percentage >= 40 ? '#e67e22' : '#ea580c';
            resultHTML +=
                '<div style="padding:12px;background:#fafafa;border-radius:8px;">' +
                '<div style="display:flex;justify-content:space-between;margin-bottom:6px;">' +
                '<strong style="color:#333;">' + scoreItem.name + '</strong>' +
                '<span style="color:#666;">' + scoreItem.earned + '/' + scoreItem.maxPoints + '</span>' +
                '</div>' +
                '<div style="background:#e2e8f0;height:8px;border-radius:4px;">' +
                '<div style="background:' + barColor + ';height:100%;width:' + percentage + '%;border-radius:4px;"></div>' +
                '</div>' +
                '<small style="color:#94a3b8;">' + scoreItem.description + '</small>' +
                '</div>';
        });

        resultHTML += '</div></div>';

        var existingResult = matchingForm.parentElement.querySelector('.matching-result-container');
        if (existingResult) existingResult.remove();

        var resultContainer = document.createElement('div');
        resultContainer.className = 'matching-result-container';
        resultContainer.innerHTML = resultHTML;
        matchingForm.parentElement.appendChild(resultContainer);
        saveCalculation('matching', { groomName: groomName, groomDOB: groomDOB, brideName: brideName, brideDOB: brideDOB }, { totalScore: totalScore, maxScore: maxPossible, scores: scores });

        showNotification('Matching complete! Total score: ' + totalScore + '/36', 'success');
        resultContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
}

function calculateAshtakootaScores(groomDate, brideDate) {
    var groomDay = groomDate.getDate();
    var brideDay = brideDate.getDate();
    var groomMonth = groomDate.getMonth();
    var brideMonth = brideDate.getMonth();
    var yearDiff = Math.abs(groomDate.getFullYear() - brideDate.getFullYear());

    return [
        { name: 'Varna', maxPoints: 1, earned: (groomMonth + brideMonth) % 3 === 0 ? 1 : 0 },
        { name: 'Vashya', maxPoints: 2, earned: Math.abs(groomDay - brideDay) % 5 === 0 ? 2 : Math.abs(groomDay - brideDay) % 3 === 0 ? 1 : 0 },
        { name: 'Tara', maxPoints: 3, earned: (groomDay + brideDay) % 9 < 3 ? 3 : (groomDay + brideDay) % 9 < 6 ? 2 : (groomDay + brideDay) % 9 < 8 ? 1 : 0 },
        { name: 'Yoni', maxPoints: 4, earned: Math.abs(groomDay - brideDay) % 7 < 2 ? 4 : Math.abs(groomDay - brideDay) % 4 === 0 ? 3 : Math.abs(groomMonth - brideMonth) % 3 === 0 ? 2 : 1 },
        { name: 'Grah Maitri', maxPoints: 5, earned: (groomMonth * brideMonth) % 7 < 2 ? 5 : (groomMonth + brideMonth) % 5 < 2 ? 4 : (groomDay * brideDay) % 6 < 3 ? 3 : 2 },
        { name: 'Gana', maxPoints: 6, earned: yearDiff % 3 === 0 ? 6 : yearDiff % 2 === 0 ? 4 : (groomDay + brideDay) % 4 === 0 ? 3 : 2 },
        { name: 'Bhakoot', maxPoints: 7, earned: (groomMonth + brideMonth) % 4 === 0 ? 7 : (groomDay + brideDay) % 5 < 2 ? 5 : Math.abs(groomDay - brideDay) % 6 < 3 ? 3 : 1 },
        { name: 'Nadi', maxPoints: 8, earned: (groomMonth + brideMonth + groomDay + brideDay) % 3 === 0 ? 8 : (groomDay + brideDay) % 5 < 3 ? 6 : (groomMonth + brideMonth) % 3 === 0 ? 4 : 2 }
    ];
}


/* =================================================================
   SECTION 10 — COMPATIBILITY CALCULATOR (compatibility.html)
   ================================================================= */

/** Zodiac element mappings and compatibility matrix */
var zodiacElementMap = {
    aries: 'Fire', taurus: 'Earth', gemini: 'Air', cancer: 'Water',
    leo: 'Fire', virgo: 'Earth', libra: 'Air', scorpio: 'Water',
    sagittarius: 'Fire', capricorn: 'Earth', aquarius: 'Air', pisces: 'Water'
};

var zodiacCompatibilityMatrix = {
    'Fire-Fire': { score: 85, label: 'Explosive Passion' },
    'Fire-Earth': { score: 55, label: 'Grounding Challenge' },
    'Fire-Air': { score: 90, label: 'Mutually Fueling' },
    'Fire-Water': { score: 45, label: 'Steam & Tension' },
    'Earth-Earth': { score: 80, label: 'Rock Solid Bond' },
    'Earth-Air': { score: 50, label: 'Different Languages' },
    'Earth-Water': { score: 88, label: 'Nurturing Growth' },
    'Air-Air': { score: 82, label: 'Intellectual Spark' },
    'Air-Water': { score: 40, label: 'Head vs Heart' },
    'Water-Water': { score: 92, label: 'Deep Soul Fusion' }
};

// Returns the same key for Fire/Air and Air/Fire.
function getElementPairKey(firstElement, secondElement) {
    var elementOrder = ['Fire', 'Earth', 'Air', 'Water'];
    return elementOrder.indexOf(firstElement) <= elementOrder.indexOf(secondElement)
        ? firstElement + '-' + secondElement
        : secondElement + '-' + firstElement;
}

function initializeCompatibility() {
    var compatForm = document.querySelector('.compatibility-form');
    if (!compatForm) return;

    compatForm.addEventListener('submit', function (event) {
        event.preventDefault();

        var userName = document.getElementById('user_name').value.trim();
        var userSign = document.getElementById('user_sign').value;
        var userGender = document.getElementById('user_gender').value;

        var partnerName = document.getElementById('partner_name').value.trim();
        var partnerSign = document.getElementById('partner_sign').value;
        var partnerGender = document.getElementById('partner_gender').value;

        if (!userName || !userSign || !partnerName || !partnerSign) {
            showNotification('Please fill in all required fields for both partners.', 'error');
            return;
        }

        userName = escapeHTML(userName);
        partnerName = escapeHTML(partnerName);

        var userElement = zodiacElementMap[userSign];
        var partnerElement = zodiacElementMap[partnerSign];
        var elementPair = getElementPairKey(userElement, partnerElement);
        var compatibilityResult = zodiacCompatibilityMatrix[elementPair] || { score: 60, label: 'Moderate Connection' };

        // Determine romantic verdict
        var romanticVerdict;
        if (compatibilityResult.score >= 85) {
            romanticVerdict = '💝 A cosmic soul match! Your signs share a profound natural harmony that deepens with time.';
        } else if (compatibilityResult.score >= 70) {
            romanticVerdict = '💖 Strong potential! With mutual respect and understanding, this bond grows into something beautiful.';
        } else if (compatibilityResult.score >= 50) {
            romanticVerdict = '💗 A dynamic pairing. Your differences create tension but also powerful growth opportunities.';
        } else {
            romanticVerdict = '💔 Challenging but not impossible. Opposites can attract, but this relationship requires conscious effort from both sides.';
        }

        var resultHTML =
            '<div style="margin-top:30px;padding:30px;background:#ffffff;border:2px solid #9b59b6;border-radius:12px;">' +
            '<h2 style="color:#9b59b6;text-align:center;margin-bottom:20px;">💕 Compatibility Result</h2>' +
            '<div style="text-align:center;margin-bottom:25px;">' +
            '<div style="display:inline-block;padding:20px 40px;background:linear-gradient(135deg,#f5e6ff,#fff);border-radius:50%;border:4px solid #9b59b6;">' +
            '<div style="font-size:2.5rem;font-weight:bold;color:#9b59b6;">' + compatibilityResult.score + '%</div>' +
            '<div style="font-size:0.9rem;color:#666;">Compatibility Score</div>' +
            '</div>' +
            '</div>' +
            '<p style="text-align:center;font-size:1.1rem;font-weight:600;color:#7b2d8e;margin-bottom:15px;">' + compatibilityResult.label + '</p>' +
            '<p style="text-align:center;color:#555;line-height:1.7;margin-bottom:20px;">' + romanticVerdict + '</p>' +

            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">' +
            '<div style="padding:15px;background:#f8f0fc;border-radius:8px;text-align:center;">' +
            '<h4 style="color:#9b59b6;">' + userName + '</h4>' +
            '<p><strong>Element:</strong> ' + userElement + '</p>' +
            '<p><strong>Sign:</strong> ' + userSign.charAt(0).toUpperCase() + userSign.slice(1) + '</p>' +
            '</div>' +
            '<div style="padding:15px;background:#fce4f0;border-radius:8px;text-align:center;">' +
            '<h4 style="color:#ec407a;">' + partnerName + '</h4>' +
            '<p><strong>Element:</strong> ' + partnerElement + '</p>' +
            '<p><strong>Sign:</strong> ' + partnerSign.charAt(0).toUpperCase() + partnerSign.slice(1) + '</p>' +
            '</div>' +
            '</div>' +
            '</div>';

        var existingResult = compatForm.parentElement.querySelector('.compat-result-container');
        if (existingResult) existingResult.remove();

        var resultContainer = document.createElement('div');
        resultContainer.className = 'compat-result-container';
        resultContainer.innerHTML = resultHTML;
        compatForm.parentElement.appendChild(resultContainer);
        saveCalculation('compatibility', { userName: userName, userSign: userSign, partnerName: partnerName, partnerSign: partnerSign }, compatibilityResult);

        showNotification('Compatibility calculated! Score: ' + compatibilityResult.score + '%', 'success');
        resultContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
}


/* =================================================================
   SECTION 11 — FRIENDSHIP CALCULATOR (friendship-calculator.html)
   ================================================================= */

function initializeFriendshipCalculator() {
    var friendForm = document.getElementById('friendForm');
    if (!friendForm) return;

    friendForm.addEventListener('submit', function (event) {
        event.preventDefault();

        var yourName = document.getElementById('your_name').value.trim();
        var friendName = document.getElementById('friend_name').value.trim();
        var friendshipType = document.getElementById('friendship_type').value;

        if (!yourName || !friendName) {
            showNotification('Please enter both names to calculate your friendship score.', 'error');
            return;
        }

        var safeYourName = escapeHTML(yourName);
        var safeFriendName = escapeHTML(friendName);

        // Calculate friendship score based on name character patterns
        var combinedNameString = (yourName + friendName).toLowerCase();
        var characterSum = 0;
        for (var i = 0; i < combinedNameString.length; i++) {
            characterSum += combinedNameString.charCodeAt(i);
        }

        var baseFriendshipScore = (characterSum % 31) + 70; // Range: 70-100

        // Adjust score based on friendship type
        var typeBonus = 0;
        var typeLabel = '';
        switch (friendshipType) {
            case 'besties':
                typeBonus = 5;
                typeLabel = 'Best Friends Forever (BFF)';
                break;
            case 'childhood':
                typeBonus = 4;
                typeLabel = 'Childhood Buddies';
                break;
            case 'college':
                typeBonus = 3;
                typeLabel = 'School/College Crew';
                break;
            case 'workplace':
                typeBonus = 2;
                typeLabel = 'Work Colleagues';
                break;
            case 'new':
                typeBonus = 0;
                typeLabel = 'New Acquaintance';
                break;
            default:
                typeLabel = 'Friends';
        }

        var finalScore = Math.min(baseFriendshipScore + typeBonus, 100);

        // Determine friendship tier
        var tierLabel, tierEmoji, tierColor;
        if (finalScore >= 95) {
            tierEmoji = '👑'; tierLabel = 'Soul Bonded Twins'; tierColor = '#d4ac0d';
        } else if (finalScore >= 90) {
            tierEmoji = '🌟'; tierLabel = 'Best Friends Forever'; tierColor = '#16a34a';
        } else if (finalScore >= 80) {
            tierEmoji = '🤝'; tierLabel = 'Inseparable Duo'; tierColor = '#2563eb';
        } else if (finalScore >= 70) {
            tierEmoji = '😊'; tierLabel = 'Solid Bond'; tierColor = '#2980b9';
        } else {
            tierEmoji = '💫'; tierLabel = 'Growing Connection'; tierColor = '#8e44ad';
        }

        // Breakdown scores
        var trustFactor = Math.min(Math.floor(finalScore * 0.95 + (characterSum % 5)), 100);
        var funChaos = Math.min(Math.floor(finalScore * 0.90 + (characterSum % 8)), 100);
        var loyaltyQuotient = Math.min(Math.floor(finalScore * 0.98 + (characterSum % 3)), 100);

        var resultHTML =
            '<div style="margin-top:30px;padding:30px;background:#ffffff;border:2px solid #2980b9;border-radius:12px;">' +
            '<h2 style="color:#2980b9;text-align:center;margin-bottom:20px;">🤝 Friendship Score</h2>' +
            '<div style="text-align:center;margin-bottom:20px;">' +
            '<div style="display:inline-block;padding:20px 40px;background:linear-gradient(135deg,#e8f4fd,#fff);border-radius:50%;border:4px solid ' + tierColor + ';">' +
            '<div style="font-size:2.5rem;">' + tierEmoji + '</div>' +
            '<div style="font-size:2.5rem;font-weight:bold;color:' + tierColor + ';">' + finalScore + '%</div>' +
            '<div style="font-size:0.9rem;color:#666;">Friendship Score</div>' +
            '</div>' +
            '</div>' +
            '<p style="text-align:center;font-weight:600;color:' + tierColor + ';font-size:1.1rem;margin-bottom:20px;">' + tierLabel + '</p>' +
            '<p style="text-align:center;color:#666;margin-bottom:20px;">' + safeYourName + ' & ' + safeFriendName + ' — ' + typeLabel + '</p>' +

            '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:15px;">' +
            buildFriendshipMeter('Trust Factor', trustFactor, '#2980b9') +
            buildFriendshipMeter('Fun & Chaos', funChaos, '#27ae60') +
            buildFriendshipMeter('Loyalty', loyaltyQuotient, '#8e44ad') +
            '</div>' +
            '</div>';

        var existingResult = friendForm.parentElement.querySelector('.friend-result-container');
        if (existingResult) existingResult.remove();

        var resultContainer = document.createElement('div');
        resultContainer.className = 'friend-result-container';
        resultContainer.innerHTML = resultHTML;
        friendForm.parentElement.appendChild(resultContainer);
        saveCalculation('friendship', { yourName: yourName, friendName: friendName, friendshipType: friendshipType }, { score: finalScore, tier: tierLabel });

        showNotification('Friendship score calculated! You scored ' + finalScore + '%!', 'success');
        resultContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
}

function buildFriendshipMeter(label, score, color) {
    return (
        '<div style="padding:15px;background:#f8fafc;border-radius:8px;text-align:center;">' +
        '<strong style="color:' + color + ';">' + label + '</strong>' +
        '<div style="font-size:1.8rem;font-weight:bold;color:' + color + ';margin:8px 0;">' + score + '%</div>' +
        '<div style="background:#e2e8f0;height:8px;border-radius:4px;">' +
        '<div style="background:' + color + ';height:100%;width:' + score + '%;border-radius:4px;"></div>' +
        '</div>' +
        '</div>'
    );
}


/* =================================================================
   SECTION 12 — MULANK CALCULATOR (mulank-calculator.html)
   ================================================================= */

/** Planet-to-Mulank mapping in Vedic Numerology */
var mulankPlanetMapping = {
    1: { planet: 'Sun', title: 'The Leader', traits: 'Confident, ambitious, independent, and natural-born authority. You radiate warmth and inspire others with your courage.' },
    2: { planet: 'Moon', title: 'The Creative', traits: 'Imaginative, sensitive, diplomatic, and deeply intuitive. You possess a rich inner world and strong emotional intelligence.' },
    3: { planet: 'Jupiter', title: 'The Guru', traits: 'Wise, optimistic, generous, and spiritually inclined. You are a natural teacher who uplifts those around you.' },
    4: { planet: 'Rahu', title: 'The Rebel', traits: 'Innovative, unconventional, restless, and progressive. You challenge the status quo and forge new paths.' },
    5: { planet: 'Mercury', title: 'The Trader', traits: 'Versatile, communicative, analytical, and quick-witted. You thrive in social settings and business negotiations.' },
    6: { planet: 'Venus', title: 'The Artist', traits: 'Harmonious, charming, creative, and pleasure-seeking. You bring beauty and balance to everything you touch.' },
    7: { planet: 'Ketu', title: 'The Mystic', traits: 'Introspective, philosophical, spiritual, and deeply perceptive. You seek truth beyond the material world.' },
    8: { planet: 'Saturn', title: 'The Judge', traits: 'Disciplined, patient, karmic, and results-driven. You understand that great achievements require sustained effort.' },
    9: { planet: 'Mars', title: 'The Warrior', traits: 'Courageous, passionate, energetic, and protective. You fight for正义正义正义 and never back down from a challenge.' }
};

function initializeMulankCalculator() {
    var mulankForm = document.getElementById('mulankForm');
    if (!mulankForm) return;

    mulankForm.addEventListener('submit', function (event) {
        event.preventDefault();

        var userName = document.getElementById('user_name').value.trim();
        var birthDateValue = document.getElementById('birth_date').value;
        var showPlanetaryDetails = document.getElementById('ruling_planet_display').value;

        if (!birthDateValue) {
            showNotification('Please enter your date of birth.', 'error');
            return;
        }

        // Parse birth date and extract day
        var birthDateObj = parseDateInput(birthDateValue);
        var birthDay = birthDateObj.getDate();

        // Calculate Mulank: sum digits of birth day
        var mulankNumber = reduceToSingleDigit(birthDay, true);
        var planetInfo = mulankPlanetMapping[mulankNumber];

        var displayLabel = userName ? escapeHTML(userName) + '\'s' : 'Your';

        var resultHTML =
            '<div style="margin-top:30px;padding:30px;background:#ffffff;border:2px solid #d4ac0d;border-radius:12px;">' +
            '<h2 style="color:#b7950b;text-align:center;margin-bottom:20px;">🔮 ' + displayLabel + ' Mulank Result</h2>' +
            '<div style="text-align:center;margin-bottom:25px;">' +
            '<div style="display:inline-block;padding:20px 40px;background:linear-gradient(135deg,#fef9e7,#fff);border-radius:50%;border:4px solid #d4ac0d;">' +
            '<div style="font-size:3rem;font-weight:bold;color:#b7950b;">' + mulankNumber + '</div>' +
            '<div style="font-size:0.9rem;color:#666;">Your Root Number</div>' +
            '</div>' +
            '</div>' +
            '<p style="text-align:center;color:#666;margin-bottom:15px;">Birth Day: ' + birthDay + ' → ' + birthDay.toString().split('').join(' + ') + ' = <strong>' + mulankNumber + '</strong></p>';

        if (showPlanetaryDetails === 'yes' && planetInfo) {
            resultHTML +=
                '<div style="padding:20px;background:#fef9e7;border-radius:8px;border-left:4px solid #d4ac0d;">' +
                '<h3 style="color:#b7950b;margin-bottom:8px;">' + planetInfo.planet + ' — ' + planetInfo.title + '</h3>' +
                '<p style="color:#555;line-height:1.6;">' + planetInfo.traits + '</p>' +
                '</div>';
        }

        resultHTML += '</div>';

        var existingResult = mulankForm.parentElement.querySelector('.mulank-result-container');
        if (existingResult) existingResult.remove();

        var resultContainer = document.createElement('div');
        resultContainer.className = 'mulank-result-container';
        resultContainer.innerHTML = resultHTML;
        mulankForm.parentElement.appendChild(resultContainer);
        saveCalculation('mulank', { name: userName, birthDate: birthDateValue }, { number: mulankNumber, planet: planetInfo && planetInfo.planet });

        showNotification('Mulank calculated! Your root number is ' + mulankNumber + '.', 'success');
        resultContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
}


/* =================================================================
   SECTION 13 — NAME NUMEROLOGY (name-numerology.html)
   ================================================================= */

/** Pythagorean numerology letter-to-number mapping */
var pythagoreanLetterValues = {
    a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9,
    j: 1, k: 2, l: 3, m: 4, n: 5, o: 6, p: 7, q: 8, r: 9,
    s: 1, t: 2, u: 3, v: 4, w: 5, x: 6, y: 7, z: 8
};

/** Chaldean numerology letter-to-number mapping (no 9 — considered sacred) */
var chaldeanLetterValues = {
    a: 1, b: 2, c: 3, d: 4, e: 5, f: 8, g: 3, h: 8, i: 1,
    j: 1, k: 2, l: 3, m: 4, n: 5, o: 7, p: 8, q: 1, r: 2,
    s: 3, t: 4, u: 6, v: 6, w: 6, x: 5, y: 1, z: 7
};

/** Vowel letters for Soul Urge calculation */
var vowelCharacters = ['a', 'e', 'i', 'o', 'u'];

function initializeNameNumerology() {
    var numerologyForm = document.querySelector('.numerology-form');
    if (!numerologyForm) return;

    numerologyForm.addEventListener('submit', function (event) {
        event.preventDefault();

        var fullName = document.getElementById('user_full_name').value.trim();
        var currentDateOfBirth = document.getElementById('user_dob').value;
        var calculationSystem = document.getElementById('system_preference').value;

        if (!fullName || !currentDateOfBirth) {
            showNotification('Please enter your full name and date of birth.', 'error');
            return;
        }

        var letterValueMap = calculationSystem === 'chaldean' ? chaldeanLetterValues : pythagoreanLetterValues;
        var systemLabel = calculationSystem === 'chaldean' ? 'Chaldean (Ancient)' : 'Pythagorean (Modern)';

        // Calculate Expression / Destiny Number (sum of all letters)
        var expressionNumber = calculateNameSum(fullName, letterValueMap, true);

        // Calculate Soul Urge Number (sum of vowel letters only)
        var soulUrgeNumber = calculateVowelSum(fullName, letterValueMap, true);

        // Calculate Personality Number (sum of consonant letters only)
        var personalityNumber = calculateConsonantSum(fullName, letterValueMap, true);

        // Calculate Life Path Number (from date of birth)
        var birthDateObj = parseDateInput(currentDateOfBirth);
        var lifePathNumber = reduceToSingleDigit(
            birthDateObj.getFullYear() + (birthDateObj.getMonth() + 1) + birthDateObj.getDate(),
            true
        );

        var displayName = fullName.split(' ')[0];
        var safeDisplayName = escapeHTML(displayName);

        var resultHTML =
            '<div style="margin-top:30px;padding:30px;background:#ffffff;border:2px solid #16a085;border-radius:12px;">' +
            '<h2 style="color:#16a085;text-align:center;margin-bottom:5px;">🔢 ' + safeDisplayName + '\'s Numerology Profile</h2>' +
            '<p style="text-align:center;color:#666;margin-bottom:25px;">Calculation System: ' + systemLabel + '</p>' +

            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">' +

            buildNumerologyCard('Expression / Destiny', expressionNumber, 'Defines your core talents and cosmic life targets. This is the number the universe assigned you.', '#16a085') +
            buildNumerologyCard('Soul Urge / Heart\'s Desire', soulUrgeNumber, 'Uncovers your deepest cravings and authentic motivations — what truly drives you from within.', '#9b59b6') +
            buildNumerologyCard('Personality Profile', personalityNumber, 'Displays the exterior mask you showcase to society — first impressions and social energy.', '#2980b9') +
            buildNumerologyCard('Life Path Foundation', lifePathNumber, 'Your ultimate life roadmap and career trajectory — the journey your soul chose.', '#d35400') +

            '</div>' +

            '<div style="margin-top:20px;padding:15px;background:#fff9e6;border-radius:8px;border-left:4px solid #f1c40f;">' +
            '<h4 style="color:#b7950b;margin-bottom:6px;">⚠️ Master Numbers</h4>' +
            '<p style="font-size:0.85rem;color:#7d6608;">If any calculation yields <strong>11, 22, or 33</strong>, it is not reduced to a single digit. These are master numbers carrying deep spiritual significance and higher purpose.</p>' +
            '</div>' +
            '</div>';

        var existingResult = numerologyForm.parentElement.querySelector('.numerology-result-container');
        if (existingResult) existingResult.remove();

        var resultContainer = document.createElement('div');
        resultContainer.className = 'numerology-result-container';
        resultContainer.innerHTML = resultHTML;
        numerologyForm.parentElement.appendChild(resultContainer);
        saveCalculation('numerology', { fullName: fullName, dateOfBirth: currentDateOfBirth, system: calculationSystem }, { expressionNumber: expressionNumber, soulUrgeNumber: soulUrgeNumber, personalityNumber: personalityNumber, lifePathNumber: lifePathNumber });

        showNotification('Numerology profile calculated for ' + displayName + '!', 'success');
        resultContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
}

function calculateNameSum(fullName, letterValueMap, keepMaster) {
    var totalSum = 0;
    var cleanName = fullName.toLowerCase().replace(/[^a-z]/g, '');
    for (var i = 0; i < cleanName.length; i++) {
        totalSum += letterValueMap[cleanName[i]] || 0;
    }
    return reduceToSingleDigit(totalSum, keepMaster);
}

function calculateVowelSum(fullName, letterValueMap, keepMaster) {
    var totalSum = 0;
    var cleanName = fullName.toLowerCase().replace(/[^a-z]/g, '');
    for (var i = 0; i < cleanName.length; i++) {
        if (vowelCharacters.includes(cleanName[i])) {
            totalSum += letterValueMap[cleanName[i]] || 0;
        }
    }
    return reduceToSingleDigit(totalSum, keepMaster);
}

function calculateConsonantSum(fullName, letterValueMap, keepMaster) {
    var totalSum = 0;
    var cleanName = fullName.toLowerCase().replace(/[^a-z]/g, '');
    for (var i = 0; i < cleanName.length; i++) {
        if (!vowelCharacters.includes(cleanName[i])) {
            totalSum += letterValueMap[cleanName[i]] || 0;
        }
    }
    return reduceToSingleDigit(totalSum, keepMaster);
}

function buildNumerologyCard(title, number, description, color) {
    return (
        '<div style="padding:20px;background:#fafafa;border-radius:10px;border-top:4px solid ' + color + ';">' +
        '<h4 style="color:' + color + ';margin-bottom:8px;">' + title + '</h4>' +
        '<div style="font-size:2rem;font-weight:bold;color:' + color + ';margin-bottom:8px;">' + number + '</div>' +
        '<p style="font-size:0.85rem;color:#666;line-height:1.5;">' + description + '</p>' +
        '</div>'
    );
}


/* =================================================================
   SECTION 14 — PANCHANG (panchang.html)
   ================================================================= */

/** Choghadiya timing data for daytime */
var choghadiyaDayTimings = [
    { time: '06:00 AM - 07:30 AM', name: 'Amrit', quality: 'Auspicious', type: 'good' },
    { time: '07:30 AM - 09:00 AM', name: 'Kala', quality: 'Inauspicious', type: 'bad' },
    { time: '09:00 AM - 10:30 AM', name: 'Shubh', quality: 'Good Fortune', type: 'good' },
    { time: '10:30 AM - 12:00 PM', name: 'Char', quality: 'Neutral (Movement)', type: 'neutral' },
    { time: '12:00 PM - 01:30 PM', name: 'Labh', quality: 'Gain', type: 'good' },
    { time: '01:30 PM - 03:00 PM', name: 'Amrit', quality: 'Excellent', type: 'good' },
    { time: '03:00 PM - 04:30 PM', name: 'Kaal', quality: 'Inauspicious', type: 'bad' },
    { time: '04:30 PM - 06:00 PM', name: 'Shubh', quality: 'Good Fortune', type: 'good' }
];

var tithiNames = [
    'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
    'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
    'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima/Amavasya'
];

var nakshatraNamesPanchang = [
    'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
    'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni',
    'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha',
    'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha', 'Uttara Ashadha',
    'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada',
    'Uttara Bhadrapada', 'Revati'
];

// ============================================================
// SWISS EPHEMERIS DAILY PANCHANG FRONTEND HANDLER
// ============================================================

function initializePanchang() {
    const refreshButton = document.querySelector('.panchang-update-btn');
    const panchangForm = document.getElementById('panchang-form');
    if (!refreshButton && !panchangForm) return;
  
    const dateInput = document.getElementById('panchang_date');
    const locationInput = document.getElementById('panchang_location');
  
    // Set default date input to today if empty
    if (dateInput && !dateInput.value) {
      dateInput.value = new Date().toISOString().split('T')[0];
    }
  
    // Master fetch function connecting to Node.js backend
    async function fetchAndRenderPanchang() {
      const selectedDate = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];
      const selectedLocation = locationInput ? locationInput.value : 'Varanasi, India';
  
      // Dynamic backend URL handling (Local vs Production Render/Vercel)
      const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:5000/api'
      : 'https://astroverse-q5hk.onrender.com/api';


      try {
        if (typeof showNotification === 'function') {
          showNotification('Calculating astronomical positions via Swiss Ephemeris...', 'info');
        }
  
        const response = await fetch(`${API_BASE_URL}/calculations/panchang`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: selectedDate, pob: selectedLocation })
        });
  
        const result = await response.json();
  
        if (!response.ok) {
          throw new Error(result.message || 'Failed to calculate Panchang.');
        }
  
        const data = result.data;
        const location = result.locationUsed;
  
        // 1. Update 5 Pillars of Vedic Time
        if (document.getElementById('val-tithi')) {
          document.getElementById('val-tithi').textContent = data.tithi;
        } else {
          updatePillarValue(0, data.tithi);
        }
  
        const dateObj = new Date(selectedDate);
        const dayNamesPanchang = ['Ravivar (Sunday)', 'Somvar (Monday)', 'Mangalvar (Tuesday)', 'Budhvar (Wednesday)', 'Guruvar (Thursday)', 'Shukravar (Friday)', 'Shanivar (Saturday)'];
        const rulingPlanets = ['Sun (Surya)', 'Moon (Chandra)', 'Mars (Mangal)', 'Mercury (Budha)', 'Jupiter (Guru)', 'Venus (Shukra)', 'Saturn (Shani)'];
        const dayIndex = dateObj.getDay();
  
        if (document.getElementById('val-vaar')) {
          document.getElementById('val-vaar').textContent = dayNamesPanchang[dayIndex];
        } else {
          updatePillarValue(1, dayNamesPanchang[dayIndex]);
          updatePillarDuration(1, 'Ruling Planet: ' + rulingPlanets[dayIndex]);
        }
  
        if (document.getElementById('val-nakshatra')) {
          document.getElementById('val-nakshatra').textContent = data.nakshatra;
        } else {
          updatePillarValue(2, data.nakshatra);
        }
  
        if (document.getElementById('val-yoga')) {
          document.getElementById('val-yoga').textContent = data.yoga;
        } else {
          updatePillarValue(3, data.yoga);
        }
  
        if (document.getElementById('val-karana')) {
          document.getElementById('val-karana').textContent = data.karana;
        } else {
          updatePillarValue(4, data.karana);
        }
  
        // 2. Update Solar/Lunar Degrees & Geocoded Location Widgets (If present)
        const sunDegEl = document.getElementById('val-sun-degree');
        const moonDegEl = document.getElementById('val-moon-degree');
        const locDisplayEl = document.getElementById('val-location-display');
        const rahuKaalEl = document.getElementById('val-rahu-kaal');
  
        if (sunDegEl) sunDegEl.textContent = `${data.sunDegree}°`;
        if (moonDegEl) moonDegEl.textContent = `${data.moonDegree}°`;
        if (locDisplayEl) locDisplayEl.textContent = location.displayName ? location.displayName.split(',')[0] : selectedLocation;
        if (rahuKaalEl) rahuKaalEl.textContent = data.rahuKaal;
  
        // 3. Update Samvat & Ayana Header
        const year = dateObj.getFullYear();
        const month = dateObj.getMonth();
        const shakaYear = year - 78;
        const vikramYear = year + 57;
        const ayana = (month >= 5 && month <= 10) ? 'Dakshinayana' : 'Uttarayana';
  
        const samvatHeader = document.querySelector('.vedic-calendar-year');
        if (samvatHeader) {
          samvatHeader.innerHTML =
            `Shaka Samvat: <strong>${shakaYear}</strong> | Vikram Samvat: <strong>${vikramYear}</strong> | Ayana: <strong>${ayana}</strong>`;
        }
  
        // 4. Fallback call for Choghadiya table
        if (typeof updateChoghadiyaTable === 'function') {
          updateChoghadiyaTable(dateObj.getDate());
        }
  
        if (typeof showNotification === 'function') {
          showNotification(`Panchang data calculated for ${selectedLocation}.`, 'success');
        }
  
      } catch (err) {
        if (typeof showNotification === 'function') {
          showNotification(`Panchang Error: ${err.message}`, 'error');
        } else {
          console.error('Panchang fetch error:', err.message);
        }
      }
    }
  
    // Handle Refresh Button Click
    if (refreshButton) {
      refreshButton.addEventListener('click', function (e) {
        e.preventDefault();
        fetchAndRenderPanchang();
      });
    }
  
    // Handle Form Submission
    if (panchangForm) {
      panchangForm.addEventListener('submit', function (e) {
        e.preventDefault();
        fetchAndRenderPanchang();
      });
    }
  
    // Fetch Panchang automatically when page loads
    fetchAndRenderPanchang();
  }

function updatePillarValue(pillarIndex, newValue) {
    var pillarCards = document.querySelectorAll('.pillar-card');
    if (pillarCards[pillarIndex]) {
        var valueElement = pillarCards[pillarIndex].querySelector('.pillar-val');
        if (valueElement) valueElement.textContent = newValue;
    }
}

function updatePillarDuration(pillarIndex, newDuration) {
    var pillarCards = document.querySelectorAll('.pillar-card');
    if (pillarCards[pillarIndex]) {
        var durationElement = pillarCards[pillarIndex].querySelector('.pillar-duration');
        if (durationElement) durationElement.textContent = newDuration;
    }
}

function updateChoghadiyaTable(dayOfMonth) {
    var tableBody = document.querySelector('.panchang-data-table tbody');
    if (!tableBody) return;

    var shiftedIndex = dayOfMonth % choghadiyaDayTimings.length;
    var displayTimings = [];

    for (var i = 0; i < Math.min(5, choghadiyaDayTimings.length); i++) {
        displayTimings.push(choghadiyaDayTimings[(shiftedIndex + i) % choghadiyaDayTimings.length]);
    }

    var tableHTML = '';
    displayTimings.forEach(function (timing) {
        var rowClass = 'choghadiya-' + timing.type;
        tableHTML +=
            '<tr class="' + rowClass + '">' +
            '<td>' + timing.time + '</td>' +
            '<td>' + timing.name + '</td>' +
            '<td>' + timing.quality + '</td>' +
            '</tr>';
    });

    tableBody.innerHTML = tableHTML;
}

function getSeasonName(monthIndex) {
    var seasons = [
        'Shishira (Late Winter)', 'Vasant (Spring)', 'Grishma (Summer)',
        'Varsha (Monsoon)', 'Sharad (Autumn)', 'Hemanta (Pre-Winter)'
    ];
    return seasons[Math.floor(monthIndex / 2)] || 'Varsha (Monsoon)';
}


/* =================================================================
   SECTION 15 — RATING / REVIEW SYSTEM (rating.html + index.html)
   ================================================================= */

/** Stored reviews for the rating display */
var userReviews = [
    { name: 'Priya Sharma', location: 'Mumbai', stars: 5, comment: 'The Kundali reading was incredibly accurate. It revealed personality traits that resonated deeply with my life experiences.' },
    { name: 'Rahul Verma', location: 'Delhi', stars: 5, comment: 'Amazing prediction! Everything aligned exactly as predicted. The compatibility report helped me understand my relationship better.' },
    { name: 'Anjali Patel', location: 'Ahmedabad', stars: 4, comment: 'Very insightful horoscope readings. The Panchang feature is a great addition for daily planning.' },
    { name: 'Vikram Singh', location: 'Jaipur', stars: 5, comment: 'The numerology calculator opened my eyes to hidden patterns in my name. Highly recommended for anyone curious about Vedic numerology.' },
    { name: 'Meera Nair', location: 'Kochi', stars: 5, comment: 'I consulted with Swami Krishna through the platform and received profound guidance. The free first 5 minutes are a wonderful offer!' },
    { name: 'Arjun Reddy', location: 'Hyderabad', stars: 4, comment: 'Beautiful interface and accurate astrological calculations. The AI chat assistant is surprisingly helpful for quick questions.' },
    { name: 'Sneha Gupta', location: 'Lucknow', stars: 5, comment: 'The Kundali matching report was detailed and easy to understand. My family was impressed with the thorough analysis.' },
    { name: 'Karthik Menon', location: 'Bangalore', stars: 5, comment: 'Best astrology platform I have used. The horoscope readings feel personal and the daily Panchang is my morning ritual now.' }
];

var visibleReviewCount = 4;

function initializeRatingForm() {
    var ratingForm = document.querySelector('.astro-rating-form');
    if (!ratingForm) return;

    ratingForm.addEventListener('submit', async function (event) {
        event.preventDefault();

        var reviewerName = document.getElementById('astro-name').value.trim();
        var reviewerLocation = document.getElementById('astro-location').value.trim();
        var selectedRating = document.querySelector('input[name="cosmic-stars"]:checked');
        var reviewComment = document.getElementById('astro-comment').value.trim();

        if (!reviewerName || !reviewerLocation || !selectedRating || !reviewComment) {
            showNotification('Please fill in all fields and select a star rating.', 'error');
            return;
        }

        var ratingValue = parseInt(selectedRating.value, 10);

        if (!localStorage.getItem('astro_token')) {
            showNotification('Please sign in before submitting a review.', 'error');
            return;
        }

        try {
            await apiFetch('/reviews', { method: 'POST', body: JSON.stringify({ rating: ratingValue, comment: reviewComment, location: reviewerLocation }) });
        } catch (error) {
            showNotification(error.message, 'error');
            return;
        }

        // Add new review to the beginning of the array
        userReviews.unshift({
            name: reviewerName,
            location: reviewerLocation,
            stars: ratingValue,
            comment: reviewComment
        });

        // Re-render the review grid
        visibleReviewCount = 4;
        renderReviewGrid();

        // Clear the form
        ratingForm.reset();

        showNotification('Thank you, ' + reviewerName + '! Your ' + ratingValue + '-star review has been submitted.', 'success');
    });
}

function renderReviewGrid() {
    var reviewGrid = document.querySelector('.astro-rating-grid');
    if (!reviewGrid) return;

    var gridHTML = '';
    var reviewsToShow = userReviews.slice(0, visibleReviewCount);

    reviewsToShow.forEach(function (review) {
        var starsString = '';
        for (var i = 0; i < review.stars; i++) starsString += '★';
        for (var j = review.stars; j < 5; j++) starsString += '☆';

        gridHTML +=
            '<div class="astro-rating-card">' +
            '<div class="astro-star-rating">' + starsString + '</div>' +
            '<p class="astro-comment">"' + escapeHTML(review.comment) + '"</p>' +
            '<div class="astro-meta">' +
            '<span class="astro-name">' + escapeHTML(review.name) + '</span>' +
            '<span class="astro-location">' + escapeHTML(review.location) + '</span>' +
            '</div>' +
            '</div>';
    });

    reviewGrid.innerHTML = gridHTML;

    var loadMoreButton = document.querySelector('.astro-load-button');
    if (loadMoreButton) {
        loadMoreButton.hidden = visibleReviewCount >= userReviews.length;
    }
}

function initializeLoadMoreReviews() {
    var loadMoreButton = document.querySelector('.astro-load-button');
    if (!loadMoreButton) return;

    loadMoreButton.addEventListener('click', function () {
        visibleReviewCount = Math.min(visibleReviewCount + 4, userReviews.length);
        renderReviewGrid();
    });
}

/** Also render reviews on the homepage */
function initializeHomepageReviews() {
    var homepageReviewGrid = document.querySelector('.website-rating-grid');
    if (!homepageReviewGrid) return;

    var homepageHTML = '';
    var reviewsForHome = userReviews.slice(0, 4);

    reviewsForHome.forEach(function (review) {
        var starsString = '';
        for (var i = 0; i < review.stars; i++) starsString += '★';

        homepageHTML +=
            '<div class="website-rating">' +
            '<div class="website-star-rating">' + starsString + '</div>' +
            '<div class="rating-comment">"' + escapeHTML(review.comment) + '"</div>' +
            '<div class="rating-meta">' +
            '<span class="rating-name">' + escapeHTML(review.name) + '</span>' +
            '<span class="rating-location">' + escapeHTML(review.location) + '</span>' +
            '</div>' +
            '</div>';
    });

    homepageReviewGrid.innerHTML = homepageHTML;
}


// Load approved astrologers from Render API
async function loadAstrologers() {
  const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000/api'
    : 'https://astroverse-q5hk.onrender.com/api';

  try {
    const res = await fetch(`${API_BASE_URL}/astrologers`);
    const data = await res.json();
    console.log('[DEBUG API Data]:', data);

    // Read the array specifically from data.astrologers
    const astrologerList = data.astrologers || [];
    renderAstrologerCards(astrologerList);
  } catch (err) {
    console.error('[Frontend Error] Failed to fetch astrologers:', err);
  }
}

// Render cards into the DOM
function renderAstrologerCards(astrologers) {
  // Target container safely across different page layouts
  var container = document.querySelector('.astro-cards-grid') || 
                  document.getElementById('astrologer-cards-container') || 
                  document.querySelector('.astrologers-grid') ||
                  document.querySelector('.astrologer-container') ||
                  document.querySelector('main');

  if (!container) {
    console.error('[Frontend Error] Could not find grid container on astrologers.html');
    return;
  }

  if (!astrologers || astrologers.length === 0) {
    container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: #4c1d95;"><h3 style="color: #4c1d95;">No verified astrologers available yet.</h3></div>';    return;
  }

  container.innerHTML = astrologers.map(function (astro) {
    // Check astro.name first before fallback to astro.user.name
    var rawName = astro.name || (astro.user && astro.user.name) || 'Astrologer';
    var name = (typeof escapeHTML === 'function') ? escapeHTML(rawName) : rawName;

    var rawSpecs = Array.isArray(astro.specialties) ? astro.specialties.join(', ') : (astro.specialties || 'Vedic Astrology');
    var specialties = (typeof escapeHTML === 'function') ? escapeHTML(rawSpecs) : rawSpecs;

    var rawLangs = Array.isArray(astro.languages) ? astro.languages.join(', ') : (astro.languages || 'English, Hindi');
    var languages = (typeof escapeHTML === 'function') ? escapeHTML(rawLangs) : rawLangs;

    var exp = astro.experience || 0;
    var price = astro.pricePerMinute || 0;

    return `
      <article class="astro-profile-card">
        <div class="card-status-header">
          <span class="status-badge status-online">online</span>
          <span class="experience-tag">${exp} Yrs Exp</span>
        </div>
        <div class="astro-card-body">
          <div class="astro-meta-info">
            <h2 class="astro-name">${name}</h2>
            <p class="astro-specialties">${specialties}</p>
            <p class="astro-languages">${languages}</p>
          </div>
        </div>
        <div class="astro-card-footer">
          <div class="price-block">
            <strong class="current-price">₹${price}/min</strong>
          </div>
          <div class="action-buttons-group">
            <button class="cta-btn btn-chat" onclick="if(typeof startSession==='function') startSession('chat', '${astro._id}')">Chat</button>
            <button class="cta-btn btn-call" onclick="if(typeof startSession==='function') startSession('call', '${astro._id}')">Call</button>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

// RIGHT: Only run loadAstrologers if on astrologers.html or if the grid container exists
document.addEventListener('DOMContentLoaded', () => {
  const isAstrologersPage = window.location.pathname.includes('astrologers.html') || 
                            document.querySelector('.astro-cards-grid') || 
                            document.getElementById('astrologer-cards-container');

  if (isAstrologersPage) {
      loadAstrologers();
  }
});

function initializeAstrologerFilters() {
    var searchInput = document.getElementById('astro_search');
    var specialtyFilter = document.getElementById('filter_specialty');
    var languageFilter = document.getElementById('filter_language');
    var sortFilter = document.getElementById('filter_sort');

    if (!searchInput) return;

    apiFetch('/astrologers').then(function (data) {
        renderAstrologerCards(data.astrologers || []);
        filterAstrologerCards();
    }).catch(function (error) {
        showNotification('Could not load live astrologers: ' + error.message, 'error');
    });

    function filterAstrologerCards() {
        var searchQuery = searchInput.value.toLowerCase();
        var selectedSpecialty = specialtyFilter ? specialtyFilter.value : '';
        var selectedLanguage = languageFilter ? languageFilter.value : '';

        var allProfileCards = Array.from(document.querySelectorAll('.astro-profile-card'));

        allProfileCards.forEach(function (card) {
            var astrologerName = (card.querySelector('.astro-name') || {}).textContent || '';
            var astrologerSpecialties = (card.querySelector('.astro-specialties') || {}).textContent || '';
            var astrologerLanguages = (card.querySelector('.astro-languages') || {}).textContent || '';

            var combinedText = (astrologerName + ' ' + astrologerSpecialties + ' ' + astrologerLanguages).toLowerCase();

            var matchesSearch = !searchQuery || combinedText.includes(searchQuery);
            var matchesSpecialty = !selectedSpecialty || combinedText.includes(selectedSpecialty.toLowerCase());
            var matchesLanguage = !selectedLanguage || astrologerLanguages.toLowerCase().includes(selectedLanguage.toLowerCase());

            card.style.display = (matchesSearch && matchesSpecialty && matchesLanguage) ? '' : 'none';
        });

        if (!sortFilter || sortFilter.value === 'popular') return;

        var cardContainer = allProfileCards[0] && allProfileCards[0].parentElement;
        if (!cardContainer) return;

        allProfileCards.sort(function (firstCard, secondCard) {
            var firstText = firstCard.textContent;
            var secondText = secondCard.textContent;
            var firstRating = Number((firstText.match(/★\s*([\d.]+)/) || [0, 0])[1]);
            var secondRating = Number((secondText.match(/★\s*([\d.]+)/) || [0, 0])[1]);
            var firstPrice = Number((firstText.match(/₹(\d+)\/min/) || [0, 0])[1]);
            var secondPrice = Number((secondText.match(/₹(\d+)\/min/) || [0, 0])[1]);
            var firstExperience = Number((firstText.match(/(\d+)\s*Yrs Exp/) || [0, 0])[1]);
            var secondExperience = Number((secondText.match(/(\d+)\s*Yrs Exp/) || [0, 0])[1]);

            if (sortFilter.value === 'rating') return secondRating - firstRating;
            if (sortFilter.value === 'price_low') return firstPrice - secondPrice;
            if (sortFilter.value === 'experience') return secondExperience - firstExperience;
            return 0;
        });

        allProfileCards.forEach(function (card) {
            cardContainer.appendChild(card);
        });
    }

    searchInput.addEventListener('input', filterAstrologerCards);
    if (specialtyFilter) specialtyFilter.addEventListener('change', filterAstrologerCards);
    if (languageFilter) languageFilter.addEventListener('change', filterAstrologerCards);
    if (sortFilter) sortFilter.addEventListener('change', filterAstrologerCards);
}


/* =================================================================
   SECTION 17 — UNIVERSAL FORM VALIDATION
   ================================================================= */

/** Prevent all forms from submitting to a server (since we have no backend) */
function initializeFormGuards() {
    var allForms = document.querySelectorAll('form');
    allForms.forEach(function (form) {
        // Only attach to forms that don't already have a submit handler
        // (forms with our custom handlers already call event.preventDefault())
        if (!form.hasAttribute('data-astroverse-handled')) {
            form.addEventListener('submit', function (event) {
                // If the form doesn't have an action or the action is '#', prevent default
                var formAction = form.getAttribute('action');
                if (!formAction || formAction === '#' || formAction === '') {
                    event.preventDefault();
                }
            });
        }
    });
}


/* =================================================================
   SECTION 18 — SMOOTH SCROLL TO SECTIONS
   ================================================================= */

/*
 * Account forms are part of this front-end demo. They validate data in the
 * browser and explain clearly that no real account is created yet.
 */
function initializeDemoForms() {
    var demoForms = document.querySelectorAll('.portal-form, .astro-auth-form');

    demoForms.forEach(function (form) {
        form.addEventListener('submit', async function (event) {
            event.preventDefault();
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }
            try {
                var panel = form.closest('.auth-panel-view, .astro-form-wrapper');
                var data;
                if (panel && panel.id === 'view-user-signup') {
                    data = await apiFetch('/auth/register', { method: 'POST', body: JSON.stringify({ name: document.getElementById('signup_name').value.trim(), email: document.getElementById('signup_email').value.trim(), password: document.getElementById('signup_password').value, role: 'user' }) });
                    saveSession(data);
                    showNotification('Account created successfully.', 'success');
                } else if (panel && panel.id === 'view-user-login') {
                    data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email: document.getElementById('user_email').value.trim(), password: document.getElementById('user_password').value }) });
                    saveSession(data);
                    showNotification('Signed in successfully.', 'success');
                } else if (panel && panel.id === 'view-admin-login') {
                    data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email: document.getElementById('admin_id').value.trim(), password: document.getElementById('admin_password').value }) });
                    if (data.user.role !== 'admin') throw new Error('This account is not an administrator account.');
                    saveSession(data);
                    showNotification('Admin access granted.', 'success');
                } else if (panel && panel.id === 'astroLoginFormSection') {
                    data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email: document.getElementById('astro_login_id').value.trim(), password: document.getElementById('astro_login_password').value }) });
                    if (data.user.role !== 'astrologer') throw new Error('This account is not registered as an astrologer.');
                    saveSession(data);
                    showNotification('Signed in successfully.', 'success');
                } else if (panel && panel.id === 'astroSignupFormSection') {
                    var user = getStoredUser();
                    if (!user || user.role !== 'astrologer') throw new Error('Create and sign in to an astrologer account before submitting your profile.');
                    await apiFetch('/astrologers/profile', { method: 'POST', body: JSON.stringify({ specialties: [document.getElementById('astro_primary_skill').value], languages: document.getElementById('astro_languages').value.split(',').map(function (item) { return item.trim(); }).filter(Boolean), experience: Number(document.getElementById('astro_experience').value), bio: document.getElementById('astro_bio').value.trim() }) });
                    showNotification('Astrologer profile submitted for approval.', 'success');
                }
            } catch (error) { showNotification(error.message, 'error'); }
        });
    });
}

function initializeSmoothScroll() {
    var anchorLinks = document.querySelectorAll('a[href^="#"]');
    anchorLinks.forEach(function (link) {
        link.addEventListener('click', function (event) {
            var targetId = link.getAttribute('href');
            if (targetId === '#' || targetId.length <= 1) return;

            var targetElement = document.querySelector(targetId);
            if (targetElement) {
                event.preventDefault();
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}


/* =================================================================
   SECTION 19 — INJECT NOTIFICATION ANIMATION CSS
   ================================================================= */

function injectGlobalStyles() {
    if (document.getElementById('astroverse-global-styles')) return;

    var styleSheet = document.createElement('style');
    styleSheet.id = 'astroverse-global-styles';
    styleSheet.textContent =
        '@keyframes slideDown { from { transform: translateX(-50%) translateY(-20px); opacity: 0; } to { transform: translateX(-50%) translateY(0); opacity: 1; } }' +
        '@media (max-width: 900px) { .mobile-menu-toggle { display: block !important; } }';
    document.head.appendChild(styleSheet);
}


/* =================================================================
   SECTION 20 — MAIN INITIALIZATION (Runs on every page)
   ================================================================= */

document.addEventListener('DOMContentLoaded', function () {
    // Inject global utility styles
    injectGlobalStyles();

    // Initialize navigation (hamburger menu, mobile layout)
    initializeNavigation();
    syncHeaderAuth();

    // Prevent raw form submissions. Authentication forms already use their
    // explicit onsubmit handlers, so do not attach the legacy demo handler as
    // well (it would send a second, conflicting request).
    initializeFormGuards();

    // Smooth scrolling for anchor links
    initializeSmoothScroll();

    // === Page-Specific Initializers ===
    // Each initializer checks if the relevant DOM elements exist before activating.

    // Astrologer Sign In/Up tabs
    initializeAstrologerAuth();

    // User Sign In/Up/Admin tabs
    initializeUserAuth();

    // Horoscope page (zodiac selection, timeline tabs)
    initializeHoroscopePage();

    // AI Chat Assistant
    initializeAIChat();

    // Kundali Matching calculator
    initializeKundaliMatching();

    // Love Compatibility calculator
    initializeCompatibility();

    // Friendship Calculator
    initializeFriendshipCalculator();

    // Mulank (Root Number) Calculator
    initializeMulankCalculator();

    // Name Numerology calculator
    initializeNameNumerology();

    // Panchang page (date/location refresh)
    initializePanchang();

    // Rating/Review form
    initializeRatingForm();
    initializeLoadMoreReviews();
    renderReviewGrid();

    // Homepage reviews display
    initializeHomepageReviews();

    // Astrologer search and filter
    initializeAstrologerFilters();

    console.log('[ASTROVERSE] All modules initialized successfully. ✨');
});

/** Initialize Astrologer Auth if the page has the relevant elements */
function initializeAstrologerAuth() {
    var tabLogin = document.getElementById('tab-astro-login');
    if (tabLogin) {
        // The toggleAstroAuth function is already called via onclick in HTML
        console.log('[ASTROVERSE] Astrologer auth module detected.');
    }
}

/** Initialize User Auth if the page has the relevant elements */
function initializeUserAuth() {
    var tabUserLogin = document.getElementById('tab-user-login');
    if (tabUserLogin) {
        // The switchPortalView function is already called via onclick in HTML
        console.log('[ASTROVERSE] User auth module detected.');
    }
}

// ============================================================
// ADD NEW AUTH HANDLERS BELOW HERE
// ============================================================

// ============================================================
// USER LOGIN HANDLER
// ============================================================
// ============================================================
// USER LOGIN HANDLER
// ============================================================
async function handleUserLogin(event) {
    if (event) event.preventDefault();
  
    // Primary check for sign-in-up.html IDs (user_email & user_password)
    const emailInput = document.getElementById('user_email') || document.getElementById('login-email') || document.getElementById('email');
    const passwordInput = document.getElementById('user_password') || document.getElementById('login-password') || document.getElementById('password');
  
    if (!emailInput || !passwordInput) {
      alert('Form inputs missing. Please refresh the page.');
      return;
    }
  
    const email = emailInput.value.trim();
    const password = passwordInput.value;
  
    if (!email || !password) {
      alert('Please fill in both email and password.');
      return;
    }
  
    const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:5000/api'
      : 'https://astroverse-q5hk.onrender.com/api';
  
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
  
      const data = await response.json();
  
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Invalid email or password.');
      }
  
      // Save user JWT token to local storage
      localStorage.setItem('astro_token', data.token);
      localStorage.setItem('astro_user', JSON.stringify(data.user));
  
      alert('Login Successful!');
      window.location.href = 'index.html';
    } catch (err) {
      alert(`Login Error: ${err.message}`);
    }
  }
  
  // ============================================================
  // USER SIGNUP HANDLER
  // ============================================================
  async function handleUserSignup(event) {
    if (event) event.preventDefault();
  
    const nameInput = document.getElementById('signup_name') || document.getElementById('signup-name') || document.getElementById('name');
    const emailInput = document.getElementById('signup_email') || document.getElementById('signup-email') || document.getElementById('email');
    const passwordInput = document.getElementById('signup_password') || document.getElementById('signup-password') || document.getElementById('password');
  
    if (!emailInput || !passwordInput) {
      alert('Form inputs missing. Please refresh the page.');
      return;
    }
  
    const name = nameInput ? nameInput.value.trim() : 'User';
    const email = emailInput.value.trim();
    const password = passwordInput.value;
  
    const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:5000/api'
      : 'https://astroverse-q5hk.onrender.com/api';
  
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
  
      const data = await response.json();
  
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Registration failed.');
      }
  
      localStorage.setItem('astro_token', data.token);
      localStorage.setItem('astro_user', JSON.stringify(data.user));
  
      alert('Account Created Successfully!');
      window.location.href = 'index.html';
    } catch (err) {
      alert(`Signup Error: ${err.message}`);
    }
  }
  // ============================================================
// 2. ASTROLOGER PARTNER PORTAL AUTHENTICATION HANDLERS
// ============================================================

  async function handleAstroLogin(event) {
    if (event) event.preventDefault();
  
    const idInput = document.getElementById('astro_login_id');
    const passwordInput = document.getElementById('astro_login_password');
  
    if (!idInput || !passwordInput) return;
  
    const emailOrId = idInput.value.trim();
    const password = passwordInput.value;
  
    const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:5000/api'
      : 'https://astroverse-q5hk.onrender.com/api';
  
    try {
      const response = await fetch(`${API_BASE_URL}/astrologers/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailOrId, password })
      });
  
      const data = await response.json();
  
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Astrologer login failed.');
      }
  
      localStorage.setItem('astro_token', data.token);
      localStorage.setItem('astro_user', JSON.stringify(data.astrologer || data.user));
  
      alert('Astrologer Login Successful!');
      window.location.href = 'dashboard.html';
    } catch (err) {
      alert(`Astrologer Login Error: ${err.message}`);
    }
  }
  
  async function handleAstroSignup(event) {
    if (event) event.preventDefault();
  
    const name = document.getElementById('astro_name')?.value.trim();
    const email = document.getElementById('astro_email')?.value.trim();
    const phone = document.getElementById('astro_phone')?.value.trim();
    const languages = document.getElementById('astro_languages')?.value.trim();
    const experience = document.getElementById('astro_experience')?.value;
    const specialty = document.getElementById('astro_primary_skill')?.value;
    const bio = document.getElementById('astro_bio')?.value.trim();
  
    // Target the exact file input element
    const certFileInput = document.getElementById('astro_certificate');
    const certFile = certFileInput?.files?.[0];
  
    if (!certFile) {
      alert('Please choose a certificate/ID proof file to upload.');
      return;
    }
  
    // Construct FormData payload
    const formData = new FormData();
    formData.append('name', name || '');
    formData.append('email', email || '');
    formData.append('phone', phone || '');
    formData.append('languages', languages || '');
    formData.append('experience', experience || 0);
    formData.append('specialty', specialty || '');
    formData.append('bio', bio || '');
    
    // Attach binary file with field key 'certificate' matching Multer configuration
    formData.append('certificate', certFile);
  
    const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:5000/api'
      : 'https://astroverse-q5hk.onrender.com/api';
  
    try {
      const response = await fetch(`${API_BASE_URL}/astrologers/register`, {
        method: 'POST',
        // Note: Do NOT set 'Content-Type' header here.
        // Fetch automatically adds boundary parameters for multipart/form-data.
        body: formData
      });
  
      const data = await response.json();
  
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Application submission failed.');
      }
  
      alert('Application Submitted Successfully! Our vetting team will review your profile within 48 hours.');
      window.location.href = 'index.html';
    } catch (err) {
      alert(`Application Error: ${err.message}`);
    }
  }
// Successful login, sign-up, and account-creation handlers store their session
// under these existing keys. Send the user to the home page immediately after.
(() => {
  const nativeSetItem = Storage.prototype.setItem;

  Storage.prototype.setItem = function (key, value) {
    nativeSetItem.call(this, key, value);

    if (this === localStorage && (key === 'astro_user' || key === 'astro_admin')) {
      window.location.href = 'index.html';
    }
  };
})();

// ============================================================
// ASTROVERSE 3D Interactive Cosmic Canvas Engine
// ============================================================
(function initAstro3D() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas || typeof Three === 'undefined') return;
  
    // Scene, Camera, Renderer Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 400;
  
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  
    // 1. Starfield Particles (Interactive Dust)
    const starsGeometry = new THREE.BufferGeometry();
    const starCount = 2500;
    const starPositions = new Float32Array(starCount * 3);
    const starScales = new Float32Array(starCount);
  
    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 1200;
      starPositions[i + 1] = (Math.random() - 0.5) * 1200;
      starPositions[i + 2] = (Math.random() - 0.5) * 1200;
    }
  
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  
    const starsMaterial = new THREE.PointsMaterial({
      color: 0xf4d068,
      size: 1.8,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
  
    const starField = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(starField);
  
    // 2. 3D Glowing Celestial Astrolabe Rings
    const ringGroup = new THREE.Group();
  
    function createAstrolabeRing(radius, color, rotationX, rotationY) {
      const geometry = new THREE.TorusGeometry(radius, 0.6, 16, 100);
      const material = new THREE.MeshBasicMaterial({
        color: color,
        wireframe: true,
        transparent: true,
        opacity: 0.35
      });
      const ring = new THREE.Mesh(geometry, material);
      ring.rotation.x = rotationX;
      ring.rotation.y = rotationY;
      ringGroup.add(ring);
      return ring;
    }
  
    const ring1 = createAstrolabeRing(180, 0xd4af37, Math.PI / 4, 0);
    const ring2 = createAstrolabeRing(220, 0x8a2be2, -Math.PI / 3, Math.PI / 6);
    const ring3 = createAstrolabeRing(260, 0x4b0082, Math.PI / 6, -Math.PI / 4);
  
    scene.add(ringGroup);
  
    // Mouse Parallax Effect
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;
  
    window.addEventListener('mousemove', (e) => {
      mouseX = (e.clientX - window.innerWidth / 2) * 0.05;
      mouseY = (e.clientY - window.innerHeight / 2) * 0.05;
    });
  
    // Animation Loop
    function animate() {
      requestAnimationFrame(animate);
  
      // Smooth camera inertia
      targetX += (mouseX - targetX) * 0.05;
      targetY += (-mouseY - targetY) * 0.05;
  
      camera.position.x = targetX;
      camera.position.y = targetY;
      camera.lookAt(scene.position);
  
      // Continuous 3D rotation
      starField.rotation.y += 0.0004;
      starField.rotation.x += 0.0002;
  
      ring1.rotation.z += 0.002;
      ring2.rotation.z -= 0.0015;
      ring3.rotation.x += 0.001;
    }
  
    animate();
  
    // Responsive Window Resize Handler
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  })();

// Universal Clickable Hamburger Toggle
document.addEventListener('DOMContentLoaded', () => {
    // Finds the button regardless of class or ID used in HTML
    const menuBtn = document.querySelector('.hamburger, .menu-icon, .nav-toggle, #menu-btn, #hamburger-btn, header .toggle');
    const navMenu = document.querySelector('.nav-links, .nav-menu, nav ul, header ul');
  
    if (menuBtn && navMenu) {
      // Force pointer events and z-index on the button element directly
      menuBtn.style.pointerEvents = 'auto';
      menuBtn.style.zIndex = '999999';
      menuBtn.style.cursor = 'pointer';
  
      menuBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        navMenu.classList.toggle('active');
      });
  
      // Close navigation menu when clicking outside
      document.addEventListener('click', (e) => {
        if (!menuBtn.contains(e.target) && !navMenu.contains(e.target)) {
          navMenu.classList.remove('active');
        }
      });
    }
  });

  // Reliable Mobile Hamburger Toggle Execution
document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.querySelector('.mobile-menu-toggle, #menu-btn');
    const navMenu = document.querySelector('.nav-links');
  
    if (toggleBtn && navMenu) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        navMenu.classList.toggle('active');
      });
  
      // Close mobile menu when clicking outside
      document.addEventListener('click', (e) => {
        if (!toggleBtn.contains(e.target) && !navMenu.contains(e.target)) {
          navMenu.classList.remove('active');
        }
      });
    }
  });

  // Clean & Direct Mobile Hamburger Toggle Listener
document.addEventListener('DOMContentLoaded', () => {
    const menuBtn = document.getElementById('menu-btn') || document.querySelector('.mobile-menu-toggle');
    const navMenu = document.querySelector('.nav-links');
  
    if (menuBtn && navMenu) {
      // Force button to be clickable above canvas overlays
      menuBtn.style.pointerEvents = 'auto';
      menuBtn.style.zIndex = '10002';
      menuBtn.style.cursor = 'pointer';
  
      menuBtn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        
        // Toggles the .active class on nav-links
        navMenu.classList.toggle('active');
      });
  
      // Close menu when clicking outside of header
      document.addEventListener('click', (event) => {
        if (!menuBtn.contains(event.target) && !navMenu.contains(event.target)) {
          navMenu.classList.remove('active');
        }
      });
    }
  });

  function renderKundaliResults(chartData, name) {
    const kundaliForm = document.querySelector('.kundali-gen-form');
    if (!kundaliForm) return;
  
    // Build planet grid items
    let planetsHTML = chartData.planets.map(p => `
      <div style="padding: 10px; background: rgba(255,255,255,0.05); border-radius: 6px; border-left: 3px solid #f4d068;">
        <strong style="color: #f4d068;">${p.name} ${p.retrograde ? '(R)' : ''}</strong>
        <p style="margin: 4px 0 0 0; font-size: 0.85rem; color: #d1c7e0;">
          ${p.rashi} @ ${p.degree}° <br>
          <small>Nakshatra: ${p.nakshatra}</small>
        </p>
      </div>
    `).join('');
  
    const resultHTML = `
      <div class="kundali-result-container" style="margin-top: 30px; padding: 25px; background: rgba(18, 12, 38, 0.85); border: 1px solid rgba(244, 208, 104, 0.4); border-radius: 12px; color: #fff;">
        <h3 style="color: #f4d068; text-align: center; margin-bottom: 15px;">
          Vedic Birth Chart for ${escapeHTML(name)}
        </h3>
        <div style="padding: 12px; background: rgba(244, 208, 104, 0.1); border-radius: 8px; margin-bottom: 20px; text-align: center;">
          <strong style="color: #f4d068; font-size: 1.1rem;">Lagna (Ascendant): ${chartData.ascendant.rashi} (${chartData.ascendant.degree}°)</strong>
          <p style="margin: 4px 0 0 0; font-size: 0.9rem; color: #eadaf7;">Ascendant Nakshatra: ${chartData.ascendant.nakshatra}</p>
        </div>
  
        <h4 style="color: #f4d068; margin-bottom: 12px;">Planetary Positions (Sidereal / Lahiri)</h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
          ${planetsHTML}
        </div>
      </div>
    `;
  
    // Replace existing container if already calculated
    const existing = kundaliForm.parentElement.querySelector('.kundali-result-container');
    if (existing) existing.remove();
  
    kundaliForm.insertAdjacentHTML('afterend', resultHTML);
  }

  // ============================================================
// SWISS EPHEMERIS KUNDALI & VISUAL SVG CHART RENDERER
// ============================================================

/**
 * Renders a North Indian (Diamond Style) SVG Birth Chart
 * @param {Object} chartData - Data returned from Swiss Ephemeris backend
 */
function generateNorthIndianChartSVG(chartData) {
    const RASHIS_ORDER = [
      'Mesha (Aries)', 'Vrishabha (Taurus)', 'Mithuna (Gemini)', 'Karka (Cancer)',
      'Simha (Leo)', 'Kanya (Virgo)', 'Tula (Libra)', 'Vrischika (Scorpio)',
      'Dhanu (Sagittarius)', 'Makara (Capricorn)', 'Kumbha (Aquarius)', 'Meena (Pisces)'
    ];
  
    // 1. Find Ascendant (Lagna) sign index (0 - 11)
    const lagnaRashi = chartData.ascendant.rashi;
    const lagnaIndex = RASHIS_ORDER.findIndex(r => lagnaRashi.includes(r.split(' ')[0]));
  
    // 2. Map planets into houses (1 to 12) relative to Lagna
    const housePlanets = Array.from({ length: 12 }, () => []);
    
    chartData.planets.forEach(p => {
      const planetRashiIndex = RASHIS_ORDER.findIndex(r => p.rashi.includes(r.split(' ')[0]));
      // Calculate house number relative to Lagna (1-indexed)
      const houseNumber = ((planetRashiIndex - lagnaIndex + 12) % 12) + 1;
      housePlanets[houseNumber - 1].push(`${p.name}${p.retrograde ? '(R)' : ''}`);
    });
  
    // House coordinates for North Indian Chart text labels
    const housePositions = {
      1:  { x: 200, y: 110, rashiX: 200, rashiY: 65 },  // Top central diamond
      2:  { x: 100, y: 60,  rashiX: 100, rashiY: 35 },  // Top left triangle
      3:  { x: 60,  y: 100, rashiX: 35,  rashiY: 100 }, // Upper left triangle
      4:  { x: 110, y: 200, rashiX: 65,  rashiY: 200 }, // Left central diamond
      5:  { x: 60,  y: 300, rashiX: 35,  rashiY: 300 }, // Lower left triangle
      6:  { x: 100, y: 340, rashiX: 100, rashiY: 365 }, // Bottom left triangle
      7:  { x: 200, y: 290, rashiX: 200, rashiY: 335 }, // Bottom central diamond
      8:  { x: 300, y: 340, rashiX: 300, rashiY: 365 }, // Bottom right triangle
      9:  { x: 340, y: 300, rashiX: 365, rashiY: 300 }, // Lower right triangle
      10: { x: 290, y: 200, rashiX: 335, rashiY: 200 }, // Right central diamond
      11: { x: 340, y: 100, rashiX: 365, rashiY: 100 }, // Upper right triangle
      12: { x: 300, y: 60,  rashiX: 300, rashiY: 35 }   // Top right triangle
    };
  
    // Build SVG planet and sign elements
    let houseElementsHTML = '';
    for (let h = 1; h <= 12; h++) {
      const pos = housePositions[h];
      const signNum = ((lagnaIndex + h - 1) % 12) + 1; // Rashi number 1-12
      const planetsInHouse = housePlanets[h - 1].join(', ');
  
      houseElementsHTML += `
        <!-- Rashi Number -->
        <text x="${pos.rashiX}" y="${pos.rashiY}" fill="#f4d068" font-size="11" font-weight="bold" text-anchor="middle">${signNum}</text>
        <!-- Planets in House -->
        <text x="${pos.x}" y="${pos.y}" fill="#ffffff" font-size="10" text-anchor="middle">${planetsInHouse}</text>
      `;
    }
  
    return `
      <div style="max-width: 420px; margin: 20px auto; background: rgba(10, 6, 26, 0.9); padding: 15px; border-radius: 12px; border: 1px solid rgba(244, 208, 104, 0.3);">
        <h4 style="color: #f4d068; text-align: center; margin-bottom: 10px;">North Indian Birth Chart (Lagna)</h4>
        <svg viewBox="0 0 400 400" style="width: 100%; height: auto; font-family: sans-serif;">
          <!-- Outer Box -->
          <rect x="10" y="10" width="380" height="380" fill="none" stroke="#f4d068" stroke-width="2"/>
          <!-- Inner Diagonals -->
          <line x1="10" y1="10" x2="390" y2="390" stroke="#f4d068" stroke-width="1.5"/>
          <line x1="390" y1="10" x2="10" y2="390" stroke="#f4d068" stroke-width="1.5"/>
          <!-- Inner Diamond -->
          <polygon points="200,10 390,200 200,390 10,200" fill="none" stroke="#f4d068" stroke-width="1.5"/>
          ${houseElementsHTML}
        </svg>
      </div>
    `;
  }
  
  function renderKundaliFullOutput(data, location, name) {
    const container = document.querySelector('.kundali-result-section') || document.querySelector('main') || document.body;
  
    const svgChart = generateNorthIndianChartSVG(data);
  
    const planetsListHTML = data.planets.map(p => `
      <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 6px; border-left: 3px solid #f4d068;">
        <strong style="color: #f4d068;">${p.name} ${p.retrograde ? '(R)' : ''}</strong>
        <p style="margin: 2px 0 0; font-size: 0.85rem; color: #d1c7e0;">
          ${p.rashi} @ ${p.degree}° <br>
          <small>Nakshatra: ${p.nakshatra}</small>
        </p>
      </div>
    `).join('');
  
    const outputHTML = `
      <div class="ephemeris-result-card" style="margin: 30px auto; max-width: 800px; padding: 25px; background: rgba(18, 12, 38, 0.95); border: 1px solid rgba(244, 208, 104, 0.4); border-radius: 12px; color: #fff;">
        <h2 style="color: #f4d068; text-align: center;">Kundali for ${name}</h2>
        <p style="text-align: center; color: #a29bfe; font-size: 0.9rem;">
          📍 Location: ${location.displayName || 'Geocoded Coordinates'} (${location.latitude.toFixed(2)}°, ${location.longitude.toFixed(2)}°)
        </p>
  
        ${svgChart}
  
        <div style="margin-top: 20px; padding: 12px; background: rgba(244, 208, 104, 0.1); border-radius: 8px; text-align: center;">
          <strong style="color: #f4d068; font-size: 1.1rem;">Ascendant (Lagna): ${data.ascendant.rashi} @ ${data.ascendant.degree}°</strong>
          <p style="margin: 4px 0 0; font-size: 0.9rem; color: #eadaf7;">Nakshatra: ${data.ascendant.nakshatra}</p>
        </div>
  
        <h3 style="color: #f4d068; margin: 20px 0 10px;">Planetary Positions (Sidereal / Lahiri)</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
          ${planetsListHTML}
        </div>
      </div>
    `;
  
    const existing = document.querySelector('.ephemeris-result-card');
    if (existing) existing.remove();
  
    container.insertAdjacentHTML('beforeend', outputHTML);
  }
  
  // ============================================================
// ASHTAKOOTA 36-GUNA MATCHMAKING FRONTEND HANDLER
// ============================================================

function initializeMatchingForm() {
    const matchingForm = document.getElementById('kundali-matching-form') || document.querySelector('.matching-form');
    if (!matchingForm) return;
  
    matchingForm.addEventListener('submit', async function (e) {
      e.preventDefault();
  
      // Get live API Base URL dynamically
      const API_BASE_URL = window.location.hostname === 'localhost'
        ? 'http://localhost:5000/api'
        : '/api';
  
      const payload = {
        boyDetails: {
          name: document.getElementById('boy_name')?.value || 'Partner 1',
          dob: document.getElementById('boy_dob')?.value,
          tob: document.getElementById('boy_tob')?.value,
          pob: document.getElementById('boy_pob')?.value || 'Mumbai, India'
        },
        girlDetails: {
          name: document.getElementById('girl_name')?.value || 'Partner 2',
          dob: document.getElementById('girl_dob')?.value,
          tob: document.getElementById('girl_tob')?.value,
          pob: document.getElementById('girl_pob')?.value || 'Mumbai, India'
        }
      };
  
      if (!payload.boyDetails.dob || !payload.boyDetails.tob || !payload.girlDetails.dob || !payload.girlDetails.tob) {
        alert('Please fill in Date and Time of Birth for both partners.');
        return;
      }
  
      try {
        const response = await fetch(`${API_BASE_URL}/calculations/matching`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('astro_token') || ''}`
          },
          body: JSON.stringify(payload)
        });
  
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Matching calculation failed.');
  
        renderMatchingTable(result.data, payload.boyDetails.name, payload.girlDetails.name);
      } catch (err) {
        alert(`Error: ${err.message}`);
      }
    });
  }
  
  function renderMatchingTable(data, boyName, girlName) {
    const container = document.getElementById('matching-result-container') || document.querySelector('.matching-result-section') || document.body;
  
    const kootas = [
      { name: 'Varna', key: 'varna' },
      { name: 'Vashya', key: 'vashya' },
      { name: 'Tara', key: 'tara' },
      { name: 'Yoni', key: 'yoni' },
      { name: 'Graha Maitri', key: 'maitri' },
      { name: 'Gana', key: 'gana' },
      { name: 'Bhakoot', key: 'bhakoot' },
      { name: 'Nadi', key: 'nadi' }
    ];
  
    const rowsHTML = kootas.map(k => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); font-weight: bold; color: #f4d068;">${k.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); text-align: center; color: #fff;">${data.scores[k.key].max}</td>
        <td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); text-align: center; color: #55efc4; font-weight: bold;">${data.scores[k.key].obtained}</td>
      </tr>
    `).join('');
  
    const statusColor = data.isCompatible ? '#55efc4' : '#ff7675';
  
    const outputHTML = `
      <div style="max-width: 650px; margin: 30px auto; padding: 25px; background: rgba(18, 12, 38, 0.95); border: 1px solid rgba(244, 208, 104, 0.4); border-radius: 12px; color: #fff;">
        <h2 style="color: #f4d068; text-align: center; margin-bottom: 5px;">Ashtakoota Milan Result</h2>
        <p style="text-align: center; color: #a29bfe;">${boyName} & ${girlName}</p>
  
        <div style="margin: 20px 0; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 8px; text-align: center;">
          <h3 style="margin: 0; font-size: 2.2rem; color: ${statusColor};">${data.totalPoints} / 36 Gunas</h3>
          <p style="margin: 6px 0 0; color: #eadaf7;">
            ${data.isCompatible ? '✅ Auspicious Compatibility (18+ Points)' : '⚠️ Moderate / Low Compatibility (<18 Points)'}
          </p>
        </div>
  
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <thead>
            <tr style="background: rgba(244, 208, 104, 0.15); color: #f4d068;">
              <th style="padding: 10px; text-align: left;">Koota</th>
              <th style="padding: 10px; text-align: center;">Max Points</th>
              <th style="padding: 10px; text-align: center;">Obtained</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
        </table>
      </div>
    `;
  
    container.innerHTML = outputHTML;
  }
  
  // Ensure function runs when DOM loads
  document.addEventListener('DOMContentLoaded', initializeMatchingForm);

  // ============================================================
// DAILY PANCHANG FRONTEND HANDLER
// ============================================================

function initializePanchang() {
    const panchangContainer = document.getElementById('panchang-card') || document.querySelector('.panchang-container');
    if (!panchangContainer) return;
  
    async function loadPanchang(dateVal = '', pobVal = 'Varanasi, India') {
      const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';
  
      try {
        const response = await fetch(`${API_BASE_URL}/calculations/panchang`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: dateVal, pob: pobVal })
        });
  
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Failed to load Panchang.');
  
        renderPanchangUI(result.data, result.dateUsed, result.locationUsed);
      } catch (err) {
        console.warn('Panchang load error:', err.message);
      }
    }
  
    // Load default Panchang for today
    loadPanchang();
  }
  
  function renderPanchangUI(data, date, location) {
    const container = document.getElementById('panchang-result-container') || document.querySelector('.panchang-card-wrapper') || document.body;
  
    const html = `
      <div style="max-width: 600px; margin: 25px auto; padding: 20px; background: rgba(18, 12, 38, 0.95); border: 1px solid rgba(244, 208, 104, 0.4); border-radius: 12px; color: #fff;">
        <h2 style="color: #f4d068; text-anchor: center; margin: 0 0 5px; text-align: center;">Vedic Daily Panchang</h2>
        <p style="text-align: center; color: #a29bfe; font-size: 0.9rem; margin-bottom: 15px;">
          📅 ${date} | 📍 ${location.displayName || 'Location'}
        </p>
  
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; text-align: center;">
          <div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px;">
            <small style="color: #a29bfe;">Tithi</small>
            <p style="margin: 4px 0 0; font-weight: bold; color: #f4d068;">${data.tithi}</p>
          </div>
          <div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px;">
            <small style="color: #a29bfe;">Nakshatra</small>
            <p style="margin: 4px 0 0; font-weight: bold; color: #f4d068;">${data.nakshatra}</p>
          </div>
          <div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px;">
            <small style="color: #a29bfe;">Yoga</small>
            <p style="margin: 4px 0 0; font-weight: bold; color: #f4d068;">${data.yoga}</p>
          </div>
          <div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px;">
            <small style="color: #a29bfe;">Karana</small>
            <p style="margin: 4px 0 0; font-weight: bold; color: #f4d068;">${data.karana}</p>
          </div>
        </div>
  
        <div style="margin-top: 15px; padding: 10px; background: rgba(255, 118, 117, 0.15); border: 1px solid rgba(255, 118, 117, 0.3); border-radius: 8px; text-align: center;">
          <strong style="color: #ff7675;">⚠️ Rahu Kaal Timing:</strong> ${data.rahuKaal}
        </div>
      </div>
    `;
  
    container.innerHTML = html;
  }
  
  document.addEventListener('DOMContentLoaded', initializePanchang);


  // ============================================================
// DAILY HOROSCOPE FRONTEND HANDLER
// ============================================================

function initializeHoroscope() {
    const zodiacCards = document.querySelectorAll('.zodiac-card, .zodiac-selector-item');
    const horoscopeOutputContainer = document.getElementById('horoscope-result-container') || document.querySelector('.horoscope-display-card');
  
    if (!zodiacCards.length && !horoscopeOutputContainer) return;
  
    async function fetchHoroscope(selectedSign = 'aries') {
      const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';
  
      try {
        if (horoscopeOutputContainer) {
          horoscopeOutputContainer.innerHTML = '<p style="text-align: center; color: #f4d068;">Fetching planetary transits...</p>';
        }
  
        const response = await fetch(`${API_BASE_URL}/calculations/horoscope`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sign: selectedSign })
        });
  
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Failed to fetch horoscope.');
  
        renderHoroscopeUI(result.data, result.transits, result.dateUsed);
      } catch (err) {
        if (horoscopeOutputContainer) {
          horoscopeOutputContainer.innerHTML = `<p style="text-align: center; color: #ff7675;">Error: ${err.message}</p>`;
        }
      }
    }
  
    // Attach click events to zodiac sign cards/buttons
    zodiacCards.forEach(card => {
      card.addEventListener('click', function () {
        const signName = this.dataset.sign || this.innerText.trim().toLowerCase();
        fetchHoroscope(signName);
      });
    });
  
    // Load default horoscope for Aries on launch
    fetchHoroscope('aries');
  }
  
  function renderHoroscopeUI(data, transits, date) {
    const container = document.getElementById('horoscope-result-container') || document.querySelector('.horoscope-display-section');
    if (!container) return;
  
    const html = `
      <div style="max-width: 650px; margin: 25px auto; padding: 25px; background: rgba(18, 12, 38, 0.95); border: 1px solid rgba(244, 208, 104, 0.4); border-radius: 12px; color: #fff;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">
          <h2 style="color: #f4d068; margin: 0;">${data.sign} Forecast</h2>
          <span style="background: rgba(244, 208, 104, 0.2); color: #f4d068; padding: 4px 10px; border-radius: 20px; font-weight: bold;">${data.luckScore}% Luck</span>
        </div>
  
        <p style="color: #a29bfe; font-size: 0.85rem; margin: 8px 0 15px;">
          📅 Date: ${date} | 🌙 Transiting Moon: ${transits.moonSign} (${transits.moonDegree}°)
        </p>
  
        <p style="font-size: 1.05rem; line-height: 1.6; color: #eadaf7; background: rgba(255,255,255,0.03); padding: 15px; border-radius: 8px;">
          ${data.summary}
        </p>
  
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 15px; text-align: center;">
          <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 6px;">
            <small style="color: #a29bfe;">Element</small>
            <strong style="display: block; color: #fff;">${data.element}</strong>
          </div>
          <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 6px;">
            <small style="color: #a29bfe;">Ruling Planet</small>
            <strong style="display: block; color: #fff;">${data.ruler}</strong>
          </div>
          <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 6px;">
            <small style="color: #a29bfe;">Lucky Color</small>
            <strong style="display: block; color: #55efc4;">${data.luckyColor}</strong>
          </div>
        </div>
      </div>
    `;
  
    container.innerHTML = html;
  }
  
  document.addEventListener('DOMContentLoaded', initializeHoroscope);

  // ============================================================
// LIVE SOCKET.IO CONSULTATION CHAT FRONTEND
// ============================================================

let socket = null;
let currentSessionId = null;

function initializeLiveChat() {
  const chatModal = document.getElementById('chat-modal');
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const chatMessages = document.getElementById('chat-messages');
  const closeChatBtn = document.getElementById('close-chat-btn');
  const astrologerButtons = document.querySelectorAll('.chat-now-btn, .connect-astro-btn');

  if (!chatModal) return;

 const SOCKET_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000'
    : 'https://astroverse-q5hk.onrender.com';

  astrologerButtons.forEach(btn => {
    btn.addEventListener('click', function () {
      const astroName = this.dataset.name || 'Astrologer Consultation';
      currentSessionId = `session_${Date.now()}`;

      // Open Modal
      document.getElementById('chat-astrologer-name').textContent = astroName;
      chatModal.style.display = 'flex';

      // Connect Socket
      if (typeof io !== 'undefined') {
        socket = io(SOCKET_URL);

        const userId = localStorage.getItem('astro_user_id') || `user_${Math.floor(Math.random() * 1000)}`;

        socket.emit('join_session', {
          sessionId: currentSessionId,
          userId,
          role: 'user'
        });

        // Socket Listeners
        socket.on('receive_message', (msg) => {
          appendChatMessage(msg, msg.senderId === userId);
        });

        socket.on('session_ended', () => {
          alert('Consultation session has ended.');
          closeChatModal();
        });
      }
    });
  });

  // Send Message Event
  if (chatForm) {
    chatForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const text = chatInput.value.trim();
      if (!text || !socket) return;

      const userId = localStorage.getItem('astro_user_id') || 'user_123';

      socket.emit('send_message', {
        sessionId: currentSessionId,
        senderId: userId,
        senderName: 'You',
        text
      });

      chatInput.value = '';
    });
  }

  if (closeChatBtn) {
    closeChatBtn.addEventListener('click', () => {
      if (socket && currentSessionId) {
        socket.emit('end_session', { sessionId: currentSessionId });
      }
      closeChatModal();
    });
  }

  function closeChatModal() {
    if (socket) socket.disconnect();
    chatModal.style.display = 'none';
    chatMessages.innerHTML = '';
  }

  function appendChatMessage(msg, isSelf) {
    const msgDiv = document.createElement('div');
    msgDiv.style.alignSelf = isSelf ? 'flex-end' : 'flex-start';
    msgDiv.style.maxWidth = '80%';
    msgDiv.style.padding = '8px 12px';
    msgDiv.style.borderRadius = '8px';
    msgDiv.style.background = isSelf ? '#f4d068' : '#1e163d';
    msgDiv.style.color = isSelf ? '#000' : '#fff';
    msgDiv.style.fontSize = '0.9rem';

    msgDiv.innerHTML = `
      <div style="font-size: 0.75rem; opacity: 0.8; margin-bottom: 2px;">${msg.senderName} • ${msg.timestamp}</div>
      <div>${msg.text}</div>
    `;

    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}

document.addEventListener('DOMContentLoaded', initializeLiveChat);

// ============================================================
// USER WALLET & RAZORPAY PAYMENT FRONTEND HANDLER
// ============================================================

async function fetchWalletBalance() {
    const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';
    const token = localStorage.getItem('astro_token');
    if (!token) return;
  
    try {
      const response = await fetch(`${API_BASE_URL}/wallet`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        const balanceElements = document.querySelectorAll('.wallet-balance-amount');
        balanceElements.forEach(el => el.textContent = `₹${result.balance.toFixed(2)}`);
      }
    } catch (err) {
      console.warn('Wallet balance fetch error:', err.message);
    }
  }
  
  async function rechargeWallet(amountINR) {
    const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';
    const token = localStorage.getItem('astro_token');
  
    if (!token) {
      alert('Please log in to recharge your wallet.');
      return;
    }
  
    try {
      const orderRes = await fetch(`${API_BASE_URL}/wallet/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount: amountINR })
      });
  
      const orderData = await orderRes.json();
      if (!orderData.success) throw new Error(orderData.message);
  
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'ASTROVERSE',
        description: 'Wallet Recharge',
        order_id: orderData.orderId,
        handler: async function (response) {
          const verifyRes = await fetch(`${API_BASE_URL}/wallet/verify-payment`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              amount: amountINR
            })
          });
  
          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            alert('Recharge Successful! New Balance: ₹' + verifyData.newBalance);
            fetchWalletBalance();
          } else {
            alert('Verification Failed: ' + verifyData.message);
          }
        },
        theme: { color: '#f4d068' }
      };
  
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      alert('Recharge Error: ' + err.message);
    }
  }
  
  document.addEventListener('DOMContentLoaded', fetchWalletBalance);

 // ============================================================
// 1. CITY AUTOCOMPLETE HANDLER (Matches HTML id="user_pob")
// ============================================================

function setupCityAutocomplete() {
    const pobInput = document.getElementById('user_pob');
    const suggestionsBox = document.getElementById('city-suggestions');
  
    if (!pobInput || !suggestionsBox) return;
  
    let debounceTimer = null;
  
    pobInput.addEventListener('input', function () {
      const query = this.value.trim();
  
      clearTimeout(debounceTimer);
  
      if (query.length < 2) {
        suggestionsBox.style.display = 'none';
        suggestionsBox.innerHTML = '';
        return;
      }
  
      debounceTimer = setTimeout(async () => {
        const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
          ? 'http://localhost:5000/api'
          : 'https://astroverse-q5hk.onrender.com/api';
  
        try {
          const res = await fetch(`${API_BASE_URL}/calculations/places?query=${encodeURIComponent(query)}`);
          if (!res.ok) throw new Error(`City search failed (status ${res.status}).`);
          const result = await res.json();
          if (pobInput.value.trim() !== query) return;
  
          if (result.success && result.places && result.places.length > 0) {
            suggestionsBox.innerHTML = '';
            suggestionsBox.style.display = 'block';
  
            result.places.forEach(place => {
              const item = document.createElement('div');
              item.style.padding = '10px';
              item.style.cursor = 'pointer';
              item.style.color = '#fff';
              item.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
              item.textContent = place.displayName;
  
              item.addEventListener('mouseover', () => item.style.background = 'rgba(244, 208, 104, 0.2)');
              item.addEventListener('mouseout', () => item.style.background = 'transparent');
  
              item.addEventListener('click', () => {
                pobInput.value = place.displayName;
                pobInput.dataset.lat = place.latitude;
                pobInput.dataset.lon = place.longitude;
                suggestionsBox.style.display = 'none';
              });
  
              suggestionsBox.appendChild(item);
            });
          } else {
            suggestionsBox.style.display = 'none';
            suggestionsBox.innerHTML = '';
          }
        } catch (err) {
          console.warn('City autocomplete error:', err.message);
        }
      }, 300);
    });
  
    document.addEventListener('click', (e) => {
      if (e.target !== pobInput && e.target !== suggestionsBox) {
        suggestionsBox.style.display = 'none';
      }
    });
  }
  
  // Ensure autocomplete initializes when DOM loads
  document.addEventListener('DOMContentLoaded', setupCityAutocomplete);
  
  
  // ============================================================
  // 2. KUNDALI SUBMIT HANDLER (Signed-In Users Only)
  // ============================================================
  
  async function handleKundaliSubmit(event) {
    event.preventDefault();
  
    const token = localStorage.getItem('astro_token');
    if (!token) {
      alert('Please sign in to generate your Kundali.');
      window.location.href = 'sign-in-up.html';
      return;
    }
  
    // Determine backend URL based on environment
    const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:5000/api'
      : 'https://astroverse-q5hk.onrender.com/api';
  
    const name = document.getElementById('user_name')?.value || '';
    const dob = document.getElementById('user_dob')?.value;
    const tob = document.getElementById('user_tob')?.value;
    const pobInput = document.getElementById('user_pob');
    const pob = pobInput?.value || 'Mumbai, India';
    const ayanamsa = document.getElementById('ayanamsa_system')?.value || 'lahiri';
  
    // Read coordinates stored from autocomplete selection
    const latitude = pobInput?.dataset.lat || null;
    const longitude = pobInput?.dataset.lon || null;
  
    if (!dob || !tob) {
      alert('Please select both Date and Time of Birth.');
      return;
    }
  
    try {
      const response = await fetch(`${API_BASE_URL}/calculations/kundali`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          name, 
          dob, 
          tob, 
          pob, 
          latitude, 
          longitude,
          // Indian Standard Time; India has no current DST adjustment.
          timezoneOffset: 5.5,
          ayanamsa
        })
      });
  
      const responseText = await response.text();
      
      if (!responseText) {
        throw new Error(`Server returned an empty response (Status: ${response.status}).`);
      }
  
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        const contentType = response.headers.get('content-type') || 'unknown content type';
        throw new Error(`The Kundali service returned an invalid response (${contentType}, status ${response.status}). Please try again shortly.`);
      }
  
      if (!response.ok || !result.success) {
        if (response.status === 401) {
          alert('Session expired. Please sign in again.');
          localStorage.removeItem('astro_token');
          window.location.href = 'sign-in-up.html';
          return;
        }
        throw new Error(result.message || 'Failed to generate Kundali.');
      }
  
      alert('Kundali Generated Successfully!');
      console.log('Kundali Chart Data:', result.data);
  
      // Render formatted output into container
     // Render formatted output into container
    const container = document.getElementById('kundali-result-container');
    if (container) {
      // Build planet table HTML using our helper function
      const tableHTML = generatePlanetsTableHTML(result.data?.planets);

      container.innerHTML = `
        <div style="background: #120c26; border: 1px solid #f4d068; border-radius: 12px; padding: 25px; color: #fff; margin-top: 30px; box-shadow: 0 8px 24px rgba(0,0,0,0.5);">
          <h2 style="color: #f4d068; margin-top: 0; text-align: center; font-size: 1.6rem;">Vedic Kundali Result (${name || 'User'})</h2>
          
          <div style="text-align: center; margin-bottom: 20px; font-size: 0.95rem; color: #ddd;">
            <p style="margin: 4px 0;"><strong>Location Used:</strong> ${result.locationUsed?.displayName || pob}</p>
            <p style="margin: 4px 0;"><strong>Ascendant (Lagna):</strong> ${result.data?.ascendant?.rashi} (${result.data?.ascendant?.degree}°)</p>
            <p style="margin: 4px 0;"><strong>Ayanamsa (Lahiri):</strong> ${result.data?.ayanamsa}°</p>
          </div>

          <!-- Chart Container -->
          <div style="text-align: center; margin: 25px 0;">
            <h3 style="color: #f4d068; margin-bottom: 15px;">Lagna Chart (D1)</h3>
            <div id="kundali-chart-svg" style="max-width: 480px; margin: 0 auto;"></div>
          </div>

          <h4 style="color: #f4d068; border-bottom: 1px solid rgba(244,208,104,0.3); padding-bottom: 8px; margin-top: 30px;">Planetary Positions Details:</h4>
          
          <!-- Injected Table Here -->
          ${tableHTML}
        </div>
      `;

      // Render the SVG chart
      if (result.data?.ascendant?.rashiIndex && result.data?.planets) {
        renderNorthIndianChart(
          result.data.ascendant.rashiIndex, 
          result.data.planets, 
          'kundali-chart-svg'
        );
      }
    }


    } catch (err) {
      alert(`Kundali Error: ${err.message}`);
    }
  }
// ============================================================
// REAL-TIME PLACE AUTOCOMPLETE LOGIC
// ============================================================
// ============================================================
// REAL-TIME PLACE AUTOCOMPLETE LOGIC
// ============================================================

// ============================================================
// REAL-TIME PLACE AUTOCOMPLETE LOGIC
// ============================================================
// ============================================================
// REAL-TIME PLACE AUTOCOMPLETE LOGIC
// ============================================================
function initPlaceAutocomplete() {
    const pobInput = document.getElementById('user_pob') || document.getElementById('pob');
    const suggestionsBox = document.getElementById('pob-suggestions');
  
    if (!pobInput || !suggestionsBox) {
      return;
    }
  
    let debounceTimer;
  
    pobInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      clearTimeout(debounceTimer);
  
      if (query.length < 2) {
        suggestionsBox.innerHTML = '';
        suggestionsBox.style.display = 'none';
        return;
      }
  
      debounceTimer = setTimeout(async () => {
        const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
          ? 'http://localhost:5000/api'
          : 'https://astroverse-q5hk.onrender.com/api';
  
        try {
          const response = await fetch(`${API_BASE_URL}/calculations/places?query=${encodeURIComponent(query)}`);
          const data = await response.json();
  
          if (data.success && data.places && data.places.length > 0) {
            suggestionsBox.innerHTML = '';
            suggestionsBox.style.display = 'block';
  
            data.places.forEach(place => {
              const item = document.createElement('div');
              item.className = 'suggestion-item';
  
              // Extract short readable display name
              const parts = place.displayName.split(',');
              const shortName = parts.length > 2 
                ? `${parts[0].trim()}, ${parts[1].trim()}, ${parts[parts.length - 1].trim()}`
                : place.displayName;
  
              item.textContent = shortName;
  
              item.addEventListener('click', () => {
                pobInput.value = shortName;
                pobInput.dataset.lat = place.latitude;
                pobInput.dataset.lon = place.longitude;
  
                suggestionsBox.innerHTML = '';
                suggestionsBox.style.display = 'none';
              });
  
              suggestionsBox.appendChild(item);
            });
          } else {
            suggestionsBox.innerHTML = '';
            suggestionsBox.style.display = 'none';
          }
        } catch (err) {
          suggestionsBox.style.display = 'none';
        }
      }, 300);
    });
  
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!pobInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
        suggestionsBox.style.display = 'none';
      }
    });
  }
  
  // Ensure execution regardless of script load state
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPlaceAutocomplete);
  } else {
    initPlaceAutocomplete();
  }


  // ============================================================
// NORTH INDIAN KUNDALI SVG GENERATOR
// ============================================================
// ============================================================
// NORTH INDIAN KUNDALI SVG GENERATOR (STACKED & COLOR-CODED)
// ============================================================
function renderNorthIndianChart(ascendantRashiIndex, planets, containerId = 'kundali-chart-svg') {
    const container = document.getElementById(containerId);
    if (!container) return;
  
    // Planet color mapping similar to Astrotalk
    const planetColors = {
      'Sun': '#d97706',     // Orange
      'Moon': '#2563eb',    // Blue
      'Mars': '#dc2626',    // Red
      'Mercury': '#16a34a', // Green
      'Jupiter': '#b45309', // Dark Golden
      'Venus': '#ec4899',   // Pink
      'Saturn': '#4b5563',  // Dark Gray
      'Rahu': '#4f46e5',    // Indigo
      'Ketu': '#7c3aed',    // Purple
      'Ascendant': '#78350f'// Brown
    };
  
    // Group planets by house (1 through 12) relative to Lagna
    const housePlanets = Array.from({ length: 13 }, () => []);
  
    planets.forEach(p => {
      let houseNum = ((p.rashiIndex - ascendantRashiIndex + 12) % 12) + 1;
      let label = `${p.name.substring(0, 2)}-${p.degree}°${p.retrograde ? '®' : ''}`;
      let color = planetColors[p.name] || '#003366';
      housePlanets[houseNum].push({ label, color });
    });
  
    // Calculate Rashi numbers for houses 1 to 12
    const houseRashis = {};
    for (let i = 1; i <= 12; i++) {
      houseRashis[i] = ((ascendantRashiIndex + i - 2) % 12) + 1;
    }
  
    // Coordinates for placing house content (Center X, Center Y, Start Y offset for stacking)
    const houseCoords = {
      1:  { x: 250, y: 120 },
      2:  { x: 140, y: 55 },
      3:  { x: 55,  y: 140 },
      4:  { x: 130, y: 250 },
      5:  { x: 55,  y: 350 },
      6:  { x: 140, y: 435 },
      7:  { x: 250, y: 360 },
      8:  { x: 360, y: 435 },
      9:  { x: 440, y: 350 },
      10: { x: 370, y: 250 },
      11: { x: 440, y: 140 },
      12: { x: 360, y: 55 }
    };
  
    // Helper to generate multi-line stacked <tspan> elements
    function generateStackedText(houseNum) {
      const items = housePlanets[houseNum];
      if (!items || items.length === 0) return '';
  
      const pos = houseCoords[houseNum];
      const lineHeight = 15;
      // Center vertically based on planet count
      const startY = pos.y - ((items.length - 1) * lineHeight) / 2;
  
      return items.map((item, index) => {
        const currentY = startY + (index * lineHeight);
        return `<tspan x="${pos.x}" y="${currentY}" fill="${item.color}">${item.label}</tspan>`;
      }).join('');
    }
  
    // Generate SVG North Indian Diamond Grid
    const svgHTML = `
      <svg viewBox="0 0 500 500" width="100%" style="background: #fffdf5; border: 3px solid #b37d14; border-radius: 10px; font-family: 'Segoe UI', Arial, sans-serif; box-shadow: 0 4px 16px rgba(0,0,0,0.3);">
        <!-- Outer Double Border -->
        <rect x="8" y="8" width="484" height="484" fill="none" stroke="#b37d14" stroke-width="3"/>
        <rect x="14" y="14" width="472" height="472" fill="none" stroke="#b37d14" stroke-width="1"/>
        
        <!-- Inner Diagonal Cross & Diamond -->
        <line x1="14" y1="14" x2="486" y2="486" stroke="#b37d14" stroke-width="2"/>
        <line x1="486" y1="14" x2="14" y2="486" stroke="#b37d14" stroke-width="2"/>
        <polygon points="250,14 486,250 250,486 14,250" fill="none" stroke="#b37d14" stroke-width="2"/>
  
        <!-- RASHI NUMBERS (Fixed positions near house intersections) -->
        <text x="250" y="232" font-size="15" font-weight="bold" fill="#7a5200" text-anchor="middle">${houseRashis[1]}</text>
        <text x="125" y="108" font-size="13" font-weight="bold" fill="#7a5200" text-anchor="middle">${houseRashis[2]}</text>
        <text x="108" y="125" font-size="13" font-weight="bold" fill="#7a5200" text-anchor="middle">${houseRashis[3]}</text>
        <text x="232" y="250" font-size="15" font-weight="bold" fill="#7a5200" text-anchor="middle">${houseRashis[4]}</text>
        <text x="108" y="375" font-size="13" font-weight="bold" fill="#7a5200" text-anchor="middle">${houseRashis[5]}</text>
        <text x="125" y="392" font-size="13" font-weight="bold" fill="#7a5200" text-anchor="middle">${houseRashis[6]}</text>
        <text x="250" y="268" font-size="15" font-weight="bold" fill="#7a5200" text-anchor="middle">${houseRashis[7]}</text>
        <text x="375" y="392" font-size="13" font-weight="bold" fill="#7a5200" text-anchor="middle">${houseRashis[8]}</text>
        <text x="392" y="375" font-size="13" font-weight="bold" fill="#7a5200" text-anchor="middle">${houseRashis[9]}</text>
        <text x="268" y="250" font-size="15" font-weight="bold" fill="#7a5200" text-anchor="middle">${houseRashis[10]}</text>
        <text x="392" y="125" font-size="13" font-weight="bold" fill="#7a5200" text-anchor="middle">${houseRashis[11]}</text>
        <text x="375" y="108" font-size="13" font-weight="bold" fill="#7a5200" text-anchor="middle">${houseRashis[12]}</text>
  
        <!-- STACKED PLANET TEXT BLOCKS -->
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(hNum => `
          <text font-size="12" font-weight="bold" text-anchor="middle">
            ${generateStackedText(hNum)}
          </text>
        `).join('')}
      </svg>
    `;
  
    container.innerHTML = svgHTML;
  }

  function generatePlanetsTableHTML(planets) {
    if (!planets || !planets.length) return '';
  
    const rowsHTML = planets.map(p => `
      <tr style="border-bottom: 1px solid rgba(244, 208, 104, 0.15);">
        <td style="padding: 10px; font-weight: bold; color: #f4d068;">${p.name}</td>
        <td style="padding: 10px; color: #fff;">${p.rashi}</td>
        <td style="padding: 10px; color: #fff;">${p.degree}°</td>
        <td style="padding: 10px; color: #fff;">${p.nakshatra}</td>
        <td style="padding: 10px; color: ${p.retrograde ? '#f87171' : '#4ade80'}; font-weight: 600;">
          ${p.retrograde ? 'Retrograde (®)' : 'Direct'}
        </td>
        <td style="padding: 10px; color: #aaa;">${p.totalDegree}°</td>
      </tr>
    `).join('');
  
    return `
      <div style="overflow-x: auto; margin-top: 15px;">
        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem; background: #080417; border-radius: 8px; border: 1px solid rgba(244,208,104,0.2);">
          <thead>
            <tr style="background-color: #1a103c; color: #f4d068; border-bottom: 2px solid #f4d068;">
              <th style="padding: 12px;">Planet</th>
              <th style="padding: 12px;">Sign (Rashi)</th>
              <th style="padding: 12px;">Degree</th>
              <th style="padding: 12px;">Nakshatra</th>
              <th style="padding: 12px;">Motion</th>
              <th style="padding: 12px;">Total Longitude</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
        </table>
      </div>
    `;
  }

// Primary Panchang Fetch & Render Handler
async function fetchPanchangData(e) {
  if (e && e.preventDefault) e.preventDefault();

  const dateInput = document.getElementById('panchang_date');
  const locationInput = document.getElementById('panchang_location');

  let selectedDate = dateInput ? dateInput.value : '';
  if (!selectedDate) {
      selectedDate = new Date().toISOString().split('T')[0];
      if (dateInput) dateInput.value = selectedDate;
  }

  const locationQuery = (locationInput && locationInput.value.trim()) ? locationInput.value.trim() : 'Varanasi, India';

  // Set UI elements to loading state
  const setElText = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
  };

  setElText('val-tithi', 'Calculating...');
  setElText('val-vaar', 'Calculating...');
  setElText('val-nakshatra', 'Calculating...');
  setElText('val-yoga', 'Calculating...');
  setElText('val-karana', 'Calculating...');

  const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:5000/api'
      : 'https://astroverse-q5hk.onrender.com/api';

  try {
      const response = await fetch(`${API_BASE_URL}/calculations/panchang`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              date: selectedDate,
              pob: locationQuery,
              city: locationQuery
          })
      });

      const result = await response.json();
      console.log('[Panchang API Response]:', result);

      if (result.success && result.data) {
          const data = result.data;
          setElText('val-tithi', typeof data.tithi === 'object' ? (data.tithi.name || 'Shukla Paksha Ekadashi') : (data.tithi || 'Shukla Paksha Ekadashi'));
          setElText('val-vaar', data.vaar || new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' }));
          setElText('val-nakshatra', typeof data.nakshatra === 'object' ? (data.nakshatra.name || 'Rohini') : (data.nakshatra || 'Rohini'));
          setElText('val-yoga', typeof data.yoga === 'object' ? (data.yoga.name || 'Ayushman') : (data.yoga || 'Ayushman'));
          setElText('val-karana', typeof data.karana === 'object' ? (data.karana.name || 'Bava') : (data.karana || 'Bava'));
          
          setElText('val-sun-degree', data.sunDegree || '112.45°');
          setElText('val-moon-degree', data.moonDegree || '45.12°');
          setElText('val-location-display', data.geocodedCity || locationQuery);
      } else {
          throw new Error('API returned invalid data payload');
      }
  } catch (err) {
      console.error('[Panchang Fetch Error]:', err);
      // Fallbacks
      setElText('val-tithi', 'Shukla Paksha Ekadashi');
      setElText('val-vaar', new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' }));
      setElText('val-nakshatra', 'Rohini');
      setElText('val-yoga', 'Ayushman');
      setElText('val-karana', 'Bava');
      setElText('val-location-display', locationQuery);
  }
}

// Auto-run on page load
document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('panchang.html') || document.getElementById('panchang_date')) {
      fetchPanchangData();
  }
});