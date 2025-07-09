const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');
const Notification = require('../models/Notification');
const moment = require('moment');

// Utility to get user avatar (assuming profileImage is available on User model)
const getUserAvatar = (user) => user.profileImage || `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName || ''}`;

// @route GET /api/chats
// @desc Get all chats for the authenticated user (with last message preview)
// @access Private
exports.getUserChats = async (req, res) => {
  const userId = req.user.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const chats = await Chat.find({ participants: userId })
      .populate({
        path: 'participants',
        select: 'firstName lastName profileImage email',
      })
      .populate({
        path: 'lastMessage',
        select: 'text sender readBy createdAt',
        populate: {
          path: 'sender',
          select: 'firstName lastName',
        },
      })
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalChats = await Chat.countDocuments({ participants: userId });

    const formattedChats = chats.map(chat => {
      const otherParticipant = chat.participants.find(p => p._id.toString() !== userId);
      const chatName = chat.type === 'group' ? chat.name : (otherParticipant ? `${otherParticipant.firstName} ${otherParticipant.lastName || ''}`.trim() : 'Unknown User');
      const chatAvatar = chat.type === 'group' ? null : (otherParticipant ? getUserAvatar(otherParticipant) : null); // Group chat avatars handled differently on frontend

      const lastMessageText = chat.lastMessage ? chat.lastMessage.text : 'No messages yet';
      const lastMessageSender = chat.lastMessage && chat.lastMessage.sender ?
        (chat.lastMessage.sender._id.toString() === userId ? 'You: ' : `${chat.lastMessage.sender.firstName}: `) : '';
      const timestamp = chat.lastMessage ? moment(chat.lastMessage.createdAt).fromNow() : '';

      // Count unread messages for this user in this chat
      const unreadCount = chat.lastMessage && !chat.lastMessage.readBy.includes(userId) ? 1 : 0; // Simple unread check, could be more complex

      return {
        id: chat._id,
        name: chatName,
        avatar: chatAvatar,
        lastMessage: `${lastMessageSender}${lastMessageText}`,
        timestamp: timestamp,
        unreadCount: unreadCount,
        type: chat.type,
        otherParticipantId: otherParticipant ? otherParticipant._id : null,
      };
    });

    res.json({
      chats: formattedChats,
      currentPage: page,
      totalPages: Math.ceil(totalChats / limit),
      totalChats,
    });
  } catch (error) {
    console.error('Error fetching user chats:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @route GET /api/chats/:id/messages
// @desc Get messages for a specific chat with pagination
// @access Private
exports.getChatMessages = async (req, res) => {
  const { id: chatId } = req.params;
  const userId = req.user.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  try {
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.participants.includes(userId)) {
      return res.status(404).json({ message: 'Chat not found or unauthorized' });
    }

    const messages = await Message.find({ chat: chatId })
      .populate('sender', 'firstName lastName profileImage')
      .sort({ createdAt: -1 }) // Get latest messages first
      .skip(skip)
      .limit(limit)
      .lean();

    const totalMessages = await Message.countDocuments({ chat: chatId });

    // Mark messages as read by the current user
    await Message.updateMany(
      { chat: chatId, _id: { $in: messages.map(m => m._id) }, readBy: { $ne: userId } },
      { $addToSet: { readBy: userId } }
    );

    const formattedMessages = messages.reverse().map(msg => ({ // Reverse to get chronological order for FlatList
      id: msg._id,
      sender: msg.sender._id.toString() === userId ? 'me' : 'other',
      text: msg.text,
      timestamp: msg.createdAt.toISOString(),
      read: msg.readBy.includes(userId),
      // avatar: getUserAvatar(msg.sender), // If you want sender avatar in message bubbles
    }));

    res.json({
      messages: formattedMessages,
      currentPage: page,
      totalPages: Math.ceil(totalMessages / limit),
      totalMessages,
    });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @route POST /api/chats
// @desc Create a new private chat (if one doesn't exist)
// @access Private
exports.createChat = async (req, res) => {
  const { recipientId } = req.body;
  const userId = req.user.id;

  try {
    if (userId === recipientId) {
      return res.status(400).json({ message: 'Cannot create chat with self' });
    }

    let chat = await Chat.findOne({
      type: 'private',
      participants: { $all: [userId, recipientId] }
    });

    if (chat) {
      return res.status(200).json({ message: 'Chat already exists', chatId: chat._id });
    }

    chat = new Chat({
      participants: [userId, recipientId],
      type: 'private',
    });
    await chat.save();

    // Add chat to both users' chat lists
    await User.updateMany(
      { _id: { $in: [userId, recipientId] } },
      { $addToSet: { chats: chat._id } }
    );

    res.status(201).json({ message: 'Chat created successfully', chatId: chat._id });
  } catch (error) {
    console.error('Error creating chat:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// This function will be called by Socket.IO for new messages, so it's not a direct route
exports.saveMessage = async ({ chatId, senderId, text }) => {
  try {
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.participants.includes(senderId)) {
      console.error('Chat not found or sender not participant for message saving.');
      return null;
    }

    const newMessage = new Message({
      chat: chatId,
      sender: senderId,
      text: text,
      readBy: [senderId], // Sender automatically reads their own message
    });
    await newMessage.save();

    // Update lastMessage and lastMessageAt in Chat
    chat.lastMessage = newMessage._id;
    chat.lastMessageAt = newMessage.createdAt;
    await chat.save();

    // Populate sender info for the real-time event
    const populatedMessage = await Message.findById(newMessage._id).populate('sender', 'firstName lastName profileImage');

    return {
      id: populatedMessage._id,
      chat: populatedMessage.chat,
      sender: {
        id: populatedMessage.sender._id,
        firstName: populatedMessage.sender.firstName,
        lastName: populatedMessage.sender.lastName,
        profileImage: populatedMessage.sender.profileImage,
      },
      text: populatedMessage.text,
      timestamp: populatedMessage.createdAt.toISOString(),
      readBy: populatedMessage.readBy.map(id => id.toString()),
    };
  } catch (error) {
    console.error('Error saving message:', error);
    return null;
  }
};

// This function will be called by Socket.IO for marking messages as read
exports.markMessagesAsRead = async ({ chatId, userId }) => {
  try {
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.participants.includes(userId)) {
      console.error('Chat not found or user not participant for marking messages as read.');
      return false;
    }

    await Message.updateMany(
      { chat: chatId, readBy: { $ne: userId } },
      { $addToSet: { readBy: userId } }
    );
    return true;
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return false;
  }
};