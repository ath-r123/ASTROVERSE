const mongoose = require('mongoose');

module.exports = mongoose.model('Calculation', new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['kundali', 'matching', 'compatibility', 'friendship', 'mulank', 'numerology'], required: true },
  input: { type: mongoose.Schema.Types.Mixed, required: true },
  result: { type: mongoose.Schema.Types.Mixed, required: true }
}, { timestamps: true }));
