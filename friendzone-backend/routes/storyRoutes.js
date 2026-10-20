import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { mediaUpload } from '../middleware/upload.js';
import { uploadLimiter } from '../middleware/rateLimit.js';
import * as storyController from '../controllers/storyController.js';

const router = Router();

router.use(protect);

router.get('/', storyController.getStories);
router.post('/', uploadLimiter, mediaUpload.single('media'), storyController.createStory);
router.post('/:id/view', storyController.viewStory);
router.get('/:id/viewers', storyController.getViewers);
router.delete('/:id', storyController.deleteStory);

export default router;
