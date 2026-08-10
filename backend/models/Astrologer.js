const mongoose = require('mongoose');

const astrologerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, unique: true },
  specialties: [{ type: String, trim: true }],
  languages: [{ type: String, trim: true }],
  experience: { type: Number, min: 0, required: true },
  bio: { type: String, trim: true, maxlength: 1000 },
  pricePerMinute: { type: Number, min: 0, default: 0 },
  status: { type: String, enum: ['online', 'busy', 'offline'], default: 'offline' },
  approved: { type: Boolean, default: false },
  certificateUrl: String
}, { timestamps: true });

module.exports = mongoose.model('Astrologer', astrologerSchema);
