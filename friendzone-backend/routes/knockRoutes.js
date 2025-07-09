const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const knockController = require('../controllers/knockController');

const router = express.Router();

router.post('/', protect, knockController.knockUser);
router.get('/knockers', protect, knockController.getKnockers);
router.get('/knocked', protect, knockController.getKnocked);
router.put('/:id/accept', protect, knockController.acceptKnock);
router.put('/:id/knockback', protect, knockController.knockBack);
router.put('/:id/decline', protect, knockController.declineKnock);

module.exports = router;
