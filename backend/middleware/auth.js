const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function requireAuth(req, res, next) {
  try {
    const header = String(req.headers.authorization || '');
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Please sign in first.' });
    if (!process.env.JWT_SECRET) return res.status(500).json({ message: 'Authentication is not configured.' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(payload.userId).select('-password');
    if (!req.user) return res.status(401).json({ message: 'Account not found.' });
    next();
  } catch (error) {
    res.status(401).json({ message: 'Your session is invalid or expired.' });
  }
}

function allowRoles(...roles) {
  return function (req, res, next) {
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'You do not have permission for this action.' });
    next();
  };
}

module.exports = { requireAuth, allowRoles };
