const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { protect } = require('../middleware/authMiddleware');
const profileController = require('../controllers/profileController');

router.get('/', protect, profileController.getProfile);
router.put('/', protect, upload.single('profileImage'), profileController.updateProfile);

router.put('/privacy', protect, profileController.toggleUserPrivacy);

module.exports = router;