import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    otp: String,
    otpPurpose: String,
    otpExpires: Date,
    otpAttempts: { type: Number, default: 0 },
    otpLockedUntil: Date,
    lastOtpSentAt: Date,
    pendingEmail: { type: String, lowercase: true, trim: true },
    termsAcceptedAt: Date,
    termsVersion: String,
    closeFriends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    tokenVersion: { type: Number, default: 0 },
    theme: { type: String, default: "light" },

    firstName: { type: String, trim: true, maxlength: 50 },
    lastName: { type: String, trim: true, maxlength: 50 },
    gender: String,
    dob: Date,
    bio: { type: String, trim: true, maxlength: 300 },
    phone: { type: String, unique: true, sparse: true },
    profileImage: String,
    profileImagePublicId: String,
    additionalImages: [
      {
        url: String,
        public_id: String,
      },
    ],
    isPrivate: { type: Boolean, default: false },
    savedPosts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
      },
    ],

    chats: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chat",
      },
    ],
    wordleStats: {
      currentStreak: {
        type: Number,
        default: 0,
      },
      longestStreak: {
        type: Number,
        default: 0,
      },
      totalGamesPlayed: {
        type: Number,
        default: 0,
      },
      totalGamesWon: {
        type: Number,
        default: 0,
      },
    },
  },
  { timestamps: true }
);

userSchema.index({ firstName: 1, lastName: 1 });

export default mongoose.model("User", userSchema);
