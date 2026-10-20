import { v4 as uuidv4 } from 'uuid';
import Chat from '../models/Chat.js';
import Meeting from '../models/Meeting.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { isBlockedBetween } from '../services/privacyService.js';
import { isObjectId } from '../utils/validate.js';

const RING_WINDOW_MS = 60 * 1000;

const postCallMessage = async (io, chat, senderId, text) => {
  const message = await Message.create({
    chat: chat._id,
    sender: senderId,
    type: 'system',
    text,
    readBy: chat.participants,
  });

  chat.lastMessage = message._id;
  chat.lastMessageAt = message.createdAt;
  await chat.save();

  io?.to(chat._id.toString()).emit('message', {
    id: message._id.toString(),
    chat: chat._id.toString(),
    sender: senderId.toString(),
    type: 'system',
    text,
    attachments: [],
    timestamp: message.createdAt.toISOString(),
    read: true,
    replyTo: null,
  });
};

const loadMemberChat = async (chatId, userId) => {
  if (!isObjectId(chatId)) return null;
  const chat = await Chat.findById(chatId);
  if (!chat || !chat.participants.some((p) => p.toString() === userId.toString())) return null;
  return chat;
};

export const startCall = async (req, res) => {
  const { chatId } = req.body || {};
  const audioOnly = req.body?.audioOnly === true;
  const userId = req.user.id.toString();

  try {
    const chat = await loadMemberChat(chatId, userId);
    if (!chat) return res.status(404).json({ message: 'Chat not found.' });

    const others = chat.participants.map(String).filter((id) => id !== userId);
    if (others.length === 0) return res.status(400).json({ message: 'There is nobody to call.' });

    if (chat.type === 'private' && (await isBlockedBetween(userId, others[0]))) {
      return res.status(403).json({ message: 'You cannot call this user.' });
    }

    const recent = await Meeting.findOne({
      host: userId,
      instant: true,
      status: 'live',
      createdAt: { $gt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
    });
    if (recent) {
      recent.status = 'completed';
      recent.actualEndTime = new Date();
      await recent.save();
    }

    const host = await User.findById(userId).select('firstName lastName profileImage').lean();
    const hostName = `${host.firstName} ${host.lastName || ''}`.trim();
    const title = chat.type === 'group' ? chat.name : `Call with ${hostName}`;
    const now = new Date();

    const meeting = await Meeting.create({
      title,
      host: userId,
      participants: others.map((id) => ({ user: id, status: 'pending' })),
      roomId: uuidv4(),
      startTime: now,
      endTime: new Date(now.getTime() + 2 * 60 * 60 * 1000),
      actualStartTime: now,
      status: 'live',
      kind: 'video',
      audioOnly,
      instant: true,
      chat: chat._id,
      maxParticipants: Math.max(chat.participants.length, 2),
    });

    const io = req.app.get('socketio');
    const payload = {
      meetingId: meeting._id.toString(),
      chatId: chat._id.toString(),
      audioOnly,
      isGroup: chat.type === 'group',
      title: chat.type === 'group' ? chat.name : hostName,
      from: { id: userId, name: hostName, profileImage: host.profileImage || null },
      expiresAt: new Date(Date.now() + RING_WINDOW_MS).toISOString(),
    };
    for (const id of others) io?.to(`notifications-${id}`).emit('incomingCall', payload);

    await postCallMessage(io, chat, userId, `${host.firstName} started ${audioOnly ? 'an audio' : 'a video'} call`);

    res.status(201).json({ meetingId: meeting._id.toString(), audioOnly });
  } catch (error) {
    console.error('Error starting call:', error.message);
    res.status(500).json({ message: 'Could not start the call.' });
  }
};

export const cancelCall = async (req, res) => {
  const { meetingId } = req.params;
  if (!isObjectId(meetingId)) return res.status(404).json({ message: 'Call not found.' });

  try {
    const meeting = await Meeting.findOne({ _id: meetingId, host: req.user.id, instant: true });
    if (!meeting) return res.status(404).json({ message: 'Call not found.' });

    const hadJoiners = meeting.participants.some((p) => p.joinedAt);
    meeting.status = 'completed';
    meeting.actualEndTime = new Date();
    await meeting.save();

    const io = req.app.get('socketio');
    for (const p of meeting.participants) {
      io?.to(`notifications-${p.user}`).emit('callCancelled', { meetingId });
    }

    if (!hadJoiners && meeting.chat) {
      const chat = await Chat.findById(meeting.chat);
      if (chat) {
        const host = await User.findById(req.user.id).select('firstName').lean();
        await postCallMessage(io, chat, req.user.id, `Missed ${meeting.audioOnly ? 'audio' : 'video'} call from ${host.firstName}`);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error cancelling call:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
};

export const declineCall = async (req, res) => {
  const { meetingId } = req.params;
  if (!isObjectId(meetingId)) return res.status(404).json({ message: 'Call not found.' });

  try {
    const meeting = await Meeting.findOne({
      _id: meetingId,
      instant: true,
      'participants.user': req.user.id,
    });
    if (!meeting) return res.status(404).json({ message: 'Call not found.' });

    const participant = meeting.participants.find((p) => p.user.toString() === req.user.id.toString());
    participant.status = 'declined';
    await meeting.save();

    req.app
      .get('socketio')
      ?.to(`notifications-${meeting.host}`)
      .emit('callDeclined', { meetingId, userId: req.user.id.toString() });

    res.json({ success: true });
  } catch (error) {
    console.error('Error declining call:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
};
