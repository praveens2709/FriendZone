import mongoose from 'mongoose';

const storySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['image', 'video', 'text'], required: true },
    mediaUrl: { type: String },
    publicId: { type: String },
    resourceType: { type: String },
    text: { type: String, trim: true, maxlength: 300, default: '' },
    gradient: { type: [String], default: [] },
    textColor: { type: String, default: '#FFFFFF' },
    textX: { type: Number, default: 0.5, min: 0.05, max: 0.95 },
    textY: { type: Number, default: 0.5, min: 0.08, max: 0.92 },
    duration: { type: Number, default: 5000, min: 2000, max: 30000 },
    audience: { type: String, enum: ['circle', 'close'], default: 'circle' },
    viewers: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        at: { type: Date, default: Date.now },
        _id: false,
      },
    ],
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

storySchema.index({ user: 1, expiresAt: 1 });

export default mongoose.model('Story', storySchema);
