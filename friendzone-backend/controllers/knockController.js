import User from '../models/User.js';
import Knock from '../models/Knock.js';
import * as NotificationController from './notificationController.js';

export const knockUser = async (req, res) => {
  const knockerId = req.user.id;
  const { knockedId } = req.body;

  const io = req.io;
  const userSocketMap = req.userSocketMap;

  if (knockerId === knockedId) {
    return res.status(400).json({ message: 'You cannot knock yourself.' });
  }

  try {
    const knockerUser = await User.findById(knockerId).select('firstName lastName isPrivate');
    const knockedUser = await User.findById(knockedId).select('isPrivate firstName lastName');

    if (!knockedUser) return res.status(404).json({ message: 'User not found.' });

    const existingKnock = await Knock.findOne({ knocker: knockerId, knocked: knockedId });
    if (existingKnock) {
      return res.status(400).json({ message: 'Already knocked this user.' });
    }

    const mutualKnock = await Knock.findOne({ knocker: knockedId, knocked: knockerId });
    const isKnockedUserPrivate = knockedUser.isPrivate;
    const isKnockerPrivate = knockerUser.isPrivate;

    let newKnockStatus = 'onesidedlock';
    
    if (isKnockedUserPrivate) {
      newKnockStatus = 'pending';
    } else if (mutualKnock && !isKnockedUserPrivate && !isKnockerPrivate) {
      newKnockStatus = 'lockedIn';
      mutualKnock.status = 'lockedIn';
      await mutualKnock.save();
    }

    const newKnock = await Knock.create({ knocker: knockerId, knocked: knockedId, status: newKnockStatus });

    if (newKnockStatus === 'lockedIn') {
        await NotificationController.createNotification({
            recipientId: knockerId,
            senderId: knockedId,
            type: 'activity',
            content: `You knocked back ${knockedUser.firstName} ${knockedUser.lastName || ''}. You are now LockedIn!`,
            relatedEntityId: newKnock._id,
            relatedEntityType: 'Knock',
            io
        });
        await NotificationController.createNotification({
            recipientId: knockedId,
            senderId: knockerId,
            type: 'activity',
            content: `knocked you back. You are now LockedIn!`,
            relatedEntityId: newKnock._id,
            relatedEntityType: 'Knock',
            io
        });

    } else if (newKnockStatus === 'onesidedlock') {
      const receiverNotification = await NotificationController.createNotification({
        recipientId: knockedId,
        senderId: knockerId,
        type: 'activity',
        content: `knocked on you.`,
        relatedEntityId: newKnock._id,
        relatedEntityType: 'Knock',
        io
      });
      const receiverSocketId = userSocketMap.get(knockedId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('newNotification', receiverNotification);
      }
    } else if (newKnockStatus === 'pending') {
      const receiverSocketId = userSocketMap.get(knockedId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('newKnockRequest', {
          id: newKnock._id,
          knockerId: knockerId,
          knockedId: knockedId,
          user: {
            id: knockerUser._id,
            username: `${knockerUser.firstName} ${knockerUser.lastName || ''}`,
            avatar: knockerUser.profileImage || null
          },
          status: 'pending',
          timestamp: newKnock.createdAt
        });
      }
    }

    const knockerSocketId = userSocketMap.get(knockerId);
    if (knockerSocketId) {
      io.to(knockerSocketId).emit('knockStatusChanged', { userId: knockerId });
    }
    const receiverSocketId = userSocketMap.get(knockedId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('knockStatusChanged', { userId: knockedId });
    }

    res.status(201).json({ message: 'Knock sent.', knock: newKnock });

  } catch (err) {
    console.error('Error knocking user:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const knockBack = async (req, res) => {
  const userId = req.user.id;
  const knockId = req.params.id;

  const io = req.io;
  const userSocketMap = req.userSocketMap;

  try {
    const existingKnock = await Knock.findOne({ _id: knockId, knocked: userId }).populate('knocker', 'firstName lastName isPrivate');

    if (!existingKnock || existingKnock.status !== 'onesidedlock') {
      return res.status(404).json({ message: 'Knock not found or not eligible to knock back.' });
    }

    const isKnockerPrivate = existingKnock.knocker.isPrivate;
    const originalKnockerId = existingKnock.knocker._id;
    const knockerUser = existingKnock.knocker;
    const acceptorUser = await User.findById(userId);

    if (isKnockerPrivate) {
      const mutualKnock = await Knock.findOne({ knocker: userId, knocked: originalKnockerId });
      
      if (mutualKnock && mutualKnock.status === 'pending') {
        existingKnock.status = 'lockedIn';
        await existingKnock.save();

        mutualKnock.status = 'lockedIn';
        await mutualKnock.save();
        
        const originalKnockerSocketId = userSocketMap.get(originalKnockerId.toString());
        const acceptorSocketId = userSocketMap.get(userId);

        if (originalKnockerSocketId) {
          io.to(originalKnockerSocketId).emit('knockStatusUpdated', {
            knockId: mutualKnock._id,
            newStatus: 'lockedIn'
          });
        }
        if (acceptorSocketId) {
          io.to(acceptorSocketId).emit('knockStatusUpdated', {
            knockId: existingKnock._id,
            newStatus: 'lockedIn'
          });
          io.to(acceptorSocketId).emit('knockRequestRemoved', existingKnock._id.toString());
        }

      } else {
        const newKnock = await Knock.create({
          knocker: userId,
          knocked: originalKnockerId,
          status: 'pending'
        });
        
        const originalKnockerSocketId = userSocketMap.get(originalKnockerId.toString());
        if (originalKnockerSocketId) {
          io.to(originalKnockerSocketId).emit('newKnockRequest', {
            id: newKnock._id,
            knockerId: userId,
            knockedId: originalKnockerId,
            user: {
              id: userId,
              username: `${acceptorUser.firstName} ${acceptorUser.lastName || ''}`,
              avatar: acceptorUser.profileImage || null
            },
            status: 'pending',
            timestamp: newKnock.createdAt
          });
        }
    
        const acceptorSocketId = userSocketMap.get(userId);
        if(acceptorSocketId) {
          io.to(acceptorSocketId).emit('knockStatusUpdated', {
            knockId: newKnock._id,
            newStatus: 'pending'
          });
        }
      }

    } else {
      existingKnock.status = 'lockedIn';
      await existingKnock.save();

      const newKnock = await Knock.create({
        knocker: userId,
        knocked: originalKnockerId,
        status: 'lockedIn'
      });

      const requesterNotification = await NotificationController.createNotification({
        recipientId: originalKnockerId,
        senderId: userId,
        type: 'activity',
        content: `knocked you back. You are now LockedIn!`,
        relatedEntityId: existingKnock._id,
        relatedEntityType: 'Knock',
        io
      });

      const acceptorNotification = await NotificationController.createNotification({
        recipientId: userId,
        senderId: originalKnockerId,
        type: 'activity',
        content: `You knocked back ${knockerUser.firstName} ${knockerUser.lastName || ''}. You are now LockedIn!`,
        relatedEntityId: existingKnock._id,
        relatedEntityType: 'Knock',
        io
      });

      const originalKnockerSocketId = userSocketMap.get(originalKnockerId.toString());
      const acceptorSocketId = userSocketMap.get(userId);

      if (originalKnockerSocketId) {
        io.to(originalKnockerSocketId).emit('knockStatusUpdated', {
          knockId: newKnock._id,
          newStatus: 'lockedIn'
        });
        io.to(originalKnockerSocketId).emit('newNotification', requesterNotification);
      }
      if (acceptorSocketId) {
        io.to(acceptorSocketId).emit('knockStatusUpdated', {
          knockId: existingKnock._id,
          newStatus: 'lockedIn'
        });
        io.to(acceptorSocketId).emit('newNotification', acceptorNotification);
      }
    }
    
    const acceptorSocketId = userSocketMap.get(userId);
    if (acceptorSocketId) {
      io.to(acceptorSocketId).emit('knockStatusChanged', { userId: userId });
    }
    const originalKnockerSocketId = userSocketMap.get(originalKnockerId.toString());
    if (originalKnockerSocketId) {
      io.to(originalKnockerSocketId).emit('knockStatusChanged', { userId: originalKnockerId });
    }

    res.json({ message: 'Knock back action completed.', locked: [existingKnock] });

  } catch (err) {
    console.error('Error knocking back:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const acceptKnock = async (req, res) => {
  const userId = req.user.id;
  const knockId = req.params.id;

  const io = req.io;
  const userSocketMap = req.userSocketMap;

  try {
    const existingKnock = await Knock.findOne({ _id: knockId, knocked: userId }).populate('knocker', 'firstName lastName isPrivate');
    if (!existingKnock || existingKnock.status !== 'pending') {
      return res.status(404).json({ message: 'Knock not found or not pending.' });
    }

    const knockerUser = existingKnock.knocker;
    const originalKnockerId = knockerUser._id.toString();
    const acceptorUser = await User.findById(userId).select('firstName lastName isPrivate');

    let newStatus = 'onesidedlock';
    let knockerNotificationContent = `accepted your knock request.`;
    let receiverNotificationContent = `knocked on you.`;

    const mutualKnock = await Knock.findOne({ knocker: userId, knocked: originalKnockerId });

    if (mutualKnock && mutualKnock.status === 'onesidedlock') {
      newStatus = 'lockedIn';
      mutualKnock.status = 'lockedIn';
      await mutualKnock.save();

      existingKnock.status = newStatus;
      await existingKnock.save();

      const acceptorSocketId = userSocketMap.get(userId);
      if (acceptorSocketId) {
        io.to(acceptorSocketId).emit('knockRequestRemoved', existingKnock._id.toString());
      }
      
      knockerNotificationContent = `accepted your knock request. You are now LockedIn!`;
      receiverNotificationContent = `knocked you back. You are now LockedIn!`;

      // Emit lockedIn status to both users
      const originalKnockerSocketId = userSocketMap.get(originalKnockerId);
      const acceptorSocketId2 = userSocketMap.get(userId);
      if (originalKnockerSocketId) {
        io.to(originalKnockerSocketId).emit('knockStatusUpdated', {
          knockId: mutualKnock._id,
          newStatus: 'lockedIn'
        });
      }
      if (acceptorSocketId2) {
        io.to(acceptorSocketId2).emit('knockStatusUpdated', {
          knockId: existingKnock._id,
          newStatus: 'lockedIn'
        });
      }

    } else if (knockerUser.isPrivate && acceptorUser.isPrivate) {
      const mutualKnock2 = await Knock.findOne({ knocker: userId, knocked: originalKnockerId, status: 'pending' });
      if (mutualKnock2) {
        newStatus = 'lockedIn';
        mutualKnock2.status = 'lockedIn';
        await mutualKnock2.save();
        existingKnock.status = newStatus;
        await existingKnock.save();

        const acceptorSocketId = userSocketMap.get(userId);
        if (acceptorSocketId) {
          io.to(acceptorSocketId).emit('knockRequestRemoved', existingKnock._id.toString());
        }

        knockerNotificationContent = `accepted your knock request. You are now LockedIn!`;
        receiverNotificationContent = `knocked you back. You are now LockedIn!`;

        const originalKnockerSocketId = userSocketMap.get(originalKnockerId);
        const acceptorSocketId2 = userSocketMap.get(userId);
        if (originalKnockerSocketId) {
          io.to(originalKnockerSocketId).emit('knockStatusUpdated', {
            knockId: mutualKnock2._id,
            newStatus: 'lockedIn'
          });
        }
        if (acceptorSocketId2) {
          io.to(acceptorSocketId2).emit('knockStatusUpdated', {
            knockId: existingKnock._id,
            newStatus: 'lockedIn'
          });
        }
      }
    } else if (!knockerUser.isPrivate && acceptorUser.isPrivate) {
        const mutualKnock3 = await Knock.findOne({ knocker: userId, knocked: originalKnockerId, status: 'pending' });
        if (mutualKnock3) {
            newStatus = 'lockedIn';
            mutualKnock3.status = 'lockedIn';
            await mutualKnock3.save();
            existingKnock.status = newStatus;
            await existingKnock.save();
            
            const acceptorSocketId = userSocketMap.get(userId);
            if (acceptorSocketId) {
              io.to(acceptorSocketId).emit('knockRequestRemoved', existingKnock._id.toString());
            }
            
            knockerNotificationContent = `accepted your knock request. You are now LockedIn!`;
            receiverNotificationContent = `knocked you back. You are now LockedIn!`;

            const originalKnockerSocketId = userSocketMap.get(originalKnockerId);
            const acceptorSocketId2 = userSocketMap.get(userId);
            if (originalKnockerSocketId) {
              io.to(originalKnockerSocketId).emit('knockStatusUpdated', {
                knockId: mutualKnock3._id,
                newStatus: 'lockedIn'
              });
            }
            if (acceptorSocketId2) {
              io.to(acceptorSocketId2).emit('knockStatusUpdated', {
                knockId: existingKnock._id,
                newStatus: 'lockedIn'
              });
            }
        }
    }
    
    // In all other cases, simply update the existing knock to onesidedlock
    if (newStatus === 'onesidedlock') {
        existingKnock.status = newStatus;
        await existingKnock.save();
    }


    const requesterNotification = await NotificationController.createNotification({
      recipientId: originalKnockerId,
      senderId: userId,
      type: 'activity',
      content: knockerNotificationContent,
      relatedEntityId: existingKnock._id,
      relatedEntityType: 'Knock',
      io
    });

    const acceptorNotification = await NotificationController.createNotification({
      recipientId: userId,
      senderId: originalKnockerId,
      type: 'activity',
      content: receiverNotificationContent,
      relatedEntityId: existingKnock._id,
      relatedEntityType: 'Knock',
      io
    });

    const originalKnockerSocketId = userSocketMap.get(originalKnockerId);
    const acceptorSocketId = userSocketMap.get(userId);

    if (originalKnockerSocketId) io.to(originalKnockerSocketId).emit('newNotification', requesterNotification);
    if (acceptorSocketId) io.to(acceptorSocketId).emit('newNotification', acceptorNotification);

    if (originalKnockerSocketId) io.to(originalKnockerSocketId).emit('knockStatusChanged', { userId: originalKnockerId });
    if (acceptorSocketId) io.to(acceptorSocketId).emit('knockStatusChanged', { userId: userId });

    res.json({ message: `Knock accepted. Status updated to ${newStatus}.`, knock: existingKnock });

  } catch (err) {
    console.error('Error accepting knock:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const declineKnock = async (req, res) => {
  const userId = req.user.id;
  const knockId = req.params.id;
  const io = req.io;
  const userSocketMap = req.userSocketMap;

  try {
    const declinedKnock = await Knock.findOneAndDelete({ _id: knockId, knocked: userId, status: 'pending' });

    if (!declinedKnock) {
      return res.status(404).json({ message: 'Knock not found or already handled.' });
    }

    const originalKnockerId = declinedKnock.knocker._id.toString();
    const originalKnockerSocketId = userSocketMap.get(originalKnockerId);
    const declinerSocketId = userSocketMap.get(userId);

    // await NotificationController.deleteNotificationsByKnockId(originalKnockerId, declinedKnock._id);
    // await NotificationController.deleteNotificationsByKnockId(userId, declinedKnock._id);

    if (declinerSocketId) {
      io.to(declinerSocketId).emit('knockStatusChanged', { userId: userId });
      io.to(declinerSocketId).emit('knockRequestRemoved', declinedKnock._id.toString());
    }
    if (originalKnockerSocketId) {
      io.to(originalKnockerSocketId).emit('knockStatusChanged', { userId: originalKnockerId });
    }

    res.json({ message: 'Knock declined.', declinedId: knockId });

  } catch (err) {
    console.error('Error declining knock:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const unknockUser = async (req, res) => {
  const userId = req.user.id;
  const knockId = req.params.id;

  const io = req.io;
  const userSocketMap = req.userSocketMap;

  try {
    const knockToUnknock = await Knock.findOneAndDelete({
      _id: knockId,
      knocker: userId,
      status: { $in: ['pending', 'onesidedlock'] }
    });

    if (!knockToUnknock) {
      return res.status(404).json({ message: 'Knock not found or already handled.' });
    }

    const unknockedUserId = knockToUnknock.knocked._id.toString();
    const mySocketId = userSocketMap.get(userId);
    const unknockedUserSocketId = userSocketMap.get(unknockedUserId);

    if (mySocketId) {
      io.to(mySocketId).emit('knockStatusChanged', { userId: userId });
    }
    if (unknockedUserSocketId) {
      io.to(unknockedUserSocketId).emit('knockStatusChanged', { userId: unknockedUserId });
    }

    // await NotificationController.deleteNotificationsByKnockId(userId, knockId);
    // await NotificationController.deleteNotificationsByKnockId(unknockedUserId, knockId);

    res.json({ message: 'Knock unknocked successfully.' });

  } catch (err) {
    console.error('Error unknocking:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getKnockers = async (req, res) => {
  const userId = req.user.id;

  try {
    const knockers = await Knock.find({
      knocked: userId,
      status: { $in: ['pending', 'onesidedlock', 'lockedIn'] }
    })
      .populate('knocker', 'firstName lastName profileImage')
      .sort({ createdAt: -1 })
      .lean();

    res.json(knockers.map(k => ({
      id: k._id.toString(),
      knockerId: k.knocker._id.toString(),
      knockedId: k.knocked.toString(),
      user: {
        id: k.knocker._id.toString(),
        username: `${k.knocker.firstName} ${k.knocker.lastName || ''}`,
        avatar: k.knocker.profileImage || null
      },
      status: k.status,
      timestamp: k.createdAt.toISOString()
    })));
  } catch (err) {
    console.error('Error getting knockers:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getKnocked = async (req, res) => {
  const userId = req.user.id;

  try {
    const knocked = await Knock.find({ knocker: userId })
      .populate('knocked', 'firstName lastName profileImage')
      .sort({ createdAt: -1 })
      .lean();

    res.json(knocked.map(k => ({
      id: k._id.toString(),
      knockerId: k.knocker.toString(),
      knockedId: k.knocked._id.toString(),
      user: {
        id: k.knocked._id.toString(),
        username: `${k.knocked.firstName} ${k.knocked.lastName || ''}`,
        avatar: k.knocked.profileImage || null
      },
      status: k.status,
      timestamp: k.createdAt.toISOString()
    })));

  } catch (err) {
    console.error('Error getting knocked:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getPendingKnockRequests = async (req, res) => {
  const userId = req.user.id;

  try {
    const pendingKnocks = await Knock.find({
      knocked: userId,
      status: 'pending'
    })
      .populate('knocker', 'firstName lastName profileImage')
      .sort({ createdAt: -1 })
      .lean();

    res.json(pendingKnocks.map(k => ({
      id: k._id.toString(),
      knockerId: k.knocker._id.toString(),
      knockedId: k.knocked.toString(),
      user: {
        id: k.knocker._id.toString(),
        username: `${k.knocker.firstName} ${k.knocker.lastName || ''}`,
        avatar: k.knocker.profileImage || null
      },
      status: k.status,
      timestamp: k.createdAt.toISOString()
    })));
  } catch (err) {
    console.error('Error getting pending knock requests:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const searchUsers = async (req, res) => {
  const query = req.query.q;
  const userId = req.user.id;

  if (!query || query.trim() === '') {
    return res.json([]);
  }

  try {
    const users = await User.find({
      _id: { $ne: userId },
      $or: [
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
      ],
    }).select('firstName lastName profileImage isPrivate');

    res.json(users);
  } catch (err) {
    console.error('Error searching users:', err);
    res.status(500).json({ message: 'Server error during user search.' });
  }
};

export const getKnockersForUser = async (req, res) => {
  const { userId } = req.params;

  try {
    const knockers = await Knock.find({
      knocked: userId,
      status: { $in: ['lockedIn'] }
    })
      .populate('knocker', 'firstName lastName profileImage')
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    res.json(knockers.map(k => ({
      id: k.knocker._id.toString(),
      username: `${k.knocker.firstName} ${k.knocker.lastName || ''}`,
      avatar: k.knocker.profileImage || null
    })));
  } catch (err) {
    console.error('Error getting knockers for user:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const breakLock = async (req, res) => {
  const myUserId = req.user.id;
  const { otherUserId } = req.body;
  const io = req.io;
  const userSocketMap = req.userSocketMap;

  try {
    const otherUserKnock = await Knock.findOne({ knocker: otherUserId, knocked: myUserId });

    if (!otherUserKnock || otherUserKnock.status !== 'lockedIn') {
        return res.status(404).json({ message: 'Knock not found or not in a LockedIn state.' });
    }

    otherUserKnock.status = 'onesidedlock';
    await otherUserKnock.save();

    await Knock.findOneAndDelete({ knocker: myUserId, knocked: otherUserId, status: 'lockedIn' });

    const mySocketId = userSocketMap.get(myUserId);
    if (mySocketId) {
      io.to(mySocketId).emit('knockStatusChanged', { userId: myUserId });
    }

    const otherUserSocketId = userSocketMap.get(otherUserId);
    if (otherUserSocketId) {
        io.to(otherUserSocketId).emit('knockStatusChanged', { userId: otherUserId });
    }

    res.status(200).json({ success: true, message: 'Connection unknocked from your side successfully.' });
  } catch (err) {
    console.error('Error unknocking connection:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getCountsForUser = async (req, res) => {
  const { userId } = req.params;

  try {
    const knockersCount = await Knock.countDocuments({
      knocked: userId,
      status: { $in: ['onesidedlock'] }
    });

    const knockingCount = await Knock.countDocuments({
      knocker: userId,
      status: { $in: ['onesidedlock', 'pending'] }
    });

    const lockedInDocsCount = await Knock.countDocuments({
      $or: [
        { knocker: userId, status: 'lockedIn' },
        { knocked: userId, status: 'lockedIn' },
      ]
    });
    const lockedInCount = lockedInDocsCount / 2;

    res.json({
      knockersCount,
      knockingCount,
      lockedInCount
    });
  } catch (err) {
    console.error('Error getting counts for user:', err);
    res.status(500).json({ message: 'Server error' });
  }
};