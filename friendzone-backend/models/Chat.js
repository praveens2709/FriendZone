import mongoose from 'mongoose';

const unreadCountSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  count: {
    type: Number,
    default: 0,
  },
});

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
    required: function() {
      return this.type === 'group';
    },
  },
  groupAvatar: {
    type: String,
    default: null,
  },
  groupAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.type === 'group';
    },
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
  // New field to track if users are "locked in" (both have sent messages)
  isLockedIn: {
    type: Boolean,
    default: false,
  },
  // Track which participants have sent at least one message
  participantsWhoSentMessages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  unreadCounts: [unreadCountSchema],
  deletedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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

chatSchema.index({ participants: 1, type: 1 });
chatSchema.index({ "unreadCounts.user": 1 });

export default mongoose.model('Chat', chatSchema);