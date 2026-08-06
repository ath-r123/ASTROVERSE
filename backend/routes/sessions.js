const express = require('express');
const Session = require('../models/Session');
const Waitlist = require('../models/Waitlist');
const Astrologer = require('../models/Astrologer');
const { requireAuth, allowRoles } = require('../middleware/auth');
const router = express.Router();

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { astrologerId, type } = req.body;
    const astrologer = await Astrologer.findOne({ _id: astrologerId, approved: true });
    if (!astrologer) return res.status(404).json({ message: 'Astrologer not found.' });
    if (astrologer.status !== 'online') return res.status(409).json({ message: 'This astrologer is not available. Join the waitlist instead.' });
    const session = await Session.create({ customer: req.user._id, astrologer: astrologer._id, type });
    res.status(201).json({ message: 'Session requested.', session });
  } catch (error) { next(error); }
});

router.post('/waitlist', requireAuth, async (req, res, next) => {
  try {
    const { astrologerId } = req.body;
    const entry = await Waitlist.findOneAndUpdate(
      { customer: req.user._id, astrologer: astrologerId }, {}, { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.status(201).json({ message: 'You were added to the waitlist.', entry });
  } catch (error) { next(error); }
});

router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const query = req.user.role === 'astrologer' ? { astrologer: await Astrologer.findOne({ user: req.user._id }) } : { customer: req.user._id };
    const sessions = await Session.find(query).populate('customer', 'name').populate({ path: 'astrologer', populate: { path: 'user', select: 'name' } }).sort({ createdAt: -1 });
    res.json({ sessions });
  } catch (error) { next(error); }
});

router.patch('/:id/status', requireAuth, allowRoles('astrologer', 'admin'), async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found.' });

    if (req.user.role === 'astrologer') {
      const profile = await Astrologer.findOne({ user: req.user._id });
      if (!profile || !session.astrologer.equals(profile._id)) {
        return res.status(403).json({ message: 'You can only update your own sessions.' });
      }
    }

    session.status = req.body.status;
    await session.save();
    res.json({ session });
  } catch (error) { next(error); }
});

module.exports = router;
