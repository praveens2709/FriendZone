const Chat = require("../models/Chat");
const Message = require("../models/Message");
const User = require("../models/User");

const getUserAvatar = (user) =>
  user.profileImage ||
  `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName || ""}`;

exports.getUserAvatar = getUserAvatar;

exports.getUserChats = async (req, res) => {
  const userId = req.user.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const io = req.io;

  try {
    const chats = await Chat.find({ participants: userId })
      .populate({
        path: "participants",
        select: "firstName lastName profileImage email isPrivate",
      })
      .populate({
        path: "lastMessage",
        select: "text sender readBy createdAt",
        populate: {
          path: "sender",
          select: "firstName lastName",
        },
      })
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalChats = await Chat.countDocuments({ participants: userId });

    const formattedChats = chats.map((chat) => {
      const otherParticipant = chat.participants.find(
        (p) => p._id.toString() !== userId
      );
      const chatName =
        chat.type === "group"
          ? chat.name
          : otherParticipant
          ? `${otherParticipant.firstName} ${
              otherParticipant.lastName || ""
            }`.trim()
          : "Unknown User";
      const chatAvatar =
        chat.type === "group"
          ? null
          : otherParticipant
          ? getUserAvatar(otherParticipant)
          : null;

      const lastMessageText = chat.lastMessage
        ? chat.lastMessage.text
        : "No messages yet";
      const lastMessageSender =
        chat.lastMessage && chat.lastMessage.sender
          ? chat.lastMessage.sender._id.toString() === userId
            ? "You: "
            : `${chat.lastMessage.sender.firstName}: `
          : "";

      const chatTimestamp = chat.lastMessageAt
        ? chat.lastMessageAt.toISOString()
        : chat.createdAt
        ? chat.createdAt.toISOString()
        : new Date().toISOString();

      const unreadCountObj = chat.unreadCounts.find(
        (uc) => uc.user.toString() === userId
      );
      const unreadCount = unreadCountObj ? unreadCountObj.count : 0;

      return {
        id: chat._id.toString(),
        name: chatName,
        avatar: chatAvatar,
        lastMessage: `${lastMessageSender}${lastMessageText}`,
        timestamp: chatTimestamp,
        unreadCount: unreadCount,
        type: chat.type,
        otherParticipantId: otherParticipant
          ? otherParticipant._id.toString()
          : null,
        isRestricted: chat.isRestricted,
        firstMessageByKnockerId: chat.firstMessageByKnockerId
          ? chat.firstMessageByKnockerId.toString()
          : null,
      };
    });

    res.json({
      chats: formattedChats,
      currentPage: page,
      totalPages: Math.ceil(totalChats / limit),
      totalChats,
    });
  } catch (error) {
    console.error("Error fetching user chats:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getChatMessages = async (req, res) => {
  const { id: chatId } = req.params;
  const userId = req.user.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  try {
    const chat = await Chat.findById(chatId).populate(
      "participants",
      "firstName lastName profileImage isPrivate"
    );
    if (!chat || !chat.participants.some((p) => p._id.toString() === userId)) {
      console.log(`Chat not found or unauthorized for user ${userId} in chat ${chatId}`);
      return res
        .status(404)
        .json({ message: "Chat not found or unauthorized" });
    }

    const messages = await Message.find({ chat: chatId })
      .populate("sender", "firstName lastName profileImage")
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalMessages = await Message.countDocuments({ chat: chatId });

    await exports.markMessagesAsRead({ chatId, userId });

    const otherParticipant = chat.participants.find(
      (p) => p._id.toString() !== userId
    );
    const otherParticipantId = otherParticipant ? otherParticipant._id.toString() : null;

    const formattedMessages = messages.map((msg) => {
      const isMyMessage = msg.sender._id.toString() === userId;
      let readStatus = false;

      if (isMyMessage && otherParticipantId) {
        readStatus = msg.readBy.map(id => id.toString()).includes(otherParticipantId);
      } else if (!isMyMessage) {
        readStatus = msg.readBy.map(id => id.toString()).includes(userId);
      }

      return {
        id: msg._id.toString(),
        sender: msg.sender._id.toString(),
        text: msg.text,
        timestamp: msg.createdAt?.toISOString() || new Date().toISOString(),
        read: readStatus,
      };
    });

    res.json({
      messages: formattedMessages,
      currentPage: page,
      totalPages: Math.ceil(totalMessages / limit),
      totalMessages,
      isRestricted: chat.isRestricted,
      firstMessageByKnockerId: chat.firstMessageByKnockerId?.toString() || null,
    });
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.createChat = async (req, res, io, userSocketMap) => {
  const { recipientId } = req.body;
  const userId = req.user.id;

  try {
    if (userId === recipientId) {
      console.log("Attempted to create chat with self:", userId);
      return res.status(400).json({ message: "Cannot create chat with self" });
    }

    let chat = await Chat.findOne({
      type: "private",
      participants: { $all: [userId, recipientId] },
    }).populate({
      path: "participants",
      select: "firstName lastName profileImage email isPrivate",
    }).populate({
      path: "lastMessage",
      select: "text sender createdAt",
      populate: {
        path: "sender",
        select: "firstName lastName",
      },
    }).lean();

    if (chat) {
      console.log("Chat already exists:", chat._id);
      const senderUser = chat.participants.find(p => p._id.toString() === userId.toString());
      const recipientUser = chat.participants.find(p => p._id.toString() === recipientId.toString());

      if (senderUser && recipientUser) {
        const lastMessageText = chat.lastMessage
          ? chat.lastMessage.text
          : "Start chatting!";
        const chatTimestamp = chat.lastMessageAt
          ? chat.lastMessageAt.toISOString()
          : chat.createdAt
          ? chat.createdAt.toISOString()
          : new Date().toISOString();

        const senderSocketId = userSocketMap.get(userId.toString());
        if (senderSocketId) {
          const lastMessageSender = chat.lastMessage && chat.lastMessage.sender ?
            (chat.lastMessage.sender._id.toString() === userId ? "You: " : `${chat.lastMessage.sender.firstName}: `) : "";

          const chatPreviewForSender = {
            id: chat._id.toString(),
            name: `${recipientUser.firstName} ${recipientUser.lastName || ""}`.trim(),
            avatar: getUserAvatar(recipientUser),
            lastMessage: `${lastMessageSender}${lastMessageText}`,
            timestamp: chatTimestamp,
            unreadCount: chat.unreadCounts.find(uc => uc.user.toString() === userId.toString())?.count || 0,
            type: chat.type,
            otherParticipantId: recipientId.toString(),
            isRestricted: chat.isRestricted,
            firstMessageByKnockerId: chat.firstMessageByKnockerId?.toString() || null,
          };
          io.to(senderSocketId).emit("chatCreatedConfirmation", chatPreviewForSender);
          console.log(`Re-emitted chatCreatedConfirmation for existing chat ${chat._id} to sender ${userId} with lastMessage: "${chatPreviewForSender.lastMessage}"`);
        }

        const recipientSocketId = userSocketMap.get(recipientId.toString());
        if (recipientSocketId) {
          const lastMessageSender = chat.lastMessage && chat.lastMessage.sender ?
            (chat.lastMessage.sender._id.toString() === recipientId ? "You: " : `${chat.lastMessage.sender.firstName}: `) : "";

          const chatPreviewForRecipient = {
            id: chat._id.toString(),
            name: `${senderUser.firstName} ${senderUser.lastName || ""}`.trim(),
            avatar: getUserAvatar(senderUser),
            lastMessage: `${lastMessageSender}${lastMessageText}`,
            timestamp: chatTimestamp,
            unreadCount: chat.unreadCounts.find(uc => uc.user.toString() === recipientId.toString())?.count || 0,
            type: chat.type,
            otherParticipantId: userId.toString(),
            isRestricted: chat.isRestricted,
            firstMessageByKnockerId: chat.firstMessageByKnockerId?.toString() || null,
          };
          io.to(recipientSocketId).emit("newChat", chatPreviewForRecipient);
          console.log(`Re-emitted newChat for existing chat ${chat._id} to recipient ${recipientId} with lastMessage: "${chatPreviewForRecipient.lastMessage}"`);
        }
      }

      return res
        .status(200)
        .json({ message: "Chat already exists", chatId: chat._id.toString() });
    }

    const recipientUser = await User.findById(recipientId);
    if (!recipientUser) {
      console.log("Recipient user not found:", recipientId);
      return res.status(404).json({ message: "Recipient user not found" });
    }

    const isRestricted = recipientUser.isPrivate;

    chat = new Chat({
      participants: [userId, recipientId],
      type: "private",
      isRestricted,
      unreadCounts: [
        { user: userId, count: 0 },
        { user: recipientId, count: 0 },
      ],
      lastMessageAt: new Date(),
    });

    await chat.save();
    console.log("New chat created:", chat._id);

    const newChatPopulated = await Chat.findById(chat._id).populate(
      "participants",
      "firstName lastName profileImage email isPrivate"
    ).lean();

    const senderUser = newChatPopulated.participants.find(p => p._id.toString() === userId.toString());
    const recipientUserPopulated = newChatPopulated.participants.find(p => p._id.toString() === recipientId.toString());


    const recipientSocketId = userSocketMap.get(recipientId.toString());
    if (recipientSocketId && senderUser) {
      const chatPreviewForRecipient = {
        id: newChatPopulated._id.toString(),
        name: `${senderUser.firstName} ${senderUser.lastName || ""}`.trim(),
        avatar: getUserAvatar(senderUser),
        lastMessage: "Start chatting!",
        timestamp: newChatPopulated.createdAt.toISOString(),
        unreadCount: 0,
        type: newChatPopulated.type,
        otherParticipantId: userId.toString(),
        isRestricted: newChatPopulated.isRestricted,
        firstMessageByKnockerId: null,
      };
      io.to(recipientSocketId).emit("newChat", chatPreviewForRecipient);
      io.to(recipientSocketId).socketsJoin(newChatPopulated._id.toString());
      console.log(`Emitted newChat for recipient ${recipientId} for chat ${newChatPopulated._id} with lastMessage: "${chatPreviewForRecipient.lastMessage}"`);
    }

    const senderSocketId = userSocketMap.get(userId.toString());
    if (senderSocketId && recipientUserPopulated) {
      const chatPreviewForSender = {
        id: newChatPopulated._id.toString(),
        name: `${recipientUserPopulated.firstName} ${recipientUserPopulated.lastName || ""}`.trim(),
        avatar: getUserAvatar(recipientUserPopulated),
        lastMessage: "Start chatting!",
        timestamp: newChatPopulated.createdAt.toISOString(),
        unreadCount: 0,
        type: newChatPopulated.type,
        otherParticipantId: recipientId.toString(),
        isRestricted: newChatPopulated.isRestricted,
        firstMessageByKnockerId: null,
      };
      io.to(senderSocketId).emit("chatCreatedConfirmation", chatPreviewForSender);
      io.to(senderSocketId).socketsJoin(newChatPopulated._id.toString());
      console.log(`Emitted chatCreatedConfirmation for sender ${userId} for chat ${newChatPopulated._id} with lastMessage: "${chatPreviewForSender.lastMessage}"`);
    }

    return res.status(201).json({
      message: "Chat created successfully",
      chatId: chat._id.toString(),
      isRestricted: chat.isRestricted,
      firstMessageByKnockerId: chat.firstMessageByKnockerId
        ? chat.firstMessageByKnockerId.toString()
        : null,
    });
  } catch (error) {
    console.error("Error creating chat:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.saveMessage = async ({
  chatId,
  senderId,
  text,
  isNewChatFromCreation,
  clientTempId,
  io,
  userSocketMap
}) => {
  try {
    console.log(`[saveMessage] Starting for chat ${chatId}, sender ${senderId}, text: "${text}"`);
    console.log(`[saveMessage] io instance received: ${!!io}`);
    console.log(`[saveMessage] userSocketMap instance received: ${!!userSocketMap}`);
    if (userSocketMap) {
      console.log(`[saveMessage] Sender's socket ID: ${userSocketMap.get(senderId.toString())}`);
    }

    const chat = await Chat.findById(chatId).populate("participants", "firstName lastName profileImage isPrivate");
    if (
      !chat ||
      !chat.participants.some((p) => p._id.toString() === senderId.toString())
    ) {
      console.log(`[saveMessage] Chat not found or sender not participant for message save: chat ${chatId}, sender ${senderId}`);
      if (io && clientTempId && senderId && userSocketMap && userSocketMap.get(senderId.toString())) {
        io.to(userSocketMap.get(senderId.toString())).emit('messageFailed', { clientTempId, error: 'Chat not found or unauthorized' });
      }
      return null;
    }

    if (chat.type === "private" && chat.isRestricted) {
      if (!chat.firstMessageByKnockerId) {
        chat.firstMessageByKnockerId = senderId;
        console.log(`Chat ${chatId} now restricted by first message from ${senderId}`);
      } else if (
        chat.firstMessageByKnockerId.toString() === senderId.toString()
      ) {
        console.log(`Sender ${senderId} tried to send another message in restricted chat ${chatId}`);
        if (io && clientTempId && senderId && userSocketMap && userSocketMap.get(senderId.toString())) {
          io.to(userSocketMap.get(senderId.toString())).emit('messageFailed', { clientTempId, error: 'Chat is restricted. Recipient needs to reply to unlock.' });
        }
        return {
          error: "Chat is restricted. Recipient needs to reply to unlock.",
        };
      } else {
        chat.isRestricted = false;
        console.log(`Chat ${chatId} now unrestricted by message from ${senderId}`);
      }
    }

    const newMessage = new Message({
      chat: chatId,
      sender: senderId,
      text: text,
      readBy: [senderId],
    });

    const savedMessage = await newMessage.save();
    console.log("Message saved to DB:", savedMessage._id);

    chat.lastMessage = savedMessage._id;
    chat.lastMessageAt = savedMessage.createdAt;

    chat.participants.forEach((participant) => {
      if (participant._id.toString() !== senderId.toString()) {
        const unreadEntry = chat.unreadCounts.find(
          (uc) => uc.user.toString() === participant._id.toString()
        );
        if (unreadEntry) {
          unreadEntry.count += 1;
        } else {
          chat.unreadCounts.push({ user: participant._id, count: 1 });
        }
      } else {
        const senderUnreadEntry = chat.unreadCounts.find(
          (uc) => uc.user.toString() === senderId.toString()
        );
        if (senderUnreadEntry) {
          senderUnreadEntry.count = 0;
        } else {
          chat.unreadCounts.push({ user: senderId, count: 0 });
        }
      }
    });

    await chat.save();
    console.log("Chat updated with new last message and unread counts for chat:", chatId);

    const populatedMessage = await Message.findById(savedMessage._id)
      .populate("sender", "firstName lastName profileImage")
      .lean();

    const messageTimestamp = populatedMessage.createdAt
      ? populatedMessage.createdAt.toISOString()
      : new Date().toISOString();

    const otherParticipant = chat.participants.find(p => p._id.toString() !== senderId.toString());
    const otherParticipantId = otherParticipant ? otherParticipant._id.toString() : null;

    const messageReadByOtherParticipant = otherParticipantId ? populatedMessage.readBy.map(id => id.toString()).includes(otherParticipantId) : false;

    const messageForSocket = {
      id: populatedMessage._id.toString(),
      chat: populatedMessage.chat.toString(),
      sender: populatedMessage.sender._id.toString(),
      text: populatedMessage.text,
      timestamp: messageTimestamp,
      read: messageReadByOtherParticipant,
      isRestricted: chat.isRestricted,
      firstMessageByKnockerId: chat.firstMessageByKnockerId?.toString() || null,
      clientTempId: clientTempId,
    };

    if (io) {
      console.log(`[saveMessage] 'io' is defined. Attempting to emit messages.`);
      console.log(`[saveMessage] Emitting 'message' to chat room ${chatId}`);
      io.to(chatId).emit("message", messageForSocket);

      for (const participant of chat.participants) {
        const participantId = participant._id.toString();
        const unreadCountForParticipant = chat.unreadCounts.find(
          (uc) => uc.user.toString() === participantId
        )?.count || 0;

        const otherParticipantFromTheirView = chat.participants.find(p => p._id.toString() !== participantId);

        const lastMessageSenderPrefix = populatedMessage.sender._id.toString() === participantId ?
                                        "You: " : `${populatedMessage.sender.firstName}: `;

        const chatPreviewData = {
          id: chat._id.toString(),
          name: chat.type === "group" ? chat.name : (otherParticipantFromTheirView ? `${otherParticipantFromTheirView.firstName} ${otherParticipantFromTheirView.lastName || ""}`.trim() : "Unknown User"),
          avatar: chat.type === "group" ? null : (otherParticipantFromTheirView ? getUserAvatar(otherParticipantFromTheirView) : null),
          lastMessage: `${lastMessageSenderPrefix}${populatedMessage.text}`,
          timestamp: messageTimestamp,
          unreadCount: unreadCountForParticipant,
          type: chat.type,
          otherParticipantId: otherParticipantFromTheirView ? otherParticipantFromTheirView._id.toString() : null,
          isRestricted: chat.isRestricted,
          firstMessageByKnockerId: chat.firstMessageByKnockerId?.toString() || null,
        };

        const participantSocketId = userSocketMap.get(participantId);
        if (participantSocketId) {
          console.log(`[saveMessage] Emitting 'chatPreviewUpdate' to socket ${participantSocketId} for chat ${chatId}`);
          console.log(`[saveMessage] Payload for ${participantId}: ${JSON.stringify(chatPreviewData)}`);
          io.to(participantSocketId).emit("chatPreviewUpdate", chatPreviewData);
        } else {
          console.log(`[saveMessage] No socket ID found for participant ${participantId}. Cannot emit chatPreviewUpdate.`);
        }
      }
    } else {
      console.log(`[saveMessage] 'io' is UNDEFINED or NULL. Cannot emit any socket events.`);
    }

    return {
      id: populatedMessage._id.toString(),
      chat: populatedMessage.chat.toString(),
      sender: populatedMessage.sender._id.toString(),
      text: populatedMessage.text,
      timestamp: messageTimestamp,
      read: messageForSocket.read,
      isRestricted: chat.isRestricted,
      firstMessageByKnockerId: chat.firstMessageByKnockerId
        ? chat.firstMessageByKnockerId.toString()
        : null,
      clientTempId: clientTempId,
    };
  } catch (error) {
    console.error("Error saving message:", error);
    if (io && clientTempId && senderId && userSocketMap && userSocketMap.get(senderId.toString())) {
      io.to(userSocketMap.get(senderId.toString())).emit('messageFailed', { clientTempId, error: error.message || 'Failed to send message' });
    }
    return null;
  }
};

exports.markMessagesAsRead = async ({ chatId, userId }) => {
  try {
    const chat = await Chat.findById(chatId);
    if (
      !chat ||
      !chat.participants.some((p) => p.toString() === userId.toString())
    ) {
      console.log(`Mark read: Chat ${chatId} not found or user ${userId} not participant.`);
      return false;
    }

    await Message.updateMany(
      { chat: chatId, readBy: { $ne: userId } },
      { $addToSet: { readBy: userId } }
    );
    console.log(`Messages in chat ${chatId} marked as read by user ${userId} in DB.`);

    const unreadCountObj = chat.unreadCounts.find(
      (uc) => uc.user.toString() === userId.toString()
    );
    if (unreadCountObj) {
      if (unreadCountObj.count > 0) {
        console.log(`Resetting unread count for user ${userId} in chat ${chatId} from ${unreadCountObj.count} to 0.`);
        unreadCountObj.count = 0;
      } else {
        console.log(`Unread count for user ${userId} in chat ${chatId} already 0.`);
      }
    } else {
      console.log(`No unread count entry found for user ${userId} in chat ${chatId}. Adding with 0.`);
      chat.unreadCounts.push({ user: userId, count: 0 });
    }
    await chat.save();
    console.log(`Chat ${chatId} saved after unread count update.`);

    return true;
  } catch (error) {
    console.error("Error marking messages as read:", error);
    return false;
  }
};

exports.markMessagesAsReadRest = async (req, res, io, userSocketMap) => {
  const { id: chatId } = req.params;
  const userId = req.user.id;

  try {
    const success = await exports.markMessagesAsRead({ chatId, userId });
    if (success) {
      const chat = await Chat.findById(chatId).populate("participants", "firstName lastName profileImage")
        .populate({
          path: "lastMessage",
          select: "text sender createdAt",
          populate: {
            path: "sender",
            select: "firstName lastName",
          },
        }).lean();

      if (chat) {
        const userSocketId = userSocketMap.get(userId.toString());
        if (userSocketId) {
          const unreadCountForUser = chat.unreadCounts.find(uc => uc.user.toString() === userId.toString())?.count || 0;
          const otherParticipantFromTheirView = chat.participants.find(p => p._id.toString() !== userId.toString());

          const lastMessageText = chat.lastMessage ? chat.lastMessage.text : "No messages yet";
          const lastMessageSenderPrefix = chat.lastMessage && chat.lastMessage.sender ?
                                          (chat.lastMessage.sender._id.toString() === userId ? "You: " : `${chat.lastMessage.sender.firstName}: `) : "";

          const chatPreviewData = {
            id: chat._id.toString(),
            name: chat.type === "group" ? chat.name : (otherParticipantFromTheirView ? `${otherParticipantFromTheirView.firstName} ${otherParticipantFromTheirView.lastName || ""}`.trim() : "Unknown User"),
            avatar: chat.type === "group" ? null : (otherParticipantFromTheirView ? getUserAvatar(otherParticipantFromTheirView) : null),
            lastMessage: `${lastMessageSenderPrefix}${lastMessageText}`,
            timestamp: chat.lastMessageAt ? chat.lastMessageAt.toISOString() : (chat.createdAt ? chat.createdAt.toISOString() : new Date().toISOString()),
            unreadCount: unreadCountForUser,
            type: chat.type,
            otherParticipantId: otherParticipantFromTheirView ? otherParticipantFromTheirView._id.toString() : null,
            isRestricted: chat.isRestricted,
            firstMessageByKnockerId: chat.firstMessageByKnockerId?.toString() || null,
          };

          console.log(`Emitting 'chatPreviewUpdate' from markMessagesAsReadRest to socket ${userSocketId} for chat ${chatId}`);
          console.log(`  Payload for read update: ${JSON.stringify(chatPreviewData)}`);
          io.to(userSocketId).emit("chatPreviewUpdate", chatPreviewData);
        }
        console.log(`Emitting messagesRead to chat room ${chatId} for all participants.`);
        io.to(chatId).emit("messagesRead", { chatId, userId });
      }
      return res.status(200).json({ message: "Messages marked as read" });
    } else {
      return res
        .status(400)
        .json({ message: "Failed to mark messages as read" });
    }
  } catch (error) {
    console.error("Error in markMessagesAsReadRest:", error);
    return res.status(500).json({ message: "Server error" });
  }
};