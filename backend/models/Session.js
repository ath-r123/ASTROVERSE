const mongoose = require('mongoose');

module.exports = mongoose.model('Session', new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  astrologer: { type: mongoose.Schema.Types.ObjectId, ref: 'Astrologer', required: true },
  type: { type: String, enum: ['chat', 'call'], required: true },
  status: { type: String, enum: ['requested', 'active', 'completed', 'cancelled'], default: 'requested' }
}, { timestamps: true }));
