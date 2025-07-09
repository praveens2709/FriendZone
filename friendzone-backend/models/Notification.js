const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: {
    type: String,
    enum: ['knock', 'knock_accepted', 'activity', 'message'],
    required: true,
  },
  content: { type: String, required: true },
  relatedEntityId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'relatedEntityType',
  },
  relatedEntityType: {
    type: String,
    enum: ['User', 'Chat', 'Post', 'Knock'],
  },
  isRead: { type: Boolean, default: false },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);