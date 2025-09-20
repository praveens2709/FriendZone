import mongoose from 'mongoose';
const { Schema } = mongoose;

const imageSchema = new Schema({
  url: { type: String, required: true },
  public_id: { type: String, required: true },
});

const commentSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
});

const postSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  images: { type: [imageSchema], required: true },
  caption: { type: String, trim: true, default: '' },
  location: { type: String, trim: true },
  song: {
    trackName: { type: String, trim: true },
    artistName: { type: String, trim: true },
    previewUrl: { type: String, trim: true },
  },
  likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  saves: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  shares: { type: Number, default: 0 },
  comments: [commentSchema],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Post', postSchema);