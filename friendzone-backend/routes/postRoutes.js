import { Router } from 'express';
const router = Router();
import * as postController from '../controllers/postController.js';
import { protect } from '../middleware/authMiddleware.js';

router.get('/', protect, postController.getFeedPosts);
router.get('/saved', protect, postController.getSavedPosts);
router.get('/my-posts', protect, postController.getMyPosts);
router.get('/archived', protect, postController.getArchivedPosts);
router.get('/deleted', protect, postController.getDeletedPosts);
router.get('/activity/liked', protect, postController.getLikedPosts);
router.get('/activity/commented', protect, postController.getCommentedPosts);
router.get('/user/:userId', protect, postController.getPostsByUserId);
router.get('/:postId', protect, postController.getPostById);
router.post('/', protect, postController.createPost);
router.put('/:postId/archive', protect, postController.archivePost);
router.put('/:postId/unarchive', protect, postController.unarchivePost);
router.delete('/:postId', protect, postController.deletePost);
router.put('/:postId/restore', protect, postController.restorePost);
router.delete('/:postId/permanent', protect, postController.deletePostForever);
router.post('/:postId/comments', protect, postController.addComment);
router.post('/:postId/like', protect, postController.toggleLike);
router.post('/:postId/save', protect, postController.toggleSave);
router.post('/:postId/share-count', protect, postController.sharePost);
router.post('/:postId/share-to-chat', protect, postController.sharePostToChat);

export default router;