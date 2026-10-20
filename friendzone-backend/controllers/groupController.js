import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import Knock from '../models/Knock.js';
import { getBlockedIds } from '../services/privacyService.js';
import { uploadImageToCloudinary, deleteImageFromCloudinary } from '../services/cloudinaryService.js';
import { cleanString, isObjectId, toIdList } from '../utils/validate.js';

const MAX_MEMBERS = 50;
const USER_FIELDS = 'firstName lastName profileImage';

const loadGroup = async (req, res) => {
  const { id } = req.params;
  if (!isObjectId(id)) {
    res.status(404).json({ message: 'Group not found.' });
    return null;
  }
  const chat = await Chat.findById(id);
  const userId = req.user.id.toString();
  if (!chat || chat.type !== 'group' || !chat.participants.some((p) => p.toString() === userId)) {
    res.status(404).json({ message: 'Group not found.' });
    return null;
  }
  return chat;
};

const requireAdmin = (req, res, chat) => {
  if (chat.groupAdmin?.toString() !== req.user.id.toString()) {
    res.status(403).json({ message: 'Only the group admin can do that.' });
    return false;
  }
  return true;
};

const previewFor = (chat, userId, content, senderId) => ({
  id: chat._id.toString(),
  name: chat.name,
  avatar: chat.groupAvatar || null,
  lastMessage: { senderId, content, type: 'text', read: undefined },
  timestamp: new Date().toISOString(),
  unreadCount: chat.unreadCounts.find((u) => u.user.toString() === userId)?.count || 0,
  type: 'group',
  isRestricted: false,
  firstMessageByKnockerId: null,
  isLockedIn: false,
});

const postSystemMessage = async ({ io, userSocketMap, chat, actorId, text, notifyIds }) => {
  const message = await Message.create({
    chat: chat._id,
    sender: actorId,
    type: 'system',
    text,
    readBy: chat.participants,
  });

  chat.lastMessage = message._id;
  chat.lastMessageAt = message.createdAt;
  await chat.save();

  if (!io) return message;

  io.to(chat._id.toString()).emit('message', {
    id: message._id.toString(),
    chat: chat._id.toString(),
    sender: actorId.toString(),
    type: 'system',
    text,
    attachments: [],
    timestamp: message.createdAt.toISOString(),
    read: true,
    replyTo: null,
  });

  for (const id of notifyIds) {
    const socketId = userSocketMap.get(id.toString());
    if (socketId) {
      io.to(socketId).emit('chatPreviewUpdate', previewFor(chat, id.toString(), text, actorId.toString()));
    }
  }
  return message;
};

const names = (users) => users.map((u) => u.firstName).join(', ');

export const getGroupInfo = async (req, res) => {
  try {
    const chat = await loadGroup(req, res);
    if (!chat) return;

    const [members, admin] = await Promise.all([
      User.find({ _id: { $in: chat.participants } }).select(USER_FIELDS).lean(),
      Promise.resolve(chat.groupAdmin?.toString()),
    ]);

    res.json({
      id: chat._id.toString(),
      name: chat.name,
      avatar: chat.groupAvatar || null,
      adminId: admin || null,
      isAdmin: admin === req.user.id.toString(),
      createdAt: chat.createdAt,
      members: members.map((m) => ({
        id: m._id.toString(),
        firstName: m.firstName,
        lastName: m.lastName,
        profileImage: m.profileImage || null,
        isAdmin: m._id.toString() === admin,
      })),
    });
  } catch (error) {
    console.error('Error fetching group info:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
};

export const renameGroup = async (req, res) => {
  const name = cleanString(req.body?.name, 60);
  if (!name) return res.status(400).json({ message: 'Group name is required.' });

  try {
    const chat = await loadGroup(req, res);
    if (!chat || !requireAdmin(req, res, chat)) return;

    chat.name = name;
    await chat.save();

    const io = req.app.get('socketio');
    const actor = await User.findById(req.user.id).select('firstName').lean();
    await postSystemMessage({
      io,
      userSocketMap: req.app.get('userSocketMap'),
      chat,
      actorId: req.user.id,
      text: `${actor.firstName} renamed the group to "${name}"`,
      notifyIds: chat.participants,
    });
    io?.to(chat._id.toString()).emit('groupUpdated', { chatId: chat._id.toString() });

    res.json({ success: true, name });
  } catch (error) {
    console.error('Error renaming group:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
};

export const updateGroupAvatar = async (req, res) => {
  if (!req.file?.buffer) return res.status(400).json({ message: 'Choose an image.' });

  try {
    const chat = await loadGroup(req, res);
    if (!chat || !requireAdmin(req, res, chat)) return;

    const uploaded = await uploadImageToCloudinary(req.file.buffer, 'group_avatars');
    const previous = chat.groupAvatarPublicId;
    chat.groupAvatar = uploaded.url;
    chat.groupAvatarPublicId = uploaded.public_id;
    await chat.save();
    if (previous) deleteImageFromCloudinary(previous);

    const io = req.app.get('socketio');
    const actor = await User.findById(req.user.id).select('firstName').lean();
    await postSystemMessage({
      io,
      userSocketMap: req.app.get('userSocketMap'),
      chat,
      actorId: req.user.id,
      text: `${actor.firstName} changed the group photo`,
      notifyIds: chat.participants,
    });
    io?.to(chat._id.toString()).emit('groupUpdated', { chatId: chat._id.toString() });

    res.json({ success: true, avatar: chat.groupAvatar });
  } catch (error) {
    console.error('Error updating group photo:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
};

export const addMembers = async (req, res) => {
  const ids = toIdList(req.body?.userIds, MAX_MEMBERS);
  if (!ids || ids.length === 0) return res.status(400).json({ message: 'Choose at least one person.' });

  try {
    const chat = await loadGroup(req, res);
    if (!chat || !requireAdmin(req, res, chat)) return;

    const adderId = req.user.id.toString();
    const existing = new Set(chat.participants.map(String));
    const fresh = ids.filter((id) => !existing.has(id));
    if (fresh.length === 0) return res.status(400).json({ message: 'Those people are already in the group.' });
    if (existing.size + fresh.length > MAX_MEMBERS) {
      return res.status(400).json({ message: `A group can have up to ${MAX_MEMBERS} people.` });
    }

    const blocked = await getBlockedIds(adderId);
    if (fresh.some((id) => blocked.has(id))) {
      return res.status(400).json({ message: 'One or more people cannot be added.' });
    }

    const users = await User.find({ _id: { $in: fresh }, isVerified: true }).select(`${USER_FIELDS} isPrivate`).lean();
    if (users.length !== fresh.length) return res.status(400).json({ message: 'One or more users were not found.' });

    const privateIds = users.filter((u) => u.isPrivate).map((u) => u._id);
    if (privateIds.length) {
      const locked = await Knock.find({ knocker: adderId, knocked: { $in: privateIds }, status: 'lockedIn' })
        .select('knocked')
        .lean();
      const lockedSet = new Set(locked.map((k) => k.knocked.toString()));
      if (privateIds.some((id) => !lockedSet.has(id.toString()))) {
        return res.status(403).json({ message: 'You can only add private accounts you are locked in with.' });
      }
    }

    chat.participants.push(...fresh);
    fresh.forEach((id) => chat.unreadCounts.push({ user: id, count: 0 }));
    chat.deletedBy = chat.deletedBy.filter((id) => !fresh.includes(id.toString()));
    await chat.save();

    const io = req.app.get('socketio');
    const userSocketMap = req.app.get('userSocketMap');
    const actor = await User.findById(adderId).select('firstName').lean();

    for (const id of fresh) {
      const socketId = userSocketMap.get(id);
      if (socketId && io) {
        io.in(socketId).socketsJoin(chat._id.toString());
        io.to(socketId).emit('newChat', previewFor(chat, id, 'You were added to the group', adderId));
      }
    }

    await postSystemMessage({
      io,
      userSocketMap,
      chat,
      actorId: adderId,
      text: `${actor.firstName} added ${names(users)}`,
      notifyIds: chat.participants.filter((p) => !fresh.includes(p.toString())),
    });
    io?.to(chat._id.toString()).emit('groupUpdated', { chatId: chat._id.toString() });

    res.json({ success: true, added: fresh.length });
  } catch (error) {
    console.error('Error adding members:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
};

export const removeMember = async (req, res) => {
  const { userId } = req.params;
  if (!isObjectId(userId)) return res.status(400).json({ message: 'Invalid user.' });

  try {
    const chat = await loadGroup(req, res);
    if (!chat || !requireAdmin(req, res, chat)) return;

    if (userId === req.user.id.toString()) {
      return res.status(400).json({ message: 'Use Leave group to leave.' });
    }
    if (!chat.participants.some((p) => p.toString() === userId)) {
      return res.status(404).json({ message: 'That person is not in the group.' });
    }

    chat.participants = chat.participants.filter((p) => p.toString() !== userId);
    chat.unreadCounts = chat.unreadCounts.filter((u) => u.user.toString() !== userId);
    await chat.save();

    const io = req.app.get('socketio');
    const userSocketMap = req.app.get('userSocketMap');
    const removedSocket = userSocketMap.get(userId);
    if (removedSocket && io) {
      io.in(removedSocket).socketsLeave(chat._id.toString());
      io.to(removedSocket).emit('chatRemoved', { chatId: chat._id.toString() });
    }

    const [actor, removed] = await Promise.all([
      User.findById(req.user.id).select('firstName').lean(),
      User.findById(userId).select('firstName').lean(),
    ]);
    await postSystemMessage({
      io,
      userSocketMap,
      chat,
      actorId: req.user.id,
      text: `${actor.firstName} removed ${removed?.firstName || 'a member'}`,
      notifyIds: chat.participants,
    });
    io?.to(chat._id.toString()).emit('groupUpdated', { chatId: chat._id.toString() });

    res.json({ success: true });
  } catch (error) {
    console.error('Error removing member:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
};

export const leaveGroup = async (req, res) => {
  try {
    const chat = await loadGroup(req, res);
    if (!chat) return;

    const userId = req.user.id.toString();
    const io = req.app.get('socketio');
    const userSocketMap = req.app.get('userSocketMap');

    chat.participants = chat.participants.filter((p) => p.toString() !== userId);
    chat.unreadCounts = chat.unreadCounts.filter((u) => u.user.toString() !== userId);

    const mySocket = userSocketMap.get(userId);
    if (mySocket && io) {
      io.in(mySocket).socketsLeave(chat._id.toString());
      io.to(mySocket).emit('chatRemoved', { chatId: chat._id.toString() });
    }

    if (chat.participants.length === 0) {
      await Message.deleteMany({ chat: chat._id });
      await Chat.deleteOne({ _id: chat._id });
      return res.json({ success: true, deleted: true });
    }

    let newAdminName = null;
    if (chat.groupAdmin?.toString() === userId) {
      chat.groupAdmin = chat.participants[0];
      const next = await User.findById(chat.groupAdmin).select('firstName').lean();
      newAdminName = next?.firstName || null;
    }
    await chat.save();

    const leaver = await User.findById(userId).select('firstName').lean();
    await postSystemMessage({
      io,
      userSocketMap,
      chat,
      actorId: userId,
      text: newAdminName
        ? `${leaver.firstName} left. ${newAdminName} is now the admin`
        : `${leaver.firstName} left the group`,
      notifyIds: chat.participants,
    });
    io?.to(chat._id.toString()).emit('groupUpdated', { chatId: chat._id.toString() });

    res.json({ success: true });
  } catch (error) {
    console.error('Error leaving group:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
};
