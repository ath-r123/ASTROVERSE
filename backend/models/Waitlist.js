const mongoose = require('mongoose');

module.exports = mongoose.model('Waitlist', new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  astrologer: { type: mongoose.Schema.Types.ObjectId, ref: 'Astrologer', required: true },
  notified: { type: Boolean, default: false }
}, { timestamps: true }));
