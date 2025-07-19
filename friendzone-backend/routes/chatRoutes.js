const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const chatController = require('../controllers/chatController');

const router = express.Router();

module.exports = (io, userSocketMap) => {
  router.get('/', protect, chatController.getUserChats);
  router.get('/:id/messages', protect, chatController.getChatMessages);

  router.post('/:id/read', protect, (req, res) => {
    chatController.markMessagesAsReadRest(req, res, io, userSocketMap);
  });

  router.post('/', protect, (req, res) => {
    chatController.createChat(req, res, io, userSocketMap);
  });

  return router;
};