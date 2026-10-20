import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import knockRoutes from "./routes/knockRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import wordleRoutes from "./routes/wordleRoutes.js";
import meetingRoutes from "./routes/meetingRoutes.js";
import safetyRoutes from "./routes/safetyRoutes.js";
import vibeRoutes from "./routes/vibeRoutes.js";
import supportRoutes from "./routes/supportRoutes.js";
import storyRoutes from "./routes/storyRoutes.js";
import callRoutes from "./routes/callRoutes.js";
import { cleanupExpiredStories } from "./controllers/storyController.js";
import { purgeExpiredDeletedPosts } from "./controllers/postController.js";
import { expireStaleMeetings } from "./controllers/meetingController.js";
import * as wordleController from "./controllers/wordleController.js";
import * as chatController from "./controllers/chatController.js";

import Chat from "./models/Chat.js";
import User from "./models/User.js";
import { verifyAccessToken } from "./utils/jwt.js";
import { isObjectId } from "./utils/validate.js";
import { UPLOADS_DIR } from "./services/cloudinaryService.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import { securityHeaders } from "./middleware/securityHeaders.js";

const requiredEnv = ["MONGO_URI", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"];
if (process.env.NODE_ENV === "production") {
  requiredEnv.push("EMAIL_USER", "EMAIL_PASS");
}
const missingEnv = requiredEnv.filter((name) => !process.env[name]);
if (missingEnv.length) {
  console.error(`Missing required environment variables: ${missingEnv.join(", ")}`);
  process.exit(1);
}

connectDB();

const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const corsOrigin = allowedOrigins.length ? allowedOrigins : false;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST", "PUT"],
  },
  maxHttpBufferSize: 1e6,
});

if (process.env.TRUST_PROXY) {
  app.set("trust proxy", Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
}

app.disable("x-powered-by");
app.use(securityHeaders);
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 400) {
      console.warn(`${req.method} ${req.originalUrl.split("?")[0]} -> ${res.statusCode}: ${body?.message || ""}`);
    }
    return originalJson(body);
  };
  next();
});

const userSocketMap = new Map();

app.set("socketio", io);
app.set("userSocketMap", userSocketMap);

app.use("/uploads", express.static(UPLOADS_DIR, { index: false, dotfiles: "deny", maxAge: "1h" }));

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", apiLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/chats", chatRoutes(io, userSocketMap));
app.use("/api/notifications", notificationRoutes(io, userSocketMap));
app.use("/api/knock", knockRoutes(io, userSocketMap));
app.use("/api/posts", postRoutes);
app.use("/api/wordle", wordleRoutes(wordleController));
app.use("/api/meetings", meetingRoutes(io, userSocketMap));
app.use("/api/safety", safetyRoutes);
app.use("/api/vibes", vibeRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/stories", storyRoutes);
app.use("/api/calls", callRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err?.name === "MulterError" || err?.message === "Unsupported file type") {
    return res.status(400).json({ message: err.message });
  }
  if (err?.type === "entity.parse.failed" || err?.type === "entity.too.large") {
    return res.status(400).json({ message: "Invalid request body" });
  }
  console.error("Unhandled error:", err.message);
  res.status(500).json({ message: "Server error" });
});

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token || typeof token !== "string") {
      return next(new Error("Unauthorized"));
    }
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id).select("_id isVerified").lean();
    if (!user || !user.isVerified) {
      return next(new Error("Unauthorized"));
    }
    socket.userId = user._id.toString();
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
});

const MESSAGE_WINDOW_MS = 10 * 1000;
const MESSAGE_MAX_PER_WINDOW = 20;

io.on("connection", async (socket) => {
  const userId = socket.userId;
  userSocketMap.set(userId, socket.id);

  let messageWindowStart = Date.now();
  let messageCount = 0;

  try {
    const chats = await Chat.find({ participants: userId }).select("_id").lean();
    chats.forEach((chat) => socket.join(chat._id.toString()));
    socket.join(`notifications-${userId}`);
  } catch (error) {
    console.error("Error joining rooms on connection:", error.message);
  }

  socket.on("setUserId", () => {
    userSocketMap.set(userId, socket.id);
  });

  socket.on("joinChat", async (chatId) => {
    if (!isObjectId(chatId)) return;
    try {
      const isMember = await Chat.exists({ _id: chatId, participants: userId });
      if (isMember) socket.join(chatId);
    } catch (error) {
      console.error("Error joining chat room:", error.message);
    }
  });

  socket.on("leaveChat", (chatId) => {
    if (typeof chatId === "string") socket.leave(chatId);
  });

  socket.on("sendMessage", async (payload) => {
    const { chatId, text, isNewChatFromCreation, clientTempId, replyToId } = payload || {};

    const now = Date.now();
    if (now - messageWindowStart > MESSAGE_WINDOW_MS) {
      messageWindowStart = now;
      messageCount = 0;
    }
    messageCount += 1;
    if (messageCount > MESSAGE_MAX_PER_WINDOW) {
      socket.emit("messageFailed", { clientTempId, error: "You are sending messages too fast" });
      return;
    }

    if (!isObjectId(chatId) || typeof text !== "string" || !text.trim() || text.length > 4000) {
      socket.emit("messageFailed", { clientTempId, error: "Invalid message" });
      return;
    }

    try {
      await chatController.saveMessage({
        chatId,
        senderId: userId,
        text,
        replyToId: isObjectId(replyToId) ? replyToId : null,
        isNewChatFromCreation,
        clientTempId,
        io,
        userSocketMap,
      });
    } catch (error) {
      console.error("Error saving socket message:", error.message);
      socket.emit("messageFailed", { clientTempId, error: "Failed to send message" });
    }
  });

  socket.on("markMessagesAsRead", async (payload) => {
    const { chatId } = payload || {};
    if (!isObjectId(chatId)) return;

    try {
      const success = await chatController.markMessagesAsRead({ chatId, userId });
      if (!success) return;

      const chat = await Chat.findById(chatId)
        .populate("participants", "firstName lastName profileImage")
        .populate({
          path: "lastMessage",
          select: "text sender createdAt",
          populate: {
            path: "sender",
            select: "firstName lastName",
          },
        })
        .lean();

      if (!chat) return;

      const unreadCountForUser =
        chat.unreadCounts.find((uc) => uc.user.toString() === userId)?.count || 0;
      const otherParticipant = chat.participants.find(
        (p) => p._id.toString() !== userId
      );
      const lastMessageText = chat.lastMessage ? chat.lastMessage.text : "No messages yet";
      const lastMessageSenderPrefix =
        chat.lastMessage && chat.lastMessage.sender
          ? chat.lastMessage.sender._id.toString() === userId
            ? "You: "
            : `${chat.lastMessage.sender.firstName}: `
          : "";

      const chatPreviewData = {
        id: chat._id.toString(),
        name:
          chat.type === "group"
            ? chat.name
            : otherParticipant
              ? `${otherParticipant.firstName} ${otherParticipant.lastName || ""}`.trim()
              : "Unknown User",
        avatar:
          chat.type === "group" ? null : otherParticipant?.profileImage || null,
        lastMessage: `${lastMessageSenderPrefix}${lastMessageText}`,
        timestamp: chat.lastMessageAt
          ? chat.lastMessageAt.toISOString()
          : chat.createdAt
            ? chat.createdAt.toISOString()
            : new Date().toISOString(),
        unreadCount: unreadCountForUser,
        type: chat.type,
        otherParticipantId: otherParticipant ? otherParticipant._id.toString() : null,
        isRestricted: chat.isRestricted,
        firstMessageByKnockerId: chat.firstMessageByKnockerId?.toString() || null,
      };

      socket.emit("chatPreviewUpdate", chatPreviewData);
      io.to(chatId).emit("messagesRead", { chatId, userId });
    } catch (error) {
      console.error("Error handling markMessagesAsRead socket event:", error.message);
    }
  });

  socket.on("typing", ({ chatId } = {}) => {
    if (typeof chatId === "string" && socket.rooms.has(chatId)) {
      socket.to(chatId).emit("typing", { chatId, userId });
    }
  });

  socket.on("stopTyping", ({ chatId } = {}) => {
    if (typeof chatId === "string" && socket.rooms.has(chatId)) {
      socket.to(chatId).emit("stopTyping", { chatId, userId });
    }
  });

  socket.on("disconnect", () => {
    if (userSocketMap.get(userId) === socket.id) {
      userSocketMap.delete(userId);
    }
  });
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason?.message || reason);
});

setInterval(cleanupExpiredStories, 60 * 60 * 1000).unref();
setInterval(purgeExpiredDeletedPosts, 6 * 60 * 60 * 1000).unref();
setInterval(expireStaleMeetings, 10 * 60 * 1000).unref();
cleanupExpiredStories();

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
