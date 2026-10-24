import Chat from "../models/Chat.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import Knock from "../models/Knock.js";
import Post from "../models/Post.js";
import { uploadImageToCloudinary } from "../services/cloudinaryService.js";
import { getBlockedIds, isBlockedBetween, getFeedRelationIds, canViewUser } from "../services/privacyService.js";
import { isObjectId, toIdList, cleanString } from "../utils/validate.js";
import { getActiveVibes } from "../services/identityService.js";
import { pushToOffline } from "../services/pushService.js";

const MAX_MESSAGE_LENGTH = 4000;
const MAX_GROUP_MEMBERS = 50;

export const formatSharedPost = (post) => {
  if (!post || post.deletedAt || post.archived || !post.user) {
    return { unavailable: true };
  }
  return {
    id: post._id.toString(),
    user: {
      id: post.user._id.toString(),
      firstName: post.user.firstName,
      lastName: post.user.lastName,
      profileImage: post.user.profileImage || null,
    },
    image: post.images?.[0]?.url || null,
    imageCount: post.images?.length || 0,
    caption: (post.caption || "").slice(0, 140),
  };
};

export const formatLastMessageContentForPreview = (message) => {
  if (!message) {
    return { content: "No messages yet", type: "text" };
  }

  if (message.attachments?.length > 0 && !message.text) {
    const firstAttachment = message.attachments[0];
    const type = firstAttachment.type;

    if (type === "image") return { content: "Photo", type };
    if (type === "video") return { content: "Video", type };
    if (type === "audio") {
      const audioDuration = firstAttachment.duration;
      if (audioDuration !== undefined) {
        const totalSeconds = Math.floor(audioDuration / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return {
          content: `${minutes}:${seconds.toString().padStart(2, "0")}`,
          type,
        };
      }
      return { content: "Voice Note", type };
    }
    return { content: "Attachment", type };
  }

  return { content: message.text || "No messages yet", type: message.type === "system" ? "system" : "text" };
};

export const createGroupChat = async (req, res, io, userSocketMap) => {
  const userId = req.user.id;
  const groupName = cleanString(req.body?.name, 60);
  const participants = toIdList(req.body?.participants, MAX_GROUP_MEMBERS);

  if (!participants || participants.filter((id) => id !== userId).length < 2) {
    return res.status(400).json({
      message: "A group chat must have at least 3 members, including yourself.",
    });
  }
  if (!groupName) {
    return res.status(400).json({ message: "Group name is required." });
  }

  const allParticipants = [...new Set([...participants, userId])];

  try {
    const blocked = await getBlockedIds(userId);
    if (allParticipants.some((id) => blocked.has(id))) {
      return res.status(400).json({ message: "One or more users cannot be added." });
    }

    const members = await User.find({ _id: { $in: allParticipants }, isVerified: true })
      .select("_id isPrivate")
      .lean();
    if (members.length !== allParticipants.length) {
      return res.status(400).json({ message: "One or more users were not found." });
    }

    const privateMemberIds = members
      .filter((m) => m.isPrivate && m._id.toString() !== userId)
      .map((m) => m._id.toString());

    if (privateMemberIds.length) {
      const lockedIn = await Knock.find({
        knocker: userId,
        knocked: { $in: privateMemberIds },
        status: "lockedIn",
      })
        .select("knocked")
        .lean();
      const lockedInIds = new Set(lockedIn.map((k) => k.knocked.toString()));
      if (privateMemberIds.some((id) => !lockedInIds.has(id))) {
        return res.status(403).json({
          message: "You can only add private accounts you are locked in with.",
        });
      }
    }

    const newChat = new Chat({
      participants: allParticipants,
      type: "group",
      name: groupName,
      groupAdmin: userId,
      unreadCounts: allParticipants.map((id) => ({ user: id, count: 0 })),
      lastMessageAt: new Date(),
      isRestricted: false,
    });

    await newChat.save();

    const populatedChat = await Chat.findById(newChat._id)
      .populate("participants", "firstName lastName profileImage")
      .populate("groupAdmin", "firstName lastName profileImage")
      .lean();

    console.log("New group chat created:", populatedChat._id);

    for (const participantId of populatedChat.participants) {
      const participantSocketId = userSocketMap.get(
        participantId._id.toString()
      );
      if (participantSocketId) {
        const chatPreviewForParticipant = {
          id: populatedChat._id.toString(),
          name: populatedChat.name,
          avatar: populatedChat.groupAvatar || null,
          lastMessage: {
            senderId: populatedChat.groupAdmin._id.toString(),
            content: `Group created by ${populatedChat.groupAdmin.firstName}`,
            type: "text",
            read: undefined,
          },
          timestamp: populatedChat.createdAt.toISOString(),
          unreadCount: 0,
          type: populatedChat.type,
          isRestricted: false,
          firstMessageByKnockerId: null,
          isLockedIn: false,
        };
        io.to(participantSocketId).emit("newChat", chatPreviewForParticipant);
        io.to(participantSocketId).socketsJoin(populatedChat._id.toString());
        console.log(
          `Emitted newChat for participant ${participantId._id} for chat ${populatedChat._id}`
        );
      }
    }

    return res.status(201).json({
      message: "Group chat created successfully",
      chatId: populatedChat._id.toString(),
    });
  } catch (error) {
    console.error("Error creating group chat:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getUserChats = async (req, res) => {
  const userId = req.user.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const [chats, totalChats, relations] = await Promise.all([
      Chat.find({
        participants: userId,
        deletedBy: { $ne: userId },
      })
        .populate({
          path: "participants",
          select: "firstName lastName profileImage isPrivate",
        })
        .populate({
          path: "lastMessage",
          select: "text type sender readBy createdAt attachments deletedBy",
          populate: {
            path: "sender",
            select: "firstName lastName",
          },
        })
        .sort({ lastMessageAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Chat.countDocuments({
        participants: userId,
        deletedBy: { $ne: userId },
      }),
      getFeedRelationIds(userId),
    ]);
    const lockedInPeers = new Set(relations.lockedInIds);

    const formattedChats = await Promise.all(
      chats.map(async (chat) => {
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
            ? chat.groupAvatar
            : otherParticipant
            ? otherParticipant.profileImage
            : null;

        let effectiveLastMessage = chat.lastMessage;

        if (
          effectiveLastMessage &&
          effectiveLastMessage.deletedBy
            ?.map((id) => id.toString())
            .includes(userId)
        ) {
          effectiveLastMessage = await Message.findOne({
            chat: chat._id,
            deletedBy: { $ne: userId },
          })
            .sort({ createdAt: -1 })
            .populate({ path: "sender", select: "firstName lastName" })
            .lean();
        }

        const lastMessageFormatted =
          formatLastMessageContentForPreview(effectiveLastMessage);
        let lastMessageContent = lastMessageFormatted.content;
        let lastMessageType = lastMessageFormatted.type;
        let lastMessageReadStatus = undefined;

        if (effectiveLastMessage) {
          const lastMessageSenderId =
            effectiveLastMessage.sender?._id?.toString();
          const isMyLastMessage = lastMessageSenderId === userId;

          if (chat.type === "group") {
            lastMessageReadStatus =
              effectiveLastMessage.readBy.length === chat.participants.length;
          } else if (isMyLastMessage && otherParticipant) {
            lastMessageReadStatus = effectiveLastMessage.readBy
              .map((id) => id.toString())
              .includes(otherParticipant._id.toString());
          }
        }

        const lastMessageSenderId =
          effectiveLastMessage?.sender?._id?.toString() || null;
        const chatTimestamp =
          effectiveLastMessage?.createdAt?.toISOString() ||
          chat.lastMessageAt?.toISOString() ||
          chat.createdAt.toISOString();
        const unreadCountObj = chat.unreadCounts.find(
          (uc) => uc.user.toString() === userId
        );
        const unreadCount = unreadCountObj ? unreadCountObj.count : 0;

        let isChatRestricted = false;
        let isLockedIn = false;
        let firstMessageByKnockerId = null;

        if (chat.type === "private" && otherParticipant) {
          if (lockedInPeers.has(otherParticipant._id.toString())) {
            isLockedIn = true;
          } else {
            isChatRestricted = chat.isRestricted && otherParticipant.isPrivate;
            if (isChatRestricted) {
              firstMessageByKnockerId =
                chat.firstMessageByKnockerId?.toString() || null;
            }
          }
        }

        return {
          id: chat._id.toString(),
          name: chatName,
          avatar: chatAvatar,
          lastMessage: {
            senderId: lastMessageSenderId,
            content: lastMessageContent,
            type: lastMessageType,
            read: lastMessageReadStatus,
          },
          timestamp: chatTimestamp,
          unreadCount: unreadCount,
          type: chat.type,
          otherParticipantId: otherParticipant
            ? otherParticipant._id.toString()
            : null,
          isRestricted: isChatRestricted,
          firstMessageByKnockerId: firstMessageByKnockerId,
          isLockedIn: isLockedIn,
        };
      })
    );

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

export const getChatMessages = async (req, res) => {
  const { id: chatId } = req.params;
  const userId = req.user.id;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;

  if (!isObjectId(chatId)) {
    return res.status(404).json({ message: "Chat not found or unauthorized" });
  }

  try {
    const chat = await Chat.findById(chatId)
      .populate("participants", "firstName lastName profileImage isPrivate")
      .populate("groupAdmin", "firstName lastName");
    if (!chat || !chat.participants.some((p) => p._id.toString() === userId)) {
      return res
        .status(404)
        .json({ message: "Chat not found or unauthorized" });
    }

    const [messages, totalMessages, relations] = await Promise.all([
      Message.find({
        chat: chatId,
        deletedBy: { $ne: userId },
      })
        .populate({
          path: "replyTo",
          select: "text sender attachments",
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Message.countDocuments({
        chat: chatId,
        deletedBy: { $ne: userId },
      }),
      getFeedRelationIds(userId),
    ]);

    const peopleById = new Map(chat.participants.map((p) => [p._id.toString(), p]));
    const unknownIds = new Set();
    for (const message of messages) {
      if (!peopleById.has(String(message.sender))) unknownIds.add(String(message.sender));
      if (message.replyTo?.sender && !peopleById.has(String(message.replyTo.sender))) {
        unknownIds.add(String(message.replyTo.sender));
      }
    }
    if (unknownIds.size) {
      const others = await User.find({ _id: { $in: [...unknownIds] } })
        .select("firstName lastName profileImage")
        .lean();
      others.forEach((person) => peopleById.set(person._id.toString(), person));
    }
    const sharedPostIds = messages.filter((m) => m.sharedPost).map((m) => m.sharedPost);
    const sharedPostMap = new Map();
    if (sharedPostIds.length) {
      const sharedDocs = await Post.find({ _id: { $in: sharedPostIds } })
        .populate("user", "firstName lastName profileImage")
        .lean();
      const authorAccess = new Map();
      for (const doc of sharedDocs) {
        const authorId = String(doc.user?._id || "");
        if (!authorId) continue;
        if (!authorAccess.has(authorId)) {
          authorAccess.set(authorId, await canViewUser(userId, authorId));
        }
        sharedPostMap.set(
          String(doc._id),
          authorAccess.get(authorId) ? formatSharedPost(doc) : { unavailable: true }
        );
      }
    }
    for (const message of messages) {
      message.sender = peopleById.get(String(message.sender)) || null;
      if (message.replyTo) {
        message.replyTo = {
          ...message.replyTo,
          sender: message.replyTo.sender
            ? peopleById.get(String(message.replyTo.sender)) || null
            : null,
        };
      }
    }

    messages.reverse();

    const markRead = page === 1 ? markMessagesAsRead({ chatId, userId }) : null;

    const otherParticipant =
      chat.type === "private"
        ? chat.participants.find((p) => p._id.toString() !== userId)
        : null;
    const otherParticipantId = otherParticipant
      ? otherParticipant._id.toString()
      : null;

    const formattedMessages = messages.filter((msg) => msg.sender).map((msg) => {
      const isMyMessage = msg.sender._id.toString() === userId;
      let readStatus = false;

      if (chat.type === "group") {
        readStatus = msg.readBy.length === chat.participants.length;
      } else {
        if (isMyMessage && otherParticipantId) {
          readStatus = msg.readBy
            .map((id) => id.toString())
            .includes(otherParticipantId);
        } else if (!isMyMessage) {
          readStatus = msg.readBy.map((id) => id.toString()).includes(userId);
        }
      }

      return {
        id: msg._id.toString(),
        sender: msg.sender._id.toString(),
        type: msg.type || "user",
        text: msg.text,
        attachments: msg.attachments,
        sharedPost: msg.sharedPost
          ? sharedPostMap.get(String(msg.sharedPost)) || { unavailable: true }
          : null,
        timestamp: msg.createdAt?.toISOString() || new Date().toISOString(),
        read: readStatus,
        isTemp: false,
        reactions: (msg.reactions || []).map((r) => ({ user: r.user.toString(), emoji: r.emoji })),
        editedAt: msg.editedAt ? msg.editedAt.toISOString() : null,
        replyTo: msg.replyTo
          ? {
              id: msg.replyTo._id.toString(),
              text: msg.replyTo.text,
              sender: msg.replyTo.sender
                ? {
                    id: msg.replyTo.sender._id.toString(),
                    firstName: msg.replyTo.sender.firstName,
                    lastName: msg.replyTo.sender.lastName,
                  }
                : null,
              attachments: msg.replyTo.attachments,
            }
          : null,
      };
    });

    let isChatRestricted = false;
    let isLockedIn = false;
    let firstMessageByKnockerId = null;

    if (chat.type === "private" && otherParticipant) {
      if (relations.lockedInIds.includes(otherParticipant._id.toString())) {
        isLockedIn = true;
      } else {
        isChatRestricted = chat.isRestricted && otherParticipant.isPrivate;
        if (isChatRestricted) {
          firstMessageByKnockerId =
            chat.firstMessageByKnockerId?.toString() || null;
        }
      }
    }

    let otherVibe = null;
    if (isLockedIn && otherParticipant) {
      const vibes = await getActiveVibes([otherParticipant._id.toString()]);
      otherVibe = vibes.get(otherParticipant._id.toString()) || null;
    }

    if (markRead) await markRead;

    res.json({
      otherVibe,
      chatType: chat.type,
      chatName: chat.type === "group" ? chat.name : null,
      chatAvatar: chat.type === "group" ? chat.groupAvatar || null : null,
      messages: formattedMessages,
      currentPage: page,
      totalPages: Math.ceil(totalMessages / limit),
      totalMessages,
      isRestricted: isChatRestricted,
      firstMessageByKnockerId: firstMessageByKnockerId,
      isLockedIn: isLockedIn,
    });
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const createChat = async (req, res, io, userSocketMap) => {
  const { recipientId } = req.body;
  const userId = req.user.id;

  if (Array.isArray(recipientId)) {
    return res.status(400).json({
      message:
        "This endpoint is for private chats only. Use /api/chats/group for group chats.",
    });
  }

  if (!isObjectId(recipientId)) {
    return res.status(400).json({ message: "Invalid recipient" });
  }

  try {
    if (userId === recipientId) {
      return res.status(400).json({ message: "Cannot create chat with self" });
    }

    if (await isBlockedBetween(userId, recipientId)) {
      return res.status(404).json({ message: "Recipient user not found" });
    }

    let chat = await Chat.findOne({
      type: "private",
      participants: { $all: [userId, recipientId] },
    })
      .populate({
        path: "participants",
        select: "firstName lastName profileImage isPrivate",
      })
      .populate({
        path: "lastMessage",
        select: "text type sender createdAt attachments readBy deletedBy",
        populate: {
          path: "sender",
          select: "firstName lastName",
        },
      })
      .lean();

    const recipientUser = await User.findById(recipientId);
    if (!recipientUser) {
      console.log("Recipient user not found:", recipientId);
      return res.status(404).json({ message: "Recipient user not found" });
    }
    const isRecipientPrivate = recipientUser.isPrivate;

    const existingKnock = await Knock.findOne({
      $or: [
        { knocker: userId, knocked: recipientId },
        { knocker: recipientId, knocked: userId },
      ],
      status: "lockedIn",
    });

    if (chat) {
      console.log("Chat already exists:", chat._id);
      const senderUser = chat.participants.find(
        (p) => p._id.toString() === userId.toString()
      );

      const isChatRestricted = !existingKnock && isRecipientPrivate;
      const isLockedIn = !!existingKnock;

      if (
        chat.isRestricted !== isChatRestricted ||
        chat.isLockedIn !== isLockedIn
      ) {
        await Chat.findByIdAndUpdate(chat._id, {
          isRestricted: isChatRestricted,
          isLockedIn: isLockedIn,
        });
      }

      if (senderUser && recipientUser) {
        let effectiveLastMessage = chat.lastMessage;

        if (
          effectiveLastMessage &&
          effectiveLastMessage.deletedBy
            ?.map((id) => id.toString())
            .includes(userId)
        ) {
          effectiveLastMessage = await Message.findOne({
            chat: chat._id,
            deletedBy: { $ne: userId },
          })
            .sort({ createdAt: -1 })
            .populate({ path: "sender", select: "firstName lastName" })
            .lean();
        }

        const lastMessageFormatted =
          formatLastMessageContentForPreview(effectiveLastMessage);
        const lastMessageContent =
          lastMessageFormatted.content || "Start chatting!";
        const lastMessageType = lastMessageFormatted.type;
        let lastMessageReadStatus = undefined;

        if (effectiveLastMessage) {
          const lastMessageSenderId =
            effectiveLastMessage.sender?._id?.toString();
          const isMyLastMessage = lastMessageSenderId === userId;

          if (isMyLastMessage && recipientUser) {
            lastMessageReadStatus = effectiveLastMessage.readBy
              .map((id) => id.toString())
              .includes(recipientUser._id.toString());
          }
        }

        const chatTimestamp =
          effectiveLastMessage?.createdAt?.toISOString() ||
          chat.lastMessageAt?.toISOString() ||
          chat.createdAt?.toISOString() ||
          new Date().toISOString();

        const senderSocketId = userSocketMap.get(userId.toString());
        if (senderSocketId) {
          const lastMessageSenderId =
            effectiveLastMessage?.sender?._id.toString() || null;

          const chatPreviewForSender = {
            id: chat._id.toString(),
            name: `${recipientUser.firstName} ${
              recipientUser.lastName || ""
            }`.trim(),
            avatar: recipientUser.profileImage || null,
            lastMessage: {
              senderId: lastMessageSenderId,
              content: lastMessageContent,
              type: lastMessageType,
              read: lastMessageReadStatus,
            },
            timestamp: chatTimestamp,
            unreadCount:
              chat.unreadCounts.find(
                (uc) => uc.user.toString() === userId.toString()
              )?.count || 0,
            type: chat.type,
            otherParticipantId: recipientId.toString(),
            isRestricted: isChatRestricted,
            firstMessageByKnockerId:
              chat.firstMessageByKnockerId?.toString() || null,
            isLockedIn: isLockedIn,
          };
          io.to(senderSocketId).emit(
            "chatCreatedConfirmation",
            chatPreviewForSender
          );
          console.log(
            `Re-emitted chatCreatedConfirmation for existing chat ${chat._id} to sender ${userId} with lastMessage: "${chatPreviewForSender.lastMessage.content}"`
          );
        }

        let effectiveLastMessageForRecipient = chat.lastMessage;

        if (
          effectiveLastMessageForRecipient &&
          effectiveLastMessageForRecipient.deletedBy
            ?.map((id) => id.toString())
            .includes(recipientId)
        ) {
          effectiveLastMessageForRecipient = await Message.findOne({
            chat: chat._id,
            deletedBy: { $ne: recipientId },
          })
            .sort({ createdAt: -1 })
            .populate({ path: "sender", select: "firstName lastName" })
            .lean();
        }

        const recipientSocketId = userSocketMap.get(recipientId.toString());
        if (recipientSocketId) {
          const lastMessageFormattedForRecipient =
            formatLastMessageContentForPreview(
              effectiveLastMessageForRecipient
            );
          const lastMessageSenderIdForRecipient =
            effectiveLastMessageForRecipient?.sender?._id.toString() || null;

          const chatPreviewForRecipient = {
            id: chat._id.toString(),
            name: `${senderUser.firstName} ${senderUser.lastName || ""}`.trim(),
            avatar: senderUser.profileImage || null,
            lastMessage: {
              senderId: lastMessageSenderIdForRecipient,
              content: lastMessageFormattedForRecipient.content,
              type: lastMessageFormattedForRecipient.type,
              read: lastMessageReadStatus,
            },
            timestamp: (
              effectiveLastMessageForRecipient?.createdAt ||
              chat.lastMessageAt ||
              chat.createdAt
            ).toISOString(),
            unreadCount:
              chat.unreadCounts.find(
                (uc) => uc.user.toString() === recipientId.toString()
              )?.count || 0,
            type: chat.type,
            otherParticipantId: userId.toString(),
            isRestricted: isChatRestricted,
            firstMessageByKnockerId:
              chat.firstMessageByKnockerId?.toString() || null,
            isLockedIn: isLockedIn,
          };
          io.to(recipientSocketId).emit("newChat", chatPreviewForRecipient);
          console.log(
            `Re-emitted newChat for existing chat ${chat._id} to recipient ${recipientId} with lastMessage: "${chatPreviewForRecipient.lastMessage.content}"`
          );
        }
      }

      return res.status(200).json({
        message: "Chat already exists",
        chatId: chat._id.toString(),
        isRestricted: !chat.isLockedIn && chat.isRestricted,
        isLockedIn: chat.isLockedIn || false,
      });
    }

    const isLockedIn = !!existingKnock;
    const isRestricted = !isLockedIn && isRecipientPrivate;

    chat = new Chat({
      participants: [userId, recipientId],
      type: "private",
      isRestricted,
      isLockedIn,
      participantsWhoSentMessages: [],
      unreadCounts: [
        { user: userId, count: 0 },
        { user: recipientId, count: 0 },
      ],
      lastMessageAt: new Date(),
    });

    await chat.save();
    console.log("New chat created:", chat._id);

    const newChatPopulated = await Chat.findById(chat._id)
      .populate(
        "participants",
        "firstName lastName profileImage isPrivate"
      )
      .lean();

    const senderUser = newChatPopulated.participants.find(
      (p) => p._id.toString() === userId.toString()
    );
    const recipientUserPopulated = newChatPopulated.participants.find(
      (p) => p._id.toString() === recipientId.toString()
    );

    const recipientSocketId = userSocketMap.get(recipientId.toString());
    if (recipientSocketId && senderUser) {
      const chatPreviewForRecipient = {
        id: newChatPopulated._id.toString(),
        name: `${senderUser.firstName} ${senderUser.lastName || ""}`.trim(),
        avatar: senderUser.profileImage || null,
        lastMessage: {
          senderId: null,
          content: "Start chatting!",
          type: "text",
          read: undefined,
        },
        timestamp: newChatPopulated.createdAt.toISOString(),
        unreadCount: 0,
        type: newChatPopulated.type,
        otherParticipantId: userId.toString(),
        isRestricted: newChatPopulated.isRestricted,
        firstMessageByKnockerId: null,
        isLockedIn: newChatPopulated.isLockedIn,
      };
      io.to(recipientSocketId).emit("newChat", chatPreviewForRecipient);
      io.to(recipientSocketId).socketsJoin(newChatPopulated._id.toString());
      console.log(
        `Emitted newChat for recipient ${recipientId} for chat ${newChatPopulated._id} with lastMessage: "${chatPreviewForRecipient.lastMessage.content}"`
      );
    }

    const senderSocketId = userSocketMap.get(userId.toString());
    if (senderSocketId && recipientUserPopulated) {
      const chatPreviewForSender = {
        id: newChatPopulated._id.toString(),
        name: `${recipientUserPopulated.firstName} ${
          recipientUserPopulated.lastName || ""
        }`.trim(),
        avatar: recipientUserPopulated.profileImage || null,
        lastMessage: {
          senderId: null,
          content: "Start chatting!",
          type: "text",
          read: undefined,
        },
        timestamp: newChatPopulated.createdAt.toISOString(),
        unreadCount: 0,
        type: newChatPopulated.type,
        otherParticipantId: recipientId.toString(),
        isRestricted: newChatPopulated.isRestricted,
        firstMessageByKnockerId: null,
        isLockedIn: newChatPopulated.isLockedIn,
      };
      io.to(senderSocketId).emit(
        "chatCreatedConfirmation",
        chatPreviewForSender
      );
      io.to(senderSocketId).socketsJoin(newChatPopulated._id.toString());
      console.log(
        `Emitted chatCreatedConfirmation for sender ${userId} for chat ${newChatPopulated._id} with lastMessage: "${chatPreviewForSender.lastMessage.content}"`
      );
    }

    return res.status(201).json({
      message: "Chat created successfully",
      chatId: chat._id.toString(),
      isRestricted: chat.isRestricted,
      firstMessageByKnockerId: chat.firstMessageByKnockerId
        ? chat.firstMessageByKnockerId.toString()
        : null,
      isLockedIn: chat.isLockedIn,
    });
  } catch (error) {
    console.error("Error creating chat:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const saveMessage = async ({
  chatId,
  senderId,
  text,
  attachments,
  replyToId,
  clientTempId,
  sharedPostId,
  io,
  userSocketMap,
}) => {
  try {
    if (typeof text === "string" && text.length > MAX_MESSAGE_LENGTH) {
      text = text.slice(0, MAX_MESSAGE_LENGTH);
    }
    if (replyToId) {
      const replied = isObjectId(String(replyToId))
        ? await Message.exists({ _id: replyToId, chat: chatId })
        : null;
      if (!replied) replyToId = null;
    }
    const chat = await Chat.findById(chatId).populate(
      "participants",
      "firstName lastName profileImage isPrivate"
    );
    if (
      !chat ||
      !chat.participants.some((p) => p._id.toString() === senderId.toString())
    ) {
      console.log(
        `[saveMessage] Chat not found or sender not participant for message save: chat ${chatId}, sender ${senderId}`
      );
      if (
        io &&
        clientTempId &&
        senderId &&
        userSocketMap &&
        userSocketMap.get(senderId.toString())
      ) {
        io.to(userSocketMap.get(senderId.toString())).emit("messageFailed", {
          clientTempId,
          error: "Chat not found or unauthorized",
        });
      }
      return null;
    }

    const otherParticipant = chat.participants.find(
      (p) => p._id.toString() !== senderId.toString()
    );

    if (
      chat.type === "private" &&
      otherParticipant &&
      (await isBlockedBetween(senderId, otherParticipant._id))
    ) {
      if (
        io &&
        clientTempId &&
        userSocketMap &&
        userSocketMap.get(senderId.toString())
      ) {
        io.to(userSocketMap.get(senderId.toString())).emit("messageFailed", {
          clientTempId,
          error: "You cannot message this user",
        });
      }
      return { error: "You cannot message this user" };
    }

    const messageCount = await Message.countDocuments({ chat: chatId });
    if (chat.type === "private" && otherParticipant?.isPrivate) {
      const knockStatus = await Knock.findOne({
        $or: [
          { knocker: senderId, knocked: otherParticipant._id },
          { knocker: otherParticipant._id, knocked: senderId },
        ],
        status: "lockedIn",
      });

      if (knockStatus) {
        chat.isRestricted = false;
        chat.isLockedIn = true;
        chat.firstMessageByKnockerId = null;
      } else if (
        chat.isRestricted &&
        chat.firstMessageByKnockerId?.toString() === senderId.toString()
      ) {
        if (
          io &&
          clientTempId &&
          senderId &&
          userSocketMap &&
          userSocketMap.get(senderId.toString())
        ) {
          io.to(userSocketMap.get(senderId.toString())).emit("messageFailed", {
            clientTempId,
            error: "Chat is restricted. Recipient needs to reply to unlock.",
          });
        }
        return {
          error: "Chat is restricted. Recipient needs to reply to unlock.",
        };
      } else {
        if (messageCount === 0) {
          chat.isRestricted = true;
          chat.firstMessageByKnockerId = senderId;
        }
      }
    }

    const newMessage = new Message({
      chat: chatId,
      sender: senderId,
      text: text || "",
      attachments: attachments || [],
      replyTo: replyToId || null,
      sharedPost: sharedPostId || null,
      readBy: [senderId],
    });

    const savedMessage = await newMessage.save();

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

    const populatedMessage = await Message.findById(savedMessage._id)
      .populate("sender", "firstName lastName profileImage")
      .populate({
        path: "replyTo",
        select: "text sender attachments",
        populate: {
          path: "sender",
          select: "firstName lastName",
        },
      })
      .lean();

    const sharedPost = sharedPostId
      ? formatSharedPost(
          await Post.findById(sharedPostId)
            .populate("user", "firstName lastName profileImage")
            .lean()
        )
      : null;

    const messageForSocket = {
      id: populatedMessage._id.toString(),
      chat: populatedMessage.chat.toString(),
      sender: populatedMessage.sender._id.toString(),
      type: populatedMessage.type || "user",
      text: populatedMessage.text,
      attachments: populatedMessage.attachments,
      timestamp:
        populatedMessage.createdAt?.toISOString() || new Date().toISOString(),
      read: false,
      isRestricted: chat.isRestricted,
      firstMessageByKnockerId: chat.firstMessageByKnockerId?.toString() || null,
      isLockedIn: chat.isLockedIn || false,
      clientTempId: clientTempId,
      sharedPost,
      reactions: [],
      editedAt: null,
      replyTo: populatedMessage.replyTo
        ? {
            id: populatedMessage.replyTo._id.toString(),
            text: populatedMessage.replyTo.text,
            sender: populatedMessage.replyTo.sender
              ? {
                  id: populatedMessage.replyTo.sender._id.toString(),
                  firstName: populatedMessage.replyTo.sender.firstName,
                  lastName: populatedMessage.replyTo.sender.lastName,
                }
              : null,
            attachments: populatedMessage.replyTo.attachments,
          }
        : null,
    };

    if (io) {
      io.to(chatId).emit("message", messageForSocket);
      const recipients = chat.participants
        .map((participant) => participant._id.toString())
        .filter((id) => id !== senderId.toString());
      const senderName = populatedMessage.sender.firstName || "FriendZone";
      const previewText = formatLastMessageContentForPreview(populatedMessage).content;
      pushToOffline(io, recipients, {
        title: chat.type === "group" ? chat.name || "Group" : senderName,
        body: chat.type === "group" ? `${senderName}: ${previewText}` : previewText,
        data: { route: `/(chat)/${chatId}` },
      });
      for (const participant of chat.participants) {
        const participantId = participant._id.toString();
        const unreadCountForParticipant =
          chat.unreadCounts.find((uc) => uc.user.toString() === participantId)
            ?.count || 0;

        const isGroupChat = chat.type === "group";
        const otherParticipantFromTheirView = !isGroupChat
          ? chat.participants.find((p) => p._id.toString() !== participantId)
          : null;

        const lastMessageFormatted =
          formatLastMessageContentForPreview(populatedMessage);
        const lastMessageContent = lastMessageFormatted.content;
        const lastMessageType = lastMessageFormatted.type;
        let lastMessageReadStatus = false;

        if (isGroupChat) {
          lastMessageReadStatus =
            populatedMessage.readBy.length === chat.participants.length;
        } else {
          const isMyMessageToThisParticipant =
            populatedMessage.sender._id.toString() === participantId;
          if (isMyMessageToThisParticipant && otherParticipantFromTheirView) {
            lastMessageReadStatus = populatedMessage.readBy
              .map((id) => id.toString())
              .includes(otherParticipantFromTheirView._id.toString());
          } else if (!isMyMessageToThisParticipant) {
            lastMessageReadStatus = populatedMessage.readBy
              .map((id) => id.toString())
              .includes(participantId);
          }
        }

        const chatPreviewData = {
          id: chat._id.toString(),
          name: isGroupChat
            ? chat.name
            : otherParticipantFromTheirView
            ? `${otherParticipantFromTheirView.firstName} ${
                otherParticipantFromTheirView.lastName || ""
              }`.trim()
            : "Unknown User",
          avatar: isGroupChat
            ? chat.groupAvatar
            : otherParticipantFromTheirView
            ? otherParticipantFromTheirView.profileImage || null
            : null,
          lastMessage: {
            senderId: populatedMessage.sender._id.toString(),
            content: lastMessageContent,
            type: lastMessageType,
            read: lastMessageReadStatus,
          },
          timestamp: messageForSocket.timestamp,
          unreadCount: unreadCountForParticipant,
          type: chat.type,
          otherParticipantId: isGroupChat
            ? null
            : otherParticipantFromTheirView
            ? otherParticipantFromTheirView._id.toString()
            : null,
          isRestricted: chat.isRestricted,
          firstMessageByKnockerId:
            chat.firstMessageByKnockerId?.toString() || null,
          isLockedIn: chat.isLockedIn || false,
        };

        const participantSocketId = userSocketMap.get(participantId);
        if (participantSocketId) {
          io.to(participantSocketId).emit("chatPreviewUpdate", chatPreviewData);
        }
      }
    }
    return messageForSocket;
  } catch (error) {
    console.error("Error saving message:", error);
    if (
      io &&
      clientTempId &&
      senderId &&
      userSocketMap &&
      userSocketMap.get(senderId.toString())
    ) {
      io.to(userSocketMap.get(senderId.toString())).emit("messageFailed", {
        clientTempId,
        error: error.message || "Failed to send message",
      });
    }
    return null;
  }
};

export const sendMessageWithAttachment = async (
  req,
  res,
  io,
  userSocketMap
) => {
  try {
    const { chatId, clientTempId, replyToId } = req.body;
    const senderId = req.user.id;
    const files = req.files;

    if (!isObjectId(chatId) || !files || files.length === 0) {
      return res
        .status(400)
        .json({ message: "Chat ID and files are required." });
    }

    const membership = await Chat.exists({ _id: chatId, participants: senderId });
    if (!membership) {
      return res.status(404).json({ message: "Chat not found or unauthorized" });
    }

    const attachments = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const durationMillis = parseInt(req.body[`file_duration_${i}`], 10);

      try {
        const result = await uploadImageToCloudinary(file.buffer, "chat_media");

        attachments.push({
          type: file.mimetype.split("/")[0],
          url: result.url,
          fileName: cleanString(file.originalname, 200),
          size: file.size,
          duration: Number.isFinite(durationMillis) ? durationMillis : undefined,
        });
      } catch (err) {
        console.error("Cloudinary upload failed:", err.message);
      }
    }

    if (attachments.length === 0) {
      return res.status(502).json({ message: "Failed to upload attachments." });
    }

    const messageData = {
      chatId,
      senderId,
      text: "",
      attachments,
      replyToId: replyToId || null,
      clientTempId,
      io,
      userSocketMap,
    };

    const savedMessage = await saveMessage(messageData);

    if (savedMessage?.error) {
      return res.status(400).json({ message: savedMessage.error });
    }

    return res.status(200).json(savedMessage);
  } catch (error) {
    console.error("Error sending message with attachment:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const markMessagesAsRead = async ({ chatId, userId }) => {
  try {
    const chat = await Chat.findById(chatId);
    if (
      !chat ||
      !chat.participants.some((p) => p.toString() === userId.toString())
    ) {
      console.log(
        `Mark read: Chat ${chatId} not found or user ${userId} not participant.`
      );
      return false;
    }

    await Message.updateMany(
      { chat: chatId, readBy: { $ne: userId } },
      { $addToSet: { readBy: userId } }
    );
    console.log(
      `Messages in chat ${chatId} marked as read by user ${userId} in DB.`
    );

    const unreadCountObj = chat.unreadCounts.find(
      (uc) => uc.user.toString() === userId.toString()
    );
    if (unreadCountObj) {
      if (unreadCountObj.count > 0) {
        console.log(
          `Resetting unread count for user ${userId} in chat ${chatId} from ${unreadCountObj.count} to 0.`
        );
        unreadCountObj.count = 0;
      } else {
        console.log(
          `Unread count for user ${userId} in chat ${chatId} already 0.`
        );
      }
    } else {
      console.log(
        `No unread count entry found for user ${userId} in chat ${chatId}. Adding with 0.`
      );
      chat.unreadCounts.push({ user: userId, count: 0 });
    }
    await chat.save();
    console.log(`Chat ${chatId} saved after unread count update.`);

    return chat;
  } catch (error) {
    console.error("Error marking messages as read:", error);
    return false;
  }
};

export const markMessagesAsReadRest = async (req, res, io, userSocketMap) => {
  const { id: chatId } = req.params;
  const userId = req.user.id;

  try {
    const updatedChat = await markMessagesAsRead({ chatId, userId });
    if (updatedChat) {
      const chat = await Chat.findById(chatId)
        .populate("participants", "firstName lastName profileImage")
        .populate({
          path: "lastMessage",
          select: "text type sender createdAt attachments readBy deletedBy",
          populate: {
            path: "sender",
            select: "firstName lastName",
          },
        })
        .lean();

      if (chat) {
        for (const participant of chat.participants) {
          const participantId = participant._id.toString();
          const unreadCountForParticipant =
            chat.unreadCounts.find((uc) => uc.user.toString() === participantId)
              ?.count || 0;
          const otherParticipantFromTheirView =
            chat.type === "private"
              ? chat.participants.find(
                  (p) => p._id.toString() !== participantId
                )
              : null;
          let effectiveLastMessage = chat.lastMessage;
          if (
            effectiveLastMessage &&
            effectiveLastMessage.deletedBy
              ?.map((id) => id.toString())
              .includes(participantId)
          ) {
            effectiveLastMessage = await Message.findOne({
              chat: chat._id,
              deletedBy: { $ne: participantId },
            })
              .sort({ createdAt: -1 })
              .populate({ path: "sender", select: "firstName lastName" })
              .lean();
          }

          let lastMessageIsRead;
          if (chat.type === "group") {
            lastMessageIsRead =
              effectiveLastMessage?.readBy.length === chat.participants.length;
          } else {
            lastMessageIsRead = effectiveLastMessage?.readBy
              .map((id) => id.toString())
              .includes(participantId);
          }

          const lastMessageFormatted =
            formatLastMessageContentForPreview(effectiveLastMessage);
          const lastMessageContent = lastMessageFormatted.content;
          const lastMessageType = lastMessageFormatted.type;

          const chatPreviewData = {
            id: chat._id.toString(),
            name:
              chat.type === "group"
                ? chat.name
                : otherParticipantFromTheirView
                ? `${otherParticipantFromTheirView.firstName} ${
                    otherParticipantFromTheirView.lastName || ""
                  }`.trim()
                : "Unknown User",
            avatar:
              chat.type === "group"
                ? chat.groupAvatar
                : otherParticipantFromTheirView
                ? otherParticipantFromTheirView.profileImage || null
                : null,
            lastMessage: {
              senderId: effectiveLastMessage?.sender?._id.toString() || null,
              content: lastMessageContent,
              type: lastMessageType,
              read: lastMessageIsRead,
            },
            timestamp: chat.lastMessageAt
              ? chat.lastMessageAt.toISOString()
              : chat.createdAt
              ? chat.createdAt.toISOString()
              : new Date().toISOString(),
            unreadCount: unreadCountForParticipant,
            type: chat.type,
            otherParticipantId: otherParticipantFromTheirView
              ? otherParticipantFromTheirView._id.toString()
              : null,
            isRestricted: chat.isRestricted,
            firstMessageByKnockerId:
              chat.firstMessageByKnockerId?.toString() || null,
            isLockedIn: chat.isLockedIn || false,
          };

          const participantSocketId = userSocketMap.get(participantId);
          if (participantSocketId) {
            console.log(
              `Emitting 'chatPreviewUpdate' from markMessagesAsReadRest to socket ${participantSocketId} for chat ${chatId}`
            );
            io.to(participantSocketId).emit(
              "chatPreviewUpdate",
              chatPreviewData
            );
          }
        }
        console.log(
          `Emitting messagesRead to chat room ${chatId} for all participants.`
        );
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

export const deleteChats = async (req, res, io, userSocketMap) => {
  const { chatIds, deleteForEveryone = false } = req.body;
  const userId = req.user.id;

  if (!chatIds || !Array.isArray(chatIds) || chatIds.length === 0) {
    return res.status(400).json({ message: "Chat IDs are required" });
  }

  try {
    const deletedChats = [];
    for (const chatId of chatIds) {
      const chat = await Chat.findById(chatId);
      if (!chat) {
        continue;
      }

      const isParticipant = chat.participants.some(
        (p) => p.toString() === userId
      );
      if (!isParticipant) {
        console.log(
          `User ${userId} attempted to delete chat ${chatId} without permission.`
        );
        continue;
      }

      if (deleteForEveryone) {
        await Message.deleteMany({ chat: chatId });
        await Chat.findByIdAndDelete(chatId);

        for (const participantId of chat.participants) {
          const participantSocketId = userSocketMap.get(
            participantId.toString()
          );
          if (participantSocketId) {
            io.to(participantSocketId).emit("chatRemoved", { chatId });
          }
        }
        console.log(
          `Chat ${chatId} and all its messages have been permanently deleted.`
        );
      } else {
        const otherParticipants = chat.participants.filter(
          (p) => p.toString() !== userId
        );

        if (otherParticipants.length > 0) {
          await Chat.findByIdAndUpdate(chatId, {
            $addToSet: { deletedBy: userId },
            $pull: { unreadCounts: { user: userId } },
          });

          for (const otherParticipantId of otherParticipants) {
            const otherSocketId = userSocketMap.get(
              otherParticipantId.toString()
            );
            if (otherSocketId) {
              io.to(otherSocketId).emit("chatRemoved", { chatId });
            }
          }
          console.log(
            `User ${userId} left chat ${chatId}. Chat is not fully deleted.`
          );
        } else {
          await Message.deleteMany({ chat: chatId });
          await Chat.findByIdAndDelete(chatId);
          console.log(
            `User ${userId} was the last participant in chat ${chatId}. Chat and messages fully deleted.`
          );
        }
      }

      deletedChats.push(chatId);
    }

    const userSocketId = userSocketMap.get(userId);
    if (userSocketId) {
      io.to(userSocketId).emit("chatsDeletedConfirmation", {
        chatIds: deletedChats,
      });
    }

    res
      .status(200)
      .json({ message: "Chats deleted successfully", deletedChats });
  } catch (error) {
    console.error("Error deleting chats:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteMessage = async (req, res, io, userSocketMap) => {
  const { messageId, deleteForEveryone = false } = req.body;
  const userId = req.user.id;

  try {
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    const chat = await Chat.findById(message.chat);
    if (!chat || !chat.participants.some((p) => p.toString() === userId)) {
      return res
        .status(403)
        .json({ message: "Unauthorized to delete this message" });
    }

    if (deleteForEveryone) {
      if (message.sender.toString() !== userId) {
        return res
          .status(403)
          .json({ message: "You can only unsend your own messages" });
      }

      await Message.findByIdAndDelete(messageId);
      console.log(`Message ${messageId} unsent by sender ${userId}`);
      const lastMessage = await Message.findOne({ chat: message.chat }).sort({
        createdAt: -1,
      });
      chat.lastMessage = lastMessage?._id || null;
      chat.lastMessageAt = lastMessage?.createdAt || chat.lastMessageAt;
      await chat.save();
      io.to(message.chat.toString()).emit("messageDeleted", {
        messageId,
        deleteForEveryone: true,
      });
      const populatedChat = await Chat.findById(chat._id)
        .populate("participants", "firstName lastName profileImage")
        .populate({
          path: "lastMessage",
          select: "text type sender createdAt attachments readBy deletedBy",
          populate: { path: "sender", select: "firstName lastName" },
        })
        .lean();

      if (populatedChat) {
        for (const participant of populatedChat.participants) {
          const participantId = participant._id.toString();
          const unreadCount =
            populatedChat.unreadCounts.find(
              (uc) => uc.user.toString() === participantId
            )?.count || 0;
          const otherParticipant =
            populatedChat.type === "private"
              ? populatedChat.participants.find(
                  (p) => p._id.toString() !== participantId
                )
              : null;
          let effectiveLastMessage = populatedChat.lastMessage;
          if (
            effectiveLastMessage &&
            effectiveLastMessage.deletedBy
              ?.map((id) => id.toString())
              .includes(participantId)
          ) {
            effectiveLastMessage = await Message.findOne({
              chat: populatedChat._id,
              deletedBy: { $ne: participantId },
            })
              .sort({ createdAt: -1 })
              .populate({ path: "sender", select: "firstName lastName" })
              .lean();
          }

          const lastMessageFormatted =
            formatLastMessageContentForPreview(effectiveLastMessage);

          const chatPreviewData = {
            id: populatedChat._id.toString(),
            name:
              populatedChat.type === "group"
                ? populatedChat.name
                : otherParticipant
                ? `${otherParticipant.firstName} ${
                    otherParticipant.lastName || ""
                  }`.trim()
                : "Unknown User",
            avatar:
              populatedChat.type === "group"
                ? populatedChat.groupAvatar || null
                : otherParticipant
                ? otherParticipant.profileImage || null
                : null,
            lastMessage: {
              senderId: effectiveLastMessage?.sender?._id.toString() || null,
              content: lastMessageFormatted.content,
              type: lastMessageFormatted.type,
              read: false,
            },
            timestamp: (
              effectiveLastMessage?.createdAt ||
              populatedChat.lastMessageAt ||
              populatedChat.createdAt
            ).toISOString(),
            unreadCount,
            type: populatedChat.type,
            otherParticipantId: otherParticipant
              ? otherParticipant._id.toString()
              : null,
            isRestricted: populatedChat.isRestricted,
            firstMessageByKnockerId:
              populatedChat.firstMessageByKnockerId?.toString() || null,
            isLockedIn: populatedChat.isLockedIn,
          };
          const participantSocketId = userSocketMap.get(participantId);
          if (participantSocketId) {
            io.to(participantSocketId).emit(
              "chatPreviewUpdate",
              chatPreviewData
            );
          }
        }
      }
    } else {
      await Message.findByIdAndUpdate(messageId, {
        $addToSet: { deletedBy: userId },
      });
      console.log(`Message ${messageId} deleted for user ${userId}`);

      const userSocketId = userSocketMap.get(userId);
      if (userSocketId) {
        io.to(userSocketId).emit("messageDeleted", {
          messageId,
          deleteForEveryone: false,
        });
      }
      const isLastMessage = chat.lastMessage?.toString() === messageId;

      if (isLastMessage) {
        const newLastMessageForUser = await Message.findOne({
          chat: chat._id,
          deletedBy: { $ne: userId },
        })
          .sort({ createdAt: -1 })
          .populate("sender", "firstName lastName")
          .lean();

        const populatedChat = await Chat.findById(chat._id)
          .populate("participants", "firstName lastName profileImage")
          .lean();

        if (populatedChat) {
          const participantId = userId;
          const unreadCount =
            populatedChat.unreadCounts.find(
              (uc) => uc.user.toString() === participantId
            )?.count || 0;
          const otherParticipant =
            populatedChat.type === "private"
              ? populatedChat.participants.find(
                  (p) => p._id.toString() !== participantId
                )
              : null;

          const lastMessageFormatted = formatLastMessageContentForPreview(
            newLastMessageForUser
          );

          const chatPreviewData = {
            id: populatedChat._id.toString(),
            name:
              populatedChat.type === "group"
                ? populatedChat.name
                : otherParticipant
                ? `${otherParticipant.firstName} ${
                    otherParticipant.lastName || ""
                  }`.trim()
                : "Unknown User",
            avatar:
              populatedChat.type === "group"
                ? populatedChat.groupAvatar || null
                : otherParticipant
                ? otherParticipant.profileImage || null
                : null,
            lastMessage: {
              senderId: newLastMessageForUser?.sender?._id.toString() || null,
              content: lastMessageFormatted.content,
              type: lastMessageFormatted.type,
              read: false,
            },
            timestamp: (
              newLastMessageForUser?.createdAt || populatedChat.createdAt
            ).toISOString(),
            unreadCount,
            type: populatedChat.type,
            otherParticipantId: otherParticipant
              ? otherParticipant._id.toString()
              : null,
            isRestricted: populatedChat.isRestricted,
            firstMessageByKnockerId:
              populatedChat.firstMessageByKnockerId?.toString() || null,
            isLockedIn: populatedChat.isLockedIn,
          };
          if (userSocketId) {
            console.log(
              `Emitting chatPreviewUpdate for user ${userId} after deleting message:`,
              chatPreviewData.lastMessage
            );
            io.to(userSocketId).emit("chatPreviewUpdate", chatPreviewData);
          }
        }
      } else {
        console.log(
          `Message ${messageId} was not the last message, but emitting update anyway for consistency`
        );
        let effectiveLastMessage = await Message.findOne({
          chat: chat._id,
          deletedBy: { $ne: userId },
        })
          .sort({ createdAt: -1 })
          .populate("sender", "firstName lastName")
          .lean();

        const populatedChat = await Chat.findById(chat._id)
          .populate("participants", "firstName lastName profileImage")
          .lean();

        if (populatedChat && userSocketId) {
          const unreadCount =
            populatedChat.unreadCounts.find(
              (uc) => uc.user.toString() === userId
            )?.count || 0;
          const otherParticipant =
            populatedChat.type === "private"
              ? populatedChat.participants.find(
                  (p) => p._id.toString() !== userId
                )
              : null;

          const lastMessageFormatted =
            formatLastMessageContentForPreview(effectiveLastMessage);

          const chatPreviewData = {
            id: populatedChat._id.toString(),
            name:
              populatedChat.type === "group"
                ? populatedChat.name
                : otherParticipant
                ? `${otherParticipant.firstName} ${
                    otherParticipant.lastName || ""
                  }`.trim()
                : "Unknown User",
            avatar:
              populatedChat.type === "group"
                ? populatedChat.groupAvatar || null
                : otherParticipant
                ? otherParticipant.profileImage || null
                : null,
            lastMessage: {
              senderId: effectiveLastMessage?.sender?._id.toString() || null,
              content: lastMessageFormatted.content,
              type: lastMessageFormatted.type,
              read: false,
            },
            timestamp: (
              effectiveLastMessage?.createdAt || populatedChat.createdAt
            ).toISOString(),
            unreadCount,
            type: populatedChat.type,
            otherParticipantId: otherParticipant
              ? otherParticipant._id.toString()
              : null,
            isRestricted: populatedChat.isRestricted,
            firstMessageByKnockerId:
              populatedChat.firstMessageByKnockerId?.toString() || null,
            isLockedIn: populatedChat.isLockedIn,
          };
          console.log(
            `Emitting chatPreviewUpdate for consistency:`,
            chatPreviewData.lastMessage
          );
          io.to(userSocketId).emit("chatPreviewUpdate", chatPreviewData);
        }
      }
    }
    res.status(200).json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getUnreadChatCount = async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: req.user.id,
      deletedBy: { $ne: req.user.id },
      unreadCounts: { $elemMatch: { user: req.user._id, count: { $gt: 0 } } },
    })
      .select("_id")
      .lean();
    res.json({ count: chats.length, chatIds: chats.map((c) => c._id.toString()) });
  } catch (error) {
    console.error("Error counting unread chats:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

const EDIT_WINDOW_MS = 15 * 60 * 1000;
const ALLOWED_REACTIONS = ["❤️", "😂", "😮", "😢", "👍", "🔥"];

const loadMessageForMember = async (messageId, userId) => {
  if (!isObjectId(messageId)) return null;
  const message = await Message.findById(messageId);
  if (!message || message.type === "system" || message.deletedBy.some((id) => id.toString() === userId)) return null;
  const chat = await Chat.findById(message.chat);
  if (!chat || !chat.participants.some((p) => p.toString() === userId)) return null;
  return { message, chat };
};

export const editMessage = async (req, res, io, userSocketMap) => {
  const userId = req.user.id;
  const text = typeof req.body?.text === "string" ? req.body.text.trim().slice(0, MAX_MESSAGE_LENGTH) : "";
  if (!text) return res.status(400).json({ message: "Message can't be empty" });
  try {
    const found = await loadMessageForMember(req.body?.messageId, userId);
    if (!found) return res.status(404).json({ message: "Message not found" });
    const { message, chat } = found;
    if (message.sender.toString() !== userId) {
      return res.status(403).json({ message: "You can only edit your own messages" });
    }
    if (Date.now() - new Date(message.createdAt).getTime() > EDIT_WINDOW_MS) {
      return res.status(400).json({ message: "Messages can only be edited within 15 minutes" });
    }
    if (message.text === text) return res.json({ messageId: message._id.toString(), text, editedAt: message.editedAt });
    message.text = text;
    message.editedAt = new Date();
    await message.save();
    const payload = {
      chatId: chat._id.toString(),
      messageId: message._id.toString(),
      text,
      editedAt: message.editedAt.toISOString(),
    };
    io.to(chat._id.toString()).emit("messageEdited", payload);
    if (chat.lastMessage?.toString() === message._id.toString()) {
      for (const participant of chat.participants) {
        const socketId = userSocketMap.get(participant.toString());
        if (socketId) {
          io.to(socketId).emit("chatPreviewUpdate", {
            id: chat._id.toString(),
            lastMessage: {
              senderId: userId,
              content: text,
              type: "text",
              read: false,
            },
          });
        }
      }
    }
    res.json(payload);
  } catch (error) {
    console.error("Error editing message:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const reactToMessage = async (req, res, io) => {
  const userId = req.user.id;
  const emoji = req.body?.emoji;
  if (typeof emoji !== "string" || !ALLOWED_REACTIONS.includes(emoji)) {
    return res.status(400).json({ message: "Unsupported reaction" });
  }
  try {
    const found = await loadMessageForMember(req.body?.messageId, userId);
    if (!found) return res.status(404).json({ message: "Message not found" });
    const { message, chat } = found;
    const existing = message.reactions.find((r) => r.user.toString() === userId);
    message.reactions = message.reactions.filter((r) => r.user.toString() !== userId);
    if (!existing || existing.emoji !== emoji) {
      message.reactions.push({ user: userId, emoji });
    }
    await message.save();
    const payload = {
      chatId: chat._id.toString(),
      messageId: message._id.toString(),
      reactions: message.reactions.map((r) => ({ user: r.user.toString(), emoji: r.emoji })),
    };
    io.to(chat._id.toString()).emit("messageReacted", payload);
    res.json(payload);
  } catch (error) {
    console.error("Error reacting to message:", error);
    res.status(500).json({ message: "Server error" });
  }
};
