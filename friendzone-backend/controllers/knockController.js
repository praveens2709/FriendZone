const User = require('../models/User');
const Knock = require('../models/Knock');
const NotificationController = require('./notificationController');

exports.knockUser = async (req, res) => {
  const knockerId = req.user.id;
  const { knockedId } = req.body;

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

    const isPrivate = knockedUser.isPrivate;
    let status = mutualKnock ? 'lockedIn' : (isPrivate ? 'pending' : 'lockedIn');

    const newKnock = await Knock.create({ knocker: knockerId, knocked: knockedId, status });

    if (mutualKnock && mutualKnock.status === 'pending') {
      mutualKnock.status = 'onesidedlock';
      await mutualKnock.save();
    }

    if (!isPrivate) {
      await NotificationController.createNotification({
        recipientId: knockerId,
        senderId: knockerId,
        type: 'activity',
        content: `You knocked on ${knockedUser.firstName} ${knockedUser.lastName || ''}.`,
        relatedEntityId: newKnock._id,
        relatedEntityType: 'Knock',
      });
    } else if (isPrivate && mutualKnock) {
       await NotificationController.createNotification({
        recipientId: knockerId,
        senderId: knockedId,
        type: 'activity',
        content: `accepted your knock request.`,
        relatedEntityId: newKnock._id,
        relatedEntityType: 'Knock',
      });
    }

    if (!isPrivate) {
      await NotificationController.createNotification({
        recipientId: knockedId,
        senderId: knockerId,
        type: 'activity',
        content: `knocked on you.`,
        relatedEntityId: newKnock._id,
        relatedEntityType: 'Knock',
      });
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

  try {
    const existingKnock = await Knock.findOne({ _id: knockId, knocked: userId }).populate('knocker', 'firstName lastName');

    if (!existingKnock || (existingKnock.status !== 'pending' && existingKnock.status !== 'onesidedlock')) {
      return res.status(404).json({ message: 'Knock not found or already handled.' });
    }

    existingKnock.status = 'lockedIn';
    await existingKnock.save();

    const existingKnockFromAcceptor = await Knock.findOne({ knocker: userId, knocked: existingKnock.knocker._id });
    if (!existingKnockFromAcceptor) {
      await Knock.create({
        knocker: userId,
        knocked: existingKnock.knocker._id,
        status: 'lockedIn'
      });
    }

    await NotificationController.createNotification({
      recipientId: existingKnock.knocker._id,
      senderId: userId,
      type: 'knock_accepted',
      content: `knocked you back. You are now LockedIn!`,
      relatedEntityId: existingKnock._id,
      relatedEntityType: 'Knock'
    });

    await NotificationController.createNotification({
      recipientId: userId,
      senderId: userId,
      type: 'activity',
      content: `You knocked back ${existingKnock.knocker.firstName} ${existingKnock.knocker.lastName || ''}. You are now LockedIn!`,
      relatedEntityId: existingKnock._id,
      relatedEntityType: 'Knock'
    });

    res.json({ message: 'Knocked back. You are now LockedIn!', locked: [existingKnock] });

  } catch (err) {
    console.error('Error knocking back:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.acceptKnock = async (req, res) => {
  const userId = req.user.id;
  const knockId = req.params.id;

  try {
    const existingKnock = await Knock.findOne({ _id: knockId, knocked: userId }).populate('knocker', 'firstName lastName');

    if (!existingKnock || existingKnock.status !== 'pending') {
      return res.status(404).json({ message: 'Knock not found or already handled.' });
    }

    existingKnock.status = 'onesidedlock';
    await existingKnock.save();

    await NotificationController.createNotification({
      recipientId: existingKnock.knocker._id,
      senderId: userId,
      type: 'activity',
      content: `accepted your knock request.`,
      relatedEntityId: existingKnock._id,
      relatedEntityType: 'Knock'
    });

    await NotificationController.createNotification({
      recipientId: userId,
      senderId: existingKnock.knocker._id,
      type: 'activity',
      content: `knocked on you.`,
      relatedEntityId: existingKnock._id,
      relatedEntityType: 'Knock'
    });

    res.json({ message: 'Knock accepted. Status updated to onesidedlock.', knock: existingKnock });

  } catch (err) {
    console.error('Error accepting knock:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.declineKnock = async (req, res) => {
  const userId = req.user.id;
  const knockId = req.params.id;

  try {
    const declined = await Knock.findOneAndDelete({ _id: knockId, knocked: userId, status: 'pending' });

    if (!declined) return res.status(404).json({ message: 'Knock not found or already handled.' });

    res.json({ message: 'Knock declined.', declinedId: knockId });

  } catch (err) {
    console.error('Error declining knock:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getKnockers = async (req, res) => {
  const userId = req.user.id;

  try {
    const knockers = await Knock.find({ knocked: userId, status: 'pending' })
      .populate('knocker', 'firstName lastName profileImage')
      .sort({ createdAt: -1 });

    res.json(knockers.map(k => ({
      id: k._id.toString(),
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
      .sort({ createdAt: -1 });

    res.json(knocked.map(k => ({
      id: k._id.toString(),
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