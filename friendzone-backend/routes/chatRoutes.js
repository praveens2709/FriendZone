const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const chatController = require('../controllers/chatController');

const router = express.Router();

router.get('/', protect, chatController.getUserChats);
router.get('/:id/messages', protect, chatController.getChatMessages);
router.post('/', protect, chatController.createChat); // To initiate a chat

module.exports = router;