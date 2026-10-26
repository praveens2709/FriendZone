import mongoose from 'mongoose';

const storySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['image', 'video', 'text', 'post'], required: true },
    mediaUrl: { type: String },
    publicId: { type: String },
    resourceType: { type: String },
    text: { type: String, trim: true, maxlength: 300, default: '' },
    gradient: { type: [String], default: [] },
    textColor: { type: String, default: '#FFFFFF' },
    textX: { type: Number, default: 0.5, min: 0.05, max: 0.95 },
    textY: { type: Number, default: 0.5, min: 0.08, max: 0.92 },
    textStyle: {
      font: { type: String, enum: ['classic', 'modern', 'strong', 'serif', 'mono', 'script'], default: 'modern' },
      size: { type: Number, default: 28, min: 12, max: 72 },
      color: { type: String, default: '#FFFFFF' },
      bg: { type: String, enum: ['none', 'solid', 'soft'], default: 'soft' },
      align: { type: String, enum: ['left', 'center', 'right'], default: 'center' },
      _id: false,
    },
    stickers: {
      type: [
        {
          kind: { type: String, enum: ['emoji', 'mention', 'time'], required: true },
          text: { type: String, maxlength: 60, default: '' },
          userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          x: { type: Number, min: 0, max: 1, default: 0.5 },
          y: { type: Number, min: 0, max: 1, default: 0.5 },
          scale: { type: Number, min: 0.3, max: 6, default: 1 },
          rotation: { type: Number, min: -360, max: 360, default: 0 },
          _id: false,
        },
      ],
      default: [],
    },
    drawing: {
      type: [
        {
          color: { type: String, default: '#FFFFFF' },
          width: { type: Number, min: 0.002, max: 0.08, default: 0.01 },
          points: { type: [Number], default: [] },
          _id: false,
        },
      ],
      default: [],
    },
    filter: { type: String, enum: ['none', 'warm', 'cool', 'rose', 'sunset', 'fade', 'night'], default: 'none' },
    music: {
      title: { type: String, maxlength: 120 },
      artist: { type: String, maxlength: 120 },
      artwork: { type: String, maxlength: 400 },
      previewUrl: { type: String, maxlength: 400 },
      _id: false,
    },
    post: {
      postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
      image: { type: String },
      authorName: { type: String },
      authorAvatar: { type: String },
      caption: { type: String, maxlength: 200 },
      _id: false,
    },
    backdrop: { type: String, enum: ['moon', 'sunny', 'water', 'leaf', 'heart', 'rocket', ''], default: '' },
    cardX: { type: Number, default: 0.5, min: 0, max: 1 },
    cardY: { type: Number, default: 0.5, min: 0, max: 1 },
    cardScale: { type: Number, default: 1, min: 0.4, max: 3 },
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
