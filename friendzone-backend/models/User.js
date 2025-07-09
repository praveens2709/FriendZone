const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  otp: String,
  otpExpires: Date,
  theme: { type: String, default: 'light' },

  firstName: String,
  lastName: String,
  gender: String,
  dob: Date,
  bio: String,
  phone: String,
  profileImage: String,
  additionalImages: [String],
  isPrivate: { type: Boolean, default: false },

  chats: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
  }],
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);