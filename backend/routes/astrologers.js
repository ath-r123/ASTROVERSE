const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const Astrologer = require('../models/Astrologer');
const { requireAuth, allowRoles } = require('../middleware/auth');

const router = express.Router();

// Helper Function: Append Row to Google Sheet
async function appendToGoogleSheet(data) {
  try {
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const rawPrivateKey = process.env.GOOGLE_PRIVATE_KEY;

    if (!spreadsheetId || !clientEmail || !rawPrivateKey) {
      console.warn('[Google Sheets Sync] Missing environment variables. Skipping sheet update.');
      return;
    }

    // Replace escaped newlines for cloud environments (Render, Heroku, Vercel)
    const privateKey = rawPrivateKey.replace(/\\n/g, '\n');

    const serviceAccountAuth = new JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(spreadsheetId, serviceAccountAuth);
    await doc.loadInfo();

    // Safely target sheet tab named 'Astrologer Signups', or default to the first tab
    let sheet = doc.sheetsByTitle['Astrologer Signups'];
    if (!sheet) {
      sheet = doc.sheetsByIndex[0];
    }

    if (!sheet) {
      console.error('[Google Sheets Sync Error] Target worksheet not found.');
      return;
    }

    // Append row matching exact Google Sheet column headers
    await sheet.addRow({
      'Timestamp': new Date().toISOString(),
      'Name': String(data.name || ''),
      'Email': String(data.email || ''),
      'Phone': String(data.phone || ''),
      'Languages': Array.isArray(data.languages) ? data.languages.join(', ') : String(data.languages || ''),
      'Experience': String(data.experience || 0),
      'Specialty': Array.isArray(data.specialties) ? data.specialties.join(', ') : String(data.specialties || ''),
      'Bio': String(data.bio || ''),
      'Certificate URL': String(data.certificateUrl || 'N/A')
    });

    console.log('[Google Sheets Sync Success] Appended row for:', data.name);
  } catch (err) {
    console.error('[Google Sheets Sync Error]', err);
  }
}

// Ensure 'uploads' directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `cert-${uniqueSuffix}${ext}`);
  }
});

// Multer File Filter & Limits
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB Maximum
  fileFilter: (req, file, cb) => {
    const allowedExtensions = /jpeg|jpg|png|pdf/;
    const extName = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
    const mimeType = allowedExtensions.test(file.mimetype);

    if (extName && mimeType) {
      return cb(null, true);
    }
    cb(new Error('Invalid file format. Only PDF, JPG, and PNG files are accepted.'));
  }
});

// GET /api/astrologers - Fetch approved astrologers with query filters
router.get('/', async (req, res, next) => {
  try {
    const { search, specialty, language, sort = 'popular' } = req.query;
    const filter = { approved: true };
    
    if (specialty) filter.specialties = new RegExp(specialty, 'i');
    if (language) filter.languages = new RegExp(language, 'i');
    
    const sortBy = sort === 'price_low' 
      ? { pricePerMinute: 1 } 
      : sort === 'experience' 
      ? { experience: -1 } 
      : { createdAt: -1 };

    let astrologers = await Astrologer.find(filter).populate('user', 'name').sort(sortBy);

    if (search) {
      astrologers = astrologers.filter((item) => {
        const userName = item.user?.name || '';
        const specs = Array.isArray(item.specialties) ? item.specialties.join(' ') : '';
        return `${userName} ${specs}`.toLowerCase().includes(search.toLowerCase());
      });
    }

    res.json({ astrologers });
  } catch (error) {
    next(error);
  }
});

// POST /api/astrologers/register - Public application submission with file upload
router.post('/register', upload.single('certificate'), async (req, res, next) => {
  try {
    const { name, email, phone, languages, experience, specialty, bio, pricePerMinute } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Convert comma-separated string inputs into arrays
    const parsedSpecialties = typeof specialty === 'string' 
      ? specialty.split(',').map(s => s.trim()) 
      : (specialty || []);

    const parsedLanguages = typeof languages === 'string' 
      ? languages.split(',').map(l => l.trim()) 
      : (languages || []);

    const certificateUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const profileData = {
      name,
      email: cleanEmail,
      phone,
      specialties: parsedSpecialties,
      languages: parsedLanguages,
      experience: Number(experience) || 0,
      bio,
      pricePerMinute: Number(pricePerMinute) || 0,
      approved: false
    };

    if (certificateUrl) {
      profileData.certificateUrl = certificateUrl;
    }

    let profile;

    // 1. Authenticated submission
    if (req.user && req.user._id) {
      profileData.user = req.user._id;
      profile = await Astrologer.findOneAndUpdate(
        { user: req.user._id },
        profileData,
        { new: true, upsert: true, runValidators: true }
      );
    } else {
      // 2. Unauthenticated public submission (upsert based on email)
      profile = await Astrologer.findOneAndUpdate(
        { email: cleanEmail },
        profileData,
        { new: true, upsert: true, runValidators: true }
      );
    }

    // Asynchronously log application entry to Google Sheet
    appendToGoogleSheet({
      name,
      email: cleanEmail,
      phone,
      languages: parsedLanguages,
      experience,
      specialties: parsedSpecialties,
      bio,
      certificateUrl
    });

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully. It is pending admin approval.',
      profile
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'An application with this email or user profile already exists.'
      });
    }
    next(error);
  }
});

// POST /api/astrologers/profile - Update profile for authenticated astrologers
router.post('/profile', requireAuth, allowRoles('astrologer'), upload.single('certificate'), async (req, res, next) => {
  try {
    const { specialties, languages, experience, bio, pricePerMinute } = req.body;

    const updateData = {
      specialties: typeof specialties === 'string' ? specialties.split(',').map(s => s.trim()) : specialties,
      languages: typeof languages === 'string' ? languages.split(',').map(l => l.trim()) : languages,
      experience: Number(experience),
      bio,
      pricePerMinute: Number(pricePerMinute)
    };

    if (req.file) {
      updateData.certificateUrl = `/uploads/${req.file.filename}`;
    }

    const profile = await Astrologer.findOneAndUpdate(
      { user: req.user._id },
      updateData,
      { new: true, upsert: true, runValidators: true }
    );

    res.status(201).json({ 
      success: true, 
      message: 'Profile saved. It is waiting for admin approval.', 
      profile 
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/astrologers/:id/approval - Admin toggle approval
router.patch('/:id/approval', requireAuth, allowRoles('admin'), async (req, res, next) => {
  try {
    const profile = await Astrologer.findByIdAndUpdate(
      req.params.id, 
      { approved: Boolean(req.body.approved) }, 
      { new: true }
    );

    if (!profile) return res.status(404).json({ message: 'Astrologer not found.' });

    res.json({ success: true, profile });
  } catch (error) {
    next(error);
  }
});

// GET /api/astrologers/pending - Fetch all unapproved astrologer applications for Admin verification
router.get('/pending', requireAuth, allowRoles('admin'), async (req, res, next) => {
  try {
    const pendingAstrologers = await Astrologer.find({ approved: false }).populate('user', 'name email phone');
    res.json({ success: true, count: pendingAstrologers.length, data: pendingAstrologers });
  } catch (error) {
    next(error);
  }
});

module.exports = router;