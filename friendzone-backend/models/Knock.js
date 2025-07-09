const mongoose = require('mongoose');

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

module.exports = mongoose.model('Knock', KnockSchema);
