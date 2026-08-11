# ASTROVERSE 🌌

A full-stack web application built to bring Vedic astrology calculations, live consultations, and daily horoscope insights into a single web platform.

I built this project to combine traditional astrological calculations (like Swiss Ephemeris calculations, Ashtakoota 36-Guna matching, and Panchang parameters) with real-time user-to-astrologer interaction.

---

## 🚀 Features

* **Live Consultations**: Real-time chat and consultation sessions between users and verified astrologers using WebSockets (`socket.io`).
* **Vedic Panchang**: Daily calculations for Tithi, Vaar, Nakshatra, Yoga, Karana, Abhijit Muhurat, and Rahu Kaal.
* **Kundali & Kundali Matching**: Generates planetary chart positions and calculates 36-Guna Ashtakoota matching scores based on exact birth coordinates.
* **Astrologer Directory & Onboarding**: Astrologer profile verification workflow with pricing, ratings, specialties, and approval status tracking.
* **Calculators**: Love, friendship, name numerology, and Mulank calculators.
* **Wallet System**: Wallet management API for per-minute chat/call consultation sessions.

---

## 🛠️ Tech Stack

### Frontend
* **HTML5 / CSS3**: Custom responsive styling with modular stylesheets (`astrologers.css`, `panchang.css`, `header.css`, `footer.css`).
* **JavaScript (ES6+)**: Vanilla JS for dynamic DOM updates, asynchronous API integration, and Socket.io client setup.

### Backend
* **Node.js & Express.js**: RESTful API routes handling calculations, user authentication, astrologer profiles, and session events.
* **MongoDB & Mongoose**: Schemas for users, astrologers, calculation history, chat sessions, reviews, and wallet transactions.
* **Socket.io**: Real-time WebSocket connection for live consultation messaging.
* **OpenStreetMap Nominatim API**: Free geocoding integration to resolve birth city names into precise latitude and longitude coordinates.

---

## 📁 Project Architecture

```text
ASTROVERSE/
├── backend/
│   ├── config/          # Database connection setup
│   ├── middleware/      # JWT Authentication & error handling
│   ├── models/          # Mongoose models (User, Astrologer, Session, etc.)
│   ├── routes/          # Express API routes
│   ├── utils/           # Astronomical calculations & Ephemeris engines
│   ├── package.json     # Node.js backend dependencies
│   └── server.js        # Main Express server entry point
└── frontend/            # Static client files (HTML, CSS, script.js)
