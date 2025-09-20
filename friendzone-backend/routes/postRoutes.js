import { Router } from 'express';
const router = Router();
import * as postController from '../controllers/postController.js';
import { protect } from '../middleware/authMiddleware.js';

router.get('/', protect, postController.getFeedPosts);
router.get('/my-posts', protect, postController.getMyPosts);
router.get('/user/:userId', protect, postController.getPostsByUserId);
router.get('/:postId', protect, postController.getPostById);
router.post('/', protect, postController.createPost);
router.post('/:postId/comments', protect, postController.addComment);
router.post('/:postId/like', protect, postController.toggleLike);
router.post('/:postId/save', protect, postController.toggleSave);
router.post('/:postId/share-count', protect, postController.sharePost);
router.post('/:postId/share-to-chat', protect, postController.sharePostToChat);

export default router;