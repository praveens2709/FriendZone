require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const chatRoutes = require('./routes/chatRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const knockRoutes = require('./routes/knockRoutes');

const chatController = require('./controllers/chatController');
const notificationController = require('./controllers/notificationController');

const User = require('./models/User');
const Chat = require('./models/Chat');

connectDB();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT'],
  },
});

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/knock', knockRoutes);

const userSocketMap = new Map();

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('setUserId', async (userId) => {
    userSocketMap.set(userId, socket.id);
    console.log(`User ${userId} mapped to socket ${socket.id}`);

    try {
      const user = await User.findById(userId).select('chats');
      if (user && user.chats.length > 0) {
        user.chats.forEach(chatId => {
          socket.join(chatId.toString());
          console.log(`User ${userId} joined chat room ${chatId.toString()}`);
        });
      }
    } catch (error) {
      console.error(`Error joining user ${userId} to chats on setUserId:`, error);
    }
  });

  socket.on('joinChat', (chatId) => {
    socket.join(chatId);
    console.log(`Socket ${socket.id} joined chat room: ${chatId}`);
  });

  socket.on('leaveChat', (chatId) => {
    socket.leave(chatId);
    console.log(`Socket ${socket.id} left chat room: ${chatId}`);
  });

  socket.on('sendMessage', async ({ chatId, senderId, text }) => {
    const message = await chatController.saveMessage({ chatId, senderId, text });
    if (message) {
      io.to(chatId).emit('newMessage', message);
      console.log(`Message sent to chat ${chatId}: ${message.text}`);

      try {
        const chat = await Chat.findById(chatId).select('participants');
        const senderUser = await User.findById(senderId).select('firstName lastName profileImage');

        if (chat && senderUser) {
          for (const participantId of chat.participants) {
            if (participantId.toString() !== senderId.toString()) {
              const recipientSocketId = userSocketMap.get(participantId.toString());
              const content = `${senderUser.firstName} ${senderUser.lastName || ''} sent you a message: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`;

              const notification = await notificationController.createNotification({
                recipientId: participantId,
                senderId: senderId,
                type: 'message',
                content: content,
                relatedEntityId: chatId,
                relatedEntityType: 'Chat',
              });

              if (notification) {
                if (recipientSocketId) {
                  io.to(recipientSocketId).emit('newNotification', notification);
                }
                io.to(participantId.toString()).emit('chatPreviewUpdate', {
                  chatId: chatId,
                  lastMessage: `${senderUser.firstName}: ${text}`,
                  timestamp: message.timestamp,
                  unreadCountChange: 1,
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('Error handling message notifications:', error);
      }
    }
  });

  socket.on('markMessagesRead', async ({ chatId, userId }) => {
    const success = await chatController.markMessagesAsRead({ chatId, userId });
    if (success) {
      io.to(chatId).emit('messagesRead', { chatId, userId });
      console.log(`Messages in chat ${chatId} marked as read by ${userId}`);
    }
  });

  socket.on('markNotificationRead', async ({ notificationId, userId }) => {
    console.log(`Received request to mark notification ${notificationId} as read by user ${userId}`);
  });


  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    for (let [key, value] of userSocketMap.entries()) {
      if (value === socket.id) {
        userSocketMap.delete(key);
        console.log(`User ${key} unmapped from socket ${socket.id}`);
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});