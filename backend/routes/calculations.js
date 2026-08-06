const express = require('express');
const Calculation = require('../models/Calculation');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { type, input, result } = req.body;
    const calculation = await Calculation.create({ owner: req.user._id, type, input, result });
    res.status(201).json({ calculation });
  } catch (error) { next(error); }
});

router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const calculations = await Calculation.find({ owner: req.user._id }).sort({ createdAt: -1 });
    res.json({ calculations });
  } catch (error) { next(error); }
});

module.exports = router;
