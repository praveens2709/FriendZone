const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const notificationController = require('../controllers/notificationController');

const router = express.Router();

router.get('/', protect, notificationController.getUserNotifications);
router.put('/:id/read', protect, notificationController.markNotificationAsRead);
router.put('/read-all', protect, notificationController.markAllNotificationsAsRead);

module.exports = router;