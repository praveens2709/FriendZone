const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const notificationController = require('../controllers/notificationController');

const router = express.Router();

module.exports = (io, userSocketMap) => {
    router.get('/', protect, notificationController.getUserNotifications);
    router.get('/unread-count', protect, notificationController.getUnreadNotificationCount);
    router.put('/:id/read', protect, (req, res) => notificationController.markNotificationAsRead(req, res, io));
    router.put('/read-all', protect, (req, res) => notificationController.markAllNotificationsAsRead(req, res, io));
    return router;
};