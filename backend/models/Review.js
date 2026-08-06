const mongoose = require('mongoose');

module.exports = mongoose.model('Review', new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true, trim: true, maxlength: 1000 },
  location: { type: String, trim: true, maxlength: 100 }
}, { timestamps: true }));
