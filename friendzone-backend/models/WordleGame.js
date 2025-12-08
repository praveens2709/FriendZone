import mongoose from 'mongoose';

const wordleGameSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: String, // Format: YYYY-MM-DD
    required: true,
    index: true
  },
  word: {
    type: String,
    required: true,
    uppercase: true
  },
  guesses: [{
    type: String,
    uppercase: true
  }],
  won: {
    type: Boolean,
    default: false
  },
  attempts: {
    type: Number,
    default: 0
  },
  streak: {
    type: Number,
    default: 0
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Compound index for unique game per user per day
wordleGameSchema.index({ userId: 1, date: 1 }, { unique: true });

const WordleGame = mongoose.model('WordleGame', wordleGameSchema);

export default WordleGame;