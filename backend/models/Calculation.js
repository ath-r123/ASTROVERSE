const mongoose = require('mongoose');

const calculationSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    enum: ['kundali', 'matching', 'compatibility', 'friendship', 'mulank', 'numerology'], 
    required: true 
  },
  input: { type: mongoose.Schema.Types.Mixed, required: true },
  result: { type: mongoose.Schema.Types.Mixed, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Calculation', calculationSchema);