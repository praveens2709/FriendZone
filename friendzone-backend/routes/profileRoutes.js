const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { protect } = require('../middleware/authMiddleware');
const profileController = require('../controllers/profileController');

router.get('/', protect, profileController.getProfile); // Get own profile
router.put('/', protect, upload.single('profileImage'), profileController.updateProfile); // Update own profile

// --- NEW ROUTE: Toggle Privacy ---
router.put('/privacy', protect, profileController.toggleUserPrivacy); // Example: PUT /api/profile/privacy
// -------------------------------

module.exports = router;