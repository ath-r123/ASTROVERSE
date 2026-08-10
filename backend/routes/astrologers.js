const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Astrologer = require('../models/Astrologer');
const { requireAuth, allowRoles } = require('../middleware/auth');
const router = express.Router();

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

    // Convert comma-separated string inputs into arrays if necessary
    const parsedSpecialties = typeof specialty === 'string' 
      ? specialty.split(',').map(s => s.trim()) 
      : (specialty || []);

    const parsedLanguages = typeof languages === 'string' 
      ? languages.split(',').map(l => l.trim()) 
      : (languages || []);

    const certificateUrl = req.file ? `/uploads/${req.file.filename}` : null;

    // Create or update registration entry
    const profileData = {
      specialties: parsedSpecialties,
      languages: parsedLanguages,
      experience: Number(experience) || 0,
      bio,
      pricePerMinute: Number(pricePerMinute) || 0,
      certificateUrl,
      approved: false
    };

    let profile;
    if (req.user) {
      profile = await Astrologer.findOneAndUpdate(
        { user: req.user._id },
        profileData,
        { new: true, upsert: true, runValidators: true }
      );
    } else {
      profile = await Astrologer.create(profileData);
    }

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully. It is pending admin approval.',
      profile
    });
  } catch (error) {
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