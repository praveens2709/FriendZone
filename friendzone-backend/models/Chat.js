const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }],
  type: {
    type: String,
    enum: ['private', 'group'],
    default: 'private',
  },
  name: {
    type: String,
    trim: true,
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
  },
  lastMessageAt: {
    type: Date,
    default: Date.now,
  },
  isRestricted: {
    type: Boolean,
    default: false,
  },
  firstMessageByKnockerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  unreadCounts: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    count: {
      type: Number,
      default: 0,
    },
  }],
}, { timestamps: true });

chatSchema.pre('save', async function(next) {
  if (this.isNew && this.type === 'private' && this.participants.length === 2) {
    const existingChat = await this.constructor.findOne({
      type: 'private',
      participants: { $all: this.participants.map(p => p._id || p) }
    });
    if (existingChat) {
      const error = new Error('A private chat between these two users already exists.');
      next(error);
      return;
    }
  }
  next();
});

module.exports = mongoose.model('Chat', chatSchema);