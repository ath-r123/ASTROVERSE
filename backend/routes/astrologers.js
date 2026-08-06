const express = require('express');
const Astrologer = require('../models/Astrologer');
const { requireAuth, allowRoles } = require('../middleware/auth');
const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { search, specialty, language, sort = 'popular' } = req.query;
    const filter = { approved: true };
    if (specialty) filter.specialties = new RegExp(specialty, 'i');
    if (language) filter.languages = new RegExp(language, 'i');
    const sortBy = sort === 'price_low' ? { pricePerMinute: 1 } : sort === 'experience' ? { experience: -1 } : { createdAt: -1 };
    let astrologers = await Astrologer.find(filter).populate('user', 'name').sort(sortBy);
    if (search) astrologers = astrologers.filter((item) => `${item.user.name} ${item.specialties.join(' ')}`.toLowerCase().includes(search.toLowerCase()));
    res.json({ astrologers });
  } catch (error) { next(error); }
});

router.post('/profile', requireAuth, allowRoles('astrologer'), async (req, res, next) => {
  try {
    const { specialties, languages, experience, bio, pricePerMinute, certificateUrl } = req.body;
    const profile = await Astrologer.findOneAndUpdate(
      { user: req.user._id },
      { specialties, languages, experience, bio, pricePerMinute, certificateUrl },
      { new: true, upsert: true, runValidators: true }
    );
    res.status(201).json({ message: 'Profile saved. It is waiting for admin approval.', profile });
  } catch (error) { next(error); }
});

router.patch('/:id/approval', requireAuth, allowRoles('admin'), async (req, res, next) => {
  try {
    const profile = await Astrologer.findByIdAndUpdate(req.params.id, { approved: Boolean(req.body.approved) }, { new: true });
    if (!profile) return res.status(404).json({ message: 'Astrologer not found.' });
    res.json({ profile });
  } catch (error) { next(error); }
});

module.exports = router;
