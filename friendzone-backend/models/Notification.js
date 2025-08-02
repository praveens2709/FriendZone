// models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: {
    type: String,
    // ADDED 'game_invite' and 'game_activity'
    enum: ['knock', 'knock_accepted', 'activity', 'message', 'game_invite', 'game_activity'],
    required: true,
  },
  content: { type: String, required: true },
  relatedEntityId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'relatedEntityType',
  },
  relatedEntityType: {
    type: String,
    // ADDED 'GameSession'
    enum: ['User', 'Post', 'Story', 'Comment', 'Knock', 'GameSession'],
  },
  isRead: { type: Boolean, default: false },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);