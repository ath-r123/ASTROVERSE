const express = require('express');
const Review = require('../models/Review');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const reviews = await Review.find().populate('author', 'name').sort({ createdAt: -1 }).limit(50);
    res.json({ reviews });
  } catch (error) { next(error); }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { rating, comment, location } = req.body;
    const review = await Review.create({ author: req.user._id, rating, comment, location });
    await review.populate('author', 'name');
    res.status(201).json({ review });
  } catch (error) { next(error); }
});

module.exports = router;
