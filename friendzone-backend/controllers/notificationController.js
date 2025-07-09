const Notification = require('../models/Notification');
const Knock = require('../models/Knock');
const User = require('../models/User');

exports.getUserNotifications = async (req, res) => {
  const userId = req.user.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 15;
  const skip = (page - 1) * limit;

  try {
    const totalNotificationsCount = await Notification.countDocuments({ recipient: userId });

    const rawNotifications = await Notification.find({ recipient: userId })
      .populate('sender', 'firstName lastName profileImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const enrichedNotifications = await Promise.all(
      rawNotifications.map(async (notification) => {
        if (notification.relatedEntityType === 'Knock' && notification.relatedEntityId) {
          const knock = await Knock.findById(notification.relatedEntityId).lean();
          return { ...notification, knockStatus: knock?.status || null };
        }
        return notification;
      })
    );

    const paginatedNotifications = enrichedNotifications;

    const formattedNotifications = paginatedNotifications.map(notification => {
      const fullName = `${notification.sender?.firstName || ''} ${notification.sender?.lastName || ''}`.trim();

      return {
        id: notification._id.toString(),
        type: notification.type,
        timestamp: notification.createdAt.toISOString(),
        isRead: notification.isRead,
        user: notification.sender ? {
          id: notification.sender._id.toString(),
          username: fullName,
          avatar: notification.sender.profileImage || null
        } : null,
        content: notification.content,
        relatedEntityId: notification.relatedEntityId?.toString() || null,
        relatedEntityType: notification.relatedEntityType || null, 
        metadata: notification.metadata || {},
        knockStatus: notification.knockStatus || null,
      };
    });

    res.json({
      notifications: formattedNotifications,
      currentPage: page,
      totalPages: Math.ceil(totalNotificationsCount / limit),
      totalNotifications: totalNotificationsCount,
    });

  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.markNotificationAsRead = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const updated = await Notification.findOneAndUpdate(
      { _id: id, recipient: userId },
      { $set: { isRead: true } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Notification not found or unauthorized' });
    }

    res.json({ message: 'Notification marked as read', notificationId: updated._id });

  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.markAllNotificationsAsRead = async (req, res) => {
  const userId = req.user.id;

  try {
    await Notification.updateMany(
      { recipient: userId, isRead: false },
      { $set: { isRead: true } }
    );

    res.json({ message: 'All notifications marked as read' });

  } catch (err) {
    console.error('Error marking all notifications as read:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createNotification = async ({
  recipientId,
  senderId,
  type,
  content,
  relatedEntityId,
  relatedEntityType,
  metadata = {}
}) => {
  try {
    const notif = new Notification({
      recipient: recipientId,
      sender: senderId,
      type,
      content,
      relatedEntityId,
      relatedEntityType,
      metadata,
    });

    await notif.save();

    const populated = await Notification.findById(notif._id).populate('sender', 'firstName lastName profileImage');
    const fullName = `${populated?.sender?.firstName || ''} ${populated?.sender?.lastName || ''}`.trim();

    let knockStatus = null;
    if (type === 'knock' && relatedEntityType === 'Knock' && relatedEntityId) {
        const knock = await Knock.findById(relatedEntityId).lean();
        knockStatus = knock?.status || null;
    }

    return {
      id: populated._id.toString(),
      type: populated.type,
      timestamp: populated.createdAt.toISOString(),
      isRead: populated.isRead,
      user: populated.sender ? {
        id: populated.sender._id.toString(),
        username: fullName,
        avatar: populated.sender.profileImage || null
      } : null,
      content: populated.content,
      relatedEntityId: populated.relatedEntityId?.toString() || null,
      metadata: populated.metadata || {},
      knockStatus: knockStatus,
    };

  } catch (err) {
    console.error('Error creating notification:', err);
    return null;
  }
};