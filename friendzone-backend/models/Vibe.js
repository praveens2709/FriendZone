import mongoose from 'mongoose';

export const VIBE_KINDS = [
  'free_tonight',
  'studying',
  'coffee',
  'game_night',
  'chilling',
  'need_company',
  'busy',
];

const vibeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    kind: { type: String, enum: VIBE_KINDS, required: true },
    note: { type: String, trim: true, maxlength: 80, default: '' },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

vibeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('Vibe', vibeSchema);
