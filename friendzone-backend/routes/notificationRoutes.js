import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import * as notificationController from '../controllers/notificationController.js';

const router = Router();

export default (io, userSocketMap) => {
    router.get('/', protect, notificationController.getUserNotifications);
    router.get('/unread-count', protect, notificationController.getUnreadNotificationCount);
    router.put('/:id/read', protect, (req, res) => notificationController.markNotificationAsRead(req, res, io));
    router.put('/read-all', protect, (req, res) => notificationController.markAllNotificationsAsRead(req, res, io));
    return router;
};