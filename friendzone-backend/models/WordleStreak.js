import mongoose from 'mongoose';

const wordleStreakSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  currentStreak: {
    type: Number,
    default: 0
  },
  longestStreak: {
    type: Number,
    default: 0
  },
  lastPlayedDate: {
    type: String,
    default: null
  },
  totalGamesPlayed: {
    type: Number,
    default: 0
  },
  totalGamesWon: {
    type: Number,
    default: 0
  },
  winPercentage: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

const WordleStreak = mongoose.model('WordleStreak', wordleStreakSchema);

export default WordleStreak;