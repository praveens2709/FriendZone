import mongoose from 'mongoose';
import { clearOnWrite, relationCache } from '../services/cacheInvalidation.js';

const blockSchema = new mongoose.Schema(
  {
    blocker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    blocked: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

blockSchema.index({ blocker: 1, blocked: 1 }, { unique: true });
blockSchema.index({ blocked: 1 });

clearOnWrite(blockSchema, relationCache);

export default mongoose.model('Block', blockSchema);
