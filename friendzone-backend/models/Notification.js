import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: {
    type: String,
    enum: ['knock', 'knock_accepted', 'activity', 'message', 'game_invite', 'game_activity', 'knock_request', 'meeting_invite', 'post_like', 'post_comment'],
    required: true,
  },
  content: { type: String, required: true },
  relatedEntityId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'relatedEntityType',
  },
  relatedEntityType: {
    type: String,
    enum: ['User', 'Post', 'Story', 'Comment', 'Knock', 'GameSession', 'Meeting'],
  },
  isRead: { type: Boolean, default: false },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ relatedEntityType: 1, relatedEntityId: 1 });

export default mongoose.model('Notification', notificationSchema);