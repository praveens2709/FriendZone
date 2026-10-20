import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { mediaUpload } from '../middleware/upload.js';
import { uploadLimiter } from '../middleware/rateLimit.js';
import * as chatController from '../controllers/chatController.js';
import * as groupController from '../controllers/groupController.js';
import { imageUpload } from '../middleware/upload.js';

const router = Router();

export default (io, userSocketMap) => {
  router.get('/', protect, chatController.getUserChats);
  router.get('/unread-count', protect, chatController.getUnreadChatCount);
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
  router.post('/send-media', protect, uploadLimiter, mediaUpload.array('files', 10), (req, res) => {
    chatController.sendMessageWithAttachment(req, res, io, userSocketMap);
  });
  router.get('/:id/info', protect, groupController.getGroupInfo);
  router.put('/:id/group', protect, groupController.renameGroup);
  router.put('/:id/avatar', protect, uploadLimiter, imageUpload.single('avatar'), groupController.updateGroupAvatar);
  router.post('/:id/members', protect, groupController.addMembers);
  router.delete('/:id/members/:userId', protect, groupController.removeMember);
  router.post('/:id/leave', protect, groupController.leaveGroup);
  router.post('/delete', protect, (req, res) => {
    chatController.deleteChats(req, res, io, userSocketMap);
  });
  router.post('/message/delete', protect, (req, res) => {
    chatController.deleteMessage(req, res, io, userSocketMap);
  });
  router.put('/message/edit', protect, (req, res) => {
    chatController.editMessage(req, res, io, userSocketMap);
  });
  router.post('/message/react', protect, (req, res) => {
    chatController.reactToMessage(req, res, io);
  });

  return router;
};