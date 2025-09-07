const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { protect } = require('../middleware/authMiddleware');

// Get home feed posts (from lockedIn and knocking users)
router.get('/', protect, postController.getFeedPosts);

// Get the authenticated user's own posts
router.get('/my-posts', protect, postController.getMyPosts);

// Get posts for a specific user ID
router.get('/user/:userId', protect, postController.getPostsByUserId);

// Get a single post by its ID (placed after more specific routes)
router.get('/:postId', protect, postController.getPostById);

// Posts
router.post('/', protect, postController.createPost);

// Comments
router.post('/:postId/comments', protect, postController.addComment);

// Likes
router.post('/:postId/like', protect, postController.toggleLike);

// Saves
router.post('/:postId/save', protect, postController.toggleSave);

// Shares
router.post('/:postId/share-count', protect, postController.sharePost);
router.post('/:postId/share-to-chat', protect, postController.sharePostToChat);

module.exports = router;