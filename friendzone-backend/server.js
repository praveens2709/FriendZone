// server.js (main file)
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const chatRoutes = require("./routes/chatRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const knockRoutes = require("./routes/knockRoutes");
const gameRoutes = require("./routes/gameRoutes"); // Already present

const chatController = require("./controllers/chatController");
const notificationController = require("./controllers/notificationController");

const User = require("./models/User");
const Chat = require("./models/Chat");
const Notification = require("./models/Notification");

// NEW: Import the game socket handlers
const registerGameSocketHandlers = require('./socketHandlers/gameSocketHandlers'); // Adjust path as needed

connectDB();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT"],
  },
});

app.use(cors());
app.use(express.json());

const userSocketMap = new Map();

app.set("socketio", io);
app.set("userSocketMap", userSocketMap);

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/chats", chatRoutes(io, userSocketMap));
app.use("/api/notifications", notificationRoutes(io, userSocketMap));
app.use("/api/knock", knockRoutes(io, userSocketMap));
app.use("/api/games", gameRoutes(io, userSocketMap));

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // It's crucial to set socket.userId right after authentication/connection
  // This example assumes 'setUserId' is your method for this.
  socket.on("setUserId", async (userId) => {
    if (!userId) {
      console.warn(
        `setUserId received with empty userId from socket ${socket.id}.`
      );
      return;
    }
    socket.userId = userId; // Store userId directly on the socket object
    userSocketMap.set(userId, socket.id);
    console.log(`User ${userId} mapped to socket ${socket.id}`);

    try {
      const chats = await Chat.find({ participants: userId }).select("_id");
      if (chats.length > 0) {
        chats.forEach((chat) => {
          socket.join(chat._id.toString());
          console.log(`User ${userId} joined chat room ${chat._id.toString()}`);
        });
      } else {
        console.log(`User ${userId} has no chats to join.`);
      }

      socket.join(`notifications-${userId}`);
      console.log(`User ${userId} joined notifications room notifications-${userId}`);

    } catch (error) {
      console.error(
        `Error joining user ${userId} to chats/notifications on setUserId:`,
        error
      );
    }
  });

  socket.on("joinChat", (chatId) => {
    socket.join(chatId);
    console.log(`Socket ${socket.id} joined chat room ${chatId}`);
  });

  socket.on("leaveChat", (chatId) => {
    socket.leave(chatId);
    console.log(`Socket ${socket.id} left chat room ${chatId}`);
  });

  socket.on(
    "sendMessage",
    async ({ chatId, senderId, text, isNewChatFromCreation, clientTempId }) => {
      const message = await chatController.saveMessage({
        chatId,
        senderId,
        text,
        isNewChatFromCreation,
        clientTempId,
        io: io,
        userSocketMap: userSocketMap,
      });

      if (!message) {
        console.log(
          `Message failed for chat ${chatId}, clientTempId ${clientTempId}. saveMessage likely handled failure.`
        );
      }
    }
  );

  socket.on("markMessagesAsRead", async ({ chatId, userId }) => {
    try {
      const success = await chatController.markMessagesAsRead({ chatId, userId });
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
              avatar: chat.type === "group" ? null : (otherParticipantFromTheirView ? chatController.getUserAvatar(otherParticipantFromTheirView) : null),
              lastMessage: `${lastMessageSenderPrefix}${lastMessageText}`,
              timestamp: chat.lastMessageAt ? chat.lastMessageAt.toISOString() : (chat.createdAt ? chat.createdAt.toISOString() : new Date().toISOString()),
              unreadCount: unreadCountForUser,
              type: chat.type,
              otherParticipantId: otherParticipantFromTheirView ? otherParticipantFromTheirView._id.toString() : null,
              isRestricted: chat.isRestricted,
              firstMessageByKnockerId: chat.firstMessageByKnockerId?.toString() || null,
            };

            io.to(userSocketId).emit("chatPreviewUpdate", chatPreviewData);
          }
          io.to(chatId).emit("messagesRead", { chatId, userId });
        }
      }
    } catch (error) {
      console.error("Error handling markMessagesAsRead socket event:", error);
    }
  });

  socket.on("typing", ({ chatId, userId }) => {
    socket.to(chatId).emit("typing", { chatId, userId });
  });

  socket.on("stopTyping", ({ chatId, userId }) => {
    socket.to(chatId).emit("stopTyping", { chatId, userId });
  });

  // NEW: Register game socket handlers for this specific socket connection
  registerGameSocketHandlers(io, userSocketMap, socket);


  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    let disconnectedUserId = null;
    for (let [key, value] of userSocketMap.entries()) {
      if (value === socket.id) {
        disconnectedUserId = key;
        userSocketMap.delete(key);
        console.log(`User ${key} unmapped from socket ${socket.id}`);
        // Optional: Handle user leaving mid-game if they disconnect
        // You might need to check active game sessions and mark players as offline/forfeit
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});