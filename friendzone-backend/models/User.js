const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  otp: String,
  otpExpires: Date,
  theme: { type: String, default: 'light' },

  // Profile Fields
  firstName: String,
  lastName: String,
  gender: String,
  dob: Date,
  bio: String,
  phone: String,
  profileImage: String,        // Single main profile image
  additionalImages: [String],  // Future support for gallery
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
