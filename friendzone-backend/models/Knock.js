import mongoose from 'mongoose';
import { clearOnWrite, relationCache } from '../services/cacheInvalidation.js';

const KnockSchema = new mongoose.Schema({
  knocker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  knocked: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['pending', 'onesidedlock', 'lockedIn'],
    default: 'pending'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

KnockSchema.index({ knocker: 1, knocked: 1 }, { unique: true });
KnockSchema.index({ knocked: 1, status: 1 });
KnockSchema.index({ knocker: 1, status: 1 });

clearOnWrite(KnockSchema, relationCache);

export default mongoose.model('Knock', KnockSchema);