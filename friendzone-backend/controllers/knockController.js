const User = require('../models/User');
const Knock = require('../models/Knock');
const NotificationController = require('./notificationController');

exports.knockUser = async (req, res) => {
  const knockerId = req.user.id;
  const { knockedId } = req.body;

  const io = req.io;
  const userSocketMap = req.userSocketMap;

  if (knockerId === knockedId) {
    return res.status(400).json({ message: 'You cannot knock yourself.' });
  }

  try {
    const knockedUser = await User.findById(knockedId);
    if (!knockedUser) return res.status(404).json({ message: 'User not found.' });

    const existingKnock = await Knock.findOne({ knocker: knockerId, knocked: knockedId });

    if (existingKnock) {
      return res.status(400).json({ message: 'Already knocked this user.' });
    }

    const mutualKnock = await Knock.findOne({ knocker: knockedId, knocked: knockerId });
    const knockerUser = await User.findById(knockerId).select('firstName lastName profileImage');

    const isPrivate = knockedUser.isPrivate;
    let status = mutualKnock ? 'lockedIn' : (isPrivate ? 'pending' : 'onesidedlock');

    const newKnock = await Knock.create({ knocker: knockerId, knocked: knockedId, status });

    if (mutualKnock && mutualKnock.status === 'onesidedlock') {
      mutualKnock.status = 'lockedIn';
      await mutualKnock.save();
    }

    const knockerSocketId = userSocketMap.get(knockerId);
    if (knockerSocketId) {
      io.to(knockerSocketId).emit('knockStatusChanged', { userId: knockerId });
    }

    const receiverSocketId = userSocketMap.get(knockedId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('knockStatusChanged', { userId: knockedId });
    }

    if (status === 'lockedIn') {
      await NotificationController.createNotification({
        recipientId: knockerId,
        senderId: knockedId,
        type: 'knock_accepted',
        content: ` knocked you back! You are now LockedIn.`,
        relatedEntityId: newKnock._id,
        relatedEntityType: 'Knock',
        knockStatus: newKnock.status,
      });

      const receiverNotification = await NotificationController.createNotification({
        recipientId: knockedId,
        senderId: knockerId,
        type: 'activity',
        content: `You knocked on ${knockedUser.firstName} ${knockedUser.lastName || ''}.`,
        relatedEntityId: newKnock._id,
        relatedEntityType: 'Knock',
        knockStatus: newKnock.status,
      });

      if (receiverSocketId) {
        io.to(receiverSocketId).emit('newNotification', receiverNotification);
      }
    } else {
      const receiverNotification = await NotificationController.createNotification({
        recipientId: knockedId,
        senderId: knockerId,
        type: isPrivate ? 'knock_request' : 'activity',
        content: ` knocked on you.`,
        relatedEntityId: newKnock._id,
        relatedEntityType: 'Knock',
        knockStatus: newKnock.status,
      });
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('newNotification', receiverNotification);
      }
    }

    res.status(201).json({ message: 'Knock sent.', knock: newKnock });

  } catch (err) {
    console.error('Error knocking user:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


exports.knockBack = async (req, res) => {
  const userId = req.user.id;
  const knockId = req.params.id;

  const io = req.io;
  const userSocketMap = req.userSocketMap;

  try {
    const existingKnock = await Knock.findOne({ _id: knockId, knocked: userId }).populate('knocker', 'firstName lastName');

    if (!existingKnock || (existingKnock.status !== 'pending' && existingKnock.status !== 'onesidedlock')) {
      return res.status(404).json({ message: 'Knock not found or already handled.' });
    }

    existingKnock.status = 'lockedIn';
    await existingKnock.save();

    const existingKnockFromAcceptor = await Knock.findOne({ knocker: userId, knocked: existingKnock.knocker._id });
    if (existingKnockFromAcceptor) {
      existingKnockFromAcceptor.status = 'lockedIn';
      await existingKnockFromAcceptor.save();
    } else {
      await Knock.create({
        knocker: userId,
        knocked: existingKnock.knocker._id,
        status: 'lockedIn'
      });
    }

    const originalKnockerId = existingKnock.knocker._id.toString();
    const originalKnockerSocketId = userSocketMap.get(originalKnockerId);

    await NotificationController.deleteNotificationsByKnockId(originalKnockerId, existingKnock._id);
    await NotificationController.deleteNotificationsByKnockId(userId, existingKnock._id);

    const acceptorSocketId = userSocketMap.get(userId);
    if (acceptorSocketId) {
      io.to(acceptorSocketId).emit('knockStatusChanged', { userId: userId });
    }
    if (originalKnockerSocketId) {
      io.to(originalKnockerSocketId).emit('knockStatusChanged', { userId: originalKnockerId });
    }

    const requesterNotification = await NotificationController.createNotification({
      recipientId: originalKnockerId,
      senderId: userId,
      type: 'knock_accepted',
      content: `knocked you back. You are now LockedIn!`,
      relatedEntityId: existingKnock._id,
      relatedEntityType: 'Knock',
      knockStatus: 'lockedIn',
    });

    if (originalKnockerSocketId) {
      io.to(originalKnockerSocketId).emit('newNotification', requesterNotification);
      io.to(originalKnockerSocketId).emit('knockStatusUpdate', { knockId: existingKnock._id.toString(), newStatus: 'lockedIn' });
    }

    const acceptorNotification = await NotificationController.createNotification({
      recipientId: userId,
      senderId: userId,
      type: 'activity',
      content: `You knocked back ${existingKnock.knocker.firstName} ${existingKnock.knocker.lastName || ''}. You are now LockedIn!`,
      relatedEntityId: existingKnock._id,
      relatedEntityType: 'Knock',
      knockStatus: 'lockedIn',
    });

    if (acceptorSocketId) {
      io.to(acceptorSocketId).emit('newNotification', acceptorNotification);
      io.to(acceptorSocketId).emit('knockRequestRemoved', existingKnock._id.toString());
      io.to(acceptorSocketId).emit('knockStatusUpdate', { knockId: existingKnock._id.toString(), newStatus: 'lockedIn' });
    }

    res.json({ message: 'Knocked back. You are now LockedIn!', locked: [existingKnock] });

  } catch (err) {
    console.error('Error knocking back:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.acceptKnock = async (req, res) => {
  const userId = req.user.id;
  const knockId = req.params.id;

  const io = req.io;
  const userSocketMap = req.userSocketMap;

  try {
    const existingKnock = await Knock.findOne({ _id: knockId, knocked: userId }).populate('knocker', 'firstName lastName');

    if (!existingKnock || existingKnock.status !== 'pending') {
      return res.status(404).json({ message: 'Knock not found or already handled.' });
    }

    existingKnock.status = 'onesidedlock';
    await existingKnock.save();

    const originalKnockerId = existingKnock.knocker._id.toString();
    const originalKnockerSocketId = userSocketMap.get(originalKnockerId);

    await NotificationController.deleteNotificationsByKnockId(originalKnockerId, existingKnock._id);
    await NotificationController.deleteNotificationsByKnockId(userId, existingKnock._id);

    const acceptorSocketId = userSocketMap.get(userId);
    if (acceptorSocketId) {
      io.to(acceptorSocketId).emit('knockStatusChanged', { userId: userId });
    }
    if (originalKnockerSocketId) {
      io.to(originalKnockerSocketId).emit('knockStatusChanged', { userId: originalKnockerId });
    }

    const requesterNotification = await NotificationController.createNotification({
      recipientId: originalKnockerId,
      senderId: userId,
      type: 'activity',
      content: `accepted your knock request.`,
      relatedEntityId: existingKnock._id,
      relatedEntityType: 'Knock',
      knockStatus: 'onesidedlock',
    });

    if (originalKnockerSocketId) {
      io.to(originalKnockerSocketId).emit('newNotification', requesterNotification);
      io.to(originalKnockerSocketId).emit('knockStatusUpdate', { knockId: existingKnock._id.toString(), newStatus: 'onesidedlock' });
    }

    const acceptorNotification = await NotificationController.createNotification({
      recipientId: userId,
      senderId: existingKnock.knocker._id,
      type: 'activity',
      content: `knocked on you.`,
      relatedEntityId: existingKnock._id,
      relatedEntityType: 'Knock',
      knockStatus: 'onesidedlock',
    });

    if (acceptorSocketId) {
      io.to(acceptorSocketId).emit('newNotification', acceptorNotification);
      io.to(acceptorSocketId).emit('knockRequestRemoved', existingKnock._id.toString());
      io.to(acceptorSocketId).emit('knockStatusUpdate', { knockId: existingKnock._id.toString(), newStatus: 'onesidedlock' });
    }

    res.json({ message: 'Knock accepted. Status updated to onesidedlock.', knock: existingKnock });

  } catch (err) {
    console.error('Error accepting knock:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.declineKnock = async (req, res) => {
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

    await NotificationController.deleteNotificationsByKnockId(originalKnockerId, declinedKnock._id);
    await NotificationController.deleteNotificationsByKnockId(userId, declinedKnock._id);

    if (declinerSocketId) {
      io.to(declinerSocketId).emit('knockStatusChanged', { userId: userId });
    }
    if (originalKnockerSocketId) {
      io.to(originalKnockerSocketId).emit('knockStatusChanged', { userId: originalKnockerId });
    }

    if (originalKnockerSocketId) {
      io.to(originalKnockerSocketId).emit('knockStatusUpdate', {
        knockId: declinedKnock._id.toString(),
        newStatus: 'declined',
      });
    }
    if (declinerSocketId) {
      io.to(declinerSocketId).emit('knockRequestRemoved', declinedKnock._id.toString());
    }

    res.json({ message: 'Knock declined.', declinedId: knockId });

  } catch (err) {
    console.error('Error declining knock:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// --- NEW UNKNOCK USER FUNCTION ---
exports.unknockUser = async (req, res) => {
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

    // You can also emit a real-time update to the unknocked user
    if (unknockedUserSocketId) {
      io.to(unknockedUserSocketId).emit('knockStatusUpdate', {
        knockId: knockId,
        newStatus: 'stranger',
      });
    }

    // You might want to delete related notifications here
    await NotificationController.deleteNotificationsByKnockId(userId, knockId);
    await NotificationController.deleteNotificationsByKnockId(unknockedUserId, knockId);

    res.json({ message: 'Knock unknocked successfully.' });

  } catch (err) {
    console.error('Error unknocking:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getKnockers = async (req, res) => {
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

exports.getKnocked = async (req, res) => {
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

exports.getPendingKnockRequests = async (req, res) => {
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

exports.searchUsers = async (req, res) => {
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

exports.getKnockersForUser = async (req, res) => {
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

exports.breakLock = async (req, res) => {
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

exports.getCountsForUser = async (req, res) => {
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