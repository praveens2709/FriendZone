import bcrypt from 'bcryptjs';
import Block from '../models/Block.js';
import Report from '../models/Report.js';
import Knock from '../models/Knock.js';
import User from '../models/User.js';
import Post from '../models/Post.js';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import Notification from '../models/Notification.js';
import Meeting from '../models/Meeting.js';
import WordleGame from '../models/WordleGame.js';
import WordleStreak from '../models/WordleStreak.js';
import { deleteImageFromCloudinary } from '../services/cloudinaryService.js';
import { cleanString, isObjectId } from '../utils/validate.js';

const REPORT_REASONS = Report.schema.path('reason').enumValues;
const REPORT_TARGETS = Report.schema.path('targetType').enumValues;

export const blockUser = async (req, res) => {
  const blockerId = req.user.id;
  const { userId } = req.params;

  if (!isObjectId(userId) || userId === blockerId) {
    return res.status(400).json({ message: 'Invalid user.' });
  }

  try {
    const target = await User.exists({ _id: userId });
    if (!target) {
      return res.status(404).json({ message: 'User not found.' });
    }

    await Block.updateOne(
      { blocker: blockerId, blocked: userId },
      { $setOnInsert: { blocker: blockerId, blocked: userId } },
      { upsert: true }
    );

    await Knock.deleteMany({
      $or: [
        { knocker: blockerId, knocked: userId },
        { knocker: userId, knocked: blockerId },
      ],
    });

    const io = req.app.get('socketio');
    if (io) {
      io.to(`notifications-${blockerId}`).emit('knockStatusChanged', { userId: blockerId });
      io.to(`notifications-${userId}`).emit('knockStatusChanged', { userId });
      io.to(`notifications-${blockerId}`).emit('blockChanged', { userId, blocked: true });
      io.to(`notifications-${userId}`).emit('blockChanged', { userId: blockerId, blocked: true });
      io.to(`notifications-${blockerId}`).emit('storiesChanged');
      io.to(`notifications-${userId}`).emit('storiesChanged');
    }

    res.json({ success: true, message: 'User blocked.' });
  } catch (error) {
    console.error('Error blocking user:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
};

export const unblockUser = async (req, res) => {
  const { userId } = req.params;

  if (!isObjectId(userId)) {
    return res.status(400).json({ message: 'Invalid user.' });
  }

  try {
    await Block.deleteOne({ blocker: req.user.id, blocked: userId });
    const io = req.app.get('socketio');
    if (io && isObjectId(userId)) {
      io.to(`notifications-${req.user.id}`).emit('blockChanged', { userId, blocked: false });
      io.to(`notifications-${userId}`).emit('blockChanged', { userId: req.user.id.toString(), blocked: false });
    }
    res.json({ success: true, message: 'User unblocked.' });
  } catch (error) {
    console.error('Error unblocking user:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
};

export const getBlockedUsers = async (req, res) => {
  try {
    const blocks = await Block.find({ blocker: req.user.id })
      .sort({ createdAt: -1 })
      .populate('blocked', 'firstName lastName profileImage')
      .lean();

    res.json(
      blocks
        .filter((b) => b.blocked)
        .map((b) => ({
          id: b.blocked._id.toString(),
          firstName: b.blocked.firstName,
          lastName: b.blocked.lastName,
          profileImage: b.blocked.profileImage || null,
          blockedAt: b.createdAt,
        }))
    );
  } catch (error) {
    console.error('Error fetching blocked users:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
};

const resolveReportedUser = async (targetType, targetId) => {
  if (targetType === 'user') return targetId;
  if (targetType === 'post') {
    const post = await Post.findById(targetId).select('user').lean();
    return post?.user || null;
  }
  if (targetType === 'comment') {
    const post = await Post.findOne({ 'comments._id': targetId }).select('comments').lean();
    const comment = post?.comments.find((c) => c._id.toString() === targetId);
    return comment?.user || null;
  }
  if (targetType === 'message') {
    const message = await Message.findById(targetId).select('sender').lean();
    return message?.sender || null;
  }
  return null;
};

export const reportContent = async (req, res) => {
  const { targetType, targetId, reason } = req.body || {};
  const details = cleanString(req.body?.details, 1000);

  if (!REPORT_TARGETS.includes(targetType) || !isObjectId(targetId) || !REPORT_REASONS.includes(reason)) {
    return res.status(400).json({ message: 'Invalid report.' });
  }

  try {
    const reportedUser = await resolveReportedUser(targetType, targetId);
    if (!reportedUser) {
      return res.status(404).json({ message: 'Content not found.' });
    }
    if (reportedUser.toString() === req.user.id) {
      return res.status(400).json({ message: 'You cannot report yourself.' });
    }

    await Report.updateOne(
      { reporter: req.user.id, targetType, targetId },
      { $setOnInsert: { reporter: req.user.id, targetType, targetId, reportedUser, reason, details } },
      { upsert: true }
    );

    res.status(201).json({ success: true, message: 'Report received. Thank you.' });
  } catch (error) {
    console.error('Error creating report:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
};

export const deleteAccount = async (req, res) => {
  const { password } = req.body || {};

  if (typeof password !== 'string' || !password) {
    return res.status(400).json({ message: 'Password is required to delete your account.' });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: 'Incorrect password.' });
    }

    const userId = user._id;

    const posts = await Post.find({ user: userId }).select('images').lean();
    const imageIds = posts.flatMap((p) => p.images.map((i) => i.public_id));
    await Promise.all(imageIds.map((id) => deleteImageFromCloudinary(id)));
    if (user.profileImagePublicId) {
      await deleteImageFromCloudinary(user.profileImagePublicId);
    }

    await Promise.all([
      Post.deleteMany({ user: userId }),
      Post.updateMany(
        { $or: [{ likes: userId }, { saves: userId }, { 'comments.user': userId }] },
        { $pull: { likes: userId, saves: userId, comments: { user: userId } } }
      ),
      Knock.deleteMany({ $or: [{ knocker: userId }, { knocked: userId }] }),
      Notification.deleteMany({ $or: [{ recipient: userId }, { sender: userId }] }),
      Meeting.deleteMany({ host: userId }),
      Meeting.updateMany({ 'participants.user': userId }, { $pull: { participants: { user: userId } } }),
      WordleGame.deleteMany({ userId }),
      WordleStreak.deleteMany({ userId }),
      Block.deleteMany({ $or: [{ blocker: userId }, { blocked: userId }] }),
      Report.deleteMany({ reporter: userId }),
    ]);

    const chats = await Chat.find({ participants: userId }).select('_id type participants').lean();
    const privateChatIds = chats.filter((c) => c.type === 'private').map((c) => c._id);
    const groupChatIds = chats.filter((c) => c.type === 'group').map((c) => c._id);

    await Message.deleteMany({ $or: [{ chat: { $in: privateChatIds } }, { sender: userId }] });
    await Chat.deleteMany({ _id: { $in: privateChatIds } });
    await Chat.updateMany(
      { _id: { $in: groupChatIds } },
      { $pull: { participants: userId, unreadCounts: { user: userId } } }
    );

    for (const chatId of groupChatIds) {
      const latest = await Message.findOne({ chat: chatId }).sort({ createdAt: -1 }).select('_id createdAt').lean();
      await Chat.updateOne(
        { _id: chatId },
        latest
          ? { $set: { lastMessage: latest._id, lastMessageAt: latest.createdAt } }
          : { $unset: { lastMessage: 1 } }
      );
    }

    await User.deleteOne({ _id: userId });

    const io = req.app.get('socketio');
    if (io) {
      io.in(`notifications-${userId}`).disconnectSockets(true);
    }

    res.json({ success: true, message: 'Account deleted.' });
  } catch (error) {
    console.error('Error deleting account:', error.message);
    res.status(500).json({ message: 'Server error while deleting account.' });
  }
};
