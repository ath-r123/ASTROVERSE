const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const createToken = (user) => jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
const cleanText = (value, maxLength) => String(value || '').trim().replace(/[<>]/g, '').slice(0, maxLength);
const cleanEmail = (value) => cleanText(value, 254).toLowerCase();

router.post('/register', async (req, res, next) => {
  try {
    const name = cleanText(req.body.name, 80);
    const email = cleanEmail(req.body.email);
    const password = String(req.body.password || '');
    const role = cleanText(req.body.role || 'user', 20);
    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email, and password are required.' });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
    if (password.length < 8 || password.length > 128) return res.status(400).json({ message: 'Password must be 8 to 128 characters.' });
    if (!['user', 'astrologer'].includes(role)) return res.status(400).json({ message: 'Invalid account role.' });
    if (await User.exists({ email })) return res.status(409).json({ message: 'An account with this email already exists.' });

    const user = await User.create({ name, email, password, role });
    res.status(201).json({ token: createToken(user), user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) { next(error); }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = cleanEmail(req.body.email);
    const password = String(req.body.password || '');
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchesPassword(password))) return res.status(401).json({ message: 'Email or password is incorrect.' });
    res.json({ token: createToken(user), user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) { next(error); }
});

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));
module.exports = router;
