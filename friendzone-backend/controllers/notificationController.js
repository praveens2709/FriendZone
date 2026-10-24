import Notification from '../models/Notification.js';
import Knock from '../models/Knock.js';
import User from '../models/User.js';
import Meeting from '../models/Meeting.js';
import Post from '../models/Post.js';
import { pushToOffline } from '../services/pushService.js';

const emitUnreadNotificationCount = async (io, userId) => {
    try {
        await purgeDeadMeetingNotifications(userId);
        await purgeDeadPostNotifications(userId);
        const unreadCount = await Notification.countDocuments({ recipient: userId, isRead: false });
        io.to(`notifications-${userId}`).emit('unreadNotificationCountUpdate', { count: unreadCount });
    } catch (error) {
        console.error("Error emitting unread notification count:", error);
    }
};

const purgeDeadPostNotifications = async (userId) => {
    const candidates = await Notification.find({ recipient: userId, relatedEntityType: 'Post' })
        .select('relatedEntityId')
        .lean();
    if (candidates.length === 0) return;
    const ids = [...new Set(candidates.map((n) => n.relatedEntityId?.toString()).filter(Boolean))];
    const alive = await Post.find({ _id: { $in: ids }, deletedAt: null }).select('_id').lean();
    const aliveSet = new Set(alive.map((p) => p._id.toString()));
    const dead = candidates.filter((n) => !aliveSet.has(n.relatedEntityId?.toString())).map((n) => n._id);
    if (dead.length) await Notification.deleteMany({ _id: { $in: dead } });
};

const purgeDeadMeetingNotifications = async (userId) => {
    const candidates = await Notification.find({
        recipient: userId,
        $or: [{ relatedEntityType: 'Meeting' }, { type: 'meeting_invite' }]
    }).select('relatedEntityId metadata').lean();
    if (candidates.length === 0) return;
    const ids = [...new Set(candidates.map((n) => (n.relatedEntityId || n.metadata?.meetingId)?.toString()).filter(Boolean))];
    const alive = await Meeting.find({ _id: { $in: ids }, status: { $ne: 'cancelled' } }).select('_id').lean();
    const aliveSet = new Set(alive.map((m) => m._id.toString()));
    const deadNotificationIds = candidates
        .filter((n) => {
            const id = (n.relatedEntityId || n.metadata?.meetingId)?.toString();
            return id && !aliveSet.has(id);
        })
        .map((n) => n._id);
    if (deadNotificationIds.length) {
        await Notification.deleteMany({ _id: { $in: deadNotificationIds } });
    }
};

export const removePostNotifications = async ({ postId, recipientId, senderId, type }, io) => {
    const filter = { relatedEntityType: 'Post', relatedEntityId: postId };
    if (recipientId) filter.recipient = recipientId;
    if (senderId) filter.sender = senderId;
    if (type) filter.type = type;
    const recipients = recipientId ? [recipientId] : await Notification.distinct('recipient', filter);
    await Notification.deleteMany(filter);
    if (!io) return;
    for (const id of recipients) {
        io.to(`notifications-${id}`).emit('postNotificationsRemoved', {
            postId: postId.toString(),
            senderId: senderId ? senderId.toString() : null,
            type: type || null,
        });
        emitUnreadNotificationCount(io, id);
    }
};

export const getUserNotifications = async (req, res) => {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const skip = (page - 1) * limit;

    try {
        await purgeDeadMeetingNotifications(userId);
        await purgeDeadPostNotifications(userId);
        const totalNotificationsCount = await Notification.countDocuments({ recipient: userId });

        const rawNotifications = await Notification.find({ recipient: userId })
            .populate('sender', 'firstName lastName profileImage')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const enrichedNotifications = await Promise.all(
            rawNotifications.map(async (notification) => {
                let enriched = { ...notification };

                if (notification.relatedEntityType === 'Knock' && notification.relatedEntityId) {
                    const knock = await Knock.findById(notification.relatedEntityId).lean();
                    enriched.knockStatus = knock?.status || null;
                } else if (notification.relatedEntityType === 'User' && notification.relatedEntityId) {
                    const relatedUser = await User.findById(notification.relatedEntityId).lean();
                    enriched.relatedEntityDetails = relatedUser ? {
                        id: relatedUser._id.toString(),
                        username: `${relatedUser.firstName || ''} ${relatedUser.lastName || ''}`.trim(),
                        avatar: relatedUser.profileImage || null,
                    } : null;
                } else if (notification.type === 'meeting_invite' || notification.relatedEntityType === 'Meeting') {
                    const meetingId = notification.relatedEntityId || notification.metadata?.meetingId;
                    if (meetingId) {
                        try {
                            const meeting = await Meeting.findById(meetingId).select('participants').lean();
                            if (meeting && meeting.participants) {
                                const p = meeting.participants.find(part => (part.user?._id || part.user)?.toString() === userId.toString());
                                if (p && p.status) {
                                    enriched.metadata = {
                                        ...(notification.metadata || {}),
                                        meetingId: meetingId.toString(),
                                        status: p.status
                                    };
                                }
                            }
                        } catch (e) {
                            console.error('Error enriching meeting notification:', e);
                        }
                    }
                }
                return enriched;
            })
        );

        const formattedNotifications = enrichedNotifications.map(notification => {
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
                relatedEntityDetails: notification.relatedEntityDetails || null,
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

export const getUnreadNotificationCount = async (req, res) => {
    const userId = req.user.id;
    try {
        const unreadCount = await Notification.countDocuments({ recipient: userId, isRead: false });
        res.json({ count: unreadCount });
    } catch (err) {
        console.error('Error fetching unread notification count:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const markNotificationAsRead = async (req, res, io) => {
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

        if (io) {
            emitUnreadNotificationCount(io, userId);
        }

        res.json({ message: 'Notification marked as read', notificationId: updated._id });

    } catch (err) {
        console.error('Error marking notification as read:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const markAllNotificationsAsRead = async (req, res, io) => {
    const userId = req.user.id;

    try {
        await Notification.updateMany(
            { recipient: userId, isRead: false },
            { $set: { isRead: true } }
        );

        if (io) {
            emitUnreadNotificationCount(io, userId);
        }

        res.json({ message: 'All notifications marked as read' });

    } catch (err) {
        console.error('Error marking all notifications as read:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const createNotification = async ({
    recipientId,
    senderId,
    type,
    content,
    relatedEntityId,
    relatedEntityType,
    metadata = {},
    io
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
        let relatedEntityDetails = null;

        if (type === 'knock' && relatedEntityType === 'Knock' && relatedEntityId) {
            const knock = await Knock.findById(relatedEntityId).lean();
            knockStatus = knock?.status || null;
        }

        if (relatedEntityId && relatedEntityType) {
            switch (relatedEntityType) {
                case 'User':
                    const relatedUser = await User.findById(relatedEntityId).lean();
                    relatedEntityDetails = relatedUser ? {
                        id: relatedUser._id.toString(),
                        username: `${relatedUser.firstName || ''} ${relatedUser.lastName || ''}`.trim(),
                        avatar: relatedUser.profileImage || null,
                    } : null;
                    break;
                default:
                    break;
            }
        }

        const newNotification = {
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
            relatedEntityType: populated.relatedEntityType || null,
            metadata: metadata || {},
            knockStatus: knockStatus,
            relatedEntityDetails: relatedEntityDetails,
        };

        if (io) {
            io.to(`notifications-${recipientId}`).emit('newNotification', newNotification);
            emitUnreadNotificationCount(io, recipientId);
            const route =
                relatedEntityType === 'Meeting' && relatedEntityId ? `/plan/${relatedEntityId}`
                : relatedEntityType === 'Post' && relatedEntityId ? `/posts/${relatedEntityId}`
                : senderId ? `/profile/UserProfile?userId=${senderId}`
                : '/(notifications)';
            pushToOffline(io, [recipientId], {
                title: fullName || 'FriendZone',
                body: content,
                data: { route },
            });
        }

        return newNotification;

    } catch (err) {
        console.error('Error creating notification:', err);
        return null;
    }
};

export const deleteNotificationsByKnockId = async (recipientId, knockId) => {
    try {
        await Notification.deleteMany({
            recipient: recipientId,
            relatedEntityId: knockId,
            relatedEntityType: 'Knock',
        });
    } catch (err) {
        console.error(`Error deleting notifications for knock ID ${knockId}:`, err);
        throw new Error(`Error deleting notifications: ${err.message}`);
    }
};

export const markNotificationAsReadAndProcessGameInvite = async (gameSessionId, userId, status) => {
    try {
        await Notification.updateMany(
            {
                recipient: userId,
                relatedEntityId: gameSessionId,
                relatedEntityType: 'GameSession',
                type: 'game_invite',
                'metadata.status': 'pending'
            },
            {
                $set: {
                    isRead: true,
                    'metadata.status': status
                }
            }
        );
    } catch (error) {
        console.error(`Error processing game invite notification for user ${userId} and session ${gameSessionId}:`, error);
    }
};