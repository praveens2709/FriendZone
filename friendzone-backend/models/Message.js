import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['user', 'system'],
    default: 'user',
  },
  text: {
    type: String,
    trim: true,
  },
  attachments: [{
    type: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
    },
    size: {
      type: Number,
    },
    duration: {
      type: Number
    }
  }],
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null,
  },
  reactions: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    emoji: { type: String, required: true, maxlength: 16 },
  }],
  editedAt: {
    type: Date,
    default: null,
  },
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  deletedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
}, { timestamps: true });

messageSchema.pre('validate', function(next) {
  if (!this.text && (!this.attachments || this.attachments.length === 0)) {
    this.invalidate('text', 'A message must contain text or attachments.', this.text);
  }
  next();
});

export default mongoose.model('Message', messageSchema);