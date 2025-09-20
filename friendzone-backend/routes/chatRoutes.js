import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import upload from '../middleware/upload.js';
import * as chatController from '../controllers/chatController.js';

const router = Router();

export default (io, userSocketMap) => {
  router.get('/', protect, chatController.getUserChats);
  router.get('/:id/messages', protect, chatController.getChatMessages);
  router.post('/:id/read', protect, (req, res) => {
    chatController.markMessagesAsReadRest(req, res, io, userSocketMap);
  });
  router.post('/', protect, (req, res) => {
    chatController.createChat(req, res, io, userSocketMap);
  });
  router.post('/group', protect, (req, res) => {
    chatController.createGroupChat(req, res, io, userSocketMap);
  });
  router.post('/send-media', protect, upload.array('files'), (req, res) => {
    chatController.sendMessageWithAttachment(req, res, io, userSocketMap);
  });
  router.post('/delete', protect, (req, res) => {
    chatController.deleteChats(req, res, io, userSocketMap);
  });
  router.post('/message/delete', protect, (req, res) => {
    chatController.deleteMessage(req, res, io, userSocketMap);
  });
  
  return router;
};