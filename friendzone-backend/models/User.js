import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, index: true },
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
  phone: { type: String, unique: true, sparse: true },
  profileImage: {
    url: String,
    public_id: String,
  },
  additionalImages: [{
    url: String,
    public_id: String,
  }],
  isPrivate: { type: Boolean, default: false },

  chats: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
  }],
}, { timestamps: true });

export default mongoose.model('User', userSchema);