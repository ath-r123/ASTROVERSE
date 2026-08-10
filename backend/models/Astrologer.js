const mongoose = require('mongoose');

const astrologerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    default: null
  },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  specialties: [{ type: String }],
  languages: [{ type: String }],
  experience: { type: Number, default: 0 },
  bio: { type: String },
  pricePerMinute: { type: Number, default: 0 },
  certificateUrl: { type: String },
  approved: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Astrologer', astrologerSchema);
