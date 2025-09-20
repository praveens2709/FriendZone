import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: {
    type: String,
    enum: ['knock', 'knock_accepted', 'activity', 'message', 'game_invite', 'game_activity', 'knock_request'], // ADDED 'knock_request'
    required: true,
  },
  content: { type: String, required: true },
  relatedEntityId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'relatedEntityType',
  },
  relatedEntityType: {
    type: String,
    enum: ['User', 'Post', 'Story', 'Comment', 'Knock', 'GameSession'],
  },
  isRead: { type: Boolean, default: false },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);